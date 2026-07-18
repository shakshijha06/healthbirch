import asyncio
from services.gemini_service import get_ai_response

def test_triage():
    messages = [
        {"role": "model", "content": "Hi! I'm HEALTHBIRCH AI—describe your symptoms and I’ll help you find the right specialist."},
        {"role": "user", "content": "I have been having chronic chest pain for 3 days and I live in Seattle."}
    ]
    response = get_ai_response(messages)
    print("\n--- GEMINI RESPONSE ---")
    print(response)
    print("-----------------------\n")
    if response.get("recommendation") and response["recommendation"].get("ai_parsing_failed"):
        print("RESULT: FALLBACK PATH TAKEN.")
    else:
        print("RESULT: PARSING SUCCEEDED END-TO-END.")

if __name__ == "__main__":
    test_triage()
