# MedLink - Patient Healthcare Platform

**MedLink** is a patient-focused healthcare platform designed to help users manage their medical information, monitor their daily health activities, maintain health records, and book appointments through a centralized dashboard.

The platform provides an organized and user-friendly interface for managing personal health information, tracking wellness habits, and keeping medical documents accessible for future reference.

## Features

### 1. Patient Dashboard
- Personalized dashboard providing an overview of the patient's health information.
- Quick access to medical reports and appointments.
- Organized presentation of important health information.
- Easy navigation between different sections of the platform.

### 2. Patient Profile
- View and manage personal information.
- Maintain personal health details and medical history.
- Organize important patient information in one place.

### 3. Medical Report Management
- Upload medical reports and documents.
- Save reports for future reference.
- Access previously uploaded medical records.
- Keep medical documents organized in a centralized location.

### 4. Health Tracking
- Track and monitor personal health records.
- Calculate and display Body Mass Index (BMI) using relevant measurements.
- Monitor daily water intake.
- Track sleep schedules and sleep consistency.
- View health-related information through visual indicators and dashboard cards.

### 5. Personal Health Journal
- Record symptoms and other health-related observations.
- Maintain a history of health journal entries.
- Review previously recorded symptoms and health information.
- View health trends and historical entries through the interface.

### 6. Appointment Booking
- Browse available hospital or healthcare options displayed by the platform.
- View appointment-related information.
- Follow the appointment booking workflow through the interface.
- Keep appointment information accessible from the dashboard.

## Technology Stack

The project uses the following technologies:

- **Frontend:** React.js, HTML5, CSS3, JavaScript
- **Styling:** Tailwind CSS
- **Build Tool:** Vite
- **Backend:** Node.js, Express.js
- **Database:** MongoDB
- **API Testing:** Postman
- **Version Control:** Git and GitHub

## Getting Started

Follow these steps to run the project locally.

### Prerequisites

Make sure you have installed:

- Node.js and npm
- MongoDB or access to a MongoDB database
- Git

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/samridhi78B/Patient-HealthCare-platform.git
```

**2. Navigate to the project directory**

```bash
cd Patient-HealthCare-platform
```

**3. Install frontend dependencies**

```bash
npm install
```

**4. Install backend dependencies**

If your backend is located in the `server` directory, run:

```bash
cd server
npm install
```

## Clinician access, AI summaries and emergency QR

These features extend the existing patient account, profile and private report flows. Patient login continues to use its existing `token` cookie. Clinicians use a separate `Clinician` collection and the separate `clinician_token` cookie.

### Configure AI summaries

1. Keep `GEMINI_API_KEY` only in `server/.env` (the server environment). The example file is `server/.env.example`; do not put the key in a frontend environment file or commit it.
2. The summary service checks Google's available models and tries `gemini-2.5-flash`, `gemini-1.5-flash`, then `gemini-flash-latest` when listed with `generateContent` support. It retries transient provider errors with backoff and falls through to other listed text Flash models after a model-specific failure.
3. A patient can open a report preview and choose **Generate AI Summary**. The report text is sent to Google Gemini, so get the patient's agreement first. The extracted text is not stored; the generated summary and source-linked extracted findings are saved in MongoDB.
4. Text PDFs are read with `pdf-parse`. JPG/PNG reports are read with English Tesseract OCR. Scans with no readable text are rejected instead of being sent as an empty report. The API key is never returned to the browser.

### Create and verify a clinician

1. Open `/clinician/login`, choose **New clinician? Register for verification**, and submit the clinician's name, email, password, license number, specialization and hospital.
2. New accounts are always created with `isVerified: false`. A registration cannot verify itself and cannot select a different role.
3. A trusted server/database operator verifies the credentials outside the public web API:

   ```bash
   npm --prefix server run clinician:verify -- doctor@example.com
   ```

4. The clinician can then sign in at `/clinician/login` and use `/clinician/dashboard`. The verification command requires the operator's access to the server environment and MongoDB.

### Emergency QR privacy and access

- The patient's profile creates a QR code containing only a random 256-bit opaque token. The token hash is used for lookup; the token is encrypted at rest so the profile can show the same QR again. The encryption key is derived from `JWT_SECRET`.
- QR credentials expire after one year and can be regenerated or revoked by the patient. Regeneration/revocation also closes active emergency sessions.
- A QR scan alone never returns medical data. A verified clinician must sign in, provide a reason, and receive a ten-minute session. The server checks the QR, clinician identity, session owner and expiry on every protected request.
- Emergency summaries label patient-entered, document-extracted and clinician-entered information separately. AI observations start as unreviewed and never become confirmed diagnoses automatically. Clinicians can verify findings or add their own verified records.
- Access, summary views, detailed report reads, record changes and QR issue/revocation events are written to `AuditLog`. The clinician dashboard shows that clinician's own access history.
- Changing `JWT_SECRET` invalidates sessions and the encrypted QR token material; patients should regenerate their QR after a secret rotation.

### Test the implementation

Run the backend tests and frontend production build from the project root:

```bash
npm --prefix server test
npm run build
```

These automated tests cover authentication boundaries, pending clinician verification, QR token handling, emergency session ownership/expiry checks, audit identity, report ownership, textless/invalid reports, and AI response/provider errors. Full live end-to-end testing also requires a running MongoDB instance and a configured OpenAI API key. Image OCR uses Tesseract's English language data.

These project features are for demonstration and education; they are not a claim of regulatory certification or a substitute for clinical judgment.


## Project Goals

- Simplify the organization of personal medical information.
- Help users maintain access to their medical reports.
- Encourage consistent monitoring of daily wellness habits.
- Provide a structured way to record symptoms and review health history.
- Make healthcare information and appointment management easier to navigate.

## Disclaimer

MedLink is a healthcare management project intended to help organize personal health information. Health tracking information and BMI calculations are for informational purposes and should not replace professional medical advice, diagnosis, or treatment.

## Contributors

- Samridhi Gumber
- Samel Dhingra
- Sanchi Sharma
- Harshita

If you find MedLink helpful, please consider giving this repository a ⭐ star on GitHub to support our project and motivate us to keep improving it!
