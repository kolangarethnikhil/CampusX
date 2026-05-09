<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/b5e0074b-737a-40e2-a8cb-79f85653542d

## Run Locally

**Prerequisites:**  
- Node.js (v16+)
- npm or yarn
- Vercel project access (to get environment variables)

### Setup Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables for Local Development:**
   
   Your app uses **Vercel for environment management**. For local development:
   
   **Get variables from Vercel:**
   - Go to: https://vercel.com/dashboard
   - Select **CampusX** project
   - Click **Settings** → **Environment Variables**
   - Copy all variables shown there
   
   **Create `.env.local` in project root:**
   ```env
   GOOGLE_MAPS_PLATFORM_KEY="paste_from_vercel"
   VITE_FIREBASE_API_KEY="paste_from_vercel"
   VITE_FIREBASE_AUTH_DOMAIN="paste_from_vercel"
   VITE_FIREBASE_PROJECT_ID="paste_from_vercel"
   VITE_FIREBASE_STORAGE_BUCKET="paste_from_vercel"
   VITE_FIREBASE_MESSAGING_SENDER_ID="paste_from_vercel"
   VITE_FIREBASE_APP_ID="paste_from_vercel"
   VITE_FIREBASE_MEASUREMENT_ID="paste_from_vercel"
   GEMINI_API_KEY="paste_from_vercel"
   ```

3. **Run the app:**
   ```bash
   npm run dev
   ```

   Open [http://localhost:5173](http://localhost:5173) in your browser

### Building for Production

```bash
npm run build
npm run preview
```

Production deployment to Vercel happens automatically - no need to set up environment variables again, they're already configured in Vercel Dashboard.

---

**Note:** `.env.local` is in `.gitignore` and never committed. Production uses Vercel's environment variables.

---

## Features

- 🗺️ **Campus Location Maps** - Precise location selection using Google Maps
- 📱 **Housing Marketplace** - Post and browse housing listings
- 🛒 **General Marketplace** - Buy/sell items on campus
- 💬 **Real-time Chat** - Message other users
- 🔐 **Secure Authentication** - Firebase Auth integration
- 📸 **Image Uploads** - Store listings with photos (Firebase Storage)
- 💾 **Save Listings** - Bookmark favorite items

---

## Troubleshooting

**Maps not working locally?** → [MAPS_SETUP_GUIDE.md](./MAPS_SETUP_GUIDE.md) - Copy environment variables from Vercel

**Images not uploading?** → Check Firebase credentials in `.env.local`

**Auth issues?** → Verify all Firebase variables are correct

**Still have issues?** → Restart dev server after updating `.env.local`
