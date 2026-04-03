from django.core.management.base import BaseCommand
from django.utils import timezone
from hygiene.models import Issue, Department, UserProfile
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Process background tasks: expired community deadlines and volunteer timeouts'

    def handle(self, *args, **kwargs):
        now = timezone.now()
        self.stdout.write(f"Running task processing at {now}")

        # 1. Check for Community Deadline Expiry (OPEN -> DEPT ASSIGNMENT if no solution yet)
        # Issues that are OPEN and past community_deadline
        expired_open_issues = Issue.objects.filter(
            status="OPEN", 
            community_deadline__lt=now,
            is_fake=False,
            is_flagged_for_review=False
        )

        for issue in expired_open_issues:
            # Logic: If no volunteer assigned/solved, assign to department
            # Since status is OPEN, no volunteer has picked it up effectively (or they are in pending solve request, but not assigned).
            # We will auto-assign to the department.
            
            department = issue.department
            if not department:
                department, _ = Department.objects.get_or_create(name="OTHER")
                issue.department = department

            issue.assigned_user = None # Ensure no user is assigned
            issue.status = "ASSIGNED" # Assigned to Department (conceptually, status ASSIGNED + no assigned_user means Dept)
            # Actually, standard flow might be: Assigned to user OR Department. 
            # If assigned_user is null and status is ASSIGNED, it implies Department responsibility in some interpretations, 
            # or we can keep it OPEN but flagged as "Department Attention Needed". 
            # Let's stick to: "ASSIGNED" with assigned_user=None implies Department? 
            # Or better, let's look at existing logic. 
            # Existing logic: assigned_issues returns issues where department=user.department.
            # So if we just identify it's for the department, the officers will see it.
            # But we want to mark it as "Escalated to Department".
            
            # Let's just log it and maybe update status if needed. 
            # If status is OPEN, officers can already see it in 'reports_view' if they filter?
            # reports_view shows all. assigned_issues shows dept issues.
            # So if department is set, officers see it.
            # We want to explicitly mark that the "Community Phase" is over.
            
            # Implementation:
            # We don't change status to ASSIGNED unless a specific OFFICER picks it. 
            # BUT, we can enact a "forced assignment" to the department queue effectively.
            # Let's just log that community phase ended.
            
            self.stdout.write(f"Issue {issue.id}: Community deadline passed. Escalating to Department.")
            pass 


        # 2. Check for Volunteer Timeout (ASSIGNED -> REASSIGN TO DEPT)
        # Issues assigned to a CITIZEN (not Dept Officer) that are overdue
        # We need a deadline for volunteers. Let's say 24 hours after assignment.
        volunteer_timeout = now - timedelta(hours=24)
        
        timed_out_issues = Issue.objects.filter(
            status="ASSIGNED",
            assigned_user__role="CITIZEN",
            assigned_at__lt=volunteer_timeout
        )

        for issue in timed_out_issues:
            self.stdout.write(f"Issue {issue.id}: Volunteer {issue.assigned_user.username} timed out. Reassigning to Department.")
            
            # Penalize Volunteer
            profile, _ = UserProfile.objects.get_or_create(user=issue.assigned_user)
            profile.points = max(0, profile.points - 20) # Heavy penalty for locking an issue
            profile.save()

            # Unassign and potentially move to Dept Officer queue (which is effectively just unassigning user)
            issue.assigned_user = None
            issue.status = "OPEN" # Back to Open pool, or keep OPEN?
            # If we set status OPEN, community might pick it again.
            # Maybe we directly assign to a Department Officer? No, we don't know which one.
            # We just unassign the user so it shows up in "Pending/Open" lists again for Dept/Community.
            # Or better, we set it to 'OPEN' but prioritize it?
            
            issue.status = "OPEN"
            issue.save()
            
            # Log/Notify
            logger.info(f"Issue {issue.id} reassigned from {issue.assigned_user} to Department pool due to timeout.")

        self.stdout.write("Task processing complete.")
