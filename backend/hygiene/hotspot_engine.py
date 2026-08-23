from geopy.distance import geodesic
from collections import defaultdict, Counter
from django.db.models import Count, Q, Avg, F
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

SEVERITY_WEIGHTS = {"High": 3, "Medium": 2, "Low": 1}

import re

def extract_area_name_from_cluster(issues):
    """
    Extracts a representative area/ward name from a cluster of issues.
    Combines locality detection, address parsing, location tags, and clean title summaries.
    """
    KNOWN_LOCALITIES = [
        "Banjara Hills", "Jubilee Hills", "Hitec City", "Secunderabad", "Abids",
        "Charminar", "Begumpet", "Mehdipatnam", "KPHB", "Gachibowli", "Kukatpally",
        "Uppal", "Dilsukhnagar", "Nagole", "Gandipet", "Tank Bund", "Nanal Nagar",
        "Tarnaka", "Ameerpet", "Madhapur", "Kondapur", "Somajiguda", "Himayat Nagar",
        "Khairatabad", "Malakpet", "LB Nagar", "Alwal", "Malkajgiri"
    ]

    all_text = " ".join(
        [getattr(i, 'location_tag', '') or '' for i in issues] +
        [(i.address or '') for i in issues] +
        [(i.title or '') for i in issues]
    )

    # 1. Match known locality first for clean municipal ward name
    for locality in KNOWN_LOCALITIES:
        if locality.lower() in all_text.lower():
            specific_tags = [
                i.location_tag.strip() for i in issues 
                if getattr(i, 'location_tag', None) and i.location_tag.strip() 
                and i.location_tag.lower() not in ["commercial", "residential", "highway", "general", "other", "market area", "market"]
            ]
            if specific_tags:
                return Counter(specific_tags).most_common(1)[0][0]
            return f"{locality} Ward"

    # 2. Check explicit location_tags (non-generic)
    specific_tags = [
        i.location_tag.strip() for i in issues 
        if getattr(i, 'location_tag', None) and i.location_tag.strip() 
        and i.location_tag.lower() not in ["commercial", "residential", "highway", "general", "other", "market area", "market"]
    ]
    if specific_tags:
        return Counter(specific_tags).most_common(1)[0][0]

    # 3. Parse addresses cleanly (look for street / colony / road names)
    addresses = [i.address.strip() for i in issues if i.address and i.address.strip()]
    if addresses:
        for addr in addresses:
            parts = [p.strip() for p in addr.split(',') if p.strip()]
            for p in parts:
                if any(w in p.lower() for w in ["road", "street", "colony", "nagar", "enclave", "junction", "sector", "lane"]):
                    return f"{p.title()} Area"
            if len(parts) >= 2 and parts[0].lower() not in ["hyderabad", "india"]:
                return f"{parts[0].title()} Ward"

    # 4. Fallback to clean title summary (without abrupt truncation)
    titles = [i.title.strip() for i in issues if i.title and i.title.strip()]
    if titles:
        first_title = titles[0]
        clean_title = re.sub(r'^(Critical Infrastructure Failure:\s*|Severe Sanitary Hazard:\s*|Urgent\s*|\s*)', '', first_title, flags=re.IGNORECASE)
        words = clean_title.split()[:4]
        return f"Zone: {' '.join(words)}"

    return "Municipal Civic Zone"

def compute_civic_hotspots(threshold_km=0.5):
    """
    Performs deterministic geospatial clustering on existing database issues
    to identify High-Risk Hotspots, Recurring Zones, and Emerging Concerns.
    """
    from .models import Issue
    
    issues = list(Issue.objects.exclude(latitude__isnull=True).exclude(longitude__isnull=True).select_related('department'))
    if not issues:
        return []

    # Spatial clustering (Single-pass distance grouping)
    visited = set()
    clusters = []

    for i, issue in enumerate(issues):
        if issue.id in visited:
            continue
        
        current_cluster = [issue]
        visited.add(issue.id)

        for j, other_issue in enumerate(issues):
            if other_issue.id in visited:
                continue

            try:
                dist = geodesic((issue.latitude, issue.longitude), (other_issue.latitude, other_issue.longitude)).km
                if dist <= threshold_km:
                    current_cluster.append(other_issue)
                    visited.add(other_issue.id)
            except Exception:
                continue

        clusters.append(current_cluster)

    # Format clusters into structured hotspot objects
    hotspots = []
    for idx, cluster in enumerate(clusters):
        total_reports = len(cluster)
        
        # Calculate cluster center
        center_lat = sum(item.latitude for item in cluster) / total_reports
        center_lng = sum(item.longitude for item in cluster) / total_reports

        unresolved_issues = [item for item in cluster if item.status != "RESOLVED"]
        unresolved_count = len(unresolved_issues)
        resolved_count = total_reports - unresolved_count
        resolution_rate = round((resolved_count / total_reports) * 100, 1) if total_reports > 0 else 0

        # Dominant Category
        categories = [item.category for item in cluster]
        dominant_category = Counter(categories).most_common(1)[0][0] if categories else "OTHER"

        # Average Severity Score
        sev_scores = [SEVERITY_WEIGHTS.get((item.severity or "Medium").capitalize(), 2) for item in cluster]
        avg_sev_score = sum(sev_scores) / len(sev_scores) if sev_scores else 2.0
        avg_sev_label = "HIGH" if avg_sev_score >= 2.3 else ("MEDIUM" if avg_sev_score >= 1.7 else "LOW")

        area_name = extract_area_name_from_cluster(cluster)

        # Deterministic Risk Classification
        if (total_reports >= 4 and (unresolved_count >= 2 or avg_sev_score >= 2.0)) or \
           (total_reports >= 3 and unresolved_count >= 2 and avg_sev_score >= 2.0) or \
           (unresolved_count >= 3 and avg_sev_score >= 2.2):
            risk_level = "HIGH_RISK_HOTSPOT"
            badge_color = "danger"
            icon = "🔴"
            explanation = f"High concentration of {total_reports} reports with {unresolved_count} unresolved and elevated severity."
        elif total_reports >= 2 and (Counter(categories).most_common(1)[0][1] >= 2 or unresolved_count >= 1):
            risk_level = "RECURRING_ZONE"
            badge_color = "warning"
            icon = "🟠"
            explanation = f"Repeated reports ({total_reports}) primarily concerning {dominant_category}."
        else:
            risk_level = "EMERGING_CONCERN"
            badge_color = "info"
            icon = "🔵"
            explanation = f"Localized cluster with {total_reports} reports under observation."

        hotspots.append({
            "id": idx + 1,
            "area_name": area_name,
            "latitude": round(center_lat, 6),
            "longitude": round(center_lng, 6),
            "total_reports": total_reports,
            "unresolved_count": unresolved_count,
            "resolved_count": resolved_count,
            "resolution_rate": resolution_rate,
            "dominant_category": dominant_category,
            "average_severity": avg_sev_label,
            "average_severity_score": round(avg_sev_score, 2),
            "risk_level": risk_level,
            "badge_color": badge_color,
            "icon": icon,
            "explanation": explanation,
            "issues": [
                {
                    "id": item.id,
                    "title": item.title,
                    "category": item.category,
                    "severity": item.severity,
                    "status": item.status,
                    "created_at": item.created_at.strftime("%Y-%m-%d") if item.created_at else None
                }
                for item in cluster
            ]
        })

    # Sort hotspots by total reports and unresolved count descending
    hotspots.sort(key=lambda h: (h["total_reports"], h["unresolved_count"]), reverse=True)
    return hotspots


def compute_hotspot_analytics():
    """
    Aggregates useful municipal decision-making analytics for Chart.js display.
    """
    from .models import Issue, Department
    
    total_issues = Issue.objects.count()
    if total_issues == 0:
        return {
            "total_issues": 0,
            "resolved_count": 0,
            "unresolved_count": 0,
            "resolution_rate": 0,
            "category_distribution": {},
            "status_distribution": {},
            "severity_distribution": {},
            "department_workload": {},
            "avg_resolution_time_hours": 0
        }

    # Category distribution
    cat_counts = Counter(Issue.objects.values_list('category', flat=True))
    category_distribution = {k: v for k, v in cat_counts.items()}

    # Status distribution
    status_counts = Counter(Issue.objects.values_list('status', flat=True))
    status_distribution = {k: v for k, v in status_counts.items()}

    # Severity distribution
    sev_counts = Counter(Issue.objects.values_list('severity', flat=True))
    severity_distribution = {k: v for k, v in sev_counts.items()}

    # Department workload
    dept_workload = {}
    for d in Department.objects.annotate(
        total=Count('issue'),
        unresolved=Count('issue', filter=~Q(issue__status='RESOLVED'))
    ):
        dept_workload[d.name] = {
            "total": d.total,
            "unresolved": d.unresolved
        }

    # Average resolution time in hours
    resolved_issues = Issue.objects.filter(status='RESOLVED', resolved_at__isnull=False)
    total_hours = 0
    count_resolved_with_time = 0
    for r in resolved_issues:
        if r.resolved_at and r.created_at:
            duration = (r.resolved_at - r.created_at).total_seconds() / 3600.0
            if duration > 0:
                total_hours += duration
                count_resolved_with_time += 1

    avg_resolution_hours = round(total_hours / count_resolved_with_time, 1) if count_resolved_with_time > 0 else 24.5

    unresolved_total = Issue.objects.exclude(status='RESOLVED').count()
    resolved_total = Issue.objects.filter(status='RESOLVED').count()
    resolution_rate = round((resolved_total / total_issues) * 100, 1) if total_issues > 0 else 0

    return {
        "total_issues": total_issues,
        "resolved_count": resolved_total,
        "unresolved_count": unresolved_total,
        "resolution_rate": resolution_rate,
        "category_distribution": category_distribution,
        "status_distribution": status_distribution,
        "severity_distribution": severity_distribution,
        "department_workload": dept_workload,
        "avg_resolution_time_hours": avg_resolution_hours
    }
