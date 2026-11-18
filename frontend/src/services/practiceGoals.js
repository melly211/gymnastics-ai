const STORAGE_KEY = 'gymnastics-ai-practice-goals'
const DEFAULT_TARGET_DAYS = 3

export function localDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseStoredGoals() {
  let stored
  try {
    stored = globalThis.localStorage.getItem(STORAGE_KEY)
  } catch (error) {
    throw new Error('Practice goals could not be accessed in this browser.', { cause: error })
  }

  if (!stored) {
    return { targetDays: DEFAULT_TARGET_DAYS, sessions: [], journal: {} }
  }

  let data
  try {
    data = JSON.parse(stored)
  } catch (error) {
    throw new Error('Saved practice goals could not be read. Clear this site’s practice-goal data and try again.', { cause: error })
  }

  const journal = data?.journal === undefined ? {} : data.journal

  if (
    !data
    || !Number.isInteger(data.targetDays)
    || data.targetDays < 1
    || data.targetDays > 7
    || !Array.isArray(data.sessions)
    || data.sessions.some((session) => !/^\d{4}-\d{2}-\d{2}$/.test(session))
    || !journal
    || typeof journal !== 'object'
    || Array.isArray(journal)
    || Object.entries(journal).some(([date, entry]) => (
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
      || !entry
      || typeof entry.focus !== 'string'
      || entry.focus.length > 80
      || typeof entry.notes !== 'string'
      || entry.notes.length > 1000
      || !Number.isInteger(entry.minutes)
      || entry.minutes < 0
      || entry.minutes > 1440
    ))
  ) {
    throw new Error('Saved practice data is invalid. Clear this site’s practice-goal data and try again.')
  }

  return {
    targetDays: data.targetDays,
    sessions: [...new Set(data.sessions)].sort(),
    journal,
  }
}

function saveGoals(goals) {
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(goals))
  } catch (error) {
    throw new Error('Practice data could not be saved in this browser.', { cause: error })
  }
}

function startOfWeek(date) {
  const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const daysSinceMonday = (weekStart.getDay() + 6) % 7
  weekStart.setDate(weekStart.getDate() - daysSinceMonday)
  return weekStart
}

function getStreak(sessions, today) {
  const loggedDays = new Set(sessions)
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (!loggedDays.has(localDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
  }

  let streak = 0
  while (loggedDays.has(localDateKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

function progressFor(goals, today = new Date()) {
  const todayKey = localDateKey(today)
  const weekStartKey = localDateKey(startOfWeek(today))
  const sessionsThisWeek = goals.sessions.filter((session) => session >= weekStartKey && session <= todayKey).length

  return {
    targetDays: goals.targetDays,
    sessionsThisWeek,
    currentStreak: getStreak(goals.sessions, today),
    hasLoggedToday: goals.sessions.includes(todayKey),
    sessions: goals.sessions,
  }
}

export function getPracticeProgress() {
  return progressFor(parseStoredGoals())
}

export function getPracticeJournalEntry(date = new Date()) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
    throw new Error('Choose a valid date for this practice entry.')
  }

  const goals = parseStoredGoals()
  const entry = goals.journal[localDateKey(date)]
  return entry ? { ...entry } : { focus: '', notes: '', minutes: 0 }
}

export function savePracticeJournalEntry(date, entry) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
    throw new Error('Choose a valid date for this practice entry.')
  }
  if (
    !entry
    || typeof entry.focus !== 'string'
    || typeof entry.notes !== 'string'
    || !Number.isInteger(entry.minutes)
    || entry.minutes < 0
    || entry.minutes > 1440
  ) {
    throw new Error('Enter a practice focus, notes, and a duration between zero and 1,440 minutes.')
  }

  const focus = entry.focus.trim()
  const notes = entry.notes.trim()
  if (focus.length > 80 || notes.length > 1000) {
    throw new Error('Keep the practice focus under 80 characters and notes under 1,000 characters.')
  }

  const goals = parseStoredGoals()
  const dateKey = localDateKey(date)
  const journal = { ...goals.journal }
  const hasDetails = Boolean(focus || notes || entry.minutes)

  if (hasDetails) {
    journal[dateKey] = { focus, notes, minutes: entry.minutes }
  } else {
    delete journal[dateKey]
  }

  const nextGoals = {
    ...goals,
    sessions: [...new Set([...goals.sessions, dateKey])].sort(),
    journal,
  }
  saveGoals(nextGoals)

  return {
    progress: progressFor(nextGoals),
    entry: hasDetails ? { focus, notes, minutes: entry.minutes } : { focus: '', notes: '', minutes: 0 },
  }
}

export function updateWeeklyPracticeGoal(targetDays) {
  if (!Number.isInteger(targetDays) || targetDays < 1 || targetDays > 7) {
    throw new Error('Choose a weekly practice goal between one and seven days.')
  }

  const goals = { ...parseStoredGoals(), targetDays }
  saveGoals(goals)
  return progressFor(goals)
}

export function logPracticeSession(date = new Date()) {
  const goals = parseStoredGoals()
  const sessionDate = localDateKey(date)
  const nextGoals = {
    ...goals,
    sessions: [...new Set([...goals.sessions, sessionDate])].sort(),
  }
  saveGoals(nextGoals)
  return progressFor(nextGoals, date)
}
