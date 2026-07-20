from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from services.firebase_service import auth, db
from firebase_admin import firestore
from models.schemas import DoctorCreate
from routers.auth import require_role

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post("/register/doctor")
def register_doctor(doctor_data: DoctorCreate, current_user: dict = Depends(require_role(["admin"]))):
    """Admin-only: Register a new doctor account. Requires admin role."""
    try:
        user_record = auth.create_user(
            email=doctor_data.email,
            password=doctor_data.password,
            display_name=doctor_data.name
        )
        
        doc_ref = db.collection("users").document(user_record.uid)
        doc_ref.set({
            "name": doctor_data.name,
            "email": doctor_data.email,
            "role": "doctor",
            "specialization": doctor_data.specialization,
            "city": doctor_data.city,
            "state": doctor_data.state,
            "country": doctor_data.country,
            "phone": doctor_data.phone,
            "clinic_name": doctor_data.clinic_name,
            "clinic_address": doctor_data.clinic_address,
            "experience": doctor_data.experience,
            "availableDays": doctor_data.availableDays,
            "availableSlots": doctor_data.availableSlots,
            "rating": doctor_data.rating,
            "reviews_count": 0,
            "status": "pending",
            "createdAt": firestore.SERVER_TIMESTAMP,
            "bio": ""
        })
        
        return {"message": "Doctor registered successfully", "uid": user_record.uid}
        
    except Exception as e:
        print(f"Doctor Registration Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to register doctor: {str(e)}"
        )
