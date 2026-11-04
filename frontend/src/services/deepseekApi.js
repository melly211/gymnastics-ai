const DEEPSEEK_MODEL = 'deepseek-chat'

function compactAnalysisPayload(analysis) {
  const joints = analysis?.joints || {}
  const symmetry = analysis?.symmetry || {}
  const movement = analysis?.movement || {}
  const tracking = analysis?.tracking || {}

  return {
    video: {
      filename: analysis?.video?.filename || 'unknown-video',
      movementType: analysis?.video?.movementType || 'Not specified',
      duration: analysis?.video?.duration || 0,
      width: analysis?.video?.width || 0,
      height: analysis?.video?.height || 0,
      analyzedFrames: analysis?.video?.analyzedFrames || 0,
    },
    tracking: {
      detectedFrames: tracking.detectedFrames || 0,
      detectionPercentage: Number(tracking.detectionPercentage ?? 0),
      averageVisibility: Number(tracking.averageVisibility ?? 0),
    },
    joints: {
      leftKnee: joints.leftKnee || { min: 0, max: 0, average: 0, range: 0 },
      rightKnee: joints.rightKnee || { min: 0, max: 0, average: 0, range: 0 },
      leftHip: joints.leftHip || { min: 0, max: 0, average: 0, range: 0 },
      rightHip: joints.rightHip || { min: 0, max: 0, average: 0, range: 0 },
      leftElbow: joints.leftElbow || { min: 0, max: 0, average: 0, range: 0 },
      rightElbow: joints.rightElbow || { min: 0, max: 0, average: 0, range: 0 },
    },
    symmetry: {
      kneeAverageDifference: Number(symmetry.kneeAverageDifference ?? 0),
      hipAverageDifference: Number(symmetry.hipAverageDifference ?? 0),
      elbowAverageDifference: Number(symmetry.elbowAverageDifference ?? 0),
    },
    movement: {
      torsoLeanMin: Number(movement.torsoLeanMin ?? 0),
      torsoLeanMax: Number(movement.torsoLeanMax ?? 0),
      torsoLeanRange: Number(movement.torsoLeanRange ?? 0),
    },
    observations: analysis?.observations || [],
  }
}

export async function generateMovementInterpretation(analysis) {
  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY

  if (!apiKey) {
    throw new Error('DeepSeek API key is not configured.')
  }

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a practical gymnastics movement-analysis assistant. You receive objective measurements, rule-based observations, and a user-selected movement category from pose-tracking software. Use the category to tailor general practice cues, but do not assume the video actually depicts that category or invent which skill or event was performed. Return valid JSON with exactly these fields: "summary" (one short plain-language paragraph), "what_went_well" (array of 1-3 concise points), "coaching_feedback" (array of 2-4 objects with "focus", "what_measurements_suggest", "change_to_make", "how_to_fix", and "try_this"), "practice_focus" (array of 2-3 specific, low-risk practice cues), "stretching_routine" (array of 2-3 objects with "exercise", "dosage", "technique_cue", and "relevance"), "strengthening_routine" (array of 2-3 objects with the same fields), and "tracking_note" (a short limitation note or an empty string). Make each coaching point concrete: name the measured pattern, explain the movement quality to work on, and give a clear step-by-step cue or controlled drill. Link each suggestion to the measurements, without overstating what joint angles can prove. For the routines, select simple, low-risk bodyweight exercises or gentle stretches relevant to the measured movement; include a realistic hold or set/repetition suggestion and one form cue. Explain relevance as a practice idea, not a diagnosis: joint angles cannot establish muscle weakness, tightness, injury, or its cause. Do not prescribe forcing a stretch, partner-applied pressure, or complex gymnastics skills. If tracking quality is limited, explicitly say that targeted conclusions are uncertain and keep routines general rather than claiming a specific deficit. Do not repeat degrees, percentages, ranges, or other numerical results in narrative explanations; those are already shown in the measurements dashboard. Do not diagnose, make guarantees, or assert elite/professional technique. Use supportive, conservative language. Keep sections concise, professional, and easy to act on.',
        },
        {
          role: 'user',
          content: JSON.stringify(compactAnalysisPayload(analysis)),
        },
      ],
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || 'DeepSeek report generation failed.')
  }

  const payload = await response.json()
  const content = payload?.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('DeepSeek returned an empty response.')
  }

  try {
    return JSON.parse(content)
  } catch {
    const trimmed = content.trim()
    return {
      summary: trimmed,
      review_points: ['DeepSeek response was returned as plain text and preserved without modification.'],
      coaching_feedback: [],
      practice_focus: [],
      stretching_routine: [],
      strengthening_routine: [],
      what_went_well: [],
      tracking_note: '',
      raw: trimmed,
    }
  }
}
