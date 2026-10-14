# Gymnastics AI

Gymnastics AI is a lightweight sports-tech MVP for analyzing gymnastics movement from uploaded videos. It combines a FastAPI backend with MediaPipe pose tracking and a React frontend dashboard for reviewing joint angles and motion metrics.

## Features

- Landing page and modern sports-tech UI
- Video upload and file preview
- FastAPI analysis endpoint
- MediaPipe pose detection
- Joint angle extraction for elbows and knees
- Simple movement statistics and feedback
- Recharts dashboard for time-series motion data
- Private analysis history saved in the current browser, including the original videos

## Tech Stack

- Frontend: React, Vite, React Router, Recharts, Lucide React
- Backend: FastAPI, Python 3.12, OpenCV, MediaPipe, NumPy

## Project Structure

```text
gymnastics-ai/
├── backend/
│   ├── main.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── angle_utils.py
│   │   ├── pose_analysis.py
│   │   └── video_analysis.py
│   └── uploads/
│       └── .gitkeep
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── .gitignore
├── README.md
└── .venv/
```

## macOS Setup

### Backend

```bash
cd backend
source .venv/bin/activate
python -m pip install fastapi uvicorn mediapipe opencv-python numpy python-multipart
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

## Run Both Services

In separate terminals:

```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload
```

```bash
cd frontend
npm run dev -- --host 0.0.0.0
```

Then open the frontend in the browser at `http://localhost:5173`.

## How It Works

1. Upload a gymnastics video from the Analyze page.
2. MediaPipe detects pose landmarks in the browser as the video is sampled.
3. Joint angles and movement statistics are calculated from the detected landmarks.
4. The analysis and original video are saved in this browser's IndexedDB and shown on the results dashboard.

Saved history is local to the current browser profile and is not uploaded or synced. Clearing this site's browser data removes the saved analyses and videos. Browser storage limits apply, so saving can fail if there is not enough space.

## Known Limitations

- This is an experimental movement-analysis MVP and not a substitute for coaching or medical evaluation.
- Pose tracking depends on video clarity, camera angle, and full-body visibility.
- Large videos may take longer to process.
- Analysis is based on basic rule-driven posture metrics, not advanced gymnastics scoring.

## Future Improvements

- Better filtering and smoothing of joint angle data
- Video overlay with pose landmarks
- More advanced movement scoring
- Model-based coaching recommendations
