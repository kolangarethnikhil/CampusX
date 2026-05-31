# CampusX Arena Fullstack — Start Here

This is the integrated Arena UI + Firebase backend foundation package.

## What this package includes

- Approved Arena premium UI as the actual app frontend.
- Firebase Auth setup.
- Real-time Firestore subscriptions for:
  - Spaces list
  - Space members
  - Space messages
  - Housing listings
  - Marketplace listings
- Backend services for:
  - Joining spaces
  - Sending space messages
  - Requesting a new space
  - Requesting moderator role
  - Saving listings foundation
- Firestore rules for spaces, messages, requests, listings, reports.
- Admin scripts:
  - seed default KJU spaces
  - set admin custom claim
- IconScout icons integrated.

## Important

Use your new Firebase dev project `CampusXDev` for testing. Do not deploy these Firestore rules to your production Firebase project until fully tested.

## Step 1 — Install

```powershell
npm install
```

## Step 2 — Create `.env.local`

Create `.env.local` in this folder and fill values from `.env.example`.

Minimum required:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_CAMPUS_ID=kju
VITE_ENABLE_SPACES_V2=true
```

## Step 3 — Test build

```powershell
npm run typecheck
npm run build
```

## Step 4 — Run locally

```powershell
npm run dev
```

Open:

```txt
http://localhost:5173
```

## Step 5 — Deploy Firestore rules to Firebase dev

```powershell
firebase login
firebase use --add
```

Choose `CampusXDev`, alias it as:

```txt
dev
```

Deploy rules:

```powershell
firebase use dev
firebase deploy --only firestore:rules
```

## Step 6 — Seed spaces

Download service account JSON from Firebase dev project.

PowerShell:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\secrets\campusx-dev-service-account.json"
$env:FIREBASE_PROJECT_ID="your-dev-project-id"
npm run seed:spaces
```

## Step 7 — Set yourself admin

Find your Firebase UID after signing in once.

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\secrets\campusx-dev-service-account.json"
$env:FIREBASE_PROJECT_ID="your-dev-project-id"
npm run admin:set -- YOUR_FIREBASE_UID true
```

Then sign out and sign in again.

## What works in this package

- Browse Arena UI.
- Home UI preserved.
- Boards UI preserved.
- Housing/market listings subscribe to Firestore and fallback to demo data if empty.
- Spaces subscribe to Firestore and fallback to demo data if empty.
- Opening a space shows real-time messages when membership/rules allow it.
- Sending a message signs in/joins space and writes to Firestore.
- Space info sheet shows members and allows moderator request.
- Profile is connected to Firebase user display name and listing data where available.

## Known limitations for next iteration

- Create/edit listing flow still needs full Arena UI integration.
- Direct buyer/seller chat from listings is not yet fully merged into this Arena app.
- Supabase image upload is not wired into Arena create flows yet.
- Admin dashboard is not built yet; admin backend foundations are present.

## QA status

- `npm run typecheck`: passed
- `npm run build`: passed
