# Fleet Management - Setup Instructions

## Prerequisites
- Node.js 18+ installed
- Firebase account
- npm or yarn

## Setup Steps

### 1. Install Dependencies
```bash
cd fleet-management
npm install
```

### 2. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable the following services:
   - **Authentication** → Email/Password
   - **Firestore Database** → Start in production mode
   - **Storage** → Start in production mode
   - **Hosting** (optional, for deployment)

4. Get your Firebase config:
   - Go to Project Settings → General
   - Scroll to "Your apps" → Web app
   - Copy the configuration

5. Create `.env.local` file in the project root:
```bash
cp env.example .env.local
```

6. Fill in your Firebase credentials in `.env.local`:
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Firestore Security Rules

Go to Firestore → Rules and paste the security rules from the implementation plan.

### 4. Create Admin User

1. Go to Firebase Console → Authentication → Users
2. Click "Add user"
3. Enter email and password
4. Copy the User UID
5. Go to Firestore Database
6. Create a new document in `users` collection with the UID as document ID:
```json
{
  "name": "Admin",
  "email": "admin@example.com",
  "role": "admin",
  "points": 0,
  "badges": [],
  "createdAt": <current timestamp>
}
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and login with your admin credentials.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Storage, Hosting)
- **UI Libraries**: Framer Motion, Lucide React
- **Charts**: Chart.js, React-Chartjs-2
- **OCR**: Tesseract.js
- **QR Codes**: qrcode
- **Date Utils**: date-fns
