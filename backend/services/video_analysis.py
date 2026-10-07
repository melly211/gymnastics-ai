def choose_sampling_interval(duration_seconds):
    if duration_seconds <= 10:
        return 2
    if duration_seconds <= 30:
        return 4
    return 6


def read_video_metadata(video_path):
    import cv2

    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        raise ValueError('Video could not be opened for analysis.')

    fps = float(capture.get(cv2.CAP_PROP_FPS) or 0)
    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    duration = (frame_count / fps) if fps else 0.0

    capture.release()

    return {
        'fps': fps,
        'total_frames': frame_count,
        'width': width,
        'height': height,
        'duration': duration,
    }
