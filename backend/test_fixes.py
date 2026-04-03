import os, sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
import django
django.setup()

from hygiene.views import classify_issue_ai_helper

# Test 1: Road damage should go to ROADS, not SAFETY
result = classify_issue_ai_helper("broken road causing heavy traffic in nallakunta")
print(f"Test 1 - Road damage: Dept={result['department']}, Severity={result['severity']}")
assert result['department'] == 'ROADS', f"FAIL: Expected ROADS, got {result['department']}"

# Test 2: Fire should still go to SAFETY
result2 = classify_issue_ai_helper("fire in the building at kukatpally")
print(f"Test 2 - Fire: Dept={result2['department']}, Severity={result2['severity']}")
assert result2['department'] == 'SAFETY', f"FAIL: Expected SAFETY, got {result2['department']}"

# Test 3: Pothole should go to ROADS
result3 = classify_issue_ai_helper("pothole on main road near secunderabad")
print(f"Test 3 - Pothole: Dept={result3['department']}, Severity={result3['severity']}")
assert result3['department'] == 'ROADS', f"FAIL: Expected ROADS, got {result3['department']}"

print("\nAll classification tests PASSED!")
