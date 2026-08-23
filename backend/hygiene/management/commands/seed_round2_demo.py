from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from hygiene.models import User, Department, Issue, UserProfile, StatusLog

def seed_demo_data_internal():
    """
    Core seeding routine callable from CLI management command or API endpoint.
    """
    now = timezone.now()

    # 1. Departments
    depts = {}
    dept_names = ["ROADS", "HYGIENE", "ELECTRICITY", "WATER", "SAFETY", "INFRA", "OTHER"]
    for name in dept_names:
        dept, _ = Department.objects.get_or_create(
            name=name,
            defaults={"contact_phone": "+918309595272", "contact_email": f"{name.lower()}@civicseva.gov.in"}
        )
        depts[name] = dept

    # 2. Users & Roles
    # Admin
    admin_user, _ = User.objects.get_or_create(
        username="admin",
        defaults={
            "role": "ADMIN",
            "is_staff": True,
            "is_superuser": True,
            "phone_number": "+919876543210"
        }
    )
    admin_user.set_password("admin123")
    admin_user.save()
    UserProfile.objects.get_or_create(user=admin_user, defaults={"points": 500})

    # Officers
    officer_roads, _ = User.objects.get_or_create(
        username="officer_roads",
        defaults={
            "role": "DEPT_OFFICER",
            "department": depts["ROADS"],
            "is_staff": True,
            "phone_number": "+919876543211"
        }
    )
    officer_roads.set_password("officer123")
    officer_roads.department = depts["ROADS"]
    officer_roads.save()

    officer_hygiene, _ = User.objects.get_or_create(
        username="officer_hygiene",
        defaults={
            "role": "DEPT_OFFICER",
            "department": depts["HYGIENE"],
            "is_staff": True,
            "phone_number": "+919876543212"
        }
    )
    officer_hygiene.set_password("officer123")
    officer_hygiene.department = depts["HYGIENE"]
    officer_hygiene.save()

    # Roads Department Employees
    # Suresh Kumar: Available, 3 active tasks, 0 overdue
    suresh, _ = User.objects.get_or_create(
        username="suresh_kumar",
        defaults={
            "first_name": "Suresh",
            "last_name": "Kumar",
            "role": "DEPT_EMPLOYEE",
            "department": depts["ROADS"],
            "phone_number": "+919876543220",
            "availability": "AVAILABLE"
        }
    )
    suresh.set_password("emp123")
    suresh.first_name = "Suresh"
    suresh.last_name = "Kumar"
    suresh.department = depts["ROADS"]
    suresh.availability = "AVAILABLE"
    suresh.save()

    # Ravi Sharma: Busy, 8 active tasks, 2 overdue
    ravi, _ = User.objects.get_or_create(
        username="ravi_sharma",
        defaults={
            "first_name": "Ravi",
            "last_name": "Sharma",
            "role": "DEPT_EMPLOYEE",
            "department": depts["ROADS"],
            "phone_number": "+919876543221",
            "availability": "AVAILABLE"
        }
    )
    ravi.set_password("emp123")
    ravi.first_name = "Ravi"
    ravi.last_name = "Sharma"
    ravi.department = depts["ROADS"]
    ravi.save()

    # Kumar Verma: Moderate, 6 active tasks, 1 overdue
    kumar, _ = User.objects.get_or_create(
        username="kumar_verma",
        defaults={
            "first_name": "Kumar",
            "last_name": "Verma",
            "role": "DEPT_EMPLOYEE",
            "department": depts["ROADS"],
            "phone_number": "+919876543222",
            "availability": "AVAILABLE"
        }
    )
    kumar.set_password("emp123")
    kumar.first_name = "Kumar"
    kumar.last_name = "Verma"
    kumar.department = depts["ROADS"]
    kumar.save()

    # Citizens
    citizen_user, _ = User.objects.get_or_create(
        username="citizen_user",
        defaults={"role": "CITIZEN", "phone_number": "+919876543230"}
    )
    citizen_user.set_password("citizen123")
    citizen_user.save()
    UserProfile.objects.get_or_create(user=citizen_user, defaults={"points": 45})

    priya, _ = User.objects.get_or_create(
        username="priya_patel",
        defaults={"role": "CITIZEN", "phone_number": "+919876543231"}
    )
    priya.set_password("citizen123")
    priya.save()

    # 3. Seed Realistic Demo Issues
    # Hero Demo Issue 1: Deep Pothole near School (Score 94-96)
    hero_issue, created = Issue.objects.get_or_create(
        title="Deep hazardous pothole near Model High School",
        defaults={
            "citizen": citizen_user,
            "description": "Severe deep road crater directly in front of the school gate. Poses extreme collision hazard for school buses and pedestrians during morning rush hours.",
            "category": "ROADS",
            "department": depts["ROADS"],
            "severity": "High",
            "status": "OPEN",
            "address": "Model High School Main Road, Secunderabad, Hyderabad",
            "location_tag": "School Zone",
            "latitude": 17.4399,
            "longitude": 78.4983,
            "upvotes": 14,
            "duplicate_count": 2,
            "community_deadline": now + timedelta(hours=4, minutes=30),
            "priority_score": 94
        }
    )
    if not created:
        hero_issue.status = "OPEN"
        hero_issue.assigned_employee = None
        hero_issue.assigned_user = None
        hero_issue.community_deadline = now + timedelta(hours=4, minutes=30)
        hero_issue.save()

    # Demo Issue 2: Resolution Evidence Case (PENDING CITIZEN VERIFICATION)
    resolution_demo_issue, _ = Issue.objects.get_or_create(
        title="Broken stormwater drain grating near Apollo Hospital",
        defaults={
            "citizen": citizen_user,
            "description": "Damaged and displaced heavy metal storm drain grate creating open tyre trap near hospital emergency wing.",
            "category": "WATER",
            "department": depts["WATER"],
            "severity": "High",
            "status": "PENDING_APPROVAL",
            "address": "Road No 36, Jubilee Hills, near Apollo Hospital, Hyderabad",
            "location_tag": "Hospital Area",
            "latitude": 17.4285,
            "longitude": 78.4110,
            "upvotes": 8,
            "duplicate_count": 1,
            "resolved_by": suresh,
            "resolved_at": now - timedelta(hours=2),
            "resolution_description": "Reinforced heavy-duty iron stormwater grating fabricated and installed flush with asphalt. Silt cleared from drain intake.",
            "community_deadline": now + timedelta(hours=18),
            "priority_score": 88
        }
    )

    # Demo Hotspot 1: Banjara Hills Cluster (Garbage & Sanitation Hotspot)
    banjara_issues = [
        ("Overflowing municipal garbage dumpster blocking walkway", "HYGIENE", "High", 17.4156, 78.4350, "Road No 12, Banjara Hills, Hyderabad", "Banjara Hills Road 12"),
        ("Uncollected domestic waste accumulation near market", "HYGIENE", "High", 17.4162, 78.4355, "Banjara Hills Market Area, Hyderabad", "Banjara Hills Market"),
        ("Stagnant foul sewage overflow on residential street", "WATER", "Medium", 17.4149, 78.4345, "Banjara Hills Colony Rd 12, Hyderabad", "Banjara Hills Colony"),
        ("Broken plastic waste collection bin spreading litter", "HYGIENE", "Medium", 17.4158, 78.4358, "Banjara Hills Junction, Hyderabad", "Banjara Hills Junction"),
        ("Dead animal carcass near open garbage point", "HYGIENE", "High", 17.4165, 78.4348, "Banjara Hills Sector 2, Hyderabad", "Banjara Hills Sector 2"),
    ]
    for t, cat, sev, lat, lng, addr, tag in banjara_issues:
        Issue.objects.get_or_create(
            title=t,
            defaults={
                "citizen": priya,
                "description": f"Repeated civic complaint reported in Banjara Hills: {t}.",
                "category": cat,
                "department": depts[cat],
                "severity": sev,
                "status": "OPEN",
                "address": addr,
                "location_tag": tag,
                "latitude": lat,
                "longitude": lng,
                "upvotes": 6,
                "duplicate_count": 1,
                "community_deadline": now + timedelta(hours=12),
                "priority_score": 82
            }
        )

    # Demo Hotspot 2: Hitec City Corridor (Roads & Infrastructure Hotspot)
    hitec_issues = [
        ("Dangerous potholes on Cyber Towers underpass", "ROADS", "High", 17.4504, 78.3808, "Cyber Towers Underpass, Hitec City, Hyderabad", "Hitec City Underpass"),
        ("Displaced road median barrier causing lane blockage", "INFRA", "Medium", 17.4510, 78.3815, "Hitec City Main Rd, Hyderabad", "Hitec City Main Rd"),
        ("Streetlight cluster completely dark during night commute", "ELECTRICITY", "Medium", 17.4498, 78.3802, "Mindspace Junction, Hitec City, Hyderabad", "Mindspace Junction"),
        ("Water pipeline leakage causing road erosion", "WATER", "High", 17.4515, 78.3820, "Inorbit Mall Road, Hitec City, Hyderabad", "Inorbit Mall Rd"),
    ]
    for t, cat, sev, lat, lng, addr, tag in hitec_issues:
        Issue.objects.get_or_create(
            title=t,
            defaults={
                "citizen": citizen_user,
                "description": f"Recurring civic infrastructure concern in Hitec City: {t}.",
                "category": cat,
                "department": depts[cat],
                "severity": sev,
                "status": "OPEN",
                "address": addr,
                "location_tag": tag,
                "latitude": lat,
                "longitude": lng,
                "upvotes": 9,
                "duplicate_count": 2,
                "community_deadline": now + timedelta(hours=8),
                "priority_score": 86
            }
        )

    # 4. Workload tasks for employees to prove Auto-Assign deterministic math
    # Give Ravi 8 tasks (2 overdue)
    for k in range(8):
        is_overdue = (k < 2)
        deadline = (now - timedelta(hours=5)) if is_overdue else (now + timedelta(hours=20 + k))
        Issue.objects.get_or_create(
            title=f"Road repair maintenance task #{k+1} - North Zone",
            defaults={
                "citizen": citizen_user,
                "description": "Routine pavement surface patch work.",
                "category": "ROADS",
                "department": depts["ROADS"],
                "severity": "Medium",
                "status": "IN_PROGRESS",
                "assigned_employee": ravi,
                "assigned_user": ravi,
                "assigned_officer": officer_roads,
                "assigned_at": now - timedelta(days=1),
                "address": f"Secunderabad North Sector, Plot #{10+k}",
                "latitude": 17.4450 + (k * 0.001),
                "longitude": 78.4900 + (k * 0.001),
                "community_deadline": deadline,
                "priority_score": 60 + k
            }
        )

    # Give Kumar 6 tasks (1 overdue)
    for k in range(6):
        is_overdue = (k == 0)
        deadline = (now - timedelta(hours=3)) if is_overdue else (now + timedelta(hours=15 + k))
        Issue.objects.get_or_create(
            title=f"Road barrier realignment task #{k+1} - Central Zone",
            defaults={
                "citizen": priya,
                "description": "Central divider alignment maintenance.",
                "category": "ROADS",
                "department": depts["ROADS"],
                "severity": "Medium",
                "status": "IN_PROGRESS",
                "assigned_employee": kumar,
                "assigned_user": kumar,
                "assigned_officer": officer_roads,
                "assigned_at": now - timedelta(days=1),
                "address": f"Abids Central Road, Sector #{20+k}",
                "latitude": 17.3900 + (k * 0.001),
                "longitude": 78.4700 + (k * 0.001),
                "community_deadline": deadline,
                "priority_score": 65 + k
            }
        )

    # Give Suresh 3 tasks (0 overdue)
    for k in range(3):
        deadline = now + timedelta(hours=24 + (k * 6))
        Issue.objects.get_or_create(
            title=f"Road inspection and resurfacing #{k+1} - South Zone",
            defaults={
                "citizen": citizen_user,
                "description": "Pothole filling and road quality verification.",
                "category": "ROADS",
                "department": depts["ROADS"],
                "severity": "Low",
                "status": "ASSIGNED",
                "assigned_employee": suresh,
                "assigned_user": suresh,
                "assigned_officer": officer_roads,
                "assigned_at": now - timedelta(hours=6),
                "address": f"Charminar South Avenue, Sector #{30+k}",
                "latitude": 17.3600 + (k * 0.001),
                "longitude": 78.4750 + (k * 0.001),
                "community_deadline": deadline,
                "priority_score": 55 + k
            }
        )

    return {
        "status": "success",
        "message": "Round-2 demo dataset successfully seeded with departments, workforce, and realistic civic hotspots!",
        "hero_issue_id": hero_issue.id,
        "resolution_demo_id": resolution_demo_issue.id,
        "users": {
            "admin": "admin / admin123",
            "officer_roads": "officer_roads / officer123",
            "officer_hygiene": "officer_hygiene / officer123",
            "employee_suresh": "suresh_kumar / emp123 (Available - 3 tasks, 0 overdue)",
            "employee_ravi": "ravi_sharma / emp123 (Busy - 8 tasks, 2 overdue)",
            "employee_kumar": "kumar_verma / emp123 (Moderate - 6 tasks, 1 overdue)",
            "citizen": "citizen_user / citizen123"
        }
    }


class Command(BaseCommand):
    help = 'Seed realistic Round-2 demo dataset for CivicSeva hackathon presentation'

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding Round-2 CivicSeva demo data...")
        result = seed_demo_data_internal()
        self.stdout.write(self.style.SUCCESS(f"[SUCCESS] {result['message']}"))
        for user_key, creds in result["users"].items():
            self.stdout.write(f"  * {user_key}: {creds}")
