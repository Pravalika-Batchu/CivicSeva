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
    "pothole", "potholes", "road crack", "road damage", "broken road", "crater",
    "broken bench", "streetlight", "street light", "lamp post", "water leak", 
    "water leakage", "pipeline burst", "pipe leak", "garbage", "trash", "waste", 
    "dump", "rubbish", "stagnant water", "waterlogging", "sewage", "drain", 
    "drainage", "blocked drain", "power outage", "electric wire", "hanging wire", 
    "fire", "crime", "manhole", "open manhole", "footpath", "signal", "traffic light", 
    "debris", "dead animal", "carcass", "tree fallen"
]

def extract_core_issue(text):
    """
    Reduce a description or title to its key keyword for quick duplicate matching.
    """
    if not text:
        return ""
    text_lower = text.lower()
    for kw in KEYWORDS:
        if kw in text_lower:
            return kw
    return text_lower[:60]


def is_duplicate_issue(description, lat, lng, category, user, address=None, title=None):
    """
    Checks if a newly submitted issue is a duplicate of an existing unresolved issue.
    Uses multi-signal matching:
      1. Active status check (checks OPEN, ASSIGNED, IN_PROGRESS, etc., excluding RESOLVED/CLOSED)
      2. GPS Proximity (geodesic distance <= 500m)
      3. Address & locality token matching / normalized fuzzy similarity
      4. Title & problem type semantic/string similarity
      5. LLM Semantic Verification with guaranteed heuristic fallback
    """
    from .models import Issue
    from geopy.distance import geodesic
    import difflib

    try:
        threshold_km = 0.5  # 500 meters

        # Search ALL unresolved active issues (OPEN, ASSIGNED, IN_PROGRESS, PENDING_APPROVAL, etc.)
        issues = Issue.objects.exclude(status__in=['RESOLVED', 'CLOSED']).order_by('-created_at')

        logger.debug(f"Checking duplicates for '{title or description[:50]}' across {issues.count()} active issues.")

        new_title = (title or "").strip()
        new_desc = (description or "").strip()
        new_addr = (address or "").strip()

        new_core = extract_core_issue(f"{new_title} {new_desc}")

        # Normalize address and build tokens
        def clean_str(s):
            return re.sub(r'[^a-z0-9]', '', (s or "").lower())

        def get_tokens(s):
            if not s:
                return set()
            cleaned = re.sub(r'[^a-zA-Z0-9\s]', ' ', s.lower())
            return {w for w in cleaned.split() if len(w) >= 2}

        new_addr_tokens = get_tokens(new_addr)
        new_title_tokens = get_tokens(new_title)
        new_location_tokens = new_addr_tokens | {w for w in new_title_tokens if w not in {"large", "small", "severe", "broken", "road", "near", "issue", "problem", "hazard"}}

        new_addr_clean = clean_str(new_addr)
        new_title_lower = new_title.lower()

        for issue in issues:
            try:
                # 1. GPS Proximity
                is_nearby = False
                dist = float('inf')
                if lat is not None and lng is not None and issue.latitude is not None and issue.longitude is not None:
                    try:
                        dist = geodesic((lat, lng), (issue.latitude, issue.longitude)).km
                        if dist <= threshold_km:
                            is_nearby = True
                    except Exception as geo_e:
                        logger.warning(f"Geodesic calc error for issue #{issue.id}: {geo_e}")

                # 2. Address & Locality Matching
                existing_addr = (issue.address or "").strip()
                existing_title = (issue.title or "").strip()
                existing_desc = (issue.description or "").strip()

                existing_addr_tokens = get_tokens(existing_addr)
                existing_title_tokens = get_tokens(existing_title)
                existing_addr_clean = clean_str(existing_addr)

                address_matched = False

                # Exact or substring clean address match (e.g. "nagoleroadno1" == "nagoleroadno1")
                if new_addr_clean and existing_addr_clean:
                    if new_addr_clean == existing_addr_clean or new_addr_clean in existing_addr_clean or existing_addr_clean in new_addr_clean:
                        address_matched = True
                    elif difflib.SequenceMatcher(None, new_addr_clean, existing_addr_clean).ratio() >= 0.70:
                        address_matched = True

                # Token intersection (e.g., both contain "nagole", "road", "1")
                shared_addr_tokens = (new_addr_tokens & existing_addr_tokens) | (new_location_tokens & (existing_addr_tokens | existing_title_tokens))
                # Meaningful locality tokens (excluding generic terms)
                meaningful_shared = {t for t in shared_addr_tokens if t not in {"road", "street", "near", "opposite", "lane", "area", "zone", "city", "main"}}
                if len(meaningful_shared) >= 1 or len(shared_addr_tokens) >= 2:
                    address_matched = True

                # Check if new address words appear in candidate title or description
                if not address_matched and new_addr_tokens:
                    for token in new_addr_tokens:
                        if len(token) >= 4 and (token in existing_title.lower() or token in existing_desc.lower()):
                            address_matched = True
                            break

                # 3. Problem Similarity
                existing_core = extract_core_issue(f"{existing_title} {existing_desc}")
                same_problem_core = (new_core and existing_core and (new_core in existing_core or existing_core in new_core))
                
                title_similarity = 0.0
                if new_title and existing_title:
                    title_similarity = difflib.SequenceMatcher(None, new_title.lower(), existing_title.lower()).ratio()

                desc_similarity = 0.0
                if new_desc and existing_desc:
                    desc_similarity = difflib.SequenceMatcher(None, new_desc[:250].lower(), existing_desc[:250].lower()).ratio()

                # --- 4. HIGH CONFIDENCE DETERMINISTIC MATCH ---
                # Case A: Title is highly similar (>75%) and location matches or has shared locality
                if title_similarity >= 0.75 and (address_matched or is_nearby or len(meaningful_shared) >= 1):
                    logger.info(f"Duplicate confirmed (Deterministic Title+Loc) for issue #{issue.id} (Title Sim: {title_similarity:.2f})")
                    return True, issue, "deterministic_title"

                # Case B: Verified location (GPS nearby or address match) + same core problem
                if (is_nearby or address_matched) and (same_problem_core or title_similarity >= 0.65 or desc_similarity >= 0.60):
                    logger.info(f"Duplicate confirmed (Deterministic Loc+Core) for issue #{issue.id} (dist={dist}km, core={new_core})")
                    return True, issue, "deterministic_location_core"

                # Case C: High title similarity alone (>85%) regardless of address syntax differences
                if title_similarity >= 0.85:
                    logger.info(f"Duplicate confirmed (High Title Similarity {title_similarity:.2f}) for issue #{issue.id}")
                    return True, issue, "deterministic_high_title"

                # --- 5. SEMANTIC AI CHECK ---
                should_check_semantic = False
                if is_nearby or address_matched or same_problem_core or title_similarity >= 0.50 or desc_similarity >= 0.50:
                    should_check_semantic = True
                elif not new_addr and not existing_addr and same_problem_core:
                    should_check_semantic = True

                if should_check_semantic:
                    logger.debug(f"Candidate issue found (id #{issue.id}): dist={dist}km, addr_match={address_matched}, title_sim={title_similarity:.2f}")
                    
                    try:
                        desc_a = f"{new_title}. {new_desc[:200]}"
                        desc_b = f"{existing_title}. {existing_desc[:200]}"
                        prompt = f"""
                        You are a civic issue duplicate detector.
                        Determine if these two reports are about the SAME CIVIC PROBLEM at the SAME LOCATION.
                        
                        Report A: "{desc_a}" (Address: {new_addr or 'Not provided'})
                        Report B: "{desc_b}" (Address: {existing_addr or 'Not provided'})
                        
                        RULES:
                        - Focus on the core problem type (e.g. pothole, garbage dump, streetlight, water leak)
                        - Ignore differences in phrasing, report author, or level of detail
                        - If both reports describe the same issue in the same area/locality/street, they ARE duplicates
                        
                        Respond ONLY with 'YES' or 'NO'.
                        """
                        answer = call_openrouter(prompt)
                        if answer and "YES" in answer.upper():
                            logger.info(f"Duplicate confirmed (Semantic AI) for issue #{issue.id}")
                            return True, issue, "semantic_ai"
                        elif answer and "NO" in answer.upper():
                            # AI decided distinct issue
                            pass
                        else:
                            # AI call returned None or timed out -> use robust heuristic fallback
                            if (is_nearby or address_matched) and (same_problem_core or title_similarity >= 0.55 or desc_similarity >= 0.50):
                                logger.info(f"Duplicate confirmed (Heuristic Fallback) for issue #{issue.id}")
                                return True, issue, "heuristic_fallback"
                    except Exception as ai_e:
                        logger.error(f"Semantic Check Error: {ai_e}")
                        if (is_nearby or address_matched) and (same_problem_core or title_similarity >= 0.55):
                            return True, issue, "keyword_fallback"

            except Exception as e:
                logger.error(f"Error checking candidate issue #{issue.id}: {e}")
                continue

        return False, None, None
    except Exception as e:
        logger.error(f"Error in is_duplicate_issue: {e}")
        return False, None, None
