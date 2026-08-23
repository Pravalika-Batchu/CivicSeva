from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError

ALLOWED_DEPARTMENTS = [
    "HYGIENE",
    "ROADS",
    "ELECTRICITY",
    "WATER",
    "SAFETY",
    "INFRA",
    "OTHER",
]

class User(AbstractUser):
    ROLE_CHOICES = [
        ('CITIZEN', 'Citizen'),
        ('ADMIN', 'Admin'),
        ('DEPT_OFFICER', 'Department Officer'),
        ('DEPT_EMPLOYEE', 'Department Employee'),
    ]
    AVAILABILITY_CHOICES = [
        ('AVAILABLE', 'Available'),
        ('BUSY', 'Busy'),
        ('UNAVAILABLE', 'Unavailable'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='CITIZEN')
    department = models.ForeignKey(
        "Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={'name__in': ALLOWED_DEPARTMENTS}
    )
    phone_number = models.CharField(max_length=25, blank=True, null=True)
    availability = models.CharField(max_length=20, choices=AVAILABILITY_CHOICES, default='AVAILABLE')

    def __str__(self):
        return f"{self.username} ({self.role})"


class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    contact_email = models.EmailField(blank=True, null=True)
    contact_phone = models.CharField(max_length=25, blank=True, null=True)

    def clean(self):
        if self.name not in ALLOWED_DEPARTMENTS:
            raise ValidationError(f"Department must be one of {ALLOWED_DEPARTMENTS}")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Issue(models.Model):
    CATEGORY_CHOICES = [
        ('HYGIENE', 'Hygiene & Sanitation'),
        ('ROADS', 'Road & Transport'),
        ('ELECTRICITY', 'Streetlights & Electricity'),
        ('WATER', 'Water Supply & Drainage'),
        ('SAFETY', 'Safety & Emergency Hazards'),
        ('INFRA', 'Public Infrastructure'),
        ('OTHER', 'Other'),
    ]
    STATUS_CHOICES = [
        ('OPEN', 'Open'),
        ('ASSIGNED', 'Assigned'),
        ('IN_PROGRESS', 'In Progress'),
        ('PENDING_APPROVAL', 'Pending Approval'),
        ('RESOLVED', 'Resolved'),
        ('REASSIGNED', 'Reassigned'),
        ('FLAGGED', 'Flagged for Review'),
        ('CLOSED', 'Closed'),
    ]
    SEVERITY_CHOICES = [
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
    ]

    citizen = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reported_issues")
    assigned_user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="assigned_issues")
    assigned_employee = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="employee_assigned_issues")
    assigned_officer = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="officer_assigned_issues")
    department = models.ForeignKey('Department', null=True, blank=True, on_delete=models.SET_NULL, related_name="issue")

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="HYGIENE")
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default="Medium")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="OPEN")
    address = models.CharField(max_length=255, blank=True, null=True)
    location_tag = models.CharField(max_length=100, blank=True, default='')
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    priority_score = models.IntegerField(default=50, db_index=True)

    resolution_proof = models.FileField(upload_to="resolutions/", null=True, blank=True)
    resolution_description = models.TextField(blank=True, null=True)
    photo = models.ImageField(upload_to="issues/", null=True, blank=True)
    resolved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="resolved_issues")
    resolved_at = models.DateTimeField(null=True, blank=True)
    is_approved = models.BooleanField(default=False)
    resolver_points_awarded = models.BooleanField(default=False)
    is_fake = models.BooleanField(default=False)
    is_flagged_for_review = models.BooleanField(default=False)
    rejection_reason = models.TextField(blank=True, null=True)
    community_deadline = models.DateTimeField(null=True, blank=True)
    assigned_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    upvotes = models.IntegerField(default=0)
    downvotes = models.IntegerField(default=0)
    duplicate_count = models.IntegerField(default=0)  # Added for duplicate tracking

    def __str__(self):
        return f"{self.title} ({self.status})"


class StatusLog(models.Model):
    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name="status_logs")
    old_status = models.CharField(max_length=20)
    new_status = models.CharField(max_length=20)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Issue {self.issue.id} changed from {self.old_status} → {self.new_status}"


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    points = models.IntegerField(default=0)
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)

    def __str__(self):
        return f"{self.user.username} - {self.points} points"


class IssueComment(models.Model):
    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name="comments")
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comment by {self.user.username} on Issue {self.issue.id}"


class IssueVote(models.Model):
    VOTE_CHOICES = [
        ('UP', 'Upvote'),
        ('DOWN', 'Downvote'),
    ]
    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name="votes")
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    vote_type = models.CharField(max_length=5, choices=VOTE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('issue', 'user')

    def __str__(self):
        return f"{self.user.username} voted {self.vote_type} on Issue {self.issue.id}"


class DepartmentNotification(models.Model):
    NOTIF_TYPE_CHOICES = [
        ('MISCLASSIFICATION', 'Misclassification'),
        ('MULTI_DEPT_NEXT_STEP', 'Multi-Dept Next Step'),
    ]
    issue = models.ForeignKey(Issue, on_delete=models.CASCADE)
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        limit_choices_to={'name__in': ALLOWED_DEPARTMENTS}
    )
    notif_type = models.CharField(max_length=32, choices=NOTIF_TYPE_CHOICES)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)


class SolveRequest(models.Model):
    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name="solve_requests")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="solve_requests")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"SolveRequest by {self.user} for {self.issue}"
    

