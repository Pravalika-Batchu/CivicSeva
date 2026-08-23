from rest_framework import serializers
from .models import Issue, IssueComment, DepartmentNotification, Department, SolveRequest, StatusLog, User
from .priority_engine import calculate_civic_intelligence

class StatusLogSerializer(serializers.ModelSerializer):
    updated_by_username = serializers.CharField(source='updated_by.username', read_only=True)

    class Meta:
        model = StatusLog
        fields = ['old_status', 'new_status', 'updated_by_username', 'timestamp']

class IssueSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    resolution_proof_url = serializers.SerializerMethodField()
    citizen_username = serializers.CharField(source='citizen.username', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    assigned_to_username = serializers.CharField(source='assigned_user.username', read_only=True)
    assigned_employee_username = serializers.CharField(source='assigned_employee.username', read_only=True)
    assigned_employee_id = serializers.IntegerField(source='assigned_employee.id', read_only=True)
    assigned_officer_username = serializers.CharField(source='assigned_officer.username', read_only=True)
    user_vote = serializers.SerializerMethodField()
    resolved_by_citizen = serializers.SerializerMethodField()
    resolved_by_officer = serializers.SerializerMethodField()
    resolved_by_employee = serializers.SerializerMethodField()
    resolved_by_username = serializers.CharField(source='resolved_by.username', read_only=True)
    is_duplicate = serializers.SerializerMethodField()
    resolver_info = serializers.SerializerMethodField()
    civic_intelligence = serializers.SerializerMethodField()
    volunteer_deadline = serializers.SerializerMethodField()
    status_logs = StatusLogSerializer(many=True, read_only=True)

    class Meta:
        model = Issue
        fields = [
            'id', 'title', 'description', 'latitude', 'longitude', 'address', 'location_tag',
            'category', 'severity', 'priority_score', 'status', 'citizen', 'citizen_username',
            'assigned_user', 'assigned_to_username', 'assigned_employee', 'assigned_employee_id',
            'assigned_employee_username', 'assigned_officer', 'assigned_officer_username',
            'department', 'department_name',
            'photo', 'file_url', 'upvotes', 'downvotes', 'is_fake',
            'duplicate_count', 'is_duplicate', 'created_at', 'resolved_at',
            'community_deadline', 'volunteer_deadline', 'resolution_proof', 'resolution_proof_url', 
            'resolution_description', 'is_approved', 'resolver_points_awarded', 
            'user_vote', 'resolved_by_citizen', 'resolved_by_officer', 'resolved_by_employee',
            'resolved_by_username', 'resolver_info', 'civic_intelligence',
            'status_logs'
        ]
        read_only_fields = ['citizen', 'assigned_user', 'department', 'status', 'upvotes', 'downvotes', 'duplicate_count', 'is_approved']

    def get_civic_intelligence(self, obj):
        try:
            return calculate_civic_intelligence(obj)
        except Exception as e:
            return {
                "priority_score": obj.priority_score or 50,
                "breakdown": {"severity": 15, "citizen_support": 0, "sla_urgency": 10, "location_sensitivity": 5, "recurrence": 0, "category_weight": 4, "total": 50},
                "location_sensitivity_label": "General Public Area",
                "recurrence_level": "LOW",
                "recurrence_count": 0,
                "sla_time_remaining": "Standard SLA",
                "is_sla_breached": False,
                "recommended_action": "Standard resolution in progress.",
                "citizen_support_count": (obj.upvotes or 0) + (obj.duplicate_count or 0)
            }

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.photo:
            if request:
                return request.build_absolute_uri(obj.photo.url)
            return obj.photo.url
        return None

    def get_resolution_proof_url(self, obj):
        request = self.context.get('request')
        if obj.resolution_proof:
            if request:
                return request.build_absolute_uri(obj.resolution_proof.url)
            return obj.resolution_proof.url
        return None

    def get_user_vote(self, obj):
        request = self.context.get('request')
        if not request or not hasattr(request, 'user') or not request.user.is_authenticated:
            return None
        vote = obj.votes.filter(user=request.user).first()
        if vote:
            return vote.vote_type
        return None

    def get_resolved_by_citizen(self, obj):
        if obj.resolved_by and obj.resolved_by.role == "CITIZEN" and obj.is_approved:
            return obj.resolved_by.username
        return None

    def get_resolved_by_officer(self, obj):
        if obj.resolved_by and obj.resolved_by.role == "DEPT_OFFICER" and obj.is_approved:
            return obj.resolved_by.username
        return None

    def get_resolved_by_employee(self, obj):
        if obj.resolved_by and obj.resolved_by.role == "DEPT_EMPLOYEE":
            return obj.resolved_by.username
        return None

    def get_is_duplicate(self, obj):
        return obj.duplicate_count > 0

    def get_volunteer_deadline(self, obj):
        return obj.community_deadline

    def get_resolver_info(self, obj):
        if obj.resolved_by:
            if obj.resolved_by.role == "CITIZEN":
                role_display = "Citizen"
            elif obj.resolved_by.role == "DEPT_EMPLOYEE":
                role_display = "Department Employee"
            elif obj.resolved_by.role == "DEPT_OFFICER":
                role_display = "Department Officer"
            else:
                role_display = "Admin"
            return {
                "username": obj.resolved_by.username,
                "role": role_display,
                "department": obj.resolved_by.department.name if obj.resolved_by.department else None
            }
        return None

class IssueCommentSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source="user.username", read_only=True)
    assigned_to_username = serializers.CharField(source="assigned_user.username", read_only=True)
    class Meta:
        model = IssueComment
        fields = ['id', 'issue', 'user', 'user_username', 'text', 'created_at']
        read_only_fields = ['user', 'created_at']

class DepartmentNotificationSerializer(serializers.ModelSerializer):
    issue_title = serializers.CharField(source='issue.title', read_only=True)
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = DepartmentNotification
        fields = [
            'id', 'issue', 'issue_title', 'sender', 'sender_username', 'department',
            'department_name', 'notif_type', 'message', 'created_at', 'is_read'
        ]

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name', 'contact_phone']

class SolveRequestSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()
    issue = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = SolveRequest
        fields = ["id", "issue", "user", "created_at", "is_active"]

# # your_app/serializers.py
# from rest_framework import serializers
# from .models import HelpDeskTicket, HelpDeskComment

# class HelpDeskCommentSerializer(serializers.ModelSerializer):
#     user = serializers.StringRelatedField(read_only=True)
#     created_at = serializers.DateTimeField(read_only=True)

#     class Meta:
#         model = HelpDeskComment
#         fields = ['id', 'user', 'text', 'created_at']

# class HelpDeskTicketSerializer(serializers.ModelSerializer):
#     user = serializers.StringRelatedField(read_only=True)
#     department = serializers.StringRelatedField(read_only=True, allow_null=True)
#     comments = HelpDeskCommentSerializer(many=True, read_only=True)

#     class Meta:
#         model = HelpDeskTicket
#         fields = ['id', 'user', 'department', 'description', 'status', 'created_at', 'updated_at', 'comments']
#         read_only_fields = ['created_at', 'updated_at']

#     def create(self, validated_data):
#         department_name = validated_data.pop('department_name', None)
#         if department_name:
#             department, _ = Department.objects.get_or_create(name=department_name.upper())
#             validated_data['department'] = department
#         return HelpDeskTicket.objects.create(**validated_data)