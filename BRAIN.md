# HEALTHBIRCH — AI-Assisted Healthcare Coordination Platform
> **Agent Note**: If you are an AI agent reading this file, read it completely before touching any code. Do not assume the project structure — verify against actual files. Do not rename or restructure files unless explicitly instructed. Always run `npm run build` after changes in the `frontend` folder to verify nothing is broken. Always report what you changed and what you skipped.

---

## 1. Project Identity
* **Name**: HEALTHBIRCH (rebranded from MediBook)
* **Type**: Full-stack AI-assisted healthcare coordination platform.
* **Purpose**: Allows patients to describe symptoms and go through AI-assisted triage interviews (integrated with Google Gemini). Triage recommendations route them to book appropriate specialties with real doctors. Doctors manage pre-consultation reports and track clinical cases, while Admins supervise practitioner lists.

---

## 2. Tech Stack & Environment
* **Frontend**: React + Vite + Tailwind CSS (running on port `5173` locally)
* **Backend**: FastAPI (Python 3) (running on port `8000` locally via Uvicorn)
* **Database & Auth**: Firebase Firestore + Firebase Authentication (using server-side `firebase-admin` SDK)
* **AI Model Integration**: Google Gemini API (`gemini-2.5-flash` model for onboarding & triage logic)
* **Execution/Start Commands**:
  * **Frontend**: `cd frontend && npm run dev`
  * **Backend**: `cd backend && venv\Scripts\Activate.ps1 && uvicorn main:app --reload`

---

## 3. Project Structure
The directories and primary files are arranged as follows:

```text
docrecomendation/
├── backend/
│   ├── main.py                     # App entry point; mounts routes & CORS middleware
│   ├── requirements.txt            # Python dependencies (fastapi, firebase-admin, google-genai)
│   ├── serviceAccountKey.json      # Credentials for Firestore/Auth SDK
│   ├── models/
│   │   └── schemas.py              # Pydantic schemas (Request/Response validators)
│   ├── services/
│   │   ├── firebase_service.py     # Firebase SDK initialization + bearer token verifier
│   │   └── gemini_service.py       # Google Gemini SDK caller for triage prompts
│   └── routers/
│       ├── auth.py                 # Security depends dependencies (require_role, get_current_user)
│       ├── auth_routes.py          # POST /api/auth/register/doctor endpoint
│       ├── admin.py                # Admin management endpoints
│       ├── appointments.py         # Booking management endpoints
│       ├── chat.py                 # Live triage chat logging endpoints
│       ├── doctors.py              # Doctor schedules, reviews and self-update endpoints
│       ├── onboarding.py           # Onboarding conversation handlers
│       └── users.py                # Patient profile GET/PUT details
│
└── frontend/
    ├── index.html                  # Core HTML5 entry
    ├── package.json                # npm dependencies
    ├── tailwind.config.js          # Design token custom overrides
    └── src/
        ├── App.jsx                 # Routing declaration
        ├── main.jsx                # React DOM render entry
        ├── services/
        │   ├── api.js              # Axios wrapper with automatic Authorization header injection
        │   └── firebase.js         # Client-side Firebase App init
        ├── components/
        │   └── shared/
        │       ├── AiChatWidget.jsx   # Interactive AI Consultation chat overlay
        │       ├── Badge.jsx          # Custom text badge UI
        │       ├── Button.jsx         # Custom gradient button Component
        │       ├── Input.jsx          # Custom styled form input
        │       ├── ProtectedRoute.jsx # Role-based router guards
        │       └── Navbar.jsx         # Navigation bar links/auth views
        └── pages/
            ├── Landing.jsx         # Marketing landing page & country clinic lookup
            ├── Login.jsx           # Firebase Authentication Login page
            ├── Register.jsx        # Patient registration form page
            ├── PatientDashboard.jsx# Patient profile edits, AI consulting, booking
            ├── DoctorDashboard.jsx # Doctor schedules, settings, and analytical reports
            └── AdminDashboard.jsx  # Admin medical staff supervisor dashboard
```

---

## 4. User Roles & Flows

### 🧑‍⚕️ Patient Flow
1. **Sign Up**: Registers account in `Register.jsx` (role defaults to `patient`).
2. **Conversational Onboarding**: Upon first login, `PatientDashboard.jsx` detects `onboardingComplete !== true` and locks screen behind a friendly interview. Gemini asks questions one-by-one (Name, Age, Height/Weight, Medications, Conditions, Symptoms, City, Diet, Exercise). Updates fields, sets `onboardingComplete = true`.
3. **AI Consultation**: Clicks "Consult AI Triage". Dialog widget handles symptom triage, asks for pain score (1-10), classifies severity (1-4 Mild -> self care info; 5-7 Concerns -> monitoring; 8-10 Severe -> doctor booking). Automatically updates history.
4. **Appointment Booking**: Searches verified doctors, selects slot, enters reasons, and submits booking.
5. **Dashboard Settings**: Modifies diet, weight, allergens, and triggers password resets.

### 🩺 Doctor Flow
1. **Creation**: Registered by Admin only.
2. **Logging In**: Accesses scheduling dashboard showing pending, approved, or cancelled visits.
3. **Pre-Consultation Review**: Analyzes AI-generated summaries and clinical details inputted by patients. Can manually overwrite triage severity.
4. **Self Settings**: Modifies contact information, clinic locations, available slots, and schedules.

### 👑 Admin Flow
1. **Creation**: Master credentials.
2. **Management Profile**: Issues new Doctor credentials, edits statuses, names, or addresses, and issues deletions. Matches doctors and clinic statistics automatically.

---

## 5. Firestore Data Model
Stored as clean collections in Google Firestore:

### Collections & Fields

#### 📁 `users`
* `uid` (string, document ID)
* `email` (string)
* `role` (string: `"patient"` | `"doctor"` | `"admin"`)
* `name` (string)
* **For Patients**:
  * `onboardingComplete` (boolean)
  * `healthProfile` (map):
    * `age` (string)
    * `gender` (string)
    * `height` (string)
    * `weight` (string)
    * `bloodType` (string)
    * `medications` (string)
    * `conditions` (string)
    * `allergies` (string)
    * `diet` (string)
    * `exercise` (string)
    * `city` (string)
    * `summary` (string - AI generated during onboarding)
  * `medicalHistory` (array of maps):
    * `id` (string: `h_timestamp`)
    * `symptoms` (string summary)
    * `painRating` (number)
    * `aiRecommendation` (string)
    * `specialty` (string)
    * `severity` (string: `"Mild"` | `"Concerning"` | `"Severe"`)
    * `recommendDoctor` (boolean)
    * `date` (ISO string)
    * `city` (string)
* **For Doctors**:
  * `specialization` (string)
  * `city` (string)
  * `state` (string)
  * `country` (string)
  * `phone` (string)
  * `clinic_name` (string)
  * `clinic_address` (string)
  * `experience` (string)
  * `availableDays` (array of strings)
  * `availableSlots` (array of strings)
  * `rating` (number)
  * `reviews_count` (number)
  * `status` (string: `"pending"` | `"approved"` | `"suspended"`)
  * `createdAt` (timestamp)
  * `bio` (string)

#### 📁 `appointments`
* `patientId` (string)
* `patientName` (string)
* `doctorId` (string)
* `doctorName` (string)
* `specialization` (string)
* `city` (string)
* `date` (string: `YYYY-MM-DD`)
* `timeSlot` (string)
* `symptoms` (string)
* `aiSummary` (string)
* `aiReasoning` (string)
* `aiSeverity` (string)
* `severity` (string - can be overridden by doctor)
* `status` (string: `"pending"` | `"confirmed"` | `"cancelled"` | `"rejected"`)
* `createdAt` (timestamp)

#### 📁 `reviews`
* `doctor_id` (string)
* `patient_id` (string)
* `patient_name` (string)
* `rating` (number)
* `comment` (string)
* `timestamp` (ISO string)

---

## 6. Backend API Endpoints

### 🔐 Authentication (`/api/auth`)
* `POST /api/auth/register/doctor` — Admin registers a new doctor account.

### 👤 Patients (`/api/users`)
* `GET /api/users/profile` — Retrieves the current patient's profile details.
* `PUT /api/users/profile` — Edits patient health fields and details.

### 🩺 Doctors (`/api/doctors`)
* `GET /api/doctors` — Search approved doctors by city, state, country, or specialization.
* `POST /api/doctors/{id}/reviews` — Booked patient leaves a review.
* `GET /api/doctors/{id}/reviews` — Retrieves reviews for a given doctor.
* `GET /api/doctors/me` — Authenticated doctor retrieves personal practice metrics and profile.
* `PUT /api/doctors/me` — Authenticated doctor edits phone, clinic variables, and slots.
* `PUT /api/doctors/{id}` — Admin modifies details of a selected doctor profile.
* `DELETE /api/doctors/{id}` — Admin removes a doctor account.

### 🗂️ Appointments (`/api/appointments`)
* `POST /api/appointments` — Books a new session (validates time/date conflicts).
* `GET /api/appointments/patient` — List appointments for the current patient.
* `GET /api/appointments/doctor` — List appointments for the current doctor.
* `PATCH /api/appointments/{id}/status` — Patient cancels (only when pending) or doctor updates status.
* `PATCH /api/appointments/{id}/severity` — Doctor overrides symptom severity assessment.

### 💬 Chat Triage (`/api/chat`)
* `POST /api/chat` — Conducts AI-driven triage assessment chat sessions (adds to profile history).
* `POST /api/chat/onboarding` — Step-by-step onboarding conversation, parsing medical parameters.

### 👑 Admin Management (`/api/admin`)
* `GET /api/admin/doctors` — Returns full list of system doctors (including pending/suspended ones).
* `POST /api/admin/create-doctor` — Registers and auto-approves a credentials slot.
* `DELETE /api/admin/delete-doctor/{id}` — Deletes account credentials (legacy route).
* `PATCH /api/admin/{id}/status` — Approves, suspends, or marks doctor profiles pending.

---

## 7. Design System & Theme
Defined in `tailwind.config.js`:

### 🎨 Color Palette
* **Deep Navy (`primary`)**: `#0A1F44` (Darker: `#061530`, Light tinted badge base: `#EEF2FA`)
* **Soft Blue (`secondary`)**: `#3B82F6` (Hover highlight: `#60A5FA`)
* **Purple Accent (`accent`)**: `#7C3AED` (Hover highlight: `#9333EA`)
* **Core Semantics**:
  * Success: `#10B981`
  * Warning: `#F59E0B`
  * Danger: `#EF4444`
  * Emergency: `#DC2626`
  * Neutrals: Background `#FFFFFF`, border `#E2E8F0`, headers text `#0A1F44`, body text `#64748B`

### 📐 Structural Styles
* **Typography**: Inter (sans-serif)
* **Borders scale**: Custom card curves (`card-sm`: `16px`, `card-md`: `20px`, `card-lg`: `24px`)
* **Aesthetics**: Responsive layouts, dark glassmorphism surfaces coupled with light overlays, subtle scaling animations (`hover:scale-[1.02]`), and smooth transitions (`duration-300`).

---

## 8. Current Known Issues & Phase History
* **Open Tasks**: We are executing a 22-item Combined Fix Batch:
  1. [x] Global blue-black gradient color overhaul (deep colors in tailwind.config.js, styles in index.css, and layouts updated) ✅
  2. [x] Fix duplicate HEALTHBIRCH branding in top navbar ✅
  3. [x] Fix navbar logo visibility (brightness/invert filter) ✅
  4. [x] Fix sidebar scroll position (fixed/sticky sidebar) ✅
  5. [x] Fix hamburger menu button visibility on split-screen viewport ✅
  6. [x] Add slowly rotating Galaxy backdrop animation to Login page ✅
  7. [x] Ensure patient onboarding interview triggers reliably (updated React useEffect trigger to fire when auth user is resolved) ✅
  8. [x] Replace Health Score stats card with Daily Water Intake tracker (card with state and -/+ 250ml buttons added) ✅
  9. [x] Remove Medical History tab and Quick Actions card from patient portal (sidebar and quick actions updated, history tab components removed) ✅
  10. [x] Pre-fill doctor search specialization from AI triage results (findDoctors sets search query parameters in search filters) ✅
  11. [x] Add "Cancel Appointment" capability to pending patient appointments (inline action added next to pending status) ✅
  12. [x] Replace Windows-broken flag emojis with colored badges / text indicators (custom codes like IN/US shown in outline badges) ✅
  13. [x] Wire functional Google Sign-In via Firebase Auth (Patient only) (signInWithPopup configured for patient flow) ✅
  14. [x] Greet clinicians by name on Doctor Dashboard Home view (time-based greeting + Dr. Firstname added) ✅
  15. [x] Add appointment outcome selector (Showed, No-show, Reschedule, Cancelled) on confirmed appointments ✅
  16. [x] Add "View Full Summary" modal/expander in doctor's Patients tab (click to expand full AI summary modal) ✅
  17. [x] Rename "Practice Reports" section to "Patient Analytics" ✅
  18. [x] Add Patients Seen derived metric list to Patient Analytics (uniquePatients Set computation) ✅
  19. [x] Map Admin logo click to correctly route to "Identity" tab (logo button → setActiveTab('identity')) ✅
  20. [x] Split doctor list to its own "Medical Staff" sidebar tab (replaces old embedded list) ✅
  21. [x] Remove placeholder Activity Log tab from Admin panel (removed from sidebar + view) ✅
  22. [x] Restrict Registration page to patient registers only (role tabs removed, informational badge added) ✅
* **Final Build**: `npm run build` → ✅ Passed (1.06s)
* **Post-Batch Fixes**: Restored red-style "Sign Out" button to all three dashboards pinned to the bottom of the sidebar with tooltips. ✅
* **Phase History**:
  * **Phase 1**: Rebrand brand guidelines & logo references. ✅
  * **Phase 2**: Redesigned Auth screens with deep navy palettes. ✅
  * **Phase 3**: Enhanced dynamic AI symptom triage. ✅
  * **Phase 4**: Expanded Patient settings, doctor panel profiles. ✅
  * **Phase 5**: Admin CRUD (Edit/Delete), detailed analytical reports, country accordion, and verification script test checks. ✅

