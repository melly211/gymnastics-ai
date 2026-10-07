from pathlib import Path
import uuid

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from services.pose_analysis import analyze_video

app = FastAPI(title='Gymnastics AI Backend', version='0.1.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173', 'http://127.0.0.1:5173'],
    allow_origin_regex=r'^http://(localhost|127\.0\.0\.1)(:\d+)?$',
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

UPLOAD_DIRECTORY = Path(__file__).resolve().parent / 'uploads'
UPLOAD_DIRECTORY.mkdir(exist_ok=True)


@app.get('/')
def home():
    return {'message': 'Gymnastics AI Backend is running!'}


@app.get('/health')
def health_check():
    return {'status': 'healthy'}


@app.post('/api/analyze')
async def analyze(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail='Please select a valid video file.')

    allowed_extensions = {'.mp4', '.mov', '.m4v', '.avi', '.webm', '.wmv'}
    suffix = Path(file.filename).suffix.lower()
    if suffix not in allowed_extensions:
        raise HTTPException(status_code=400, detail='Unsupported file type. Please upload a common video format.')

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail='The uploaded file is empty.')
    if len(file_bytes) > 200 * 1024 * 1024:
        raise HTTPException(status_code=413, detail='File is too large. Please upload a video under 200MB.')

    unique_name = f'{uuid.uuid4().hex}{suffix}'
    temp_path = UPLOAD_DIRECTORY / unique_name
    temp_path.write_bytes(file_bytes)

    try:
        return analyze_video(temp_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f'Video analysis failed: {exc}') from exc
    finally:
        if temp_path.exists():
            temp_path.unlink()