import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from services.firebase_service import app, db
from firebase_admin import auth

try:
    user = auth.create_user(email='admin@medpro.in', password='password123', display_name='System Admin')
    db.collection('users').document(user.uid).set({'email': 'admin@medpro.in', 'role': 'admin', 'name': 'System Admin'})
    print("Admin seeded")
except Exception as e:
    print(e)
