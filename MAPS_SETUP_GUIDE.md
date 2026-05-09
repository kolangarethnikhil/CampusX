# Google Maps API - Local Development Setup

## Overview
Your app is deployed on **Vercel** with environment variables already configured. 

For **local development**, you just need to copy those values to your `.env.local` file.

---

## Quick Setup (2 Minutes)

### Step 1: Get Environment Variables from Vercel
1. Go to: https://vercel.com/dashboard
2. Select your **CampusX** project
3. Click **Settings** (top menu)
4. Go to **Environment Variables** (left sidebar)
5. You'll see all your configured variables:
   - `GOOGLE_MAPS_PLATFORM_KEY`
   - `VITE_FIREBASE_*` (all Firebase keys)
   - `GEMINI_API_KEY`
   - etc.

### Step 2: Copy to Local `.env.local`
1. Open `.env.local` in your project root
2. For each variable in Vercel, copy the value:
   ```env
   GOOGLE_MAPS_PLATFORM_KEY="copy_from_vercel_here"
   VITE_FIREBASE_API_KEY="copy_from_vercel_here"
   VITE_FIREBASE_PROJECT_ID="copy_from_vercel_here"
   # ... etc
   ```

### Step 3: Restart Dev Server
```bash
npm run dev
```

---

## How It Works

| Environment | Configuration | How Variables Are Read |
|---|---|---|
| **Local Dev** | `.env.local` file | Vite loads from file at startup |
| **Vercel Production** | Vercel Dashboard | Injected at runtime by Vercel |

When you deploy to Vercel, your `.env.local` file is **not** pushed (it's in `.gitignore`). Instead, Vercel uses the variables you configured in the Vercel Dashboard.

---

## Troubleshooting

### ❌ "Still seeing Maps authorization error?"

**Check 1:** Verify `.env.local` has the correct value
```bash
cat .env.local | grep GOOGLE_MAPS_PLATFORM_KEY
```
Should show something like: `GOOGLE_MAPS_PLATFORM_KEY="AIzaSy..."`

**Check 2:** Restart dev server completely
```bash
# Stop: Ctrl+C
npm run dev
```

**Check 3:** Clear browser cache
- DevTools → Application → Clear storage → Clear all
- Refresh the page

### ❌ "Works in Vercel but not locally?"
- `.env.local` values might be missing/incorrect
- Copy again from Vercel Dashboard
- Make sure you didn't include quotes around the value twice

### ❌ "Keys look different in production?"
- That's normal! Vercel might show partial keys for security
- The full key is there, just truncated in the UI

---

## Production Deployment

When you push to GitHub, Vercel automatically:
1. Detects the push
2. Reads environment variables from Vercel Dashboard (not `.env.local`)
3. Builds and deploys your app

**You don't need to do anything special** - your API keys are already secure in Vercel!

---

## Security Best Practices

✅ **Do:**
- Store API keys in Vercel Environment Variables
- Use different keys for staging vs production if needed
- Restrict API keys in Google Cloud (by domain/referrer)

❌ **Don't:**
- Commit `.env.local` to Git (it's in `.gitignore` already)
- Share your Vercel environment variables
- Use development keys in production

---

## Questions?

- 📚 [Vercel Environment Variables Docs](https://vercel.com/docs/projects/environment-variables)
- 🗺️ [Google Maps API Docs](https://developers.google.com/maps/documentation)
- 🔥 [Firebase Docs](https://firebase.google.com/docs)
