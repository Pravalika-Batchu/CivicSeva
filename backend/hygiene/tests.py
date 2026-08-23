from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from hygiene.models import User, Department, Issue, StatusLog
from hygiene.priority_engine import calculate_civic_intelligence
from hygiene.hotspot_engine import compute_civic_hotspots, compute_hotspot_analytics
from hygiene.workforce_engine import get_workforce_for_department, auto_assign_task_to_employee, manually_assign_task_to_employee

class CivicSevaRound2Tests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.dept_roads = Department.objects.create(name="ROADS")
        self.dept_hygiene = Department.objects.create(name="HYGIENE")

        self.citizen = User.objects.create_user(
            username="test_citizen",
            password="password123",
            role="CITIZEN"
        )
        self.officer_roads = User.objects.create_user(
            username="test_officer_roads",
            password="password123",
            role="DEPT_OFFICER",
            department=self.dept_roads
        )
        self.emp_suresh = User.objects.create_user(
            username="test_emp_suresh",
            password="password123",
            role="DEPT_EMPLOYEE",
            department=self.dept_roads,
            availability="AVAILABLE"
        )
        self.emp_ravi = User.objects.create_user(
            username="test_emp_ravi",
            password="password123",
            role="DEPT_EMPLOYEE",
            department=self.dept_roads,
            availability="AVAILABLE"
        )

        now = timezone.now()
        # Create issue
        self.issue = Issue.objects.create(
            citizen=self.citizen,
            title="Dangerous pothole near school",
            description="Deep pothole right next to school entrance causing accidents.",
            category="ROADS",
            department=self.dept_roads,
            severity="High",
            status="OPEN",
            location_tag="School Zone",
            latitude=17.4400,
            longitude=78.4900,
            upvotes=10,
            duplicate_count=2,
            community_deadline=now + timedelta(hours=4)
        )

    def test_civic_priority_calculation(self):
        """Verify deterministic Civic Priority Score and breakdown."""
        intel = calculate_civic_intelligence(self.issue)
        self.assertGreaterEqual(intel["priority_score"], 80)
        self.assertIn("breakdown", intel)
        self.assertEqual(intel["breakdown"]["severity"], 25)
        self.assertEqual(intel["breakdown"]["location_sensitivity"], 15)
        self.assertTrue("School Zone" in intel["location_sensitivity_label"])
        self.assertIn("remaining", intel["sla_time_remaining"])

    def test_workforce_and_auto_assignment(self):
        """Verify intelligent workload-based task allocation to employee with lowest active load."""
        now = timezone.now()
        # Give Ravi 5 active tasks
        for i in range(5):
            Issue.objects.create(
                citizen=self.citizen,
                title=f"Road repair #{i}",
                category="ROADS",
                department=self.dept_roads,
                severity="Medium",
                status="IN_PROGRESS",
                assigned_employee=self.emp_ravi,
                assigned_user=self.emp_ravi,
                community_deadline=now + timedelta(hours=24)
            )

        # Give Suresh only 1 active task
        Issue.objects.create(
            citizen=self.citizen,
            title="Road patch #1",
            category="ROADS",
            department=self.dept_roads,
            severity="Low",
            status="ASSIGNED",
            assigned_employee=self.emp_suresh,
            assigned_user=self.emp_suresh,
            community_deadline=now + timedelta(hours=48)
        )

        # Check workforce stats
        workforce = get_workforce_for_department(self.dept_roads)
        self.assertEqual(len(workforce), 2)
        suresh_stat = next(e for e in workforce if e["username"] == "test_emp_suresh")
        ravi_stat = next(e for e in workforce if e["username"] == "test_emp_ravi")
        self.assertEqual(suresh_stat["active_tasks"], 1)
        self.assertEqual(ravi_stat["active_tasks"], 5)

        # Auto Assign should choose Suresh Kumar
        res = auto_assign_task_to_employee(self.issue, self.officer_roads)
        self.assertTrue(res["success"])
        self.assertEqual(res["assigned_employee"]["username"], "test_emp_suresh")
        self.assertTrue("lowest active workload" in res["reason"]["summary"])

        # Verify issue status
        self.issue.refresh_from_db()
        self.assertEqual(self.issue.status, "ASSIGNED")
        self.assertEqual(self.issue.assigned_employee, self.emp_suresh)

    def test_manual_assignment_department_boundary(self):
        """Ensure officers cannot assign issues to employees of other departments."""
        emp_hygiene = User.objects.create_user(
            username="test_emp_hygiene",
            password="password123",
            role="DEPT_EMPLOYEE",
            department=self.dept_hygiene
        )
        res = manually_assign_task_to_employee(self.issue, emp_hygiene, self.officer_roads)
        self.assertFalse(res["success"])
        self.assertIn("does not belong to ROADS", res["error"])

    def test_hotspot_geospatial_clustering(self):
        """Verify deterministic geospatial clustering into hotspots."""
        # Create nearby issues around lat: 17.4400, lng: 78.4900
        for i in range(3):
            Issue.objects.create(
                citizen=self.citizen,
                title=f"Nearby road issue {i}",
                category="ROADS",
                department=self.dept_roads,
                severity="High",
                status="OPEN",
                latitude=17.4401 + (i * 0.0005),
                longitude=78.4901 + (i * 0.0005)
            )

        hotspots = compute_civic_hotspots(threshold_km=0.5)
        self.assertGreaterEqual(len(hotspots), 1)
        cluster = hotspots[0]
        self.assertGreaterEqual(cluster["total_reports"], 4)
        self.assertIn(cluster["risk_level"], ["HIGH_RISK_HOTSPOT", "RECURRING_ZONE", "EMERGING_CONCERN"])

    def test_resolution_and_citizen_verification_lifecycle(self):
        """Verify resolution submission and citizen verification approval gate."""
        from django.core.files.uploadedfile import SimpleUploadedFile
        test_file = SimpleUploadedFile("proof.jpg", b"fake_image_bytes_content", content_type="image/jpeg")

        self.client.force_authenticate(user=self.emp_suresh)
        # 1. Employee submits resolution
        res = self.client.post(
            f"/api/issues/{self.issue.id}/submit_resolution/",
            {
                "description": "Repaired the asphalt crater with hot mix and leveled with road surface.",
                "file": test_file
            },
            format='multipart'
        )
        self.assertEqual(res.status_code, 200)
        self.issue.refresh_from_db()
        self.assertEqual(self.issue.status, "PENDING_APPROVAL")
        self.assertEqual(self.issue.resolved_by, self.emp_suresh)

        # 2. Random user cannot approve resolution
        other_user = User.objects.create_user(username="other_user", password="password123")
        self.client.force_authenticate(user=other_user)
        approve_fail = self.client.post(f"/api/issues/{self.issue.id}/approve_resolution/")
        self.assertEqual(approve_fail.status_code, 403)

        # 3. Original reporting citizen approves resolution
        self.client.force_authenticate(user=self.citizen)
        approve_ok = self.client.post(f"/api/issues/{self.issue.id}/approve_resolution/")
        self.assertEqual(approve_ok.status_code, 200)

        self.issue.refresh_from_db()
        self.assertEqual(self.issue.status, "RESOLVED")
        self.assertTrue(self.issue.is_approved)

    def test_duplicate_issue_detection_assigned_status(self):
        """Verify that duplicate detection catches duplicates even if original is ASSIGNED."""
        from hygiene.utils import is_duplicate_issue

        # Create original issue with status ASSIGNED
        orig_issue = Issue.objects.create(
            citizen=self.citizen,
            title="Large Pothole on Nagole Road No 1",
            description="A significant pothole has developed on Nagole Road No 1, presenting a clear hazard.",
            category="ROADS",
            department=self.dept_roads,
            severity="High",
            status="ASSIGNED",
            address="Nagole, Road no 1",
            latitude=17.3700,
            longitude=78.5600,
        )

        is_dup, matched_issue, match_type = is_duplicate_issue(
            description="A significant pothole has developed on Road No. 1 in Nagole, posing a substantial risk.",
            lat=17.3705,
            lng=78.5605,
            category="ROADS",
            user=self.citizen,
            address="Nagole Road no1",
            title="Large Pothole on Road No. 1 in Nagole"
        )

        self.assertTrue(is_dup)
        self.assertEqual(matched_issue.id, orig_issue.id)
