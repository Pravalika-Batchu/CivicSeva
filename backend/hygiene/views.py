from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.utils import timezone
from datetime import datetime, timedelta
from geopy.distance import geodesic, distance
from .models import (
    Issue, IssueComment, IssueVote, UserProfile, User,
    Department, StatusLog, DepartmentNotification, SolveRequest
)
from .serializers import IssueSerializer, IssueCommentSerializer, DepartmentNotificationSerializer, DepartmentSerializer
from .utils import refine_issue_description, is_duplicate_issue, call_openrouter
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from collections import defaultdict
import logging
import json, re
import requests
from django.conf import settings
from django.db.models import Count, Q, Sum
from django.shortcuts import get_object_or_404
from .utils import call_openrouter

logger = logging.getLogger(__name__)

# Common safety settings (Legacy - kept for backward compatibility if needed)
SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
]
DUPLICATE_THRESHOLD = 2

@api_view(['POST'])
@permission_classes([AllowAny])
def ai_chat(request):
    """
    Handles conversational queries from the user via the OpenRouter API.
    Provides system-level fallbacks if the AI service becomes temporarily unavailable.
    """
    user_msg = request.data.get("message", "").strip()
    if not user_msg:
        return Response({"reply": "Please type a message."})
    
    # Add system context for better summaries
    full_msg = f"You are a helpful civic assistant. {user_msg}"
    ai_reply = call_openrouter(full_msg)
    
    if not ai_reply:
        ai_reply = f"System Insight: Active issues are currently under review. (AI service temporarily disconnected)"
        
    return Response({"reply": ai_reply})

def classify_issue_ai_helper(description, lat=None, lng=None):
    """
    Classifies an issue description into a relevant civic department and assigns severity.
    Utilizes local keyword pre-checking for speed and accuracy before falling back to OpenRouter.
    """
    valid_depts = ["HYGIENE", "ROADS", "ELECTRICITY", "WATER", "SAFETY", "INFRA", "OTHER"]
    desc_lower = description.lower()
    
    # Priority keyword screening
    road_keywords = ["pothole", "broken road", "road damage", "road condition", "cracked road",
                     "road repair", "pavement", "asphalt", "footpath", "manhole", "speed bump",
                     "road block", "crater", "uneven road", "road surface"]
    
    if any(k in desc_lower for k in road_keywords):
        severity = "High" if any(k in desc_lower for k in ["accident", "danger", "hazard", "emergency"]) else "Medium"
        return {"department": "ROADS", "severity": severity}
    
    if any(k in desc_lower for k in ["fire", "smoke", "emergency", "crime", "harassment", "assault", "attack"]):
        return {"department": "SAFETY", "severity": "High"}
    
    prompt = f"""
    You are an expert civic issue classifier for an Indian municipal corporation.
    Analyze the issue description and categorize it.
    
    IMPORTANT RULES:
    - If the issue is about ROAD CONDITIONS (potholes, broken roads, road damage, cracked pavement, 
      uneven surfaces, traffic due to road conditions), classify as ROADS, NOT SAFETY.
    - SAFETY is ONLY for: fire, crime, harassment, assault, active threats to human life.
    
    Valid departments: 
    - HYGIENE (garbage, sanitation, waste, public toilets, dead animals, smells, sewage)
    - ROADS (potholes, broken roads, road damage, cracked pavement, footpaths, manholes, 
      speed bumps, road repair needed, craters in road, traffic due to road conditions,
      asphalt damage, road surface issues)
    - ELECTRICITY (streetlights, hanging wires, power outages, transformers)
    - WATER (leaks, no supply, dirty water, drainage overflow, pipe burst)
    - SAFETY (fire, crime, harassment, assault, attack, open construction sites)
    - INFRA (parks, benches, public buildings, broken fences)
    - OTHER (if none of the above fits)

    Valid severity: Low, Medium, High
    
    Issue description: "{description}"

    Respond ONLY with strict JSON:
    {{ "department": "DEPARTMENT_NAME", "severity": "SEVERITY_LEVEL" }}
    """

    dept_raw = "OTHER"
    severity = "Medium"

    ai_text = call_openrouter(prompt)
    if ai_text:
        try:
            match = re.search(r'\{.*\}', ai_text, re.DOTALL)
            if match:
                data = json.loads(match.group(0))
                dept_raw = data.get("department", "OTHER").upper().strip()
                severity = data.get("severity", "Medium").capitalize()
        except Exception as e:
            logger.error(f"Classification JSON Parsing Error: {e}")
    else:
        logger.warning(f"AI Classification service unavailable (OpenRouter Failed). Falling back to local rules.")

    # Local fallback logic if AI mapping is ambiguous or fails
    if dept_raw not in valid_depts or dept_raw == "OTHER":
        if any(k in desc_lower for k in ["garbage", "waste", "clean", "hygiene", "sanitation", "toilet", "odor", "smell", "dump", "dirty"]):
            dept_raw = "HYGIENE"
        elif any(k in desc_lower for k in ["pothole", "road", "pavement", "street", "path", "asphalt", "tile", "divider", "crater", "traffic", "driving", "surface"]):
            dept_raw = "ROADS"
        elif any(k in desc_lower for k in ["light", "power", "electric", "wire", "current", "transformer", "pole"]):
            dept_raw = "ELECTRICITY"
        elif any(k in desc_lower for k in ["water", "leak", "drain", "sewage", "supply", "pipe", "overflow"]):
            dept_raw = "WATER"
        elif any(k in desc_lower for k in ["fire", "crime", "threat", "assault", "attack", "harassment"]):
            dept_raw = "SAFETY"
            severity = "High" # Elevated severity for safety issues
        elif any(k in desc_lower for k in ["park", "bench", "building", "fence", "public", "garden", "playground"]):
            dept_raw = "INFRA"

    # Severity normalization
    if severity not in ["Low", "Medium", "High"]:
        severity = "Medium"
    
    # Specific keywords that FORCE high severity
    if any(k in desc_lower for k in ["fire", "accident", "death", "toxic", "explosion", "urgent", "emergency"]):
        severity = "High"

    return {"department": dept_raw, "severity": severity}



@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def classify_issue_ai(request):
    """
    Exposes the classification helper as an endpoint for asynchronous frontend categorization.
    """
    description = request.data.get('description', '')
    lat = request.data.get('latitude', '')
    lng = request.data.get('longitude', '')
    if not description:
        return Response({"error": "Description is required"}, status=400)
    classification = classify_issue_ai_helper(description, lat, lng)
    return Response(classification)

@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def refine_description(request):
    raw_text = request.data.get("text", "").strip()
    if not raw_text:
        return Response({"refined": "{}"}, status=200)
    
    try:
        refined_text = refine_issue_description(raw_text)
        return Response({"refined": refined_text})
    except Exception as e:
        logger.error(f"Text refinement service encountered an issue: {e}")
        return Response({"refined": json.dumps({"description": raw_text, "error": str(e)})}, status=200)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def submit_issue(request):
    data = request.data.copy()
    serializer = IssueSerializer(data=data, context={'request': request})
    
    if not serializer.is_valid():
        logger.error(f"Issue Submission Validation Failed: {serializer.errors}")
        return Response(serializer.errors, status=400)

    classification = classify_issue_ai_helper(
        description=data.get('description', ''),
        lat=data.get('latitude', ''),
        lng=data.get('longitude', '')
    )
    department_name = classification['department']
    severity = classification['severity']

    is_duplicate, original_issue, match_type = is_duplicate_issue(
        description=data.get('description', ''),
        lat=float(data.get('latitude', '')) if data.get('latitude') else None,
        lng=float(data.get('longitude', '')) if data.get('longitude') else None,
        category=department_name,
        user=request.user,
        address=data.get('address', '')
    )

    if is_duplicate and original_issue:
        vote, created = IssueVote.objects.get_or_create(user=request.user, issue=original_issue)
        
        # Increment duplicate count only if newly detected or newly upvoted
        if created or vote.vote_type != 'UP':
            vote.vote_type = 'UP'
            vote.save()
            original_issue.duplicate_count += 1
            if original_issue.duplicate_count >= DUPLICATE_THRESHOLD:
                original_issue.severity = "High"
            original_issue.save()
            
        original_issue.upvotes = original_issue.votes.filter(vote_type='UP').count()
        original_issue.downvotes = original_issue.votes.filter(vote_type='DOWN').count()
        
        serializer = IssueSerializer(original_issue, context={'request': request})
        msg = f"Duplicate of issue #{original_issue.id} detected. Your report has been recorded as an upvote."
        if not created and vote.vote_type == 'UP':
            msg = f"You have already reported/upvoted this issue (ID #{original_issue.id}). Thank you!"

        return Response({
            "message": msg,
            "is_duplicate": True,
            "original_issue_id": original_issue.id,
            "upvotes": original_issue.upvotes,
            "duplicate_count": original_issue.duplicate_count,
            "severity": original_issue.severity,
            **serializer.data
        }, status=200)

    issue = serializer.save(citizen=request.user, created_at=timezone.now())
    issue.severity = severity
    issue.category = department_name

    now = timezone.now()
    # Set Community Deadline (how long until it MUST be resolved)
    if severity == "High":
        issue.community_deadline = now + timedelta(hours=24)
    elif severity == "Medium":
        issue.community_deadline = now + timedelta(hours=48)
    else:  # Low
        issue.community_deadline = now + timedelta(hours=72)

    if department_name == "OTHER":
        issue.department = None
    else:
        issue.department, _ = Department.objects.get_or_create(name=department_name)
    
    issue.status = "OPEN"
    issue.duplicate_count = 0
    issue.save()
    
    logger.debug(f"New issue created: #{issue.id}, category={department_name}, severity={severity}")
    
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    profile.points += 5
    profile.save()

    return Response(IssueSerializer(issue, context={'request': request}).data, status=201)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def check_duplicate_issue(request):
    description = request.data.get('description', '').strip()
    lat = request.data.get('latitude', '')
    lng = request.data.get('longitude', '')
    category = request.data.get('category', '').strip()

    if not description or not category or not lat or not lng:
        return Response({"error": "Description, category, latitude, and longitude are required"}, status=400)

    try:
        lat = float(lat)
        lng = float(lng)
    except (ValueError, TypeError):
        return Response({"error": "Invalid latitude or longitude"}, status=400)

    is_duplicate, original_issue, match_type = is_duplicate_issue(
        description=description,
        lat=lat,
        lng=lng,
        category=category,
        user=request.user,
        address=data.get('address', '')
    )

    if is_duplicate and original_issue:
        vote, created = IssueVote.objects.get_or_create(user=request.user, issue=original_issue)
        if not created and vote.vote_type == 'UP':
            return Response({
                "error": "You have already upvoted this issue.",
                "is_duplicate": True,
                "original_issue_id": original_issue.id
            }, status=400)

        vote.vote_type = 'UP'
        vote.save()

        original_issue.upvotes = original_issue.votes.filter(vote_type='UP').count()
        original_issue.downvotes = original_issue.votes.filter(vote_type='DOWN').count()
        original_issue.duplicate_count += 1

        if original_issue.duplicate_count >= DUPLICATE_THRESHOLD:
            original_issue.severity = "High"

        original_issue.save()
        logger.debug(f"Duplicate issue detected: #{original_issue.id}, duplicate_count={original_issue.duplicate_count}, upvotes={original_issue.upvotes}, severity={original_issue.severity}")

        serializer = IssueSerializer(original_issue, context={'request': request})
        return Response({
            "message": f"This issue is a duplicate of issue #{original_issue.id}. Upvote and duplicate count incremented.",
            "is_duplicate": True,
            "original_issue_id": original_issue.id,
            "upvotes": original_issue.upvotes,
            "duplicate_count": original_issue.duplicate_count,
            "severity": original_issue.severity,
            **serializer.data
        }, status=200)

    return Response({
        "message": "No duplicate found. This issue is unique.",
        "is_duplicate": False
    }, status=200)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_reports(request):
    user = request.user
    issues = Issue.objects.filter(citizen=user).order_by('-created_at')
    serializer = IssueSerializer(issues, many=True, context={"request": request})
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([AllowAny])
def reports_view(request):
    priority_filter = request.query_params.get('priority', None)
    department_filter = request.query_params.get('department', None)
    sort_by = request.query_params.get('sort', 'created_at') # created_at, nearby
    lat = request.query_params.get('lat')
    lng = request.query_params.get('lng')

    issues = Issue.objects.all()

    # Filters
    if priority_filter == 'high':
        issues = issues.filter(duplicate_count__gte=DUPLICATE_THRESHOLD)
    
    if department_filter:
        issues = issues.filter(department__name=department_filter)

    # Sorting
    if sort_by == 'nearby' and lat and lng:
        try:
            user_loc = (float(lat), float(lng))
            # In-memory sort for distance (not efficient for huge DBs, but fine here)
            # Use a list to sort
            issue_list = list(issues)
            issue_list.sort(key=lambda x: geodesic(user_loc, (x.latitude, x.longitude)).km if x.latitude and x.longitude else float('inf'))
            serializer = IssueSerializer(issue_list, many=True, context={"request": request})
            return Response(serializer.data)
        except ValueError:
            pass # Fallback to default sort if coords invalid

    # Default Sort
    issues = Issue.objects.all().order_by('-created_at')
    
    # Auto-reassignment logic for issues past deadline
    now = timezone.now()
    
    # 1. Individual officer assignment expired
    expired_issues = issues.filter(
        status='ASSIGNED',
        community_deadline__lt=now,
        is_approved=False
    )
    for exp_issue in expired_issues:
        exp_issue.status = 'REASSIGNED'
        exp_issue.assigned_user = None
        exp_issue.save()
        StatusLog.objects.create(
            issue=exp_issue,
            old_status='ASSIGNED',
            new_status='REASSIGNED',
            updated_by=None,
            timestamp=now
        )
        logger.info(f"Auto-reassigned issue #{exp_issue.id} due to deadline expiry.")

    # 2. Volunteer window expired - mark for department action
    # We define expiry dynamically based on created_at and severity
    # High: 1h, Medium: 12h, Low: 24h
    
    # This filter is an approximation for logging/processing
    potential_expired = issues.filter(
        status='OPEN',
        assigned_user__isnull=True,
        created_at__lt=now - timedelta(hours=1) # At least High expired
    )
    for v_issue in potential_expired:
        is_expired = False
        if v_issue.severity == "High":
            is_expired = True # since created_at < now - 1h
        elif v_issue.severity == "Medium" and v_issue.created_at < now - timedelta(hours=12):
            is_expired = True
        elif v_issue.severity == "Low" and v_issue.created_at < now - timedelta(hours=24):
            is_expired = True
        
        if is_expired:
            logger.debug(f"Volunteer window expired for issue #{v_issue.id}. Department is now responsible.")

    serializer = IssueSerializer(issues, many=True, context={'request': request})
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def assigned_issues(request):
    user = request.user
    if user.role != "DEPT_OFFICER":
        return Response({"error": "Permission denied"}, status=403)
    issues = Issue.objects.filter(department=user.department).order_by('-created_at')
    serializer = IssueSerializer(issues, many=True, context={"request": request})
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_issue_to_user(request, issue_id):
    if request.user.role != 'ADMIN':
        return Response({"error": "Permission denied"}, status=403)

    user_id = request.data.get("user_id")
    try:
        issue = Issue.objects.get(id=issue_id)
        user = User.objects.get(id=user_id)

        if user.role not in ['DEPT_OFFICER', 'CITIZEN']:
            return Response({"error": "User cannot be assigned issues."}, status=400)

        issue.assigned_user = user
        issue.status = 'ASSIGNED'
        issue.save()

        return Response({
            "success": True,
            "assigned_to": user.username,
            "issue_id": issue.id,
            "status": issue.status
        })
    except Issue.DoesNotExist:
        return Response({"error": "Issue not found"}, status=404)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_solve_issue(request, issue_id):
    try:
        issue = Issue.objects.get(id=issue_id)
    except Issue.DoesNotExist:
        return Response({"error": "Issue not found"}, status=404)

    if (timezone.now() - issue.created_at).days > 3:
        return Response({"error": "Solve option expired for this issue"}, status=400)

    if issue.citizen == request.user:
        return Response({"error": "You cannot solve your own reported issue"}, status=403)

    solve_req, created = SolveRequest.objects.get_or_create(issue=issue, user=request.user)
    if not created:
        return Response({"error": "You already requested to solve this issue"}, status=400)

    return Response({"message": "Solve request submitted! Admin will review."})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_issue_status(request, issue_id):
    try:
        issue = Issue.objects.get(id=issue_id)
    except Issue.DoesNotExist:
        return Response({"error": "Issue not found"}, status=404)
    new_status = request.data.get("status")
    allowed_statuses = [s[0] for s in Issue.STATUS_CHOICES]
    if new_status not in allowed_statuses:
        return Response({"error": "Invalid status"}, status=400)
    if issue.assigned_user == request.user or (request.user.role == "DEPT_OFFICER" and issue.department == request.user.department):
        old_status = issue.status
        issue.status = new_status
        issue.save()
        StatusLog.objects.create(issue=issue, old_status=old_status, new_status=new_status, updated_by=request.user, timestamp=timezone.now())
        return Response({"message": f"Issue status updated: {old_status} → {new_status}"})
    return Response({"error": "Permission denied"}, status=403)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_resolution(request, issue_id):
    try:
        issue = Issue.objects.get(id=issue_id)
    except Issue.DoesNotExist:
        return Response({'error': 'Issue not found'}, status=404)
    if issue.citizen == request.user:
        return Response({'error': 'You cannot resolve your own report.'}, status=403)
    file = request.FILES.get('file')
    description = request.POST.get('description', '').strip()
    if not file:
        return Response({'error': 'Proof file is required.'}, status=400)
    issue.resolved_by = request.user
    issue.resolution_proof = file
    issue.resolution_description = description
    issue.resolved_at = timezone.now()
    issue.status = "PENDING_APPROVAL"
    issue.save()
    return Response({'message': 'Resolution submitted and waiting for approval!'}, status=200)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_resolution(request, issue_id):
    try:
        issue = Issue.objects.get(id=issue_id)
    except Issue.DoesNotExist:
        return Response({'error': 'Issue not found'}, status=404)
    if issue.citizen != request.user:
        return Response({'error': 'Only the reporter can approve.'}, status=403)
    if not issue.resolution_proof:
        return Response({'error': 'No resolution submitted yet.'}, status=400)
    if issue.is_approved:
        return Response({'message': 'Already approved'}, status=200)
    
    issue.is_approved = True
    issue.status = "RESOLVED"
    issue.save()

    if issue.resolved_by and not issue.resolver_points_awarded:
        severity_points = {"Low": 5, "Medium": 10, "High": 20}
        profile, _ = UserProfile.objects.get_or_create(user=issue.resolved_by)
        profile.points += severity_points.get(issue.severity, 10)
        profile.save()
        issue.resolver_points_awarded = True
        issue.save()
    
    return Response({'message': 'Resolution approved! Issue marked as RESOLVED.'}, status=200)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_resolution(request, issue_id):
    try:
        issue = Issue.objects.get(id=issue_id)
    except Issue.DoesNotExist:
        return Response({'error': 'Issue not found'}, status=404)

    if issue.citizen != request.user:
        return Response({'error': 'Only the reporter can reject key.'}, status=403)

    if issue.status != "PENDING_APPROVAL":
         return Response({'error': 'Issue is not pending approval.'}, status=400)

    reason = request.data.get("reason", "").strip()
    if not reason:
        return Response({'error': 'Rejection reason is required.'}, status=400)

    issue.status = "REOPENED" # Or "IN_PROGRESS" / "OPEN"
    issue.rejection_reason = reason
    issue.is_approved = False
    issue.resolution_proof = None # Optional: Clear proof or keep for history
    issue.save()

    # Create log
    StatusLog.objects.create(
        issue=issue, 
        old_status="PENDING_APPROVAL", 
        new_status="REOPENED", 
        updated_by=request.user, 
        timestamp=timezone.now()
    )

    return Response({'message': 'Resolution rejected. Issue reopened.'}, status=200)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def close_issue(request, issue_id):
    if request.user.role != 'ADMIN':
        return Response({"error": "Permission denied"}, status=403)
    try:
        issue = Issue.objects.get(id=issue_id)
        issue.status = 'CLOSED'
        issue.save()
        return Response({"success": True, "message": "Issue closed."})
    except Issue.DoesNotExist:
        return Response({"error": "Issue not found"}, status=404)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_comment(request, issue_id):
    try:
        issue = Issue.objects.get(id=issue_id)
    except Issue.DoesNotExist:
        return Response({"error": "Issue not found"}, status=404)
    text = request.data.get('text', '').strip()
    if not text:
        return Response({"error": "Comment text is required"}, status=400)
    comment = IssueComment.objects.create(issue=issue, user=request.user, text=text)
    serializer = IssueCommentSerializer(comment)
    return Response(serializer.data, status=201)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_comments(request, issue_id):
    try:
        issue = Issue.objects.get(id=issue_id)
    except Issue.DoesNotExist:
        return Response({"error": "Issue not found"}, status=404)
    comments = issue.comments.all().order_by('created_at')
    serializer = IssueCommentSerializer(comments, many=True)
    return Response(serializer.data)

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upvote_issue(request, issue_id):
    try:
        issue = Issue.objects.get(id=issue_id)
    except Issue.DoesNotExist:
        return Response({"error": "Issue not found"}, status=404)
    
    if issue.citizen == request.user:
        return Response({"error": "You cannot vote for your own issue."}, status=403)
    
    vote, created = IssueVote.objects.get_or_create(user=request.user, issue=issue)
    if not created and vote.vote_type == 'UP':
        return Response({"error": "You have already upvoted this issue."}, status=400)
    
    vote.vote_type = 'UP'
    vote.save()
    
    issue.upvotes = issue.votes.filter(vote_type='UP').count()
    issue.downvotes = issue.votes.filter(vote_type='DOWN').count()
    issue.save()
    
    return Response({
        "message": "Upvoted successfully",
        "upvotes": issue.upvotes,
        "downvotes": issue.downvotes,
        "duplicate_count": issue.duplicate_count
    })

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def downvote_issue(request, issue_id):
    try:
        issue = Issue.objects.get(id=issue_id)
    except Issue.DoesNotExist:
        return Response({"error": "Issue not found"}, status=404)
    
    if issue.citizen == request.user:
        return Response({"error": "You cannot vote for your own issue."}, status=403)
    
    vote, created = IssueVote.objects.get_or_create(user=request.user, issue=issue)
    if not created and vote.vote_type == 'DOWN':
        return Response({"error": "You have already downvoted this issue."}, status=400)
    
    vote.vote_type = 'DOWN'
    vote.save()
    
    issue.upvotes = issue.votes.filter(vote_type='UP').count()
    issue.downvotes = issue.votes.filter(vote_type='DOWN').count()
    
    if issue.downvotes >= 3 and issue.downvotes > issue.upvotes:
        if not issue.is_fake and not issue.is_flagged_for_review:
            issue.is_flagged_for_review = True
            issue.status = "FLAGGED"
            issue.save()
            # Note: Points are not deducted yet. Admin must confirm.
    
    issue.save()
    
    return Response({
        "message": "Downvoted successfully",
        "upvotes": issue.upvotes,
        "downvotes": issue.downvotes,
        "is_fake": issue.is_fake,
        "duplicate_count": issue.duplicate_count
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile_data(request):
    user = request.user
    reports = Issue.objects.filter(citizen=user)
    solved = Issue.objects.filter(resolved_by=user, is_approved=True)
    count = reports.count()
    solved_count = solved.count()
    badges = []
    if count >= 1:
        badges.append("📝 First Report Submitted")
    if solved_count >= 1:
        badges.append("⭐ First Task Completed")
    if solved_count >= 5:
        badges.append("🛠️ 5 Issues Solved")
    if solved_count >= 10:
        badges.append("💪 Civic Hero")
    
    profile = UserProfile.objects.filter(user=user).first()
    points = profile.points if profile else 0
    
    return Response({
        'username': user.username,
        'report_count': count,
        'solved_count': solved_count,
        'points': points,
        'badges': badges,
        'role': user.role,
        'department': user.department.name if user.department else None
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def leaderboard_view(request):
    dept_leaderboard = (
        Department.objects.annotate(
            issues_resolved=Count(
                "issue",
                filter=Q(issue__status="RESOLVED", issue__is_approved=True)
            ),
            total_points=Sum(
                "user__userprofile__points",
                filter=Q(user__role="DEPT_OFFICER"),
                default=0
            )
        )
        .order_by("-total_points")
        .values("id", "name", "issues_resolved", "total_points")
    )
    officers_leaderboard = [
        {
            "rank": idx + 1,
            "department": dept["name"],
            "issues_resolved": dept["issues_resolved"] or 0,
            "total_points": dept["total_points"] or 0
        }
        for idx, dept in enumerate(dept_leaderboard)
    ]

    citizen_leaderboard = (
        User.objects.filter(role="CITIZEN")
        .annotate(
            issues_resolved=Count(
                "resolved_issues",
                filter=Q(resolved_issues__status="RESOLVED", resolved_issues__is_approved=True)
            ),
            points=Sum(
                "userprofile__points",
                default=0
            )
        )
        .select_related("userprofile")
        .order_by("-points")
        .values("id", "username", "issues_resolved", "points")[:10]
    )

    logger.debug(f"Officers leaderboard: {officers_leaderboard}")
    logger.debug(f"Citizen leaderboard: {citizen_leaderboard}")

    return Response({
        "department_leaderboard": officers_leaderboard,
        "citizen_leaderboard": list(citizen_leaderboard)
    })

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_report(request, issue_id):
    try:
        issue = Issue.objects.get(id=issue_id)
    except Issue.DoesNotExist:
        return Response({'error': 'Issue not found'}, status=404)
    if issue.citizen != request.user:
        return Response({'error': 'Permission denied'}, status=403)
    issue.delete()
    return Response({'message': 'Issue deleted successfully!'}, status=200)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_department_notifications(request):
    if request.user.role != "ADMIN":
        return Response({"error": "Permission denied"}, status=403)
    notifs = DepartmentNotification.objects.select_related("issue", "sender", "department").order_by("-created_at")
    serializer = DepartmentNotificationSerializer(notifs, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pending_solve_requests(request):
    if request.user.role != "ADMIN":
        return Response({"error": "Permission denied"}, status=403)
    
    solve_reqs = SolveRequest.objects.filter(is_active=True).select_related("user", "issue")
    data = []
    for sr in solve_reqs:
        user_profile, _ = UserProfile.objects.get_or_create(user=sr.user)
        solved_count = Issue.objects.filter(resolved_by=sr.user, is_approved=True).count()
        data.append({
            "id": sr.id,
            "user": {"id": sr.user.id, "username": sr.user.username, "points": user_profile.points, "solved_count": solved_count},
            "issue": {"id": sr.issue.id, "title": sr.issue.title},
            "created_at": sr.created_at,
        })
    logger.debug(f"Pending solve requests: {data}")
    return Response(data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_solve_request(request, request_id):
    if request.user.role != "ADMIN":
        return Response({"error": "Permission denied"}, status=403)

    solve_request = get_object_or_404(SolveRequest, pk=request_id)
    issue = solve_request.issue

    logger.debug(f"Approving solve request {request_id} for issue {issue.id} by user {solve_request.user.username}")

    if solve_request.user.role == "DEPT_OFFICER" and solve_request.user.department:
        issue.department = solve_request.user.department

    issue.assigned_user = solve_request.user
    issue.status = "ASSIGNED"
    issue.save()

    solve_request.approved = True
    solve_request.is_active = False
    solve_request.save()

    logger.debug(f"Solve request {request_id} approved, is_active={solve_request.is_active}, issue status={issue.status}, assigned_user={issue.assigned_user.username if issue.assigned_user else None}")

    return Response({"message": "Solve request approved and issue assigned."})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_solve_request(request, request_id):
    try:
        solve_request = SolveRequest.objects.get(id=request_id)
        solve_request.is_active = False
        solve_request.save()
        logger.debug(f"Solve request {request_id} rejected, is_active={solve_request.is_active}")
        return Response({"message": "Solve request rejected successfully."})
    except SolveRequest.DoesNotExist:
        return Response({"error": "Solve request not found."}, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def citizen_assigned_issues(request):
    user = request.user
    issues = Issue.objects.filter(
        assigned_user=user,
        status__in=["ASSIGNED", "IN_PROGRESS"]
    ).select_related("assigned_user", "department").order_by('-created_at')
    serializer = IssueSerializer(issues, many=True, context={"request": request})
    logger.debug(f"Assigned issues for user {user.username}: {[{'id': issue.id, 'title': issue.title, 'status': issue.status} for issue in issues]}")
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_notifications(request):
    """
    Fetch notifications for Admin.
    """
    if request.user.role != "ADMIN":
        return Response({"error": "Permission denied"}, status=403)
    
    # Example: Notifications about High Severity issues or Approval Requests
    # For now, we can fetch Pending Approval issues as "notifications"
    pending_approvals = Issue.objects.filter(status="PENDING_APPROVAL").count()
    high_severity_count = Issue.objects.filter(severity="High", status__in=["OPEN", "IN_PROGRESS"]).count()
    
    notifications = []
    
    if pending_approvals > 0:
        notifications.append({
            "id": "pending_approvals",
            "title": "Resolution Approvals Pending",
            "message": f"{pending_approvals} issues are waiting for your approval.",
            "type": "warning",
            "link": "/admin/reports" # Or a specific approvals page
        })
        
    if high_severity_count > 0:
        notifications.append({
            "id": "high_severity",
            "title": "High Severity Issues",
            "message": f"{high_severity_count} high severity issues need attention.",
            "type": "danger",
            "link": "/admin/reports?priority=High"
        })
        
    return Response(notifications)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_stats(request):
    """
    Public endpoint for landing page statistics.
    """
    total_issues = Issue.objects.count()
    resolved_issues = Issue.objects.filter(status='RESOLVED').count()
    active_citizens = User.objects.filter(role='CITIZEN').count()
    
    return Response({
        "total_issues": total_issues,
        "resolved_issues": resolved_issues,
        "active_citizens": active_citizens
    })
    if request.user.role != "ADMIN":
        return Response({"error": "Permission denied"}, status=403)

    notifs = []
    for issue in Issue.objects.filter(duplicate_count__gte=DUPLICATE_THRESHOLD):
        notifs.append({
            "id": f"high-{issue.id}",
            "type": "HIGH_PRIORITY",
            "message": f'High priority issue due to multiple reports: "{issue.title}" (Duplicate Count: {issue.duplicate_count})',
            "issue_title": issue.title,
            "created_at": issue.created_at,
        })
    for issue in Issue.objects.filter(status="PENDING"):
        notifs.append({
            "id": f"pending-{issue.id}",
            "type": "PENDING",
            "message": f'Pending approval for "{issue.title}"',
            "issue_title": issue.title,
            "created_at": issue.created_at,
        })

    solve_reqs = SolveRequest.objects.filter(is_active=True).select_related("user", "issue")
    issue_to_users = defaultdict(list)

    for sr in solve_reqs:
        user_profile, _ = UserProfile.objects.get_or_create(user=sr.user)
        solved_count = Issue.objects.filter(resolved_by=sr.user, is_approved=True).count()
        issue_to_users[sr.issue.id].append({
            "id": sr.user.id,
            "username": sr.user.username,
            "points": user_profile.points,
            "solved_count": solved_count
        })

    for issue_id, users in issue_to_users.items():
        issue = Issue.objects.get(id=issue_id)
        user_names = ", ".join([u["username"] for u in users])
        notifs.append({
            "id": f"solve-{issue.id}",
            "type": "SOLVE_REQUEST",
            "message": f'Users {user_names} want to solve "{issue.title}"',
            "issue_id": issue.id,
            "issue_title": issue.title,
            "users": users,
            "created_at": max([sr.created_at for sr in solve_reqs if sr.issue.id == issue_id]),
        })

    return Response(notifs)

@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def department_statistics(request):
    if request.user.role != "DEPT_OFFICER":
        return Response({"error": "Permission denied"}, status=403)
    
    dept = request.user.department
    total_issues = Issue.objects.filter(department=dept).count()
    solved_issues = Issue.objects.filter(department=dept, status="RESOLVED").count()
    pending_issues = Issue.objects.filter(department=dept, status="PENDING").count()
    in_progress_issues = Issue.objects.filter(department=dept, status="IN_PROGRESS").count()
    
    severity_high = Issue.objects.filter(department=dept, severity="High").count()
    severity_medium = Issue.objects.filter(department=dept, severity="Medium").count()
    severity_low = Issue.objects.filter(department=dept, severity="Low").count()
    high_priority_issues = Issue.objects.filter(department=dept, duplicate_count__gte=DUPLICATE_THRESHOLD).count()
    
    return Response({
        "total": total_issues,
        "solved": solved_issues,
        "pending": pending_issues,
        "in_progress": in_progress_issues,
        "severity_high": severity_high,
        "severity_medium": severity_medium,
        "severity_low": severity_low,
        "high_priority": high_priority_issues
    })

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reassign_issue(request, issue_id):
    if request.user.role != "ADMIN":
        return Response({"error": "Permission denied"}, status=403)
    new_dept_name = request.data.get("department")
    try:
        issue = Issue.objects.get(id=issue_id)
        department, _ = Department.objects.get_or_create(name=new_dept_name.upper())
        issue.department = department
        issue.status = "REASSIGNED"
        issue.save()
        return Response({"success": True, "new_department": department.name})
    except Issue.DoesNotExist:
        return Response({"error": "Issue not found"}, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def high_risk_zones(request):
    high_risk = (
        Issue.objects.filter(duplicate_count__gte=DUPLICATE_THRESHOLD)
        .values('latitude', 'longitude')
        .annotate(issue_count=Count('id'))
        .order_by('-issue_count')[:10]
    )
    return Response(list(high_risk))

@csrf_exempt
@api_view(['GET'])
@permission_classes([AllowAny])
def get_departments(request):
    from .models import ALLOWED_DEPARTMENTS
    for dept_name in ALLOWED_DEPARTMENTS:
        Department.objects.get_or_create(name=dept_name)
    
    departments = Department.objects.all()
    serializer = DepartmentSerializer(departments, many=True)
    return Response(serializer.data)

def nearby_issues(request):
    lat = float(request.GET.get("lat"))
    lng = float(request.GET.get("lng"))
    nearby = []

    for issue in Issue.objects.all():
        issue_coords = (issue.latitude, issue.longitude)
        user_coords = (lat, lng)
        if distance(issue_coords, user_coords).km <= 5:
            nearby.append({
                "id": issue.id,
                "title": issue.title,
                "description": issue.description,
                "lat": issue.latitude,
                "lng": issue.longitude,
                "severity": issue.severity,
                "duplicate_count": issue.duplicate_count
            })

    summary = {"total_issues": len(nearby)}
    precautions = ["Stay alert for any emerging issues."]
    if nearby:
        prompt = f"""
        Analyze the following civic issues reported within a 5km radius. Provide a concise summary (150-200 words) covering key issues, common themes, and recommendations for local authorities. Also, list specific precautions citizens should take to stay safe given these issues. Avoid using markdown symbols like ** or * in the response. Format the response as JSON with 'summary' and 'precautions' keys, where precautions is a list of actionable steps.

        Issues: {'; '.join([f'Title: {i["title"]}, Description: {i["description"]}, Severity: {i["severity"]}' for i in nearby])}
        """
        try:
            model = genai.GenerativeModel("gemini-flash-latest")
            response = model.generate_content(prompt)
            # Find JSON in response
            json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
            if json_match:
                ai_response = json.loads(json_match.group(0))
            else:
                ai_response = {}
            summary = ai_response.get("summary", "No summary available.")
            precautions = ai_response.get("precautions", ["Stay alert for any emerging issues."])
        except Exception as e:
            logger.error(f"AI summary error: {e}")
            summary = f"{len(nearby)} issues reported, including potholes, sanitation, and safety concerns."
            precautions = ["Avoid areas with reported hazards.", "Stay cautious during travel."]

    return JsonResponse({
        "issues": nearby,
        "summary": summary,
        "precautions": precautions
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_issue(request, issue_id):
    issue = get_object_or_404(Issue, pk=issue_id)
    # Authorization check removed to allow public viewing of issues
    # if issue.citizen != request.user and issue.assigned_user != request.user:
    #     return Response({"error": "Not authorized to view this issue."}, status=403)
    serializer = IssueSerializer(issue, context={'request': request})
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def review_flagged_issue(request, issue_id):
    if request.user.role != 'ADMIN':
        return Response({"error": "Permission denied"}, status=403)

    try:
        issue = Issue.objects.get(id=issue_id)
    except Issue.DoesNotExist:
        return Response({"error": "Issue not found"}, status=404)

    action = request.data.get("action") # 'CONFIRM_FAKE' or 'DISMISS'
    
    if action == 'CONFIRM_FAKE':
        issue.is_fake = True
        issue.status = 'CLOSED' 
        issue.save()
        
        # Deduct points
        profile, _ = UserProfile.objects.get_or_create(user=issue.citizen)
        points_to_deduct = 10
        if profile.points >= points_to_deduct:
            profile.points -= points_to_deduct
        else:
            profile.points = 0
        profile.save()
        
        return Response({"message": "Issue marked as FAKE. Reporter penalized."})

    elif action == 'DISMISS':
        issue.is_fake = False
        issue.is_flagged_for_review = False
        issue.status = 'OPEN' 
        issue.save()
        return Response({"message": "Flag dismissed. Issue reopened."})

    return Response({"error": "Invalid action"}, status=400)