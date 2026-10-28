import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'

import {
  JOINT_DEFINITIONS,
  JOINT_KEYS,
  calculateAngle,
  average,
  getLandmarkPosition,
  summarizeAngles,
} from '../utils/angleUtils'

const MODEL_ASSET_PATH =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
const VISION_WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm'

let landmarkerPromise

async function loadPoseLandmarker() {
  if (!landmarkerPromise) {
    const vision = await FilesetResolver.forVisionTasks(VISION_WASM_PATH)
    landmarkerPromise = PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_ASSET_PATH,
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.3,
    })
  }

  return landmarkerPromise
}

function averageVisibility(landmarks) {
  if (!landmarks || !landmarks.length) {
    return 0
  }

  const all = landmarks.map((landmark) => landmark.visibility ?? 0.5)
  return average(all)
}

function sampleFromVideo(video, timestamp) {
  return new Promise((resolve, reject) => {
    const handleSeeked = () => {
      cleanup()
      resolve()
    }

    const handleError = () => {
      cleanup()
      reject(new Error('The selected video could not be read for analysis.'))
    }

    const cleanup = () => {
      video.removeEventListener('seeked', handleSeeked)
      video.removeEventListener('error', handleError)
    }

    video.addEventListener('seeked', handleSeeked, { once: true })
    video.addEventListener('error', handleError, { once: true })

    try {
      if (Math.abs(video.currentTime - timestamp) < 0.05) {
        cleanup()
        resolve()
        return
      }
      video.currentTime = timestamp
    } catch (error) {
      cleanup()
      reject(error)
    }
  })
}

function buildFrameAngles(landmarks) {
  const angles = {}

  for (const key of JOINT_KEYS) {
    const definition = JOINT_DEFINITIONS[key]
    const pointA = getLandmarkPosition(landmarks, definition.a)
    const pointB = getLandmarkPosition(landmarks, definition.b)
    const pointC = getLandmarkPosition(landmarks, definition.c)

    if (!pointA || !pointB || !pointC) {
      continue
    }

    const visibility = (pointA.visibility + pointB.visibility + pointC.visibility) / 3
    if (visibility < 0.2) {
      continue
    }

    const value = calculateAngle(
      [pointA.x, pointA.y],
      [pointB.x, pointB.y],
      [pointC.x, pointC.y],
    )

    if (Number.isFinite(value)) {
      angles[key] = value
    }
  }

  return angles
}

function calculateVectorAngle(vectorA, vectorB) {
  const dot = vectorA.x * vectorB.x + vectorA.y * vectorB.y
  const magnitudeA = Math.hypot(vectorA.x, vectorA.y)
  const magnitudeB = Math.hypot(vectorB.x, vectorB.y)

  if (!magnitudeA || !magnitudeB) {
    return 0
  }

  const cosine = Math.max(-1, Math.min(1, dot / (magnitudeA * magnitudeB)))
  return (Math.acos(cosine) * 180) / Math.PI
}

function calculateTorsoLean(landmarks) {
  const leftShoulder = getLandmarkPosition(landmarks, 'LEFT_SHOULDER')
  const leftHip = getLandmarkPosition(landmarks, 'LEFT_HIP')
  const rightShoulder = getLandmarkPosition(landmarks, 'RIGHT_SHOULDER')
  const rightHip = getLandmarkPosition(landmarks, 'RIGHT_HIP')

  const leftAngle = leftShoulder && leftHip
    ? calculateVectorAngle(
        { x: leftShoulder.x - leftHip.x, y: leftShoulder.y - leftHip.y },
        { x: 0, y: -1 },
      )
    : null

  const rightAngle = rightShoulder && rightHip
    ? calculateVectorAngle(
        { x: rightShoulder.x - rightHip.x, y: rightShoulder.y - rightHip.y },
        { x: 0, y: -1 },
      )
    : null

  return {
    left: leftAngle,
    right: rightAngle,
    average: average([leftAngle ?? 0, rightAngle ?? 0].filter((value) => Number.isFinite(value))),
  }
}

function buildObservations(metadata) {
  const observations = []
  const { joints, symmetry, detectionPercentage } = metadata

  const kneeDifference = symmetry.kneeAverageDifference ?? 0
  if (kneeDifference < 8) {
    observations.push('Left and right knee movement was relatively symmetrical.')
  } else if (kneeDifference > 15) {
    observations.push('Noticeable left-right difference was detected in knee movement.')
  }

  const hipDifference = symmetry.hipAverageDifference ?? 0
  if (hipDifference > 10) {
    observations.push('Hip alignment differences were present across the analyzed sequence.')
  }

  const elbowDifference = symmetry.elbowAverageDifference ?? 0
  if (elbowDifference > 12) {
    observations.push('Elbow movement showed measurable asymmetry between sides.')
  }

  const leftKneeMin = joints.leftKnee?.min ?? 0
  const rightKneeMin = joints.rightKnee?.min ?? 0
  if (leftKneeMin < 90 || rightKneeMin < 90) {
    observations.push('Deep knee flexion was detected during the movement cycle.')
  }

  const leftKneeMax = joints.leftKnee?.max ?? 0
  const rightKneeMax = joints.rightKnee?.max ?? 0
  if (leftKneeMax > 165 || rightKneeMax > 165) {
    observations.push('Near-full knee extension was detected.')
  }

  if (detectionPercentage < 70) {
    observations.push('Pose tracking quality was limited. Use a video where the full body remains visible for more reliable measurements.')
  }

  return observations.length ? observations : ['Pose landmarks were detected and joint angles were calculated across the analyzed sequence.']
}

export async function analyzeVideo(file, onProgress, movementType = '') {
  if (!file) {
    throw new Error('Please choose a video before analyzing.')
  }

  const landmarker = await loadPoseLandmarker()
  const videoUrl = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.src = videoUrl
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'

  await new Promise((resolve, reject) => {
    const handleReady = () => {
      cleanup()
      resolve()
    }

    const handleError = () => {
      cleanup()
      reject(new Error('The selected video could not load. Please try another file.'))
    }

    const cleanup = () => {
      video.removeEventListener('loadedmetadata', handleReady)
      video.removeEventListener('error', handleError)
    }

    video.addEventListener('loadedmetadata', handleReady, { once: true })
    video.addEventListener('error', handleError, { once: true })
  })

  const duration = Number.isFinite(video.duration) ? video.duration : 0
  const width = video.videoWidth || 0
  const height = video.videoHeight || 0

  const maxSamples = Math.min(500, Math.max(30, Math.round(Math.max(duration, 1) * 6)))
  const sampleTimes = Array.from({ length: maxSamples }, (_, index) => {
    const ratio = index / Math.max(maxSamples - 1, 1)
    return Math.min(Math.max(duration * ratio, 0.05), Math.max(duration - 0.05, 0.05))
  })

  const frames = []
  let detectedFrames = 0
  let visibilityValues = []

  for (let index = 0; index < sampleTimes.length; index += 1) {
    const timestamp = sampleTimes[index]
    await sampleFromVideo(video, timestamp)

    const result = landmarker.detectForVideo(video, performance.now())
    const landmarks = result?.landmarks?.[0]

    if (landmarks && landmarks.length) {
      const angles = buildFrameAngles(landmarks)
      const frameVisibility = averageVisibility(landmarks)
      visibilityValues.push(frameVisibility)

      if (Object.keys(angles).length > 0) {
        detectedFrames += 1
      }

      const torsoLean = calculateTorsoLean(landmarks)

      frames.push({
        time: Number(timestamp.toFixed(2)),
        visibility: frameVisibility,
        angles,
        torsoLean,
      })
    }

    const progress = ((index + 1) / sampleTimes.length) * 100
    onProgress?.({
      progress,
      message: `Analyzing frame ${index + 1} / ${sampleTimes.length}`,
    })
  }

  if (!frames.length) {
    URL.revokeObjectURL(videoUrl)
    throw new Error('No person was detected in the uploaded video. Please use a frame with full-body visibility.')
  }

  const jointValues = {}
  for (const key of JOINT_KEYS) {
    jointValues[key] = (frames || [])
      .map((frame) => frame.angles?.[key])
      .filter((value) => Number.isFinite(value))
  }

  const joints = {}
  for (const key of JOINT_KEYS) {
    joints[key] = summarizeAngles(jointValues[key] || [])
  }

  const symmetry = {
    kneeAverageDifference: average(
      frames.map((frame) => {
        const left = frame.angles?.leftKnee
        const right = frame.angles?.rightKnee
        if (!Number.isFinite(left) || !Number.isFinite(right)) return 0
        return Math.abs(left - right)
      }),
    ),
    hipAverageDifference: average(
      frames.map((frame) => {
        const left = frame.angles?.leftHip
        const right = frame.angles?.rightHip
        if (!Number.isFinite(left) || !Number.isFinite(right)) return 0
        return Math.abs(left - right)
      }),
    ),
    elbowAverageDifference: average(
      frames.map((frame) => {
        const left = frame.angles?.leftElbow
        const right = frame.angles?.rightElbow
        if (!Number.isFinite(left) || !Number.isFinite(right)) return 0
        return Math.abs(left - right)
      }),
    ),
  }

  const detectionPercentage = (detectedFrames / frames.length) * 100
  const averageVisibilityScore = average(visibilityValues)
  const movementRange = average(Object.values(joints).map((joint) => joint.range))
  const torsoLeanValues = frames.map((frame) => frame.torsoLean?.average).filter((value) => Number.isFinite(value))
  const torsoLeanSummary = summarizeAngles(torsoLeanValues)

  const analysis = {
    video: {
      filename: file.name,
      movementType,
      duration,
      width,
      height,
      analyzedFrames: frames.length,
      fileSize: file.size,
    },
    tracking: {
      detectedFrames,
      detectionPercentage,
      averageVisibility: averageVisibilityScore,
      framesAnalyzed: frames.length,
      videoDuration: duration,
    },
    joints,
    symmetry,
    movement: {
      torsoLeanMin: torsoLeanSummary.min,
      torsoLeanMax: torsoLeanSummary.max,
      torsoLeanRange: torsoLeanSummary.range,
      duration,
      coverage: detectionPercentage,
    },
    frames: frames.map((frame) => ({
      time: frame.time,
      angles: frame.angles,
      torsoLean: frame.torsoLean,
    })),
    summary: {
      pose_detected_percentage: detectionPercentage,
      average_visibility: averageVisibilityScore,
      movement_range: movementRange > 60 ? 'wide' : movementRange > 30 ? 'moderate' : 'limited',
      coverage: detectionPercentage,
      average_visibility_percentage: averageVisibilityScore * 100,
      movement_duration: duration,
      torso_lean_range: torsoLeanSummary.range,
      left_right_knee_difference: symmetry.kneeAverageDifference,
      left_right_hip_difference: symmetry.hipAverageDifference,
      left_right_elbow_difference: symmetry.elbowAverageDifference,
    },
    observations: buildObservations({
      joints,
      symmetry,
      detectionPercentage,
    }),
  }

  URL.revokeObjectURL(videoUrl)

  return analysis
}
