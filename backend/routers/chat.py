from fastapi import APIRouter, Depends, HTTPException
from routers.auth import require_role, CurrentUser
from models.schemas import ChatRequest
from services.gemini_service import get_ai_response
from services.firebase_service import db
from firebase_admin import firestore
import datetime

router = APIRouter(prefix="/api/chat", tags=["Chat"])


def _val(v, fallback="Not specified"):
    """Return v as a string if set, else the fallback label."""
    if v is None:
        return fallback
    if isinstance(v, list):
        joined = ", ".join(str(i) for i in v if i)
        return joined if joined else fallback
    s = str(v).strip()
    return s if s else fallback


def build_system_prompt(hp: dict, city: str) -> str:
    """Construct the rich HEALTHBIRCH system prompt with patient profile context."""
    age        = _val(hp.get("age"))
    gender     = _val(hp.get("gender"))
    height     = _val(hp.get("height"))
    weight     = _val(hp.get("weight"))
    blood_type = _val(hp.get("bloodType"))
    medications= _val(hp.get("medications"), "None reported")
    conditions = _val(hp.get("conditions"),  "None reported")
    allergies  = _val(hp.get("allergies"),   "None reported")
    diet       = _val(hp.get("diet"))
    exercise   = _val(hp.get("exercise"))
    city_str   = _val(hp.get("city") or city)

    return f"""You are HEALTHBIRCH AI Health Assistant, a professional medical triage assistant.

PATIENT HEALTH PROFILE (saved by the patient in their HEALTHBIRCH account):
- Age: {age}
- Gender: {gender}
- Height: {height}
- Weight: {weight}
- Blood Type: {blood_type}
- City: {city_str}
- Current Medications: {medications}
- Existing Conditions: {conditions}
- Allergies: {allergies}
- Diet: {diet}
- Exercise: {exercise}

Use this profile as background context for this consultation. Do not assume it is fully up to date — at the start of the conversation, acknowledge you have access to their saved profile and invite them to mention any recent changes.

CONSULTATION RULES:
1. Never recommend a doctor immediately. Always gather enough information first through follow-up questions.
2. Always ask the patient to rate their pain/discomfort on a scale of 1-10.
3. Ask relevant follow-up questions based on the symptom type (location, duration, severity, associated symptoms).
4. Only after gathering enough information, classify severity:
   - 1-4 + non-critical symptom → provide self-care advice, no doctor recommendation
   - 5-7 OR moderately concerning symptom → recommend monitoring, offer option to see a doctor
   - 8-10 OR critical symptom (chest pain, difficulty breathing, sudden weakness, vision changes, uncontrolled bleeding, loss of consciousness) → immediately advise emergency care or doctor regardless of rating
5. When recommending a doctor, always specify the exact specialty AND mention doctors available in the patient's saved city ({city_str}). Say: "Based on your profile, I can help you find a [specialty] in {city_str}."
6. End every completed consultation with a structured summary card containing: Possible Concern, Urgency level, Recommended Specialist, Reasoning, Home Care steps (if applicable), and Emergency Warning Signs.
7. Be transparent about what information you are using: "I'm using your saved HEALTHBIRCH health profile as context for this conversation."
8. Never claim to remember previous conversations — you only have access to the saved profile data and the current conversation.
9. If the profile fields are empty or missing, do not mention them — just work with what's available.

Triage Criteria:
- Rating 1-4 AND non-critical symptom: set severity = "Low", recommendDoctor = false, recommendedSpecialty = null, and provide self-care advice in the message.
- Rating 5-7 OR moderately concerning symptom: set severity = "Medium", recommendDoctor = true, recommendedSpecialty = "<speciation name>", and suggest monitoring, offering the option to see a doctor in the message.
- Rating 8-10 OR critical symptom type (such as chest pain, no periods for extended time, breathing difficulty, severe headache, etc.): set severity = "High", recommendDoctor = true, recommendedSpecialty = "<speciation name>", and immediately recommend seeing a doctor regardless of the rating.

When you have enough information to make a recommendation, respond ONLY with valid JSON in this exact format:
{{"message": "<your conversational response>", "recommendation": {{"severity": "<Low|Medium|High>", "recommendDoctor": <true|false>, "painRating": <pain rating integer 1-10>, "recommendedSpecialty": "<specialty name or null>","reasoning": "<A clear explanation in 2-3 sentences of why this severity level and specialty was chosen, written so the patient can understand it.>",  "summary": "<A detailed pre-consultation brief of at least 100 words for the doctor. Include: (1) all symptoms the patient reported with duration and severity, (2) the pain rating they gave, (3) any relevant medical history from their profile such as existing conditions, current medications, allergies, (4) what the patient is most concerned about, (5) any red flags or urgent observations noted during the conversation, (6) suggested areas for the doctor to focus on during consultation. Write this as a proper clinical handoff note, not a one-liner.>", "city": "<city name if known, else null>", "disclaimer": "This is an AI-assisted assessment and not a medical diagnosis. The doctor will perform the final assessment."}}}}

If you need more information (like symptoms, pain rating, or city), respond ONLY with valid JSON without the recommendation field:
{{"message": "<your question>", "recommendation": null}}

Always respond with valid JSON only. Never add markdown or extra text outside the JSON."""


def build_opening_message(hp: dict) -> str:
    """Generate the dynamic welcome message based on whether the profile has data."""
    has_data = any(
        hp.get(f) for f in ["age", "gender", "height", "weight", "bloodType",
                             "city", "medications", "conditions", "allergies"]
    )
    if has_data:
        return (
            "Hello! I'm your HEALTHBIRCH AI Health Assistant. I have access to your saved health profile "
            "and will use it to provide more personalized guidance today. If any of your medications, "
            "conditions, or health details have changed recently, please let me know before we begin. "
            "What symptoms or health concerns are you experiencing today?"
        )
    return (
        "Hello! I'm your HEALTHBIRCH AI Health Assistant. I notice your health profile hasn't been fully "
        "filled out yet — you can update it in Settings for more personalized guidance. For now, tell me "
        "what symptoms you're experiencing and I'll ask a few follow-up questions."
    )


@router.get("/opening-message")
def get_opening_message(current_user: CurrentUser = Depends(require_role(["patient"]))):
    """Return a dynamic opening message based on the patient's saved health profile."""
    try:
        doc = db.collection("users").document(current_user.uid).get()
        hp = {}
        if doc.exists:
            data = doc.to_dict()
            hp = data.get("healthProfile") or {}
        return {"message": build_opening_message(hp), "recommendation": None}
    except Exception as e:
        return {"message": "Hello! I'm your HEALTHBIRCH AI Health Assistant. What symptoms are you experiencing today?", "recommendation": None}


@router.post("/")
@router.post("")
def chat_with_ai(request: ChatRequest, current_user: CurrentUser = Depends(require_role(["patient"]))):
    try:
        # ── Load patient health profile from Firestore ──────────────────────
        hp = {}
        city = ""
        try:
            doc = db.collection("users").document(current_user.uid).get()
            if doc.exists:
                data = doc.to_dict()
                hp   = data.get("healthProfile") or {}
                city = hp.get("city") or data.get("city") or ""
        except Exception as profile_err:
            print(f"[Chat] Could not load health profile: {profile_err}")

        # ── Build context-aware system prompt ───────────────────────────────
        system_prompt = build_system_prompt(hp, city)

        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        response = get_ai_response(messages, system_prompt=system_prompt)

        if not response:
            print("Chat Error: AI response failed to parse.")
            raise HTTPException(status_code=500, detail="AI response failed to parse.")

        if response.get("recommendation"):
            rec = response["recommendation"]
            new_history_item = {
                "id": f"h_{int(datetime.datetime.now().timestamp())}",
                "symptoms": rec.get("summary", ""),
                "painRating": rec.get("painRating", 0),
                "aiRecommendation": response.get("message", ""),
                "specialty": rec.get("recommendedSpecialty", ""),
                "severity": rec.get("severity", ""),
                "recommendDoctor": rec.get("recommendDoctor", True),
                "date": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "city": rec.get("city")
            }
            user_ref = db.collection("users").document(current_user.uid)
            user_ref.update({
                "medicalHistory": firestore.ArrayUnion([new_history_item])
            })

        return response
    except HTTPException as he:
        print(f"Chat HTTP Exception: {he.detail}")
        raise
    except Exception as e:
        print(f"Chat Unexpected Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
