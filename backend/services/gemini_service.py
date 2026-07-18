from google import genai
from google.genai import types
import os
import json
from dotenv import load_dotenv
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(env_path)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

SYSTEM_PROMPT = """You are a medical AI assistant for HEALTHBIRCH. Your job is to:
1. Have a natural conversation with the patient about their symptoms.
2. Ask the patient to rate their pain or discomfort on a scale of 1-10.
3. Ask the patient for their city/location if they haven't provided one.
4. After gathering enough information (symptoms, pain rating, and optionally city), assess the situation.

Triage Criteria:
- Rating 1-4 AND non-critical symptom: set severity = "Low", recommendDoctor = false, recommendedSpecialty = null, and provide self-care advice in the message.
- Rating 5-7 OR moderately concerning symptom: set severity = "Medium", recommendDoctor = true, recommendedSpecialty = "<specialization name>", and suggest monitoring, offering the option to see a doctor in the message.
- Rating 8-10 OR critical symptom type (such as chest pain, no periods for extended time, breathing difficulty, severe headache, etc.): set severity = "High", recommendDoctor = true, recommendedSpecialty = "<specialization name>", and immediately recommend seeing a doctor regardless of the rating.

When you have enough information to make a recommendation, respond ONLY with valid JSON in this exact format:
{"message": "<your conversational response>", "recommendation": {"severity": "<Low|Medium|High>", "recommendDoctor": <true|false>, "painRating": <pain rating integer 1-10>, "recommendedSpecialty": "<specialty name or null>", "reasoning": "<short plain-language explanation of why this severity/specialty/recommendation was chosen>", "summary": "<structured summary of reported symptoms for a doctor to review>", "city": "<city name if known, else null>", "disclaimer": "This is an AI-assisted assessment and not a medical diagnosis. The doctor will perform the final assessment."}}

If you need more information (like symptoms, pain rating, or city), respond ONLY with valid JSON without the recommendation field:
{"message": "<your question>", "recommendation": null}

Always respond with valid JSON only. Never add markdown or extra text outside the JSON."""

def get_ai_response(messages: list[dict]) -> dict:
    try:
        if len(messages) == 0:
            return {"message": "Please describe your symptoms so I can help.", "recommendation": None}

        conversation = ""
        for m in messages[:-1]:
            role = "Patient" if m["role"] == "user" else "Assistant"
            conversation += f"{role}: {m['content']}\n"

        last_message = messages[-1]["content"]
        full_prompt = f"{SYSTEM_PROMPT}\n\nConversation so far:\n{conversation}\nPatient: {last_message}\nAssistant:"

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=full_prompt
        )

        def extract_json(text_content):
            raw_text = (text_content or "").strip()
            if raw_text.startswith("```"):
                parts = raw_text.split("```")
                raw_text = parts[1] if len(parts) > 1 else raw_text
                if raw_text.lstrip().startswith("json"):
                    raw_text = raw_text.lstrip()[4:]
            return raw_text.strip()

        raw = extract_json(response.text)

        def post_process(res_dict):
            if res_dict and "recommendation" in res_dict and res_dict["recommendation"]:
                rec = res_dict["recommendation"]
                rec["recommended_specialist"] = rec.get("recommendedSpecialty") or rec.get("recommended_specialist")
                rec["recommendedSpecialty"] = rec.get("recommendedSpecialty") or rec.get("recommended_specialist")
                rec["advice"] = rec.get("reasoning") or rec.get("advice")
                rec["reasoning"] = rec.get("reasoning") or rec.get("advice")
                
                # Default painRating and recommendDoctor if missing
                if "painRating" not in rec:
                    rec["painRating"] = 0
                if "recommendDoctor" not in rec:
                    severity = str(rec.get("severity", "")).lower()
                    rec["recommendDoctor"] = (severity != "low")
            return res_dict

        try:
            return post_process(json.loads(raw))
        except json.JSONDecodeError as jde:
            print(f"JSON Decode Error on first try: {jde} | Raw content: {raw}")
            # Robust Retry logic: prompt the model again explicitly asking for valid JSON
            try:
                retry_response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=f"{full_prompt}\n(Note: Your last response was invalid JSON. Please return STRICT valid JSON only.)"
                )
                retry_raw = extract_json(retry_response.text)
                return post_process(json.loads(retry_raw))
            except Exception as retry_err:
                print(f"Failed on retry: {retry_err}")
                return post_process({
                    "message": "I'm having trouble analyzing your request properly, but I can match you with a general physician to be safe.",
                    "recommendation": {
                        "severity": "Medium",
                        "recommendDoctor": True,
                        "painRating": 5,
                        "reasoning": "AI assessment could not be parsed. Defaulting to standard care.",
                        "summary": last_message,
                        "recommendedSpecialty": "General Physician",
                        "city": None,
                        "disclaimer": "This is an AI-assisted assessment and not a medical diagnosis. The doctor will perform the final assessment.",
                        "ai_parsing_failed": True
                    }
                })

    except Exception as e:
        error_str = str(e).lower()
        print(f"Gemini Service Error: {e}")

        if "quota" in error_str or "limit" in error_str or "429" in error_str:
            return {
                "message": "The medical AI has reached its quota limit. Please try again later.",
                "recommendation": None
            }
        elif "unavailable" in error_str or "503" in error_str:
            return {
                "message": "The medical AI is currently busy. Please try again in a few minutes.",
                "recommendation": None
            }
        else:
            return {
                "message": "Sorry, I am having trouble connecting right now. Please try again.",
                "recommendation": None
            }