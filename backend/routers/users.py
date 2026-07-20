from fastapi import APIRouter, Depends, HTTPException
from routers.auth import require_role, CurrentUser
from services.firebase_service import db
from pydantic import BaseModel, field_validator
from typing import Optional, List, Union

router = APIRouter(prefix="/api/users", tags=["Users"])


def _coerce_to_str(v):
    """Convert list values (from onboarding) to comma-separated strings."""
    if isinstance(v, list):
        return ", ".join(str(i) for i in v if i)
    return v


class HealthProfile(BaseModel):
    age: Optional[str] = None
    gender: Optional[str] = None
    height: Optional[str] = None
    weight: Optional[str] = None
    bloodType: Optional[str] = None
    # These three can arrive as string arrays from onboarding — coerce to str
    medications: Optional[Union[str, List[str]]] = None
    conditions: Optional[Union[str, List[str]]] = None
    allergies: Optional[Union[str, List[str]]] = None
    diet: Optional[str] = None
    exercise: Optional[str] = None
    city: Optional[str] = None

    @field_validator("medications", "conditions", "allergies", mode="before")
    @classmethod
    def coerce_list_to_str(cls, v):
        return _coerce_to_str(v)


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
            # Exclude None values; list fields already coerced to str by validator
            hp = {k: v for k, v in payload.healthProfile.dict().items() if v is not None}
            # Merge into existing healthProfile sub-document (avoid wiping AI summary etc.)
            existing_doc = db.collection("users").document(current_user.uid).get()
            if existing_doc.exists:
                existing_hp = existing_doc.to_dict().get("healthProfile", {}) or {}
                existing_hp.update(hp)
                updates["healthProfile"] = existing_hp
            else:
                updates["healthProfile"] = hp

        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        db.collection("users").document(current_user.uid).update(updates)
        return {"message": "Profile updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
