export const JOINT_KEYS = [
  'leftKnee',
  'rightKnee',
  'leftHip',
  'rightHip',
  'leftElbow',
  'rightElbow',
]

export const JOINT_DEFINITIONS = {
  leftKnee: { a: 'LEFT_HIP', b: 'LEFT_KNEE', c: 'LEFT_ANKLE' },
  rightKnee: { a: 'RIGHT_HIP', b: 'RIGHT_KNEE', c: 'RIGHT_ANKLE' },
  leftHip: { a: 'LEFT_SHOULDER', b: 'LEFT_HIP', c: 'LEFT_KNEE' },
  rightHip: { a: 'RIGHT_SHOULDER', b: 'RIGHT_HIP', c: 'RIGHT_KNEE' },
  leftElbow: { a: 'LEFT_SHOULDER', b: 'LEFT_ELBOW', c: 'LEFT_WRIST' },
  rightElbow: { a: 'RIGHT_SHOULDER', b: 'RIGHT_ELBOW', c: 'RIGHT_WRIST' },
}

export const LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
}

export function calculateAngle(pointA, pointB, pointC) {
  const [ax, ay] = pointA
  const [bx, by] = pointB
  const [cx, cy] = pointC

  const ba = [ax - bx, ay - by]
  const bc = [cx - bx, cy - by]

  const dot = ba[0] * bc[0] + ba[1] * bc[1]
  const magnitudeBA = Math.hypot(ba[0], ba[1])
  const magnitudeBC = Math.hypot(bc[0], bc[1])

  if (!magnitudeBA || !magnitudeBC) {
    return 0
  }

  const cosine = Math.max(-1, Math.min(1, dot / (magnitudeBA * magnitudeBC)))
  return (Math.acos(cosine) * 180) / Math.PI
}

export function getLandmarkPosition(landmarks, name) {
  if (!landmarks || !Array.isArray(landmarks)) {
    return null
  }

  const index = LANDMARKS[name]
  const landmark = landmarks[index]

  if (!landmark) {
    return null
  }

  return { x: landmark.x, y: landmark.y, z: landmark.z ?? 0, visibility: landmark.visibility ?? 0.5 }
}

export function average(values) {
  const valid = values.filter((value) => Number.isFinite(value) && value !== null)
  if (!valid.length) return 0
  return valid.reduce((total, value) => total + value, 0) / valid.length
}

export function rangeOf(values) {
  const valid = values.filter((value) => Number.isFinite(value))
  if (!valid.length) return 0
  return Math.max(...valid) - Math.min(...valid)
}

export function summarizeAngles(values) {
  const clean = values.filter((value) => Number.isFinite(value))
  if (!clean.length) {
    return { min: 0, max: 0, average: 0, range: 0 }
  }

  return {
    min: Math.min(...clean),
    max: Math.max(...clean),
    average: average(clean),
    range: Math.max(...clean) - Math.min(...clean),
  }
}
