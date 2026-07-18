from fastapi import APIRouter, Depends, HTTPException
from routers.auth import require_role, CurrentUser
from services.firebase_service import db
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(prefix="/api/users", tags=["Users"])


class HealthProfile(BaseModel):
    age: Optional[str] = None
    gender: Optional[str] = None
    height: Optional[str] = None
    weight: Optional[str] = None
    bloodType: Optional[str] = None
    medications: Optional[str] = None
    conditions: Optional[str] = None
    allergies: Optional[str] = None
    diet: Optional[str] = None
    exercise: Optional[str] = None
    city: Optional[str] = None


class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    healthProfile: Optional[HealthProfile] = None


@router.get("/profile")
def get_profile(current_user: CurrentUser = Depends(require_role(["patient"]))):
    """Return the current patient's Firestore profile."""
    try:
        doc = db.collection("users").document(current_user.uid).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="User not found")
        data = doc.to_dict()
        # Strip sensitive/unnecessary fields
        data.pop("password", None)
        data["uid"] = current_user.uid
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/profile")
def update_profile(
    payload: UserProfileUpdate,
    current_user: CurrentUser = Depends(require_role(["patient"]))
):
    """Update name and/or healthProfile for the current patient."""
    try:
        updates = {}
        if payload.name is not None:
            updates["name"] = payload.name
        if payload.healthProfile is not None:
            # Merge healthProfile fields (exclude None values)
            hp = {k: v for k, v in payload.healthProfile.dict().items() if v is not None}
            updates["healthProfile"] = hp

        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        db.collection("users").document(current_user.uid).update(updates)
        return {"message": "Profile updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
