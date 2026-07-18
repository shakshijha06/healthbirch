from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from routers import admin, doctors, appointments, chat, auth_routes, onboarding, users
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

app = FastAPI(title="AI Doctor Appointment Booking System")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(admin.router)
app.include_router(doctors.router)
app.include_router(appointments.router)
app.include_router(chat.router)
app.include_router(onboarding.router)
app.include_router(users.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the HEALTHBIRCH API"}
