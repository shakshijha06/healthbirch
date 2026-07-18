from fastapi import APIRouter, Depends, HTTPException
from routers.auth import require_role, CurrentUser
from models.schemas import ChatRequest
from services.gemini_service import get_ai_response
from services.firebase_service import db
from firebase_admin import firestore
import datetime

router = APIRouter(prefix="/api/chat", tags=["Chat"])

@router.post("/")
@router.post("")
def chat_with_ai(request: ChatRequest, current_user: CurrentUser = Depends(require_role(["patient"]))):
    try:
        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        response = get_ai_response(messages)
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
