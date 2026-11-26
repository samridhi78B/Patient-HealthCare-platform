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

## Clinician access and emergency QR

These features extend the existing patient account, profile and private report flows. Patient login continues to use its existing `token` cookie. Clinicians use a separate `Clinician` collection and the separate `clinician_token` cookie.

### Create a clinician account

1. Open `/clinician/login`, choose **New clinician? Register**, and submit the clinician's name, email, password, license number, specialization and hospital.
2. The clinician can sign in immediately at `/clinician/login` and use `/clinician/dashboard`.

### Emergency QR privacy and access

- The patient's profile creates a QR code containing only a random 256-bit opaque token. The token hash is used for lookup; the token is encrypted at rest so the profile can show the same QR again. The encryption key is derived from `JWT_SECRET`.
- QR credentials expire after one year and can be regenerated or revoked by the patient. Regeneration/revocation also closes active emergency sessions.
- A QR scan alone never returns medical data. A clinician must sign in, provide a reason, and receive a ten-minute, read-only session limited to emergency details and medical-report names and dates. The server checks the QR, clinician identity, session owner and expiry on every protected request; QR sessions cannot access detailed reports or change records.
- Emergency summaries label patient-entered, document-extracted and clinician-entered information separately. Clinicians can verify findings or add their own verified records.
- Access, summary views, detailed report reads, record changes and QR issue/revocation events are written to `AuditLog`. The clinician dashboard shows that clinician's own access history.
- Changing `JWT_SECRET` invalidates sessions and the encrypted QR token material; patients should regenerate their QR after a secret rotation.

### Test the implementation

Run the backend tests and frontend production build from the project root:

```bash
npm --prefix server test
npm run build
```

These automated tests cover authentication boundaries, legacy clinician accounts, QR token handling, emergency session ownership/expiry checks, audit identity, report ownership, and invalid report handling. Full live end-to-end testing also requires a running MongoDB instance.

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
