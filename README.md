# Gymnastics AI

Gymnastics AI is a frontend-only demo for analyzing gymnastics movement from uploaded videos. The app runs entirely from GitHub Pages and performs pose tracking locally in the browser using MediaPipe and JavaScript geometry.

This frontend-only demo exposes the DeepSeek API key and must not be used for production. Use a backend/serverless proxy for production deployment.

## Features

- Landing page and polished sports-tech UI
- Video upload, preview, and replacement flow
- Local browser-side pose detection with MediaPipe
- Real joint angle calculations for knees, hips, elbows, shoulders, wrists, and ankles
- Motion symmetry and torso lean metrics
- Recharts time-series dashboards for angle tracking
- AI interpretation through the DeepSeek Chat Completions API using only calculated movement metrics
- PDF export for a professional movement-analysis report
- Private analysis history saved in the current browser, including the original videos

## Tech Stack

- Frontend: React, Vite, React Router, Recharts, Lucide React, jsPDF, html2canvas
- AI: DeepSeek Chat Completions API
- Pose analysis: MediaPipe Tasks Vision

## Project Structure

```text
gymnastics-ai/
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── vite.config.js
│   └── public/
├── backend/
│   └── (legacy / not required for this GitHub Pages demo)
├── README.md
└── .gitignore
```

## Frontend-only setup

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

Then open the frontend in the browser at `http://localhost:5173`.

## GitHub Pages deployment

The app is configured for the repository path and uses a hash router so pages work correctly on GitHub Pages without 404s.

```bash
cd frontend
npm run build
```

## How it works

1. Upload a gymnastics video from the Analyze page.
2. MediaPipe detects pose landmarks locally in the browser as the video is sampled.
3. Joint angles and movement statistics are calculated from the detected landmarks.
4. The results dashboard shows real movement metrics and optional AI interpretation.
5. The generated report can be exported as a PDF.

Saved history is local to the current browser profile and is not uploaded or synced. Clearing this site's browser data removes the saved analyses and videos. Browser storage limits apply, so saving can fail if there is not enough space.

## Known limitations

- This is an experimental movement-analysis demo and not a substitute for coaching or medical evaluation.
- Pose tracking depends on video clarity, camera angle, and full-body visibility.
- Large videos may take longer to process.
- Analysis is based on basic rule-driven posture metrics, not advanced gymnastics scoring.

## Environment variable

For the optional AI interpretation feature, set the following environment variable in your build environment:

```bash
VITE_DEEPSEEK_API_KEY=your_api_key_here
```

If the key is absent, the AI report button is disabled and the app shows a clear prompt instead.
