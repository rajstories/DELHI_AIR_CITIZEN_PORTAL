# Citizen Report → Government Alert Pipeline
## Complete Implementation Plan

---

## CODEBASE SCAN RESULTS

### 1. CITIZEN APP STRUCTURE

| Question | Finding |
|---|---|
| **Framework** | React 18 + TypeScript + Vite (web app, NOT React Native/Flutter) |
| **Project Location** | `/Users/vishal/citizen app antigravity/DELHI_AIR_CITIZEN_PORTAL/` |
| **Camera/Scan Feature** | `components/GreenLensCamera.tsx` — opens device camera via `navigator.mediaDevices.getUserMedia()`, freezes frame on tap, shows verification form |
| **Report Submission Form** | Inside `GreenLensCamera.tsx` (lines 195-328) — the "Verify Incident" step |
| **Current Form Fields** | 1. Pollution Type (select: Biomass Burning, Construction Dust, Industrial Smoke, Vehicle Pollution, Garbage Burning) 2. Severity (chips: Mild, Moderate, Severe) 3. Location Note (free text, e.g., "Near Primary School") |
| **Form Submission** | REST API `PUT` to Firebase RTDB: `https://delhi-citizen-app-default-rtdb.firebaseio.com/latest_alert.json` — overwrites a single `latest_alert` node (NOT a collection) |
| **Firebase Installed?** | ❌ NO Firebase SDK. Uses raw `fetch()` with the REST API URL |
| **Auth System?** | ❌ NO authentication. No user ID, no login, no citizen profile. `userPoints` is hardcoded at `1250` in `App.tsx` |
| **Existing EXIF Extraction?** | ❌ NONE. Camera just freezes the video frame |
| **GPS Capture?** | ❌ Only `aqiService.ts` uses `navigator.geolocation` for AQI fetching. Camera/report does NOT capture GPS |
| **DigiPin?** | ❌ Not mentioned anywhere in the codebase |

**Current Submit Payload** (from `GreenLensCamera.tsx` line 84-92):
```json
{
  "id": 1711111234567,
  "type": "Construction Dust",
  "severity": "Severe",
  "location": "Rohini Sec-18",
  "description": "Near Primary School",
  "timestamp": "2:30:00 PM",
  "isNew": true
}
```

### 2. GOVERNMENT PORTAL STRUCTURE

| Question | Finding |
|---|---|
| **Separate Project?** | ✅ YES — separate repo at `/Users/vishal/WardWatch AI/Delhi_pollution_goverment_portal/` |
| **Also found** | Older version at `/Users/vishal/DELHI_POLLUTION_CONTROL_CENTRE/` (smaller, less features) |
| **Framework** | React 19 + TypeScript + Vite |
| **Active Alerts** | `components/ActiveAlerts.tsx` (915 lines, 42KB) |
| **Auth** | Clerk (`@clerk/clerk-react`) for government officer login |
| **Maps** | Leaflet (`react-leaflet`) for ward map visualization |
| **How Active Alerts Gets Data** | **Polling every 2 seconds** via `fetch()` to `https://delhi-citizen-app-default-rtdb.firebaseio.com/latest_alert.json` (line 28, 176-223). Converts citizen report to `Alert` format and prepends to the mock alerts list |

**Current Alert Object** (from `types.ts`):
```typescript
interface Alert {
  id: string;           // e.g., "ALRT-2401" or "CIT-1711111234567"
  severity: AlertSeverity; // 'Critical' | 'High' | 'Medium' | 'Low'
  title: string;
  location: string;
  message: string;
  timestamp: string;
  status: 'Open' | 'Resolved';
  type: string;         // e.g., 'Smog', 'Fire', 'Construction', 'Traffic'
}
```

**ActiveAlerts.tsx Features Already Built:**
- ✅ Real-time polling from Firebase RTDB (`BRIDGE_API_URL`)
- ✅ Toast notification + audio alert on new citizen report
- ✅ Converts `BridgeReport` → `Alert` with severity mapping
- ✅ SOP checklist workflow per alert type
- ✅ Initiate Response → Active → Mark Resolved flow
- ✅ Broadcast Action Plan to Twitter/WhatsApp
- ✅ Posts to Firebase `social_media_posts` collection
- ✅ Filter by severity, search by location/type

### 3. EXISTING CONNECTIONS

| Connection | Detail |
|---|---|
| **Shared Firebase RTDB** | Both projects use `https://delhi-citizen-app-default-rtdb.firebaseio.com` |
| **Citizen → Govt Bridge** | Citizen PUTs to `/latest_alert.json` → Govt portal polls it every 2s |
| **Firebase SDK Installed?** | ❌ Neither project has `firebase` npm package. Both use raw REST API |
| **Firebase Config File?** | ❌ None. The RTDB URL is hardcoded as a constant |
| **Firebase Auth?** | ❌ No Firebase Auth. Govt portal uses Clerk instead |
| **Shared Backend?** | ❌ No backend server. Direct client → Firebase communication |

### 4. CURRENT SCAN/CAMERA FLOW

```
Citizen taps "Snap" button in BottomNav
    ↓
App.tsx sets showCamera=true
    ↓
GreenLensCamera opens with device rear camera (getUserMedia)
    ↓
Citizen taps shutter button → video pauses (freeze frame)
    ↓
800ms "Analyzing..." spinner (simulated, no actual analysis)
    ↓
Verification form slides up from bottom:
  - Pollution Type (required)
  - Severity (required)
  - Location Note (optional)
    ↓
Submit → fetch PUT to Firebase /latest_alert.json
    ↓
onSubmit() → RewardModal (confetti + "+50 Green Credits")
    ↓
Government portal sees it on next 2-second poll cycle
```

**Key gaps:**
- ❌ Photo is NOT actually captured/stored (just video pause)
- ❌ No EXIF extraction
- ❌ No GPS from photo
- ❌ No photo upload to any storage
- ❌ Location hardcoded as `"Rohini Sec-18"`
- ❌ Single `latest_alert` node means only one report exists at a time
- ❌ No trust score or verification logic
- ❌ No citizen identity tracking

---

## SYSTEM OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CITIZEN APP (React Web)                       │
│                                                                      │
│  1. Citizen takes photo via GreenLensCamera                         │
│     ↓                                                                │
│  2. App extracts EXIF (GPS, timestamp, camera model) via exifr      │
│     ↓                                                                │
│  3. App captures current GPS via navigator.geolocation              │
│     ↓                                                                │
│  4. Citizen fills form:                                              │
│     • Issue type (6 options with icons)                              │
│     • Description (min 20 chars)                                     │
│     • DigiPin (10-char code)                                        │
│     • Severity (Low / Medium / High)                                │
│     • Auto-detected GPS shown (citizen confirms)                     │
│     ↓                                                                │
│  5. Submit:                                                          │
│     a) Upload photo → Firebase Storage: reports/[uid]/[ts].jpg      │
│     b) Write report → Firebase RTDB: /pending_reports/[reportId]    │
│     c) Write citizen view → /citizen_reports/[uid]/[reportId]       │
│     d) Show: "Report submitted! Verification in progress..."        │
│     ↓                                                                │
│  6. Navigate to "My Reports" screen                                 │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   VERIFICATION ENGINE (Client-side)                  │
│                                                                      │
│  Runs in-browser after Firebase write (no Cloud Functions needed):  │
│                                                                      │
│  CHECK 1 — GPS vs EXIF GPS (30 pts max):                           │
│    haversine(submittedGPS, exifGPS)                                 │
│    < 100m → +30 | < 500m → +20 | < 1000m → +10 | else → 0         │
│                                                                      │
│  CHECK 2 — DigiPin decode vs GPS (40 pts max):                     │
│    Decode DigiPin → lat/lng                                         │
│    haversine(digiPinGPS, submittedGPS)                              │
│    < 50m → +40 | < 200m → +25 | else → 0                           │
│                                                                      │
│  CHECK 3 — Real photo check (20 pts max):                          │
│    Has camera model → +10 | Has timestamp → +5                     │
│    Timestamp within 24h → +5 | No EXIF → 0                         │
│                                                                      │
│  CHECK 4 — Rate limit (10 pts max):                                │
│    Reports from this citizen in 24h:                                │
│    ≤ 5 → +10 | 6-10 → +5 | > 10 → 0                               │
│                                                                      │
│  CHECK 5 — Image validation (bonus/penalty):                       │
│    File > 50KB and valid MIME → no deduction                        │
│    Fails → -20 points                                               │
│                                                                      │
│  THRESHOLDS:                                                        │
│    ≥ 70 → status: "verified" → copy to /active_alerts              │
│    40-69 → status: "flagged" → manual review queue                  │
│    < 40 → status: "rejected" → citizen notified                     │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  GOVERNMENT PORTAL (ActiveAlerts.tsx)                │
│                                                                      │
│  Firebase onValue listener on /active_alerts                        │
│  (replaces current 2-second polling on /latest_alert.json)          │
│                                                                      │
│  New verified alert appears in real-time with:                      │
│  🟢 Trust Score badge: "Trust: 87/100 — Citizen Verified"          │
│  📸 Photo thumbnail                                                │
│  📍 Location on mini-map                                            │
│                                                                      │
│  Officer clicks "Initiate Response" → existing SOP workflow         │
│  Officer clicks "Mark Resolved" →                                   │
│    Updates /active_alerts/[id]/status = "resolved"                  │
│    Updates /citizen_reports/[uid]/[reportId] progressUpdates         │
│    Citizen sees update in "My Reports" screen                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## FIREBASE DATABASE STRUCTURE

```
/pending_reports
  /[reportId]
    citizenId: "anon_abc123"
    citizenName: "Anonymous Citizen"
    timestamp: 1711111234567
    status: "pending" | "verifying" | "verified" | "flagged" | "rejected"
    trustScore: 0-100

    location:
      submittedLat: 28.6139
      submittedLng: 77.2090
      exifLat: 28.6142
      exifLng: 77.2088
      digiPin: "J6HF-KMPQ"
      digiPinLat: 28.6140
      digiPinLng: 77.2091
      address: "Near Rohini Metro Station"

    photo:
      url: "firebase_storage_url"
      hasExif: true
      cameraModel: "Samsung Galaxy S23"
      captureTime: "2026-03-22T14:30:00"
      exifTimestamp: 1711111200000

    report:
      issueType: "construction_dust" | "vehicular" | "burning" |
                 "industrial" | "garbage_burning" | "other"
      description: "Construction happening near primary school..."
      severity: "low" | "medium" | "high"

    verification:
      gpsMatch: true | false
      digiPinMatch: true | false
      hasRealExif: true | false
      rateLimitOk: true | false
      imageValid: true | false
      gpsScore: 30
      digiPinScore: 40
      exifScore: 20
      rateLimitScore: 10
      totalScore: 87
      verifiedAt: 1711111300000
      rejectionReason: null | "gps_mismatch" | "rate_limit" | "invalid_image"

/active_alerts  (government portal reads this)
  /[alertId]
    sourceReportId: "reportId"
    wardId: "024N"
    zone: "N"
    issueType: "construction_dust"
    description: "Construction happening near..."
    photoUrl: "firebase_storage_url"
    location:
      lat: 28.6139
      lng: 77.2090
      address: "Near Rohini Metro Station"
    trustScore: 87
    citizenId: "anon_abc123"
    timestamp: 1711111234567
    status: "open" | "in_progress" | "resolved"
    governmentResponse: null | "Sprinklers deployed"
    resolvedAt: null | 1711115000000

/citizen_reports  (citizen app reads this)
  /[citizenId]
    /[reportId]
      status: "pending" | "verified" | "flagged" | "rejected"
      trustScore: 87
      issueType: "construction_dust"
      description: "..."
      timestamp: 1711111234567
      progressUpdates:
        - time: 1711111234567, status: "Submitted"
        - time: 1711111235000, status: "Verifying..."
        - time: 1711111240000, status: "✅ Verified — Sent to DPCC"
        - time: 1711111300000, status: "Officer Assigned"
        - time: 1711115000000, status: "Action Taken: Sprinklers Deployed"
```

---

## STEP BY STEP IMPLEMENTATION PLAN

### STEP 1 — Firebase Setup

> **Current state:** Both projects use raw `fetch()` to `https://delhi-citizen-app-default-rtdb.firebaseio.com`. No Firebase SDK installed.

**Install in Citizen App** (`DELHI_AIR_CITIZEN_PORTAL`):
```bash
npm install firebase exifr
```

**Install in Government Portal** (`WardWatch AI/Delhi_pollution_goverment_portal`):
```bash
npm install firebase
```

**Create Firebase config — Citizen App:**
```
NEW FILE: services/firebaseConfig.ts
```
```typescript
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  // Use the existing RTDB — project ID: delhi-citizen-app
  databaseURL: "https://delhi-citizen-app-default-rtdb.firebaseio.com",
  // These will need to be filled from Firebase console:
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-key",
  projectId: "delhi-citizen-app",
  storageBucket: "delhi-citizen-app.appspot.com",
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const storage = getStorage(app);
export default app;
```

**Create Firebase config — Government Portal:**
```
NEW FILE: services/firebaseConfig.ts
```
```typescript
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  databaseURL: "https://delhi-citizen-app-default-rtdb.firebaseio.com",
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-key",
  projectId: "delhi-citizen-app",
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export default app;
```

**Firebase Services to Enable:**
- ✅ Realtime Database (already exists and working)
- 🆕 Firebase Storage (for photo uploads)
- ❌ Firebase Auth — NOT needed (citizen app uses anonymous ID, govt portal uses Clerk)
- ❌ Cloud Functions — NOT needed (verification runs client-side for hackathon speed)

**Firebase Realtime Database Security Rules:**
```json
{
  "rules": {
    "pending_reports": {
      "$reportId": {
        ".read": true,
        ".write": true
      }
    },
    "active_alerts": {
      ".read": true,
      ".write": true
    },
    "citizen_reports": {
      "$uid": {
        ".read": true,
        ".write": true
      }
    },
    "latest_alert": {
      ".read": true,
      ".write": true
    },
    "social_media_posts": {
      ".read": true,
      ".write": true
    }
  }
}
```
> **Note:** For hackathon demo, rules are permissive. Production would restrict by `auth.uid`.

---

### STEP 2 — Citizen App: Enhanced Scan Form

**File to Modify:** `components/GreenLensCamera.tsx`

#### A) ACTUAL PHOTO CAPTURE

Currently: Video just pauses (no image data extracted).

Change: On snap, capture the video frame to a `canvas`, convert to `Blob`, then extract EXIF from the original file (if user picks from gallery) or from the captured image.

**Also add a "Pick from Gallery" option** alongside the live camera — this is critical because:
- Gallery photos have EXIF data (camera photos from `getUserMedia` do NOT have EXIF since they're video frames)
- Judges can demo with a pre-taken photo that has real GPS

#### B) EXIF EXTRACTION SERVICE

```
NEW FILE: services/exifService.ts
```
Uses `exifr` library to extract:
- GPS coordinates (latitude, longitude)
- Camera make/model
- Capture timestamp (DateTimeOriginal)

Shows citizen: "📍 Location detected from photo: 28.6139, 77.2090"
If no EXIF: shows warning badge but still allows submit.

#### C) DIGIPIN SERVICE

```
NEW FILE: services/digiPinService.ts
```
DigiPin is India Post's geocoding system. Implements the decode formula:
- Takes 10-char alphanumeric code (e.g., `38J-764-3847`)
- Decodes to lat/lng coordinates
- Shows on mini-map for citizen confirmation

#### D) ENHANCED FORM FIELDS

Replace the current simple form with:

| Field | Type | Validation | Source |
|---|---|---|---|
| Photo | File/Camera | Required | Camera capture or gallery |
| Issue Type | Select with icons | Required, 6 options | User selects |
| Description | Textarea | Required, min 20 chars | User types |
| DigiPin | Text input | Optional, 10-char format helper | User enters |
| Auto GPS | Display only | Auto-captured | `navigator.geolocation` |
| EXIF GPS | Display only | Auto-extracted | `exifr` library |
| Severity | Chip selector | Required: Low/Medium/High | User selects |
| Camera Model | Display only | Auto-extracted | EXIF data |

**Issue Types (6 options with icons):**
1. 🔥 Biomass Burning
2. 🏗️ Construction Dust
3. 🏭 Industrial Smoke
4. 🚗 Vehicle Pollution
5. 🗑️ Garbage Burning
6. ❓ Other

#### E) SUBMIT FLOW

```
1. Generate citizenId (localStorage-based anonymous ID)
2. Generate reportId (timestamp-based)
3. Upload photo to Firebase Storage
   path: reports/[citizenId]/[reportId].jpg
4. Get download URL
5. Run verification engine (client-side) → get trust score
6. Write to /pending_reports/[reportId]
7. Write to /citizen_reports/[citizenId]/[reportId]
8. If trust score >= 70: also write to /active_alerts/[reportId]
9. Show verification result to citizen
10. Navigate to "My Reports" screen
```

---

### STEP 3 — VERIFICATION ENGINE

> **Approach:** Client-side verification in the citizen app. No Cloud Functions needed for hackathon.

```
NEW FILE: services/verificationService.ts
```

**CHECK 1 — GPS vs EXIF (30 points):**
```typescript
// Haversine distance between submitted GPS and EXIF GPS
const distance = haversine(submittedGPS, exifGPS);
if (distance < 100)  score += 30;  // Very close — strong match
else if (distance < 500)  score += 20;  // Reasonable proximity
else if (distance < 1000) score += 10;  // Weak match
else score += 0;  // No match or no EXIF GPS
```

**CHECK 2 — DigiPin decode (40 points):**
```typescript
// Decode DigiPin to lat/lng, compare with submitted GPS
const digiPinCoords = decodeDigiPin(digiPinCode);
const distance = haversine(digiPinCoords, submittedGPS);
if (distance < 50)   score += 40;  // Exact area match
else if (distance < 200) score += 25;  // Close enough
else score += 0;  // Mismatch
```
> If no DigiPin entered: award 15 points (neutral, don't penalize)

**CHECK 3 — Real photo check (20 points):**
```typescript
if (exifData.cameraModel) score += 10;  // Has camera model
if (exifData.captureTime) score += 5;   // Has timestamp
if (isWithin24Hours(exifData.captureTime)) score += 5;  // Recent photo
// No EXIF at all → 0 points (possible AI/screenshot)
```

**CHECK 4 — Rate limit (10 points):**
```typescript
// Count reports from this citizenId in last 24 hours
// Read from /citizen_reports/[citizenId] and count
if (count <= 5)  score += 10;  // Normal user
else if (count <= 10) score += 5;   // Monitor
else score += 0;  // Possible spam
```

**CHECK 5 — Image validation (bonus/penalty):**
```typescript
if (fileSize > 50 * 1024 && isValidMimeType(file)) {
  // OK — no deduction
} else {
  score -= 20;  // Blank, corrupt, or too small
}
```

**SCORE THRESHOLDS:**
| Score | Status | Action |
|---|---|---|
| ≥ 70 | `"verified"` | Copy to `/active_alerts` → Govt portal notified |
| 40-69 | `"flagged"` | Stays in `/pending_reports` → manual review |
| < 40 | `"rejected"` | Citizen notified with reason |

---

### STEP 4 — Verified Alert → Government Portal

**File to Modify:** `WardWatch AI/Delhi_pollution_goverment_portal/components/ActiveAlerts.tsx`

**Current:** Polls `/latest_alert.json` every 2 seconds.
**Change to:** Use Firebase SDK `onValue` listener on `/active_alerts` for true real-time updates.

**Changes needed:**
1. Import Firebase database and `onValue` from the new `firebaseConfig.ts`
2. Replace the 2-second `setInterval` fetch with `onValue('/active_alerts', callback)`
3. Convert the Firebase data to the existing `Alert` type
4. Add trust score badge to each alert card
5. Show "📸 Citizen Verified" label for citizen reports vs "🛰️ Sensor Alert" for existing mock alerts
6. On "Mark Resolved" → update `/active_alerts/[id]` and `/citizen_reports/[uid]/[reportId]`

**New alert card additions:**
```
┌─────────────────────────────────────────┐
│ 🔴 CRITICAL    Trust: 87/100 🟢        │
│ Construction Dust — Rohini Sec-18       │
│ 📸 Citizen Report · 3 mins ago         │
│                                         │
│ [View Details] [Mark Resolved]          │
└─────────────────────────────────────────┘
```

---

### STEP 5 — Citizen "My Reports" Screen

```
NEW FILE (Citizen App): pages/MyReports.tsx
```

**Add to navigation:** Add a 'myreports' page type in `types.ts` Page union + BottomNav.

Shows list of all reports submitted by this citizen (from `/citizen_reports/[citizenId]`).

**Report card UI:**
```
┌─────────────────────────────────────────┐
│ 🔴 Construction Violation               │
│ Rohini Sec-18                           │
│ Submitted: 2 hours ago                  │
│                                         │
│ Progress:                               │
│ ✅ Submitted                            │
│ ✅ Verified (Trust Score: 87/100)       │
│ ✅ Sent to DPCC                         │
│ 🔄 Officer Assigned — In Progress      │
│ ⬜ Resolved                             │
│                                         │
│ [View Details]                          │
└─────────────────────────────────────────┘
```

Listens to Firebase `onValue` on `/citizen_reports/[citizenId]` for real-time updates when government officer takes action.

---

### STEP 6 — Government Portal Updates Needed

**Files to modify in** `WardWatch AI/Delhi_pollution_goverment_portal/`:

| File | Change |
|---|---|
| `components/ActiveAlerts.tsx` | Replace polling with Firebase `onValue` listener; add trust score badge; update "Mark Resolved" to write back to citizen reports |
| `services/firebaseConfig.ts` | NEW — Firebase SDK config |
| `types.ts` | Add `trustScore`, `photoUrl`, `citizenId` fields to `Alert` interface |
| `constants.tsx` | No changes needed (existing MOCK_ALERTS stay as fallback) |

**When officer clicks "Mark Resolved":**
1. Update `/active_alerts/[id]/status = "resolved"`
2. Update `/active_alerts/[id]/governmentResponse = "Sprinklers deployed"`
3. Update `/citizen_reports/[citizenId]/[reportId]/progressUpdates` → add "Resolved" step
4. Citizen's "My Reports" screen updates in real-time

---

### STEP 7 — Real-Time Notifications (In-App)

**Citizen App:**
- Add notification badge (red dot) on "My Reports" nav item when a new progress update arrives
- Use Firebase `onValue` on `/citizen_reports/[citizenId]` to detect changes
- Show toast notification when status changes

> **Not implementing for hackathon:** Firebase Cloud Messaging push notifications (requires service worker setup, would slow down the demo).

---

## FILES TO CREATE / MODIFY

### CITIZEN APP (`DELHI_AIR_CITIZEN_PORTAL`)

| Status | File | Purpose |
|---|---|---|
| 🆕 NEW | `services/firebaseConfig.ts` | Firebase SDK initialization |
| 🆕 NEW | `services/reportService.ts` | Submit report, upload photo, read citizen reports |
| 🆕 NEW | `services/exifService.ts` | EXIF extraction from photos |
| 🆕 NEW | `services/digiPinService.ts` | DigiPin decode to lat/lng |
| 🆕 NEW | `services/verificationService.ts` | Trust score calculation (5 checks) |
| 🆕 NEW | `pages/MyReports.tsx` | Citizen's report tracking screen |
| 🆕 NEW | `components/ReportProgressCard.tsx` | Progress timeline card component |
| 🆕 NEW | `components/TrustScoreBadge.tsx` | Visual trust score indicator |
| ✏️ MODIFY | `components/GreenLensCamera.tsx` | Add actual photo capture, EXIF extraction, enhanced form, new submit flow |
| ✏️ MODIFY | `App.tsx` | Add MyReports page routing, citizen ID generation |
| ✏️ MODIFY | `components/BottomNav.tsx` | Add "My Reports" nav item (replace center Snap with regular nav) |
| ✏️ MODIFY | `types.ts` | Add `Page` type for 'myreports', add report-related interfaces |

### GOVERNMENT PORTAL (`WardWatch AI/Delhi_pollution_goverment_portal`)

| Status | File | Purpose |
|---|---|---|
| 🆕 NEW | `services/firebaseConfig.ts` | Firebase SDK initialization |
| ✏️ MODIFY | `components/ActiveAlerts.tsx` | Replace polling with `onValue`, add trust score badge, update resolve flow |
| ✏️ MODIFY | `types.ts` | Add trust score, photo, citizen fields to Alert interface |

---

## PACKAGES TO INSTALL

### Citizen App
```bash
cd "/Users/vishal/citizen app antigravity/DELHI_AIR_CITIZEN_PORTAL"
npm install firebase exifr
```

### Government Portal
```bash
cd "/Users/vishal/WardWatch AI/Delhi_pollution_goverment_portal"
npm install firebase
```

---

## DEMO FLOW FOR JUDGES

**Story: "Rahul, a Rohini resident, spots construction dust near his child's school"**

### ACT 1 — Citizen Reports (Citizen App)
1. Open citizen app on phone/browser
2. Show home screen with live AQI (Rohini: 412 Severe)
3. Tap **📷 Snap** button in bottom nav
4. Camera opens → Point at construction site → Tap shutter
5. **Auto-extraction animation:** "📍 Location detected from photo" with GPS coordinates
6. Fill form:
   - Issue: 🏗️ Construction Dust
   - Description: "Illegal construction near DPS School, Sector 18"
   - DigiPin: `38J-764-3847`
   - Severity: 🔴 High
7. Tap **Submit Report**
8. **Verification animation:**
   - ✅ GPS Match: 30/30
   - ✅ DigiPin Match: 40/40
   - ✅ Real Photo: 17/20
   - ✅ Rate Limit OK: 10/10
   - **Trust Score: 87/100 — VERIFIED ✅**
9. Show: "Report sent to DPCC Command Center!"
10. Navigate to **My Reports** → see live progress tracker

### ACT 2 — Government Receives (Govt Portal)
11. **Switch to Government portal** (second browser tab)
12. Active Alerts page — **NEW alert appears in real-time** with sound
13. Alert card shows:
    - 🔴 CRITICAL — Construction Dust
    - 📍 Rohini Sec-18
    - 🟢 Trust Score: 87/100 — Citizen Verified
    - 📸 Photo attached
14. Officer clicks **View Details** → sees SOP checklist
15. Officer clicks **Initiate Response** → "Rapid Response Team dispatched"
16. Officer completes SOP → clicks **Mark Resolved**

### ACT 3 — Citizen Gets Feedback (Citizen App)
17. **Back on citizen app** → My Reports updates **in real-time**:
    - ✅ Submitted
    - ✅ Verified (Trust Score: 87/100)
    - ✅ Sent to DPCC
    - ✅ Officer Assigned
    - ✅ **Action Taken: Sprinklers Deployed** ← new update!

### The Wow Factor
> "This is a **complete feedback loop** — Citizen → Verification → Government → Action → Citizen confirmation. No other team has this end-to-end pipeline with trust scoring."

---

## FIREBASE SECURITY RULES

```json
{
  "rules": {
    "pending_reports": {
      "$reportId": {
        ".read": true,
        ".write": true
      }
    },
    "active_alerts": {
      ".read": true,
      ".write": true
    },
    "citizen_reports": {
      "$uid": {
        ".read": true,
        ".write": true
      }
    },
    "latest_alert": {
      ".read": true,
      ".write": true
    },
    "social_media_posts": {
      ".read": true,
      ".write": true
    }
  }
}
```
> **Hackathon mode:** All read/write open. For production, restrict by `auth.uid` and add validation.

---

## RISK FLAGS & WORKAROUNDS

| Risk | Impact | Workaround |
|---|---|---|
| **Firebase free tier limits** | Spark plan: 100 simultaneous connections, 1GB storage, 10GB/month bandwidth | Our demo uses minimal data — well within limits. Use REST fallback if SDK fails |
| **CORS issues between apps** | Firebase SDK handles CORS internally | If issues arise, fall back to REST API (current approach works) |
| **DigiPin decode accuracy** | India Post's DigiPin spec may have edge cases | Implement basic decode formula; for demo, hardcode known DigiPin values for Rohini area |
| **getUserMedia video has no EXIF** | Camera captures from `getUserMedia` are video frames, NOT photos — no EXIF | Add "📁 Pick from Gallery" button alongside camera. Gallery photos HAVE EXIF. For demo, prepare a pre-taken photo with GPS EXIF |
| **Real-time listener not updating** | Firebase `onValue` might not fire if connection drops | Keep existing polling as fallback (2-second interval) alongside `onValue` listener |
| **Photo upload size limits** | Firebase Storage free tier: 5GB total | Compress images client-side before upload (max 500KB). Delete old demo uploads |
| **No Firebase Auth** | Can't restrict writes by user | Use localStorage-generated `citizenId` for demo. Security rules stay open |
| **Large photo upload time** | Could be slow on demo WiFi | Pre-compress to JPEG ~200KB. Show upload progress bar |
| **`navigator.geolocation` denied** | User might deny location permission | Fall back to hardcoded Rohini coordinates for demo. Show "Location unavailable" warning |
| **Multiple `latest_alert` overwrites** | Current design overwrites single node | New design uses `/pending_reports/[reportId]` — each report gets unique key |

---

## IMPLEMENTATION ORDER (RECOMMENDED)

For maximum hackathon efficiency:

1. **Step 1** — Firebase Setup (both projects) — ~15 min
2. **Step 3** — Verification Engine (pure logic, no UI) — ~20 min
3. **Step 2** — Enhanced Scan Form (biggest change, depends on Step 1+3) — ~45 min
4. **Step 4** — Government Portal Updates (depends on Step 1) — ~30 min
5. **Step 5** — My Reports Screen (depends on Step 2) — ~30 min
6. **Step 6** — Mark Resolved flow (connects both apps) — ~20 min
7. **Step 7** — Notification badges (polish) — ~10 min

**Total estimated: ~2.5 hours**
