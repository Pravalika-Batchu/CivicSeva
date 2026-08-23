import requests

BASE = 'http://localhost:8000'

def run_checks():
    print("==================================================")
    print(" CIVICSEVA SYSTEM INTEGRATION VERIFICATION")
    print("==================================================")

    # 1. Test Auth
    tokens = {}
    accounts = [
        ('admin', 'admin123'),
        ('officer_roads', 'officer123'),
        ('suresh_kumar', 'emp123'),
        ('citizen_user', 'citizen123')
    ]
    for u, p in accounts:
        r = requests.post(f"{BASE}/api/auth/login/", json={"username": u, "password": p})
        assert r.status_code == 200, f"Login failed for {u}: {r.text}"
        tokens[u] = r.json()["access"]
    print("[PASS] 1. Authentication (Admin, Officer, Employee, Citizen): OK")

    # 2. Test Issues List & Public Issue Detail with Civic Intelligence
    r_issues = requests.get(f"{BASE}/api/issues/")
    assert r_issues.status_code == 200 and len(r_issues.json()) > 0, "Issues list failed"
    sample_id = r_issues.json()[0]["id"]
    
    r_detail = requests.get(f"{BASE}/api/issues/{sample_id}/")
    assert r_detail.status_code == 200, f"Detail failed for issue #{sample_id}"
    intel = r_detail.json().get("civic_intelligence", {})
    score = intel.get("priority_score")
    assert "priority_score" in intel and "breakdown" in intel, "Civic intelligence missing in detail payload"
    print(f"[PASS] 2. Public Issue Feed & Detail (Sample #{sample_id} Priority Score: {score}/100): OK")

    # 3. Test Hotspot Geospatial Engine & Decision Analytics
    r_hotspots = requests.get(f"{BASE}/api/hotspots/")
    assert r_hotspots.status_code == 200 and len(r_hotspots.json()) > 0, "Hotspots failed"
    r_analytics = requests.get(f"{BASE}/api/hotspots/analytics/")
    assert r_analytics.status_code == 200 and "status_distribution" in r_analytics.json(), "Analytics failed"
    print(f"[PASS] 3. Hotspots ({len(r_hotspots.json())} Geospatial Clusters) & Decision Analytics: OK")

    # 4. Test Workforce Engine & Auto-Assign
    r_workforce = requests.get(
        f"{BASE}/api/department/employees/",
        headers={"Authorization": f"Bearer {tokens['officer_roads']}"}
    )
    assert r_workforce.status_code == 200 and len(r_workforce.json()) >= 3, "Workforce listing failed"
    print(f"[PASS] 4. Department Workforce ({len(r_workforce.json())} Employees with Workload Scores): OK")

    # 5. Test Employee Portal
    r_tasks = requests.get(
        f"{BASE}/api/employee/my-tasks/",
        headers={"Authorization": f"Bearer {tokens['suresh_kumar']}"}
    )
    assert r_tasks.status_code == 200, "Employee tasks failed"
    print(f"[PASS] 5. Dedicated Employee Portal (Suresh has {len(r_tasks.json())} tasks): OK")

    # 6. Test AI Layer (Executive Insights & Classification)
    r_ai = requests.post(f"{BASE}/api/ai-chat/", json={"message": "Give a 1-sentence municipal update."})
    assert r_ai.status_code == 200 and len(r_ai.json().get("reply", "")) > 0, "AI Chat failed"
    
    r_classify = requests.post(f"{BASE}/api/classify-issue/", json={"description": "Large deep pothole on MG Road"})
    assert r_classify.status_code == 200 and r_classify.json().get("department") == "ROADS", "AI Classify failed"
    print("[PASS] 6. AI Intelligence Services (Executive Summaries, Issue Classification): OK")

    print("\n" + "=" * 50)
    print(" >>> ALL 6 CORE MODULES FULLY OPERATIONAL & VERIFIED <<<")
    print("==================================================")

if __name__ == "__main__":
    run_checks()
