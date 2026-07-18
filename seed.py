import os
import sys
import datetime

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
os.environ['FIREBASE_SERVICE_ACCOUNT_PATH'] = os.path.join(os.path.dirname(__file__), 'backend', 'serviceAccountKey.json')

from services.firebase_service import app, db
from firebase_admin import auth
from google.cloud.firestore_v1 import FieldFilter

INDIAN_DOCTORS = [
    {"email": "sharma.cardio@medpro.in", "name": "Dr. Rajesh Sharma", "specialization": "Cardiologist", "city": "Mumbai", "state": "Maharashtra", "country": "India", "phone": "9876543210", "clinic_name": "HeartCare Hospital", "clinic_address": "Andheri West, Mumbai", "experience": "15 Years", "rating": 4.8, "reviews_count": 120, "days": ["Monday", "Wednesday", "Friday"]},
    {"email": "ananya.skin@medpro.in", "name": "Dr. Ananya Iyer", "specialization": "Dermatologist", "city": "Chennai", "state": "Tamil Nadu", "country": "India", "phone": "9876543211", "clinic_name": "SkinGlow Clinic", "clinic_address": "T. Nagar, Chennai", "experience": "8 Years", "rating": 4.6, "reviews_count": 85, "days": ["Tuesday", "Thursday", "Saturday"]},
    {"email": "amit.neuro@medpro.in", "name": "Dr. Amit Verma", "specialization": "Neurologist", "city": "Delhi", "state": "Delhi", "country": "India", "phone": "9876543212", "clinic_name": "NeuroBrain Clinic", "clinic_address": "Connaught Place, Delhi", "experience": "20 Years", "rating": 4.9, "reviews_count": 200, "days": ["Monday", "Tuesday", "Wednesday", "Thursday"]},
    {"email": "sneha.gen@medpro.in", "name": "Dr. Sneha Das", "specialization": "General Physician", "city": "Kolkata", "state": "West Bengal", "country": "India", "phone": "9876543213", "clinic_name": "CareWell Center", "clinic_address": "Salt Lake, Kolkata", "experience": "12 Years", "rating": 4.7, "reviews_count": 150, "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]},
    {"email": "pranav.ortho@medpro.in", "name": "Dr. Pranav Reddy", "specialization": "Orthopedic", "city": "Hyderabad", "state": "Telangana", "country": "India", "phone": "9876543214", "clinic_name": "Bone & Joint Hospital", "clinic_address": "Banjara Hills, Hyderabad", "experience": "10 Years", "rating": 4.5, "reviews_count": 92, "days": ["Wednesday", "Friday", "Sunday"]},
    {"email": "patel.heart@medpro.in", "name": "Dr. Ramesh Patel", "specialization": "Cardiologist", "city": "Ahmedabad", "state": "Gujarat", "country": "India", "phone": "9876543215", "clinic_name": "Gujarat Heart Center", "clinic_address": "SG Highway, Ahmedabad", "experience": "18 Years", "rating": 4.3, "reviews_count": 60, "days": ["Monday", "Tuesday", "Thursday"]},
    {"email": "neha.skin@medpro.in", "name": "Dr. Neha Joshi", "specialization": "Dermatologist", "city": "Pune", "state": "Maharashtra", "country": "India", "phone": "9876543216", "clinic_name": "Pune Skin Clinic", "clinic_address": "Koregaon Park, Pune", "experience": "6 Years", "rating": 4.4, "reviews_count": 45, "days": ["Friday", "Saturday", "Sunday"]},
    {"email": "vikram.ortho@medpro.in", "name": "Dr. Vikram Singh", "specialization": "Orthopedic", "city": "Jaipur", "state": "Rajasthan", "country": "India", "phone": "9876543217", "clinic_name": "Rajputana Hosptial", "clinic_address": "Malviya Nagar, Jaipur", "experience": "14 Years", "rating": 4.7, "reviews_count": 110, "days": ["Monday", "Tuesday", "Friday"]},
    {"email": "zoya.gen@medpro.in", "name": "Dr. Zoya Khan", "specialization": "General Physician", "city": "Lucknow", "state": "Uttar Pradesh", "country": "India", "phone": "9876543218", "clinic_name": "Awadh Health Center", "clinic_address": "Gomti Nagar, Lucknow", "experience": "9 Years", "rating": 4.8, "reviews_count": 134, "days": ["Monday", "Wednesday", "Thursday", "Saturday"]},
    {"email": "suresh.neuro@medpro.in", "name": "Dr. Suresh Rao", "specialization": "Neurologist", "city": "Bangalore", "state": "Karnataka", "country": "India", "phone": "9876543219", "clinic_name": "TechCity Neuro", "clinic_address": "Koramangala, Bangalore", "experience": "22 Years", "rating": 4.9, "reviews_count": 210, "days": ["Tuesday", "Thursday", "Friday"]},
    {"email": "dr.mehtre@medpro.in", "name": "Dr. Arvind Mehtre", "specialization": "Pediatrician", "city": "Nagpur", "state": "Maharashtra", "country": "India", "phone": "9823000111", "clinic_name": "KidsCare Clinic", "clinic_address": "Dharampeth, Nagpur", "experience": "11 Years", "rating": 4.6, "reviews_count": 78, "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]},
    {"email": "dr.kulkarni@medpro.in", "name": "Dr. Smita Kulkarni", "specialization": "Gynecologist", "city": "Nashik", "state": "Maharashtra", "country": "India", "phone": "9823000222", "clinic_name": "Nashik Women Hospital", "clinic_address": "College Road, Nashik", "experience": "16 Years", "rating": 4.7, "reviews_count": 145, "days": ["Monday", "Wednesday", "Saturday"]},
    {"email": "dr.gupta@medpro.in", "name": "Dr. Alok Gupta", "specialization": "Psychiatrist", "city": "Indore", "state": "Madhya Pradesh", "country": "India", "phone": "9823000333", "clinic_name": "Gupta Mind Center", "clinic_address": "Vijay Nagar, Indore", "experience": "13 Years", "rating": 4.5, "reviews_count": 88, "days": ["Tuesday", "Thursday", "Saturday", "Sunday"]},
    {"email": "dr.bose@medpro.in", "name": "Dr. Rahul Bose", "specialization": "ENT Specialist", "city": "Bhubaneswar", "state": "Odisha", "country": "India", "phone": "9823000444", "clinic_name": "Odisha ENT Clinic", "clinic_address": "Saheed Nagar, Bhubaneswar", "experience": "9 Years", "rating": 4.4, "reviews_count": 56, "days": ["Monday", "Tuesday", "Thursday", "Friday"]},
    {"email": "dr.nair@medpro.in", "name": "Dr. Lakshmi Nair", "specialization": "Ophthalmologist", "city": "Kochi", "state": "Kerala", "country": "India", "phone": "9823000555", "clinic_name": "EyeVision Kochi", "clinic_address": "MG Road, Kochi", "experience": "10 Years", "rating": 4.8, "reviews_count": 102, "days": ["Wednesday", "Thursday", "Friday", "Saturday"]},
    {"email": "dr.patil@medpro.in", "name": "Dr. Sunil Patil", "specialization": "Urologist", "city": "Solapur", "state": "Maharashtra", "country": "India", "phone": "9823000666", "clinic_name": "Patil Urology Center", "clinic_address": "Navi Peth, Solapur", "experience": "14 Years", "rating": 4.6, "reviews_count": 67, "days": ["Monday", "Tuesday", "Wednesday"]},
    {"email": "dr.sinha@medpro.in", "name": "Dr. Kavita Sinha", "specialization": "Endocrinologist", "city": "Patna", "state": "Bihar", "country": "India", "phone": "9823000777", "clinic_name": "Patna Diabetes Center", "clinic_address": "Boring Road, Patna", "experience": "12 Years", "rating": 4.5, "reviews_count": 89, "days": ["Thursday", "Friday", "Saturday", "Sunday"]},
    {"email": "dr.gill@medpro.in", "name": "Dr. Harpreet Gill", "specialization": "Dentist", "city": "Chandigarh", "state": "Punjab", "country": "India", "phone": "9823000888", "clinic_name": "Gill Dental Clinic", "clinic_address": "Sector 17, Chandigarh", "experience": "7 Years", "rating": 4.7, "reviews_count": 120, "days": ["Monday", "Wednesday", "Friday", "Saturday"]},
    {"email": "dr.shinde@medpro.in", "name": "Dr. Sanjay Shinde", "specialization": "General Physician", "city": "Satara", "state": "Maharashtra", "country": "India", "phone": "9823000999", "clinic_name": "Village Health Post", "clinic_address": "Main Bazar, Satara Village", "experience": "25 Years", "rating": 4.9, "reviews_count": 300, "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]},
    {"email": "dr.mishra@medpro.in", "name": "Dr. Pooja Mishra", "specialization": "Pediatrician", "city": "Varanasi", "state": "Uttar Pradesh", "country": "India", "phone": "9823001111", "clinic_name": "Ganga Kids Hospital", "clinic_address": "Assi Ghat Road, Varanasi", "experience": "10 Years", "rating": 4.6, "reviews_count": 95, "days": ["Monday", "Thursday", "Saturday"]},
    {"email": "dr.menon@medpro.in", "name": "Dr. Vijay Menon", "specialization": "Pulmonologist", "city": "Thiruvananthapuram", "state": "Kerala", "country": "India", "phone": "9823002222", "clinic_name": "Kerala Lung Center", "clinic_address": "Statue Junction, TVM", "experience": "17 Years", "rating": 4.8, "reviews_count": 130, "days": ["Tuesday", "Wednesday", "Friday"]},
    {"email": "dr.chatterjee@medpro.in", "name": "Dr. Arindam Chatterjee", "specialization": "Oncologist", "city": "Durgapur", "state": "West Bengal", "country": "India", "phone": "9823003333", "clinic_name": "Bengal Cancer Care", "clinic_address": "City Center, Durgapur", "experience": "15 Years", "rating": 4.7, "reviews_count": 112, "days": ["Monday", "Wednesday", "Friday"]},
    {"email": "dr.khanna@medpro.in", "name": "Dr. Simran Khanna", "specialization": "Nutritionist", "city": "Ludhiana", "state": "Punjab", "country": "India", "phone": "9823004444", "clinic_name": "Khanna Diet Clinic", "clinic_address": "Model Town, Ludhiana", "experience": "5 Years", "rating": 4.4, "reviews_count": 42, "days": ["Tuesday", "Thursday", "Saturday"]},
    {"email": "dr.hegde@medpro.in", "name": "Dr. K.P. Hegde", "specialization": "Gastroenterologist", "city": "Mangalore", "state": "Karnataka", "country": "India", "phone": "9823005555", "clinic_name": "Coastal Gastro Center", "clinic_address": "Hampankatta, Mangalore", "experience": "19 Years", "rating": 4.9, "reviews_count": 180, "days": ["Monday", "Tuesday", "Thursday", "Friday", "Saturday"]},
    {"email": "dr.chauhan@medpro.in", "name": "Dr. Deepak Chauhan", "specialization": "Neurologist", "city": "Shimla", "state": "Himachal Pradesh", "country": "India", "phone": "9823006666", "clinic_name": "Himalayan Neuro Center", "clinic_address": "Mall Road, Shimla", "experience": "11 Years", "rating": 4.6, "reviews_count": 75, "days": ["Wednesday", "Thursday", "Saturday"]},
    {"email": "dr.pandit@medpro.in", "name": "Dr. Rekha Pandit", "specialization": "Gynecologist", "city": "Bhagalpur", "state": "Bihar", "country": "India", "phone": "9823007777", "clinic_name": "Pandit Maternity Clinic", "clinic_address": "Station Road, Bhagalpur", "experience": "21 Years", "rating": 4.8, "reviews_count": 220, "days": ["Monday", "Tuesday", "Thursday", "Friday", "Saturday"]}
]

def clean_doctors():
    print("🧹 Cleaning existing doctors...")
    try:
        query = db.collection("users").where(filter=FieldFilter("role", "==", "doctor"))
        docs = query.stream()
        for doc in docs:
            doc_id = doc.id
            doc.reference.delete()
            try:
                auth.delete_user(doc_id)
            except Exception:
                pass
        print("✅ Doctors cleaned.")
    except Exception as e:
        print(f"Error cleaning doctors: {e}")

def seed_doctors():
    print("🌱 Seeding Indian Doctors...")
    password = 'password123'
    for doc_data in INDIAN_DOCTORS:
        try:
            user = auth.create_user(
                email=doc_data['email'],
                password=password,
                display_name=doc_data['name']
            )
            
            db.collection("users").document(user.uid).set({
                "name": doc_data["name"],
                "email": doc_data["email"],
                "role": "doctor",
                "specialization": doc_data["specialization"],
                "city": doc_data["city"],
                "state": doc_data["state"],
                "country": doc_data["country"],
                "phone": doc_data["phone"],
                "clinic_name": doc_data["clinic_name"],
                "clinic_address": doc_data["clinic_address"],
                "experience": doc_data["experience"],
                "rating": doc_data["rating"],
                "reviews_count": doc_data["reviews_count"],
                "availableDays": doc_data["days"],
                "availableSlots": ["09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"],
                "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "status": "approved",
                "bio": f"Experienced {doc_data['specialization']} based in {doc_data['city']}."
            })
            print(f"✅ Created: {doc_data['name']} in {doc_data['city']}")
        except Exception as e:
            print(f"⚠️ Error creating {doc_data['name']}: {e}")

if __name__ == '__main__':
    clean_doctors()
    seed_doctors()
