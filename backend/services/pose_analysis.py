from __future__ import annotations

from pathlib import Path

import cv2
import mediapipe as mp

from .angle_utils import calculate_angle
from .video_analysis import choose_sampling_interval, read_video_metadata

mp_pose = mp.solutions.pose

ANGLE_MAPPING = {
    'left_elbow': (11, 13, 15),
    'right_elbow': (12, 14, 16),
    'left_knee': (23, 25, 27),
    'right_knee': (24, 26, 28),
    'left_hip': (11, 23, 25),
    'right_hip': (12, 24, 26),
}

POSE_INDICES = sorted({idx for mapping in ANGLE_MAPPING.values() for idx in mapping})


def _extract_point(landmarks, index):
    if index >= len(landmarks):
        return None
    landmark = landmarks[index]
    if landmark.visibility is not None and landmark.visibility < 0.1:
        return None
    return (landmark.x, landmark.y)


def _average_visibility(landmarks):
    values = []
    for index in POSE_INDICES:
        if index < len(landmarks):
            landmark = landmarks[index]
            if landmark.visibility is not None:
                values.append(float(landmark.visibility))
    if not values:
        return 0.0
    return sum(values) / len(values)


def _build_frame_angles(landmarks):
    frame_angles = {}
    for label, (a_idx, b_idx, c_idx) in ANGLE_MAPPING.items():
        a = _extract_point(landmarks, a_idx)
        b = _extract_point(landmarks, b_idx)
        c = _extract_point(landmarks, c_idx)
        if a is None or b is None or c is None:
            continue
        angle = calculate_angle(a, b, c)
        frame_angles[label] = round(float(angle), 2)
    return frame_angles


def _build_statistics(frames):
    stats = {}

    for key in ANGLE_MAPPING:
        values = [frame['angles'].get(key) for frame in frames if key in frame['angles']]
        if not values:
            continue
        stats[key] = {
            'min': round(min(values), 2),
            'max': round(max(values), 2),
            'average': round(sum(values) / len(values), 2),
        }

    return stats


def _movement_range(summary):
    if summary['pose_detected_percentage'] < 60:
        return 'limited'
    if summary['average_visibility'] > 0.75 and summary['pose_detected_percentage'] > 80:
        return 'moderate'
    return 'low'


def _build_feedback(summary, statistics):
    feedback = []

    if summary['pose_detected_percentage'] < 70:
        feedback.append('Pose tracking confidence was limited. Try using a clearer video with the full body visible in frame.')

    left_knee = statistics.get('left_knee')
    right_knee = statistics.get('right_knee')
    if left_knee and right_knee:
        asymmetry = abs(left_knee['average'] - right_knee['average'])
        if asymmetry > 12:
            feedback.append('Noticeable asymmetry detected between left and right knee movement.')

    for side in ('left', 'right'):
        knee_key = f'{side}_knee'
        if knee_key not in statistics:
            continue
        knee_stats = statistics[knee_key]
        if knee_stats['min'] < 90:
            feedback.append(f'{side.title()} knee flexion reached deep angles during the movement.')
        if knee_stats['max'] > 165:
            feedback.append(f'{side.title()} knee extension remained strong through several recorded frames.')

    left_hip = statistics.get('left_hip')
    right_hip = statistics.get('right_hip')
    if left_hip and right_hip:
        hip_balance = abs(left_hip['average'] - right_hip['average'])
        if hip_balance < 10:
            feedback.append('Hip movement appears relatively balanced across both sides.')

    if not feedback:
        feedback.append('Movement patterns were detected with moderate consistency and may benefit from review across key phases.')

    return feedback


def analyze_video(video_path):
    file_path = Path(video_path)
    metadata = read_video_metadata(file_path)

    fps = metadata['fps'] or 30.0
    duration = metadata['duration'] or 0.0
    step = choose_sampling_interval(duration)
    sample_limit = 150

    cap = cv2.VideoCapture(str(file_path))
    if not cap.isOpened():
        raise ValueError('Video could not be opened for analysis.')

    with mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
        frames = []
        sampled_count = 0
        detected_count = 0
        total_visibility = 0.0
        frame_index = 0

        while True:
            success, frame = cap.read()
            if not success:
                break

            if frame_index % step != 0:
                frame_index += 1
                continue

            if sampled_count >= sample_limit:
                break

            sampled_count += 1
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose.process(rgb_frame)
            if not results.pose_landmarks:
                frame_index += 1
                continue

            detected_count += 1
            landmarks = results.pose_landmarks.landmark
            total_visibility += _average_visibility(landmarks)

            frame_angles = _build_frame_angles(landmarks)
            if not frame_angles:
                frame_index += 1
                continue

            frames.append({
                'time': round(frame_index / fps, 2),
                'angles': frame_angles,
            })

            frame_index += 1

    cap.release()

    if not frames:
        raise ValueError("No usable joint angles could be calculated. Ensure the athlete's full body is visible in the video.")

    average_visibility = (total_visibility / detected_count) if detected_count else 0.0
    summary = {
        'pose_detected_percentage': round((detected_count / sampled_count) * 100, 2) if sampled_count else 0.0,
        'average_visibility': round(average_visibility, 2),
        'movement_range': _movement_range({
            'pose_detected_percentage': (detected_count / sampled_count) * 100 if sampled_count else 0.0,
            'average_visibility': average_visibility,
        }),
    }

    statistics = _build_statistics(frames)
    feedback = _build_feedback(summary, statistics)

    return {
        'video': {
            'filename': file_path.name,
            'fps': round(fps, 2) if fps else 0,
            'duration': round(duration, 2),
            'total_frames': metadata['total_frames'],
            'analyzed_frames': len(frames),
            'width': metadata['width'],
            'height': metadata['height'],
        },
        'summary': summary,
        'statistics': statistics,
        'frames': frames,
        'feedback': feedback,
    }
