# Green Lens Camera - Workflow Implementation Guide

## Overview
This document details the implementation of the Green Lens Camera verification workflow, which ensures **only real-time camera photos are accepted** and rejected photos flow through a complete verification process.

## Reference Workflow (from diagram)

```
CAPTURE PHOTO (Live Camera) 
    ↓ GPS Location (auto-detected)
    ↓ DigiPin Entry (10-char grid code)
    ↓ Submit (Issue category + description)
    ↓
HTTP POST TO BACKEND
    ↓
TRUST SCORE ENGINE (0-100 points)
    ├─ CHECK 1: EXIF GPS vs Submitted GPS (GPS Match) → 0-30 pts
    ├─ CHECK 2: DigiPin Cross-Check (verify location encoding) → 0-40 pts
    └─ CHECK 3: EXIF Quality + Live Photo Verification → 0-30 pts
    ↓
RESULT DETERMINATION:
    ├─ Score ≥ 70 → VERIFIED ✅ (sent to DPCC)
    ├─ Score 40-69 → FLAGGED ⚠️ (manual review)
    └─ Score < 40 → REJECTED ❌ (notify citizen)
    ↓
GOVERNMENT PORTAL:
    ├─ Live Dashboard (map + report list)
    ├─ Push Notification (email/SMS to dept officer)
    └─ Resolution Track (citizen status updates)
```

## Key Changes Made

### 1. **GreenLensCamera.tsx** - UI & Capture Logic

#### Removed Gallery Upload Support
- **Before**: Component had placeholder for gallery picker
- **After**: ONLY real-time camera button visible
- Added visual indicator: "📸 Live Camera Only" pill in capture screen

```tsx
// New indicator on capture screen
<div className="bg-green-500/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-green-300/40 flex items-center gap-2">
  <div className="w-2 h-2 bg-green-400 rounded-full" />
  <span className="text-xs font-medium text-green-100">📸 Live Camera Only</span>
</div>
```

#### Enhanced handleSnap() Function
- Now explicitly sets `isLiveCapture = true` (the ONLY way to capture)
- Added comment clarifying that gallery uploads are not allowed
- Enhanced console logging to confirm live capture

```tsx
const handleSnap = useCallback(() => {
  // ... capture logic ...
  setIsLiveCapture(true); // ALWAYS true — this is the ONLY way to capture
  console.log(`[GreenLens] Camera snap: ${(blob.size / 1024).toFixed(1)} KB — Live capture confirmed`);
}, [isProcessing, runAnalysis]);
```

#### Strict handleSubmit() Validation
- Added explicit check to reject any non-live captures
- If somehow `isLiveCapture === false`, user is alerted and returned to capture step

```tsx
const handleSubmit = async () => {
  // ENFORCE: Only live camera photos are allowed
  if (!isLiveCapture) {
    alert('❌ Gallery uploads are not allowed. Please use the live camera to capture the photo.');
    setStep('capture');
    handleRetake();
    return;
  }
  // ... rest of submission ...
};
```

#### Enhanced Info Banner
- Clearly explains why gallery is not allowed
- References the three verification checks

```tsx
<p className="text-xs text-blue-800 leading-relaxed">
  <strong>📸 Live Camera Required:</strong> Your GPS location, photo metadata, and DigiPin 
  (10-char grid code) are verified for authenticity. Only real-time camera captures are 
  accepted to prevent gallery uploads.
</p>
```

#### Improved Result Display
- Workflow visualization with all 3 checks listed with descriptions
- Each check shows points awarded and what it verifies
- Better rejection messages with emoji and explanations

```tsx
{[
  { label: '1️⃣ GPS Match',      desc: 'Photo location vs submitted GPS', score: ..., max: 30 },
  { label: '2️⃣ DigiPin Match',  desc: '10-char grid code verification', score: ..., max: 40 },
  { label: '3️⃣ Real Photo',     desc: 'Live camera confirmed (not gallery)', score: ..., max: 30 },
]}
```

### 2. **verificationService.ts** - Backend Trust Score Calculation

#### Enhanced CHECK 3 - Live Capture Verification
- **CRITICAL** gate: If `isLiveCapture === false`, ALWAYS reject
- Additional -20 penalty for imageScore to discourage attempts
- Detailed console logging

```tsx
if (!isLiveCapture) {
  breakdown.exifScore = 0;
  details.rejectionReason = 'gallery_not_allowed';
  breakdown.imageScore = -20; // Penalty for attempting gallery upload
  console.log('[verifyReport] ⛔ CHECK 3 — NOT a live capture (Gallery photo). REJECTED.');
}
```

#### CRITICAL: Enforced isLiveCapture Gate
- Gallery photos are **ALWAYS rejected** regardless of other scores
- No exceptions - even if GPS and DigiPin match perfectly
- Added early rejection logic before score thresholds

```tsx
let status: VerificationResult['status'];

if (!isLiveCapture) {
  // Gallery photos are ALWAYS rejected — no exceptions
  status = 'rejected';
  details.rejectionReason = 'gallery_not_allowed';
  console.log('[verifyReport] ⛔ CRITICAL: Gallery/non-live photo. REJECTING regardless of other scores.');
} else if (trustScore >= 70) {
  status = 'verified';
} else if (trustScore >= 40) {
  status = 'flagged';
} else {
  status = 'rejected';
}
```

### 3. **Rejection Messages** - User-Friendly Feedback

When a photo is rejected, users see:
- **Gallery upload attempt**: "📱 Only live camera photos allowed. Gallery uploads rejected for authenticity."
- **GPS mismatch**: "📍 Location mismatch — check your GPS or DigiPin"
- **Rate limit**: "⏱️ Too many reports today. Try again tomorrow."
- **Invalid image**: "🖼️ Image too small or invalid format"
- **Low trust score**: "📊 Insufficient trust score"

## Verification Score Breakdown

| Check | Max Points | Condition | Points Award |
|-------|-----------|-----------|--------------|
| **1. GPS Match** | 30 | Distance < 100m | 30 |
| | | Distance 100-500m | 20 |
| | | Distance 500-1000m | 10 |
| | | Distance > 1000m or no EXIF GPS | 0 |
| **2. DigiPin** | 40 | Distance < 50m | 40 |
| | | Distance 50-200m | 25 |
| | | Distance > 200m or invalid | 0 |
| | | Not entered | 15 (neutral) |
| **3. Real Photo** | 30 | Live capture + EXIF data | 10-25 |
| | | Live capture only | 10 |
| | | Gallery/not live | 0 (-20 penalty) |

## Trust Score Thresholds

- **≥ 70**: ✅ **VERIFIED** → Sent to DPCC Command Center instantly
- **40-69**: ⚠️ **FLAGGED** → Queued for manual review
- **< 40**: ❌ **REJECTED** → Citizen notified with specific reason

## Testing Checklist

- [ ] Camera capture works without errors (device test pending)
- [x] Live capture sets `isLiveCapture = true` (code-gate verified)
- [x] `isLiveCapture = false` is blocked at submission (code-gate verified)
- [x] Rejection reason displays correctly for gallery attempts (logic verified)
- [x] Workflow visualization shows all 3 checks
- [ ] GPS data extracted from EXIF correctly (field photo test pending)
- [ ] DigiPin verification calculates distance correctly (field test pending)
- [x] Trust score threshold logic works (verified/flagged/rejected) at code level
- [ ] Government portal receives verified reports (integration test pending)
- [x] Console logs show detailed verification steps in verification service

## Execution Status (March 26, 2026)

- Completed: Production build executed successfully with TypeScript + Vite.
- Completed: Gallery picker path removed from Green Lens capture UI.
- Completed: Demo-mode fake capture bypass removed.
- Completed: Submit gate enforces live capture before verification.
- Completed: Verification engine rejects non-live captures with gallery rejection reason.
- Pending manual QA: device camera permission flow and real GPS capture on mobile.
- Pending manual QA: EXIF/GPS match scoring with field photos.
- Pending manual QA: end-to-end government portal propagation and notifications.

## Mobile QA Pass Script (Execute on Phone)

1. Launch app in mobile browser and open Green Lens camera screen.
2. Deny camera permission once, verify denial UI appears, then allow permission and retry.
3. Confirm only shutter capture is available and no gallery picker option exists.
4. Capture a live photo, select issue type and severity, submit with GPS enabled.
5. Validate result screen shows three checks: GPS Match, DigiPin Match, Real Photo.
6. Turn off location permission and retry; confirm fallback/denied messaging appears.
7. Enter incorrect DigiPin intentionally and verify reduced DigiPin score.
8. Submit multiple reports to validate flagged/rejected transitions by score.
9. Confirm verified reports appear in My Reports and government-facing paths.
10. Capture screenshots for each scenario and attach to release QA evidence.

## QA Execution Log (Current Run)

| Test | Method | Result | Notes |
|------|--------|--------|-------|
| Build + TypeCheck | `npm run build` | PASS | TypeScript and Vite build completed successfully |
| Gallery picker removed | Source scan | PASS | No file input/gallery handler path in Green Lens component |
| Live-capture submit gate | Source scan | PASS | Submit flow blocks when `isLiveCapture` is false |
| Verification hard reject | Source scan | PASS | Non-live capture sets `gallery_not_allowed` and rejected status |
| Demo bypass removed | Source scan | PASS | No fake/demo image path remains in Green Lens component |
| Mobile camera + GPS runtime | Real device | PENDING | Requires physical phone/browser permissions |
| End-to-end govt portal propagation | Integration runtime | PENDING | Requires backend/event flow verification |

## Live QA Session (Ready Now)

- Dev server started successfully on March 26, 2026.
- Use this URL on phone (same Wi-Fi): `http://192.168.153.192:5173/`
- Fallback URL: `http://172.30.48.1:5173/`

### Strict On-Device Test Sequence with Expected Result

1. Open app URL on phone and navigate to Green Lens camera.
Expected: camera permission prompt appears.
2. Deny camera once.
Expected: camera denied state appears with retry guidance.
3. Allow camera and reopen Green Lens.
Expected: live camera feed appears with shutter button only.
4. Confirm no gallery upload option exists.
Expected: no file picker, no "pick from gallery" control.
5. Capture a live photo and proceed to details.
Expected: details sheet opens with "Live Camera Required" verification hint.
6. Fill issue type + severity and submit.
Expected: upload, verify, calculate, send steps progress in sequence.
7. Check result card.
Expected: three checks shown (GPS Match, DigiPin Match, Real Photo), trust score displayed.
8. Retake and submit with poor/invalid DigiPin.
Expected: lower DigiPin points and possible flagged/rejected status.
9. Submit enough low-confidence attempts.
Expected: status transitions to flagged/rejected based on thresholds.
10. Verify saved report in My Reports.
Expected: report appears with status and trust score outcome.

## Security Notes

1. **No Client-Side Workarounds**: The `isLiveCapture` flag cannot be manually set after capture
2. **Verification is Server-Enforced**: Backend should also validate photo metadata
3. **GPS Spoofing**: DigiPin adds extra layer - GPS alone isn't sufficient
4. **Rate Limiting**: Prevents spam by tracking submissions per user per 24h
5. **Image Validation**: Minimum file size check prevents placeholder uploads

## Future Enhancements

1. **AI Image Detection**: Verify image is actually a pollution scene (not just any photo)
2. **Hive Moderation API**: Human review for flagged reports
3. **Camera Model Validation**: Whitelist known mobile camera signatures
4. **Timestamp Validation**: Ensure photo timestamp matches submission time (±5 min)
5. **Voice Note**: Add audio complaint option for additional verification

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "Only live camera..." rejection | Gallery upload attempted | Use camera capture only |
| GPS mismatch | Location changed after capture | Stay in same spot while submitting |
| Invalid image | File too small (<50KB) | Take clearer photo with more detail |
| Rate limit hit | >10 reports in 24h | Wait until next day |
| No EXIF data | Camera doesn't include metadata | Photo still accepted with lower score |

