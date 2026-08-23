from django.utils import timezone
from geopy.distance import geodesic
import logging

logger = logging.getLogger(__name__)

LOCATION_SENSITIVITIES = {
    "SCHOOL_ZONE": {"label": "School Zone", "score": 15},
    "HOSPITAL_AREA": {"label": "Hospital Area", "score": 15},
    "HIGHWAY": {"label": "Main Highway / Transit", "score": 15},
    "MARKET": {"label": "Market / Commercial Zone", "score": 12},
    "RESIDENTIAL": {"label": "Residential Area", "score": 8},
    "GENERAL": {"label": "General Public Area", "score": 5},
}

CATEGORY_WEIGHTS = {
    "SAFETY": 6,
    "ROADS": 5,
    "WATER": 5,
    "ELECTRICITY": 5,
    "HYGIENE": 4,
    "INFRA": 4,
    "OTHER": 2,
}

def get_location_sensitivity_score(issue):
    """
    Evaluates location sensitivity based on issue address, description, or explicit location tag.
    """
    tag = (getattr(issue, 'location_tag', '') or '').lower()
    text = f"{issue.title} {issue.description} {issue.address or ''}".lower()

    if tag in ["school zone", "school", "education"] or any(k in text for k in ["school", "college", "university", "kindergarten", "children", "student"]):
        return 15, "School Zone"
    if tag in ["hospital area", "hospital", "clinic"] or any(k in text for k in ["hospital", "clinic", "dispensary", "emergency room", "medical", "ambulance"]):
        return 15, "Hospital Area"
    if tag in ["highway", "transit", "main road"] or any(k in text for k in ["highway", "flyover", "metro", "bus station", "railway", "junction"]):
        return 15, "Main Highway / Transit"
    if tag in ["market", "commercial"] or any(k in text for k in ["market", "bazaar", "mall", "shopping", "commercial"]):
        return 12, "Market / Commercial Zone"
    if tag in ["residential"] or any(k in text for k in ["colony", "apartment", "residence", "residential", "housing"]):
        return 8, "Residential Area"
    return 5, "General Public Area"

def get_recurrence_score(issue):
    """
    Calculates recurrence based on nearby issues (within 500m in same category).
    """
    from .models import Issue
    if not issue.latitude or not issue.longitude:
        return 0, 0

    try:
        threshold_km = 0.5
        all_candidates = Issue.objects.filter(
            category=issue.category
        ).exclude(id=issue.id).only('id', 'latitude', 'longitude')

        nearby_count = 0
        for cand in all_candidates:
            if cand.latitude and cand.longitude:
                dist = geodesic((issue.latitude, issue.longitude), (cand.latitude, cand.longitude)).km
                if dist <= threshold_km:
                    nearby_count += 1

        # Max recurrence score: 14 points (3.5 points per duplicate/recurrence up to 4)
        recurrence_points = min(14, int(nearby_count * 3.5))
        return recurrence_points, nearby_count
    except Exception as e:
        logger.error(f"Error calculating recurrence score: {e}")
        return 0, 0

def calculate_civic_intelligence(issue):
    """
    Calculates the centralized Civic Priority Score (0-100), transparent breakdown,
    SLA time remaining, and deterministic recommended action.
    """
    # 1. Severity component (Max 25)
    sev = (issue.severity or "Medium").capitalize()
    if sev == "High":
        severity_score = 25
    elif sev == "Medium":
        severity_score = 15
    else:  # Low
        severity_score = 5

    # 2. Citizen Support component (Max 20)
    total_support = (issue.upvotes or 0) + (issue.duplicate_count or 0)
    citizen_support_score = min(20, total_support * 4)

    # 3. SLA Urgency component (Max 20) & SLA Time remaining
    now = timezone.now()
    is_sla_breached = False
    sla_time_remaining_str = "No deadline set"
    hours_left = None

    if issue.community_deadline:
        time_diff = issue.community_deadline - now
        total_seconds = time_diff.total_seconds()
        hours_left = total_seconds / 3600.0

        if total_seconds <= 0:
            is_sla_breached = True
            sla_urgency_score = 20
            abs_seconds = abs(total_seconds)
            h = int(abs_seconds // 3600)
            m = int((abs_seconds % 3600) // 60)
            sla_time_remaining_str = f"SLA Breached ({h}h {m}m ago)" if h > 0 else f"SLA Breached ({m}m ago)"
        else:
            h = int(total_seconds // 3600)
            m = int((total_seconds % 3600) // 60)
            sla_time_remaining_str = f"{h}h {m}m remaining" if h > 0 else f"{m}m remaining"

            if hours_left <= 6:
                sla_urgency_score = 18
            elif hours_left <= 12:
                sla_urgency_score = 14
            elif hours_left <= 24:
                sla_urgency_score = 10
            else:
                sla_urgency_score = 5
    else:
        sla_urgency_score = 5

    # 4. Location Sensitivity component (Max 15)
    loc_score, loc_label = get_location_sensitivity_score(issue)

    # 5. Recurrence component (Max 14)
    recurrence_score, nearby_count = get_recurrence_score(issue)
    recurrence_label = "HIGH" if nearby_count >= 3 else ("MODERATE" if nearby_count >= 1 else "LOW")

    # 6. Category base weight (Max 6)
    category_score = CATEGORY_WEIGHTS.get(issue.category, 4)

    # Total Score (Clamped 0 to 100)
    total_priority = min(100, severity_score + citizen_support_score + sla_urgency_score + loc_score + recurrence_score + category_score)

    # Deterministic Recommended Action
    if issue.status == "RESOLVED":
        recommended_action = "Issue successfully resolved and verified."
    elif issue.status == "PENDING_APPROVAL":
        recommended_action = "Resolution submitted — awaiting citizen verification."
    elif is_sla_breached:
        recommended_action = "Escalation required — SLA breached. Expedite resolution immediately."
    elif sev == "High" and (hours_left is not None and hours_left <= 6):
        recommended_action = "Immediate inspection and high-priority repair recommended."
    elif issue.status in ["ASSIGNED", "IN_PROGRESS"] and (hours_left is not None and hours_left <= 12):
        recommended_action = "Prioritize resolution before SLA expiry deadline."
    elif issue.status == "OPEN":
        recommended_action = "Dispatch task to eligible department employee with lowest active workload."
    elif issue.status == "IN_PROGRESS":
        recommended_action = "Field resolution underway. Await proof of work submission."
    else:
        recommended_action = "Standard department resolution in progress."

    return {
        "priority_score": total_priority,
        "breakdown": {
            "severity": severity_score,
            "citizen_support": citizen_support_score,
            "sla_urgency": sla_urgency_score,
            "location_sensitivity": loc_score,
            "recurrence": recurrence_score,
            "category_weight": category_score,
            "total": total_priority
        },
        "location_sensitivity_label": loc_label,
        "recurrence_level": recurrence_label,
        "recurrence_count": nearby_count,
        "sla_time_remaining": sla_time_remaining_str,
        "is_sla_breached": is_sla_breached,
        "recommended_action": recommended_action,
        "citizen_support_count": total_support
    }
