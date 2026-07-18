from fastapi import APIRouter, Depends, Query, HTTPException
from typing import List, Optional
from routers.auth import get_current_user, require_role, CurrentUser
from services.firebase_service import db
from google.cloud.firestore_v1 import FieldFilter
from models.schemas import ReviewCreate, ReviewResponse
import datetime

router = APIRouter(prefix="/api/doctors", tags=["Doctors"])

@router.get("/")
def get_doctors(
    country: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    specialization: Optional[str] = Query(None),
    current_user: CurrentUser = Depends(get_current_user)
):
    try:
        query = db.collection("users").where(filter=FieldFilter("role", "==", "doctor")).where(filter=FieldFilter("status", "==", "approved"))
        
        if country:
            query = query.where(filter=FieldFilter("country", "==", country))
        if state:
            query = query.where(filter=FieldFilter("state", "==", state))
        if city:
            query = query.where(filter=FieldFilter("city", "==", city))
        if specialization:
            query = query.where(filter=FieldFilter("specialization", "==", specialization))
            
        docs = query.stream()
        doctors = []
        for doc in docs:
            doctor_data = doc.to_dict()
            doctor_data['id'] = doc.id
            doctors.append(doctor_data)
        return doctors
    except Exception as e:
        print(f"Fetch Doctors Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{doctor_id}/reviews")
def add_review(
    doctor_id: str,
    review_data: ReviewCreate,
    current_user: CurrentUser = Depends(require_role(["patient"]))
):
    try:
        doc_ref = db.collection("users").document(doctor_id)
        doc = doc_ref.get()
        if not doc.exists or doc.to_dict().get("role") != "doctor":
            raise HTTPException(status_code=404, detail="Doctor not found")
        
        review = {
            "doctor_id": doctor_id,
            "patient_id": current_user.uid,
            "patient_name": current_user.email.split('@')[0],
            "rating": review_data.rating,
            "comment": review_data.comment,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        
        db.collection("reviews").add(review)
        
        doctor_data = doc.to_dict()
        current_rating = doctor_data.get("rating", 0)
        reviews_count = doctor_data.get("reviews_count", 0)
        
        new_count = reviews_count + 1
        new_rating = ((current_rating * reviews_count) + review_data.rating) / new_count
        
        doc_ref.update({
            "rating": new_rating,
            "reviews_count": new_count
        })
        return {"message": "Review added successfully"}
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Add Review Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{doctor_id}/reviews", response_model=List[ReviewResponse])
def get_reviews(
    doctor_id: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    try:
        query = db.collection("reviews").where(filter=FieldFilter("doctor_id", "==", doctor_id))
        docs = query.stream()
        
        reviews = []
        for doc in docs:
            data = doc.to_dict()
            reviews.append(ReviewResponse(
                id=doc.id,
                patient_id=data["patient_id"],
                patient_name=data.get("patient_name", "Anonymous"),
                rating=data["rating"],
                comment=data["comment"],
                timestamp=data["timestamp"]
            ))
        return reviews
    except Exception as e:
        print(f"Get Reviews Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────
# Doctor self-edit ("my profile")
# ──────────────────────────────────────────
from pydantic import BaseModel
from typing import Optional

class DoctorSelfUpdate(BaseModel):
    phone: Optional[str] = None
    clinic_name: Optional[str] = None
    clinic_address: Optional[str] = None
    experience: Optional[str] = None
    availableDays: Optional[List[str]] = None
    availableSlots: Optional[List[str]] = None


@router.get("/me")
def get_my_profile(current_user: CurrentUser = Depends(require_role(["doctor"]))):
    """Return the calling doctor's profile from Firestore."""
    doc = db.collection("users").document(current_user.uid).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    data = doc.to_dict()
    data.pop("password", None)
    data["id"] = current_user.uid
    return data


@router.put("/me")
def update_my_profile(
    payload: DoctorSelfUpdate,
    current_user: CurrentUser = Depends(require_role(["doctor"]))
):
    """Allow a doctor to update their own practice details."""
    updates = {k: v for k, v in payload.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    db.collection("users").document(current_user.uid).update(updates)
    return {"message": "Profile updated successfully"}


# ──────────────────────────────────────────
# Admin edit/delete a doctor
# ──────────────────────────────────────────
class AdminDoctorUpdate(BaseModel):
    name: Optional[str] = None
    specialization: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    clinic_name: Optional[str] = None
    clinic_address: Optional[str] = None
    experience: Optional[str] = None
    status: Optional[str] = None
    availableDays: Optional[List[str]] = None
    availableSlots: Optional[List[str]] = None


@router.put("/{doctor_id}")
def admin_update_doctor(
    doctor_id: str,
    payload: AdminDoctorUpdate,
    current_user: CurrentUser = Depends(require_role(["admin"]))
):
    """Admin: edit a doctor's details."""
    doc_ref = db.collection("users").document(doctor_id)
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Doctor not found")
    updates = {k: v for k, v in payload.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    doc_ref.update(updates)
    return {"message": "Doctor updated successfully"}


@router.delete("/{doctor_id}")
def admin_delete_doctor(
    doctor_id: str,
    current_user: CurrentUser = Depends(require_role(["admin"]))
):
    """Admin: delete a doctor account."""
    doc_ref = db.collection("users").document(doctor_id)
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Doctor not found")
    doc_ref.delete()
    return {"message": "Doctor deleted successfully"}
