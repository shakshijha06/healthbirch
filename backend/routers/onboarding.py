from fastapi import APIRouter, Depends, HTTPException
from routers.auth import require_role, CurrentUser
from models.schemas import ChatRequest
from services.firebase_service import db
from services.gemini_service import client
import json

router = APIRouter(prefix="/api/chat/onboarding", tags=["Onboarding"])

SYSTEM_ONBOARDING_PROMPT = """You are conducting a patient onboarding conversational interview for HEALTHBIRCH.
Your task is to obtain the following patient information in sequence, one at a time, conversationally:
1. Full name
2. Age
3. Height and weight (e.g. 175cm, 70kg)
4. Current medications (if any, otherwise "none")
5. Any existing diagnosed medical conditions (otherwise "none")
6. Symptoms or health issues they occasionally experience (e.g. chest pain, anxiety, headaches)
7. City they live in
8. Diet habits (vegetarian, non-vegetarian, vegan, etc.)
9. Exercise frequency (e.g. 3 times a week, sedentary)

Guidelines:
- Review the conversation history. Skip questions if they have already provided the answer in previous messages.
- Ask ONLY ONE question at a time. Do not list multiple questions.
- Maintain a warm, clinical, and helpful tone.
- If all questions are answered or you have collected all required information, respond with complete = true, a detailed brief medical/health summary, a brief personalized advice response based on their profile, and a parsed JSON profile object. Note that Medications, Conditions, and Symptoms must be returned as lists of strings (arrays).
- If not all information is collected yet, set complete = false and message = the next question you need to ask.

Return output strictly as a JSON object matching this schema:
If complete is false:
{
  "complete": false,
  "message": "<next question to ask>"
}

If complete is true:
{
  "complete": true,
  "summary": "<brief medical/health profile summary>",
  "advice": "<brief personalized advice response (e.g. Based on your profile, you should keep an eye on X. I'm here whenever you need health guidance.)>",
  "profile": {
    "name": "<name>",
    "age": "<age>",
    "height": "<height>",
    "weight": "<weight>",
    "medications": ["medication1", ...],
    "conditions": ["condition1", ...],
    "symptoms": ["symptom1", ...],
    "city": "<city>",
    "diet": "<diet>",
    "exercise": "<exercise>"
  }
}

Do not include any formatting other than valid JSON. Return raw JSON text without markdown code blocks.
"""

@router.post("/")
@router.post("")
def onboarding_chat(request: ChatRequest, current_user: CurrentUser = Depends(require_role(["patient"]))):
    try:
        conversation = ""
        for m in request.messages[:-1]:
            role = "Patient" if m.role == "user" else "Assistant"
            conversation += f"{role}: {m.content}\n"

        last_message = request.messages[-1].content
        full_prompt = f"{SYSTEM_ONBOARDING_PROMPT}\n\nConversation so far:\n{conversation}\nPatient: {last_message}\nAssistant:"

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=full_prompt
        )

        raw_text = (response.text or "").strip()
        if raw_text.startswith("```"):
            parts = raw_text.split("```")
            raw_text = parts[1] if len(parts) > 1 else raw_text
            if raw_text.lstrip().startswith("json"):
                raw_text = raw_text.lstrip()[4:]
        raw_text = raw_text.strip()

        data = json.loads(raw_text)
        
        if data.get("complete") is True:
            # Save to Firestore
            profile = data.get("profile", {})
            profile["summary"] = data.get("summary", "")
            
            user_ref = db.collection("users").document(current_user.uid)
            user_ref.update({
                "healthProfile": profile,
                "onboardingComplete": True
            })
            
            # Update display name in Firestore if it was empty
            user_doc = user_ref.get()
            if user_doc.exists:
                current_data = user_doc.to_dict()
                if not current_data.get("name") and profile.get("name"):
                    user_ref.update({"name": profile.get("name")})
                    
        return data

    except Exception as e:
        print(f"Onboarding error: {e}")
        # Return fallback json
        return {
            "complete": False,
            "message": "Sorry, I had a momentary issue. Let's continue — what is your full name?"
        }
