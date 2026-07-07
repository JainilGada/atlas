# Platform Strategy — Web + Android + iOS

> Decision deferred — revisit after app is built. Analysis below.

---

## Current State
App is already React + Vite + PWA with full offline support (Workbox + IndexedDB). No rewrite needed for multi-platform.

---

## Recommended Approach: PWA + Capacitor

### Why
- Zero rewrite — Capacitor wraps existing React/Vite app as-is
- One codebase for all 3 platforms
- No domain needed — Vercel gives free `*.vercel.app` subdomain
- Android distribution: sideload APK (share via WhatsApp/Drive) or Google Play ($25 one-time)
- iOS: Safari PWA "Add to Home Screen" to start; Capacitor + TestFlight later if needed

---

## Platform Breakdown

| Platform | Tool | Distribution | Cost |
|----------|------|-------------|------|
| Web | Vercel free tier | Share `atlas-xyz.vercel.app` link | Free |
| Android | Capacitor v6 → APK | WhatsApp/Drive APK or Google Play | Free / $25 Play |
| iOS | Safari PWA (now) → Capacitor later | Add to Home Screen / TestFlight | Free / $99/yr App Store |

---

## Steps When Ready

### 1. Deploy Web to Vercel (30 min)
- Connect GitHub repo → Vercel auto-deploys on push
- Add env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Get free `atlas-xyz.vercel.app` URL
- Add URL to Supabase CORS allowed origins

### 2. Add Capacitor for Android (2 hrs)
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init  # app ID: com.jg.atlas
npm run build
npx cap add android
npx cap sync
# Open android/ in Android Studio → build APK
```

### 3. Capacitor Plugins Needed
- `@capacitor/camera` — native camera for photo uploads
- `@capacitor/filesystem` — file handling
- `@capacitor/haptics` — tap feedback on check-in
- `@capacitor/status-bar` — theme the Android status bar

### 4. Files to Touch
- `capacitor.config.ts` — new file
- `vite.config.ts` — minor tweak for Capacitor output
- `src/lib/supabase.ts` — possibly URL scheme for native deep links
- `package.json` — add `build:android` script

---

## What NOT to Do
- No Flutter rewrite — unnecessary
- No React Native — unnecessary
- Keep existing PWA config — it's already solid

---

## iOS Decision Tree
```
Friends/family only → Safari PWA (free, zero effort)
Want proper app icon + feel → Capacitor + TestFlight ($99/yr Apple Dev)
Want App Store → Capacitor + App Store review ($99/yr)
```
