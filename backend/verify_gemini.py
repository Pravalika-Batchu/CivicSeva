
import os
import sys
import google.generativeai as genai
from django.conf import settings

# Setup Django environment
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

api_key = settings.GEMINI_API_KEY
print(f"Using API Key: {api_key[:5]}...{api_key[-5:]}")

# Safety settings to prevent blocking of civic issues
safety_settings = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
]

def test_gemini(transport=None):
    print(f"\nTesting with transport={transport}...")
    try:
        if transport:
            genai.configure(api_key=api_key, transport=transport)
        else:
            genai.configure(api_key=api_key)
            
        model = genai.GenerativeModel("gemini-2.0-flash", safety_settings=safety_settings)
        # Test with a prompt that might trigger safety filters in strict mode
        prompt = "There is a huge pile of garbage and dead animals effectively blocking the road causing traffic accidents."
        print(f"Prompt: {prompt}")
        response = model.generate_content(prompt)
        print(f"Success! Response: {response.text[:100]}...")
        return True
    except Exception as e:
        print(f"Failed with transport={transport}: {e}")
        return False

if __name__ == "__main__":
    test_gemini()
