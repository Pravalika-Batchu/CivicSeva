import logging
import requests
import json
import re
from django.conf import settings

logger = logging.getLogger(__name__)

def call_openrouter(prompt, model="deepseek/deepseek-chat"):
    """
    Handles API communication with OpenRouter, implementing retries and timeouts.
    """
    import time
    max_retries = 2
    for attempt in range(max_retries + 1):
        try:
            response = requests.post(
                url="https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                },
                data=json.dumps({
                    "model": model,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ]
                }),
                timeout=45 # Increased timeout
            )
            if response.status_code == 200:
                content = response.json()['choices'][0]['message']['content'].strip()
                return content
            else:
                logger.error(f"OpenRouter Error {response.status_code}: {response.text}")
        except Exception as e:
            logger.error(f"OpenRouter Network/Timeout Exception on attempt {attempt+1}: {e}")
        
        if attempt < max_retries:
            time.sleep(2) # Backoff
            
    return None

def refine_issue_description(raw_text: str) -> str:
    """
    Transforms raw user input into a professional, structured civic report via AI.
    Returns a stringified JSON object containing title, description, and urgency.
    """
    if not raw_text:
        return json.dumps({
            "title": "",
            "description": "",
            "urgency": "Normal",
            "details": "",
            "contact": "Not provided"
        })

    prompt = f"""
    You are an expert municipal reporting consultant. 
    Your task is to transform this raw citizen report into a HIGHLY DETAILED, PROFESSIONAL municipal case study.
    
    INPUT: "{raw_text}"
    
    INSTRUCTIONS:
    1. EXTRACT the core issue.
    2. GENERATE A SPECIFIC TITLE:
       - MUST BE UNIQUE to this specific location and issue.
       - DO NOT use generic prefixes like "Severe Sanitary Hazard" or "Critical Infrastructure Failure".
       - Format: "[Specific Issue] at [Location/Landmark]" (e.g., "Overflowing Dumpster at Market St", "Deep Pothole near School").
    3. EXPAND the description into at least 5-6 FULL SENTENCES. 
       - Explain the visual impact (e.g., "piles of rotting waste", "deep hazardous crater").
       - Explain the public safety risk (e.g., "disease vector", "risk to pedestrians/vehicles").
       - Explain the civic impact (e.g., "blocking right of way", "causing traffic congestion").
    4. IF INPUT IS NOT ENGLISH, TRANSLATE TO FORMAL ENGLISH.
    5. ESTIMATE urgency based on keywords (Fire/Wire/Blood = High).
    
    REQUIRED JSON OUTPUT:
    {{
      "title": "Short Professional Title (e.g., 'Severe Sanitary Hazard: Garbage Accumulation')",
      "description": "5-6 sentences of detailed professional text describing the situation, risks, and location context.",
      "urgency": "High/Medium/Low",
      "details": "Bulleted technical summary (e.g., 'Est. Vol: 50kg', 'Loc: Main Rd')",
      "contact": "Not provided"
    }}
    """
    
    try:
        # Use OpenRouter (DeepSeek)
        ai_text = call_openrouter(prompt)
        
        if not ai_text:
            raise ValueError("Empty response from OpenRouter")

        # Try to find JSON within code blocks first
        code_block_match = re.search(r'```json\s*(\{[\s\S]*?\})\s*```', ai_text)
        if code_block_match:
            json_str = code_block_match.group(1)
        else:
            # Fallback to finding the first { ... } block
            match = re.search(r'\{[\s\S]*\}', ai_text)
            if match:
                json_str = match.group(0)
            else:
                raise ValueError("No JSON found in AI response")

        refined_json = json.loads(json_str)
        # Ensure all required keys exist
        required_keys = ["title", "description", "urgency", "details", "contact"]
        for key in required_keys:
            if key not in refined_json:
                refined_json[key] = "" if key != "contact" else "Not provided"
        
        return json.dumps(refined_json)

    except Exception as e:
        logger.error(f"Refine AI Error (OpenRouter): {e}")
        return json.dumps({
            "title": raw_text[:50].title(),
            "description": raw_text,
            "urgency": "Normal",
            "details": "AI Refinement Failed",
            "contact": "Not provided"
        })

KEYWORDS = [
    "pothole", "road crack", "broken bench", "streetlight", "water leak",
    "garbage", "stagnant water", "power outage", "fire", "crime"
]

def extract_core_issue(description):
    """
    Reduce a description to its key keyword for quick duplicate matching.
    """
    description = description.lower()
    for kw in KEYWORDS:
        if kw in description:
            return kw
    return description  # fallback to full description

def is_duplicate_issue(description, lat, lng, category, user, address=None):
    """
    Checks if a newly submitted issue is a duplicate of an existing open issue.
    First filters by proximity and key terms, then uses a semantic AI check for edge cases.
    """
    from .models import Issue
    from geopy.distance import geodesic
    from django.db.models import Q
    
    try:
        threshold_km = 0.5  # 500 meters
        
        # Search ALL open issues regardless of category to catch misclassified duplicates
        issues = Issue.objects.filter(status='OPEN')
        
        logger.debug(f"Checking duplicates for '{description[:50]}' in category '{category}' among {issues.count()} candidates.")
        
        new_core = extract_core_issue(description)
        
        # Extract key location words from address for broad matching
        address_words = set()
        if address:
            address_words = {w.lower() for w in address.replace(",", " ").replace(".", " ").split() if len(w) > 3}
        
        for issue in issues:
            try:
                # 1. Location Matching (if coordinates exist)
                is_nearby = False
                dist = float('inf')
                if lat is not None and lng is not None and issue.latitude is not None and issue.longitude is not None:
                    dist = geodesic((lat, lng), (issue.latitude, issue.longitude)).km
                    if dist <= threshold_km:
                        is_nearby = True
                
                # 2. Address String Matching (check address, title, AND description)
                address_match = False
                if address_words:
                    # Check against existing issue's address
                    if issue.address:
                        existing_addr_words = {w.lower() for w in issue.address.replace(",", " ").replace(".", " ").split() if len(w) > 3}
                        if address_words & existing_addr_words:
                            address_match = True
                    
                    # Also check address words against issue title (e.g., "Tankbund" in title)
                    if not address_match and issue.title:
                        title_words = {w.lower() for w in issue.title.replace(",", " ").replace(".", " ").split() if len(w) > 3}
                        if address_words & title_words:
                            address_match = True
                
                # 3. Content matching decision
                should_check_semantic = False
                if is_nearby or address_match:
                    should_check_semantic = True
                elif (lat is None or lng is None) and (not address):
                    existing_core = extract_core_issue(issue.description)
                    if new_core == existing_core:
                        should_check_semantic = True
                elif (lat is None or lng is None) and address:
                    existing_core = extract_core_issue(issue.description)
                    if new_core == existing_core:
                        should_check_semantic = True

                if should_check_semantic:
                    logger.debug(f"Candidate issue found (id #{issue.id}): dist={dist}km, addr_match={address_match}")
                    
                    try:
                        # Truncate descriptions to focus on core issue, not verbose AI expansion
                        desc_a = description[:200]
                        desc_b = issue.description[:200]
                        prompt = f"""
                        You are a civic issue duplicate detector.
                        Determine if these two reports are about the SAME TYPE of problem at the SAME LOCATION.
                        
                        Report A: "{desc_a}" (Address: {address or 'Unknown'})
                        Report B: "{desc_b}" (Address: {issue.address or 'Unknown'}, Title: "{issue.title}")
                        
                        RULES:
                        - Focus on the CORE PROBLEM TYPE (e.g., both about "road damage", both about "garbage")
                        - Ignore differences in wording or level of detail
                        - If both reports mention the same area/location AND the same problem type, they are duplicates
                        
                        Respond ONLY with 'YES' or 'NO'.
                        """
                        answer = call_openrouter(prompt)
                        if answer and "YES" in answer.upper():
                            logger.info(f"Duplicate found (semantic) for issue #{issue.id}")
                            return True, issue, "semantic"
                    except Exception as ai_e:
                        logger.error(f"Semantic Check Error: {ai_e}")
                        # Fallback if AI fails: use simple keyword overlap
                        if new_core == extract_core_issue(issue.description):
                             return True, issue, "keyword_fallback"

            except Exception as e:
                logger.error(f"Error checking issue #{issue.id}: {e}")
                continue
                
        return False, None, None
    except Exception as e:
        logger.error(f"Error in is_duplicate_issue: {e}")
        return False, None, None
