from pydantic import BaseModel
from typing import List, Optional

class DoctorCreate(BaseModel):
    name: str
    email: str
    password: str
    specialization: str
    city: str
    state: str
    country: str
    phone: str
    clinic_name: str
    clinic_address: str
    experience: str = "0 Years"
    availableDays: List[str] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    availableSlots: List[str] = ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM"]
    rating: float = 0.0

class ReviewCreate(BaseModel):
    rating: int
    comment: str

class ReviewResponse(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    rating: int
    comment: str
    timestamp: str

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

class AppointmentCreate(BaseModel):
    doctorId: str
    date: str
    timeSlot: str
    symptoms: str
    aiSummary: str
    aiReasoning: str
    aiSeverity: str
    severity: str
    specialization: str

class AppointmentSeverityOverride(BaseModel):
    severity: str

class AppointmentStatusUpdate(BaseModel):
    status: str

class DoctorStatusUpdate(BaseModel):
    status: str
