from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from routers.auth import require_role, CurrentUser
from models.schemas import DoctorCreate, DoctorStatusUpdate
from services.firebase_service import auth, db
from firebase_admin import firestore
from google.cloud.firestore_v1 import FieldFilter
import datetime

router = APIRouter(prefix="/api/admin", tags=["Admin"])

@router.get("/doctors")
def get_all_doctors(current_user: CurrentUser = Depends(require_role(["admin"]))):
    try:
        query = db.collection("users").where(filter=FieldFilter("role", "==", "doctor"))
        docs = query.stream()
        return [{**doc.to_dict(), "id": doc.id} for doc in docs]
    except Exception as e:
        print(f"Admin Get Doctors Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-doctor")
def create_doctor(doctor_data: DoctorCreate, current_user: CurrentUser = Depends(require_role(["admin"]))):
    try:
        # Check if user already exists in Auth to provide better error
        try:
            auth.get_user_by_email(doctor_data.email)
            raise HTTPException(status_code=400, detail="A user with this email already exists.")
        except auth.UserNotFoundError:
            pass

        user_record = auth.create_user(
            email=doctor_data.email,
            password=doctor_data.password,
            display_name=doctor_data.name
        )
        
        doc_ref = db.collection("users").document(user_record.uid)
        doctor_doc = {
            "uid": user_record.uid,
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
            "experience": doctor_data.experience or "0 Years",
            "availableDays": doctor_data.availableDays or ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            "availableSlots": doctor_data.availableSlots or ["09:00 AM", "10:30 AM", "01:00 PM", "03:00 PM"],
            "rating": float(doctor_data.rating or 5.0),
            "reviews_count": 0,
            "status": "approved",
            "createdAt": firestore.SERVER_TIMESTAMP,
            "bio": ""
        }
        doc_ref.set(doctor_doc)
        
        return {"message": "Doctor created and verified successfully", "uid": user_record.uid}

        
    except Exception as e:
        print(f"Admin Create Doctor Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create doctor: {str(e)}"
        )

@router.delete("/delete-doctor/{doctor_id}")
def delete_doctor(doctor_id: str, current_user: CurrentUser = Depends(require_role(["admin"]))):
    try:
        doc_ref = db.collection("users").document(doctor_id)
        doc = doc_ref.get()
        
        if not doc.exists or doc.to_dict().get("role") != "doctor":
            raise HTTPException(status_code=404, detail="Doctor not found")
            
        doc_ref.delete()
        auth.delete_user(doctor_id)
        return {"message": "Doctor deleted successfully"}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Admin Delete Doctor Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete doctor: {str(e)}"
        )

@router.patch("/{doctor_id}/status")
def update_doctor_status(
    doctor_id: str, 
    status_update: DoctorStatusUpdate, 
    current_user: CurrentUser = Depends(require_role(["admin"]))
):
    try:
        doc_ref = db.collection("users").document(doctor_id)
        doc = doc_ref.get()
        
        if not doc.exists or doc.to_dict().get("role") != "doctor":
            raise HTTPException(status_code=404, detail="Doctor not found")
            
        doc_ref.update({
            "status": status_update.status
        })
        return {"message": f"Doctor status updated to {status_update.status}"}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Admin Update Doctor Status Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
