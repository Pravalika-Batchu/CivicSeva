from django.utils import timezone
from django.db.models import Count, Q
from .models import User, Issue, Department, StatusLog
import logging

logger = logging.getLogger(__name__)

def get_workforce_for_department(department):
    """
    Returns all employees for a department annotated with active workload,
    overdue count, resolved count, and workload status.
    """
    now = timezone.now()
    employees = User.objects.filter(
        role='DEPT_EMPLOYEE',
        department=department
    ).select_related('department')

    workforce_data = []
    for emp in employees:
        active_issues = Issue.objects.filter(
            Q(assigned_employee=emp) | Q(assigned_user=emp),
            status__in=['ASSIGNED', 'IN_PROGRESS', 'PENDING_APPROVAL']
        )
        active_count = active_issues.count()
        
        overdue_count = active_issues.filter(
            community_deadline__lt=now
        ).count()

        resolved_count = Issue.objects.filter(
            resolved_by=emp,
            status='RESOLVED'
        ).count()

        # Workload status badge
        if active_count >= 8:
            workload_status = "Busy"
            badge_color = "danger"
            badge_icon = "🔴"
        elif active_count >= 4:
            workload_status = "Moderate"
            badge_color = "warning"
            badge_icon = "🟡"
        else:
            workload_status = "Available"
            badge_color = "success"
            badge_icon = "🟢"

        workforce_data.append({
            "id": emp.id,
            "username": emp.username,
            "first_name": emp.first_name,
            "last_name": emp.last_name,
            "full_name": emp.get_full_name() or emp.username,
            "department_id": department.id if department else None,
            "department_name": department.name if department else "Unassigned",
            "phone_number": emp.phone_number,
            "availability": emp.availability,
            "active_tasks": active_count,
            "overdue_tasks": overdue_count,
            "resolved_tasks": resolved_count,
            "workload_status": workload_status,
            "badge_color": badge_color,
            "badge_icon": badge_icon
        })

    # Sort employees by active tasks ascending (most available first)
    workforce_data.sort(key=lambda x: (x["overdue_tasks"], x["active_tasks"]))
    return workforce_data


def auto_assign_task_to_employee(issue, assigning_user):
    """
    Deterministically auto-assigns an issue to the best available department employee
    based on lowest active workload and zero overdue assignments.
    Returns the assigned employee and an explainable reasoning structure.
    """
    department = issue.department
    if not department:
        # Fallback to category department if not set
        department_name = issue.category if issue.category != "OTHER" else "ROADS"
        department, _ = Department.objects.get_or_create(name=department_name)
        issue.department = department
        issue.save()

    # 1. Fetch department employees
    candidate_employees = User.objects.filter(
        role='DEPT_EMPLOYEE',
        department=department
    ).exclude(availability='UNAVAILABLE')

    # If no DEPT_EMPLOYEE exists yet, check DEPT_OFFICER for fallback
    if not candidate_employees.exists():
        candidate_employees = User.objects.filter(
            role__in=['DEPT_EMPLOYEE', 'DEPT_OFFICER'],
            department=department
        )

    if not candidate_employees.exists():
        return {
            "success": False,
            "error": f"No eligible workforce employees found in {department.name} department."
        }

    now = timezone.now()
    candidates_ranked = []

    for emp in candidate_employees:
        active_issues = Issue.objects.filter(
            Q(assigned_employee=emp) | Q(assigned_user=emp),
            status__in=['ASSIGNED', 'IN_PROGRESS', 'PENDING_APPROVAL']
        )
        active_count = active_issues.count()
        overdue_count = active_issues.filter(community_deadline__lt=now).count()
        resolved_count = Issue.objects.filter(resolved_by=emp, status='RESOLVED').count()

        candidates_ranked.append({
            "employee": emp,
            "active_tasks": active_count,
            "overdue_tasks": overdue_count,
            "resolved_tasks": resolved_count,
            "availability": emp.availability
        })

    # 2. Ranking Algorithm:
    # Priority 1: lowest overdue tasks
    # Priority 2: lowest active tasks
    # Priority 3: highest historical resolutions
    candidates_ranked.sort(
        key=lambda c: (c["overdue_tasks"], c["active_tasks"], -c["resolved_tasks"])
    )

    best_candidate = candidates_ranked[0]
    selected_emp = best_candidate["employee"]

    # 3. Perform assignment on issue
    old_status = issue.status
    issue.assigned_employee = selected_emp
    issue.assigned_user = selected_emp
    issue.assigned_officer = assigning_user
    issue.assigned_at = timezone.now()
    if issue.status == "OPEN" or issue.status == "REASSIGNED":
        issue.status = "ASSIGNED"
    issue.save()

    # 4. Log status history
    StatusLog.objects.create(
        issue=issue,
        old_status=old_status,
        new_status=issue.status,
        updated_by=assigning_user,
        timestamp=timezone.now()
    )

    summary_text = (
        f"{selected_emp.username.title()} was selected as the most suitable employee "
        f"with the lowest active workload ({best_candidate['active_tasks']} active tasks) "
        f"and {best_candidate['overdue_tasks']} overdue assignments in {department.name}."
    )

    return {
        "success": True,
        "assigned_employee": {
            "id": selected_emp.id,
            "username": selected_emp.username,
            "full_name": selected_emp.get_full_name() or selected_emp.username,
            "department": department.name,
            "active_tasks": best_candidate["active_tasks"] + 1,
            "overdue_tasks": best_candidate["overdue_tasks"]
        },
        "reason": {
            "department_match": True,
            "department_name": department.name,
            "availability": selected_emp.availability,
            "active_tasks": best_candidate["active_tasks"],
            "overdue_tasks": best_candidate["overdue_tasks"],
            "total_candidates_evaluated": len(candidates_ranked),
            "summary": summary_text
        }
    }


def manually_assign_task_to_employee(issue, employee, assigning_officer):
    """
    Manually assigns an issue to a specific department employee with validation.
    """
    # Department boundary check
    if employee.department != issue.department and assigning_officer.role != "ADMIN":
        return {
            "success": False,
            "error": f"Employee {employee.username} does not belong to {issue.department.name} department."
        }

    old_status = issue.status
    issue.assigned_employee = employee
    issue.assigned_user = employee
    issue.assigned_officer = assigning_officer
    issue.assigned_at = timezone.now()
    if issue.status in ["OPEN", "REASSIGNED"]:
        issue.status = "ASSIGNED"
    issue.save()

    StatusLog.objects.create(
        issue=issue,
        old_status=old_status,
        new_status=issue.status,
        updated_by=assigning_officer,
        timestamp=timezone.now()
    )

    return {
        "success": True,
        "message": f"Issue successfully assigned to {employee.username}.",
        "assigned_employee": {
            "id": employee.id,
            "username": employee.username,
            "full_name": employee.get_full_name() or employee.username,
            "department": employee.department.name if employee.department else None
        }
    }
