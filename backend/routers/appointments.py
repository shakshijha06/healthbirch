from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from routers.auth import require_role, get_current_user, CurrentUser
from models.schemas import AppointmentCreate, AppointmentStatusUpdate
from services.firebase_service import db
from firebase_admin import firestore
from google.cloud.firestore_v1 import FieldFilter
import datetime

router = APIRouter(prefix="/api/appointments", tags=["Appointments"])

@router.post("/")
def create_appointment(appointment: AppointmentCreate, current_user: CurrentUser = Depends(require_role(["patient"]))):
    try:
        doctor_doc = db.collection("users").document(appointment.doctorId).get()
        if not doctor_doc.exists or doctor_doc.to_dict().get("role") != "doctor":
            raise HTTPException(status_code=400, detail="Doctor not found")
        doctor_data = doctor_doc.to_dict()
        
        existing = db.collection("appointments") \
            .where(filter=FieldFilter("doctorId", "==", appointment.doctorId)) \
            .where(filter=FieldFilter("date", "==", appointment.date)) \
            .where(filter=FieldFilter("timeSlot", "==", appointment.timeSlot)) \
            .where(filter=FieldFilter("status", "==", "confirmed")).stream()
            
        if len(list(existing)) > 0:
            raise HTTPException(status_code=409, detail="Time slot is already booked")
            
        _, doc_ref = db.collection("appointments").add({
            "patientId": current_user.uid,
            "patientName": current_user.email.split('@')[0],
            "patientCity": "Unknown",
            "doctorId": appointment.doctorId,
            "doctorName": doctor_data.get("name"),
            "specialization": appointment.specialization,
            "city": doctor_data.get("city"),
            "date": appointment.date,
            "timeSlot": appointment.timeSlot,
            "symptoms": appointment.symptoms,
            "aiSummary": appointment.aiSummary,
            "aiReasoning": appointment.aiReasoning,
            "aiSeverity": appointment.aiSeverity,
            "severity": appointment.severity,
            "status": "pending",
            "createdAt": firestore.SERVER_TIMESTAMP
        })
        
        return {"message": "Appointment booked successfully", "id": doc_ref.id}
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Create Appointment Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/patient")
def get_patient_appointments(current_user: CurrentUser = Depends(require_role(["patient"]))):
    try:
        docs = db.collection("appointments").where(filter=FieldFilter("patientId", "==", current_user.uid)).stream()
        return [{"id": doc.id, **doc.to_dict()} for doc in docs]
    except Exception as e:
        print(f"Get Patient Appointments Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/doctor")
def get_doctor_appointments(current_user: CurrentUser = Depends(require_role(["doctor"]))):
    try:
        docs = db.collection("appointments").where(filter=FieldFilter("doctorId", "==", current_user.uid)).stream()
        return [{"id": doc.id, **doc.to_dict()} for doc in docs]
    except Exception as e:
        print(f"Get Doctor Appointments Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{appointment_id}/status")
def update_appointment_status(
    appointment_id: str, 
    update: AppointmentStatusUpdate, 
    current_user: CurrentUser = Depends(get_current_user)
):
    try:
        doc_ref = db.collection("appointments").document(appointment_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Appointment not found")
            
        data = doc.to_dict()
        
        if current_user.role == "patient" and data.get("patientId") != current_user.uid:
            raise HTTPException(status_code=403, detail="Not your appointment")
        if current_user.role == "doctor" and data.get("doctorId") != current_user.uid:
            raise HTTPException(status_code=403, detail="Not your appointment")
            
        if current_user.role == "patient":
            if update.status != "cancelled" or data.get("status") != "pending":
                raise HTTPException(status_code=400, detail="Patients can only cancel pending appointments")
                
        doc_ref.update({"status": update.status})
        return {"message": "Appointment status updated"}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Update Appointment Status Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{appointment_id}/severity")
def override_appointment_severity(
    appointment_id: str, 
    update: dict, 
    current_user: CurrentUser = Depends(require_role(["doctor"]))
):
    try:
        doc_ref = db.collection("appointments").document(appointment_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Appointment not found")
        data = doc.to_dict()
        if data.get("doctorId") != current_user.uid:
            raise HTTPException(status_code=403, detail="Not your appointment")
            
        new_severity = update.get("severity")
        if not new_severity:
            raise HTTPException(status_code=400, detail="Severity field required")
            
        doc_ref.update({"severity": new_severity})
        return {"message": "Appointment severity updated"}
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Update Appointment Severity Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
