# Backend Verification Engine

A high-performance, low-latency (<1s) verification pipeline for a Citizen Pollution Reporting Platform.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        VERIFICATION PIPELINE                              │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐     ┌──────────────────────────────────────────┐     │
│  │  INCOMING    │     │       TIER 1: PRE-CHECKS                  │     │
│  │  REQUEST     │────▶│  • Rate Limiting (Redis)                   │     │
│  │  /submit     │     │  • pHash Duplicate Check                   │     │
│  └──────────────┘     │  • Device Integrity (Attestation Token)    │     │
│                       │  • Time Buffer (< 15 min)                  │     │
│                       └──────────────────────────────────────────┘     │
│                                      │                                    │
│                                      ▼                                    │
│                       ┌──────────────────────────────────────────┐     │
│                       │       TIER 2: PARALLEL AI VERIFICATION   │     │
│                       │         Using Promise.all                │     │
│                       │  ┌─────────┐ ┌─────────┐ ┌───────────┐  │     │
│                       │  │ BLOCK A │ │ BLOCK B │ │ BLOCK C  │  │     │
│                       │  │ AI      │ │Content  │ │Location  │  │     │
│                       │  │Forgery  │ │Context  │ │Triangul. │  │     │
│                       │  │Suite    │ │NLP      │ │DigiPin   │  │     │
│                       │  └─────────┘ └─────────┘ └───────────┘  │     │
│                       └──────────────────────────────────────────┘     │
│                                      │                                    │
│                                      ▼                                    │
│                       ┌──────────────────────────────────────────┐     │
│                       │        COMPOSITE SCORING ENGINE          │     │
│                       │  • Calculate weighted trust_score        │     │
│                       │  • Apply routing logic                    │     │
│                       └──────────────────────────────────────────┘     │
│                                      │                                    │
│                                      ▼                                    │
│                       ┌──────────────────────────────────────────┐     │
│                       │           OUTPUT & BROADCAST             │     │
│                       │  • WebSocket to Government Dashboard     │     │
│                       │  • Status: VERIFIED_PRIORITY/PENDING/REJ│     │
│                       └──────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
```

## Scoring Matrix

| Component | Weight | Criteria |
|-----------|--------|----------|
| Liveness | 25% | Pass = 100, Fail = 0 |
| GAN Detection | 15% | Inverse of AI confidence |
| Classification | 15% | Top label > 0.5 = 80 |
| NLP Consistency | 15% | Matched labels in desc |
| DigiPin Match | 15% | Valid = 100, Invalid = 0 |
| Scene Context | 15% | Matches terrain = 100 |

## Routing Logic

- **Score >= 80 AND Liveness == Pass**: `VERIFIED_PRIORITY` → Instant WebSocket alert
- **Score 60-79 AND Liveness == Pass**: `PENDING_REVIEW` → Human moderation
- **Score < 60 OR Liveness == Fail**: `REJECTED` → Generic 400 error

## Security: Blind Rejection

All rejected reports return a generic error:
```json
{"error": "Could not verify authenticity of the report."}
```

This prevents attackers from probing AI thresholds.

## Quick Start (Local)

```bash
# Install dependencies
cd verification-engine
npm install

# Build TypeScript
npm run build

# Run the server
npm start
# or for development
npm run dev
```

## Deployment to Render

### Option 1: GitHub Integration (Recommended)

1. Push `verification-engine` folder to a GitHub repo
2. Go to [render.com](https://render.com) and create a new Web Service
3. Connect your GitHub repo
4. Configure:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Click "Create Web Service"

### Option 2: Render CLI

```bash
# Install render CLI
npm install -g render-cli

# Deploy
render deploy
```

### Environment Variables

Set in Render dashboard:
| Variable | Value | Description |
|----------|-------|-------------|
| `REDIS_HOST` | (optional) | Redis host for rate limiting |
| `REDIS_PORT` | 6379 | Redis port |
| `REDIS_PASSWORD` | (optional) | Redis password |

**Note**: The engine works with in-memory storage when Redis is unavailable.

## API Usage

```bash
curl -X POST https://your-app.onrender.com/api/v1/reports/submit \
  -H "Content-Type: application/json" \
  -d '{
    "image": "base64_or_url",
    "gps_lat": 28.6139,
    "gps_lng": 77.2090,
    "digipin": "ABCD123456",
    "description": "Smoke from factory",
    "capture_timestamp": "2024-01-15T10:30:00Z",
    "submission_timestamp": "2024-01-15T10:35:00Z",
    "attestation_token": "attestation_valid_token",
    "client_phash": "abc123hash"
  }'
```

## WebSocket

Connect to `wss://your-app.onrender.com/ws` for real-time alerts.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/reports/submit | Submit pollution report |
| GET | /ws | WebSocket for real-time alerts |
| GET | /health | Health check |
