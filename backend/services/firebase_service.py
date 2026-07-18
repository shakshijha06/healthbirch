import firebase_admin
from firebase_admin import credentials, firestore, auth
import os
from dotenv import load_dotenv

load_dotenv()

def get_firebase_app():
    if not firebase_admin._apps:
        base_dir = os.path.dirname(os.path.dirname(__file__))
        default_cred_path = os.path.join(base_dir, 'serviceAccountKey.json')
        cred_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH', default_cred_path)
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    return firebase_admin.get_app()

app = get_firebase_app()
db = firestore.client()

def verify_token(token: str):
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        print(f"Token verification failed: {e}")
        return None

def get_user_role(uid: str) -> str:
    try:
        doc = db.collection('users').document(uid).get()
        if doc.exists:
            return doc.to_dict().get('role', 'patient')
        return 'patient'
    except Exception as e:
        print(f"Failed to fetch user role: {e}")
        return 'patient'
