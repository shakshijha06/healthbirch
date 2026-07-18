import requests
import json

BASE_URL = "http://localhost:8000"

def test_chat():
    print("Testing /api/chat...")
    payload = {"message": "I have a mild headache since this morning.", "history": []}
    response = requests.post(f"{BASE_URL}/api/chat", json=payload)
    print("Status:", response.status_code)
    try:
        data = response.json()
        print("Response:", json.dumps(data, indent=2))
    except Exception as e:
        print("Response text:", response.text)

def test_doctors():
    print("\nTesting /api/doctors...")
    response = requests.get(f"{BASE_URL}/api/doctors")
    print("Status:", response.status_code)
    try:
        data = response.json()
        print(f"Found {len(data)} doctors.")
        if len(data) > 0:
            print("First doctor:", json.dumps(data[0], indent=2))
    except Exception as e:
        print("Response text:", response.text)

if __name__ == "__main__":
    test_chat()
    test_doctors()
