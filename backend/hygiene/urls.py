from django.urls import path
from . import views

urlpatterns = [
    # Profile & Leaderboard
    path('api/profile/', views.profile_data, name='profile_data'),
    path('api/leaderboard/', views.leaderboard_view, name='leaderboard'),
    # Issues
    path('api/issues/submit/', views.submit_issue, name='submit_issue'),
    path('api/issues/', views.reports_view, name='reports_view'),
    path('api/issues/delete/<int:issue_id>/', views.delete_report, name='delete_report'),
    path('api/classify-issue/', views.classify_issue_ai, name='classify_issue'),  # New endpoint
    path('api/issues/<int:issue_id>/', views.get_issue, name='get_issue'),
    # Issue resolution
    path('api/issues/<int:issue_id>/submit_resolution/', views.submit_resolution, name='submit_resolution'),
    path('api/issues/<int:issue_id>/approve_resolution/', views.approve_resolution, name='approve_resolution'),
    path('api/issues/<int:issue_id>/reject_resolution/', views.reject_resolution, name='reject_resolution'),
    path('api/issues/<int:issue_id>/review_flagged/', views.review_flagged_issue, name='review_flagged_issue'),

    # Reassign issue (only admin)
    path('api/issues/reassign/<int:issue_id>/', views.reassign_issue, name='reassign_issue'),

    # Comments
    path('api/issues/<int:issue_id>/comment/', views.add_comment, name='add_comment'),
    path('api/issues/<int:issue_id>/comments/', views.get_comments, name='get_comments'),

    # Upvote / Downvote
    path('api/issues/<int:issue_id>/upvote/', views.upvote_issue, name='upvote_issue'),
    path('api/issues/<int:issue_id>/downvote/', views.downvote_issue, name='downvote_issue'),

    # High Risk Zones
    path('api/high_risk_zones/', views.high_risk_zones, name='high_risk_zones'),

    path('api/departments/', views.get_departments),

    path('api/my-reports/', views.my_reports, name='my_reports'),

    path('api/assigned_issues/', views.assigned_issues, name='assigned_issues'),
    path('api/ai-chat/', views.ai_chat, name='ai_chat'),

    path('api/refine-description/', views.refine_description, name='refine_description'),

    path('api/issues/<int:issue_id>/update_status/', views.update_issue_status, name='update_issue_status'),

    # path('api/department-notifications/send/', views.send_department_notification, name='send_department_notification'),
    # path('api/department-notifications/', views.get_department_notifications, name='get_department_notifications'),
    # path('api/admin-notifications/', views.admin_notifications, name='admin_notifications'),
    path('api/department-statistics/', views.department_statistics, name='department_statistics'),

    path('api/issues/check-duplicate/', views.check_duplicate_issue, name='check_duplicate_ai'),
    path('api/issues/request_solve/<int:issue_id>/', views.request_solve_issue, name='request_solve_issue'),
    path('api/solve-requests/pending/', views.pending_solve_requests, name='pending_solve_requests'),

    # Solve Requests approval/rejection
    path('api/solve-requests/<int:request_id>/approve/', views.approve_solve_request, name='approve_solve_request'),
    path('api/solve-requests/<int:request_id>/reject/', views.reject_solve_request, name='reject_solve_request'),

    path('api/assigned-issues/', views.citizen_assigned_issues, name='citizen_assigned_issues'),

    path('api/nearby-issues/', views.nearby_issues, name='nearby_issues'),
    path('api/public-stats/', views.public_stats, name='public_stats'),

    # path('helpdesk/submit-ticket/', views.submit_helpdesk_ticket, name='submit_helpdesk_ticket'),
    # path('helpdesk/my-tickets/', views.my_helpdesk_tickets, name='my_helpdesk_tickets'),
    # path('helpdesk/admin-tickets/', views.admin_helpdesk_tickets, name='admin_helpdesk_tickets'),
    # path('helpdesk/ticket-comments/<int:ticket_id>/', views.get_helpdesk_comments, name='get_helpdesk_comments'),
    # path('helpdesk/add-comment/<int:ticket_id>/', views.add_helpdesk_comment, name='add_helpdesk_comment'),
    # path('helpdesk/update-status/<int:ticket_id>/', views.update_helpdesk_status, name='update_helpdesk_status'),
    # path('helpdesk/ai-summarize/<int:ticket_id>/', views.ai_summarize_ticket, name='ai_summarize_ticket'),
]