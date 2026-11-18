import { BookOpen, CalendarCheck, CheckCircle2, ChevronLeft, ChevronRight, Flame, Save, Target } from 'lucide-react'
import { useState } from 'react'

import {
  getPracticeJournalEntry,
  getPracticeProgress,
  localDateKey,
  logPracticeSession,
  savePracticeJournalEntry,
  updateWeeklyPracticeGoal,
} from '../services/practiceGoals'

function Goals() {
  const [today] = useState(() => new Date())
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(today)
  const [initialState] = useState(() => {
    let progress = null
    let journalEntry = { focus: '', notes: '', minutes: 0 }
    let error = ''

    try {
      progress = getPracticeProgress()
    } catch (loadError) {
      error = loadError.message || 'Practice goals could not be loaded.'
    }

    if (progress) {
      try {
        journalEntry = getPracticeJournalEntry(today)
      } catch (loadError) {
        error = loadError.message || 'The practice journal could not be loaded.'
      }
    }

    return { progress, selectedTarget: progress?.targetDays ?? 3, journalEntry, error }
  })
  const [progress, setProgress] = useState(initialState.progress)
  const [selectedTarget, setSelectedTarget] = useState(initialState.selectedTarget)
  const [journalEntry, setJournalEntry] = useState(initialState.journalEntry)
  const [error, setError] = useState(initialState.error)

  function saveGoal(event) {
    event.preventDefault()
    setError('')
    try {
      const nextProgress = updateWeeklyPracticeGoal(Number(selectedTarget))
      setProgress(nextProgress)
    } catch (saveError) {
      setError(saveError.message || 'The weekly practice goal could not be saved.')
    }
  }

  function logToday() {
    openPracticeDate(new Date())
  }

  function openPracticeDate(date) {
    setError('')
    try {
      const dateKey = localDateKey(date)
      if (!progress.sessions.includes(dateKey)) {
        logPracticeSession(date)
      }
      setProgress(getPracticeProgress())
      setSelectedDate(date)
      setJournalEntry(getPracticeJournalEntry(date))
    } catch (logError) {
      setError(logError.message || 'The selected practice day could not be opened.')
    }
  }

  function saveJournal(event) {
    event.preventDefault()
    setError('')
    try {
      const savedEntry = savePracticeJournalEntry(selectedDate, journalEntry)
      setProgress(savedEntry.progress)
      setJournalEntry(savedEntry.entry)
    } catch (saveError) {
      setError(saveError.message || 'The practice entry could not be saved.')
    }
  }

  const year = visibleMonth.getFullYear()
  const month = visibleMonth.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leadingDays = (new Date(year, month, 1).getDay() + 6) % 7
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}-`
  const sessionsThisMonth = progress?.sessions.filter((session) => session.startsWith(monthKey)).length ?? 0
  const canGoForward = year < today.getFullYear()
    || (year === today.getFullYear() && month < today.getMonth())

  function changeMonth(offset) {
    setVisibleMonth((currentMonth) => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1))
  }

  const goalReached = progress && progress.sessionsThisWeek >= progress.targetDays
  const weeklyPercent = progress
    ? Math.min((progress.sessionsThisWeek / progress.targetDays) * 100, 100)
    : 0

  return (
    <div className="page goals-page">
      <section className="panel goals-intro">
        <div className="goals-icon"><Target size={23} /></div>
        <div>
          <p className="eyebrow">Build a steady practice habit</p>
          <h2>Practice goals</h2>
          <p>Choose how many days you want to practice this week, then log a practice day when you’re done.</p>
        </div>
      </section>

      {error ? <div className="error-message" role="alert">{error}</div> : null}

      {progress ? (
        <>
          <section className="panel practice-progress-panel">
            <div className="practice-progress-heading">
              <div>
                <p className="eyebrow">This week</p>
                <h3>{progress.sessionsThisWeek} of {progress.targetDays} practice days</h3>
              </div>
              {goalReached ? <span className="goal-complete-badge"><CheckCircle2 size={16} /> Goal reached</span> : null}
            </div>
            <div
              className="goal-progress-track"
              role="progressbar"
              aria-label="Weekly practice goal"
              aria-valuemin={0}
              aria-valuemax={progress.targetDays}
              aria-valuenow={Math.min(progress.sessionsThisWeek, progress.targetDays)}
            >
              <div className="goal-progress-fill" style={{ width: `${weeklyPercent}%` }} />
            </div>
            <p className="goal-progress-caption">
              {goalReached
                ? 'You met this week’s target. Set a new goal whenever you’re ready.'
                : `${Math.max(progress.targetDays - progress.sessionsThisWeek, 0)} more ${progress.targetDays - progress.sessionsThisWeek === 1 ? 'day' : 'days'} to reach your target.`}
            </p>

            <div className="practice-stats">
              <div className="practice-stat">
                <CalendarCheck size={19} />
                <span>Logged this week</span>
                <strong>{progress.sessionsThisWeek} {progress.sessionsThisWeek === 1 ? 'day' : 'days'}</strong>
              </div>
              <div className="practice-stat">
                <Flame size={19} />
                <span>Current streak</span>
                <strong>{progress.currentStreak} {progress.currentStreak === 1 ? 'day' : 'days'}</strong>
              </div>
            </div>
          </section>

          <section className="panel practice-calendar-panel" aria-labelledby="practice-calendar-title">
            <div className="practice-calendar-heading">
              <div>
                <p className="eyebrow">Your activity</p>
                <h3 id="practice-calendar-title">Practice calendar</h3>
              </div>
              <div className="calendar-month-summary">
                <strong>{sessionsThisMonth}</strong>
                <span>{sessionsThisMonth === 1 ? 'day' : 'days'} this month</span>
              </div>
            </div>

            <div className="calendar-navigation">
              <button
                type="button"
                className="calendar-nav-button"
                onClick={() => changeMonth(-1)}
                aria-label="Previous month"
              >
                <ChevronLeft size={19} />
              </button>
              <h4 aria-live="polite">
                {visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </h4>
              <button
                type="button"
                className="calendar-nav-button"
                onClick={() => changeMonth(1)}
                disabled={!canGoForward}
                aria-label="Next month"
              >
                <ChevronRight size={19} />
              </button>
            </div>

            <div className="practice-calendar-grid" role="grid" aria-label="Practice days">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <span className="calendar-weekday" key={day} role="columnheader">{day}</span>
              ))}
              {Array.from({ length: leadingDays }, (_, index) => (
                <span className="calendar-day calendar-day-empty" key={`empty-${index}`} role="gridcell" />
              ))}
              {Array.from({ length: daysInMonth }, (_, index) => {
                const day = index + 1
                const date = new Date(year, month, day)
                const dateKey = localDateKey(date)
                const isLogged = progress.sessions.includes(dateKey)
                const isToday = dateKey === localDateKey(today)
                const isSelected = dateKey === localDateKey(selectedDate)
                const isFuture = date > new Date(today.getFullYear(), today.getMonth(), today.getDate())

                return (
                  <button
                    type="button"
                    className={`calendar-day${isLogged ? ' calendar-day-logged' : ''}${isToday ? ' calendar-day-today' : ''}${isSelected ? ' calendar-day-selected' : ''}`}
                    key={dateKey}
                    onClick={() => openPracticeDate(date)}
                    disabled={isFuture}
                    aria-label={`${date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}${isLogged ? ', practice logged' : isFuture ? ', future date' : ', open practice journal'}`}
                    aria-pressed={isSelected}
                    role="gridcell"
                    title={isLogged ? 'View or edit practice entry' : isFuture ? 'Future dates cannot be logged' : 'Log practice and add details'}
                  >
                    {day}
                    {isLogged ? <CheckCircle2 size={13} aria-hidden="true" /> : null}
                  </button>
                )
              })}
            </div>
            <div className="calendar-legend">
              <span><i className="calendar-legend-dot" /> Practice logged</span>
              <span>Select a date to log practice or edit its journal entry.</span>
            </div>

            <form className="practice-journal-form" onSubmit={saveJournal}>
              <div className="practice-journal-title">
                <div>
                  <p className="eyebrow"><BookOpen size={14} /> Session journal</p>
                  <h4>{selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h4>
                </div>
              </div>
              <div className="practice-journal-fields">
                <label>
                  Practice focus
                  <input
                    type="text"
                    maxLength={80}
                    placeholder="e.g. balance, flexibility, turns"
                    value={journalEntry.focus}
                    onChange={(event) => setJournalEntry((current) => ({ ...current, focus: event.target.value }))}
                  />
                </label>
                <label>
                  Minutes practiced
                  <input
                    type="number"
                    min="0"
                    max="1440"
                    step="5"
                    value={journalEntry.minutes}
                    onChange={(event) => setJournalEntry((current) => ({
                      ...current,
                      minutes: event.target.value === '' ? 0 : Number(event.target.value),
                    }))}
                  />
                </label>
                <label className="practice-journal-notes">
                  Notes
                  <textarea
                    maxLength={1000}
                    rows={3}
                    placeholder="What felt good? What would you like to work on next time?"
                    value={journalEntry.notes}
                    onChange={(event) => setJournalEntry((current) => ({ ...current, notes: event.target.value }))}
                  />
                </label>
              </div>
              <div className="practice-journal-footer">
                <p>Saving also logs this date on your calendar.</p>
                <button type="submit" className="secondary-button">
                  <Save size={16} />
                  Save session
                </button>
              </div>
            </form>
          </section>

          <section className="panel goal-settings-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Your target</p>
                <h3>Set a weekly practice goal</h3>
              </div>
            </div>
            <form className="goal-settings-form" onSubmit={saveGoal}>
              <label htmlFor="weekly-goal">Practice days per week</label>
              <select
                id="weekly-goal"
                value={selectedTarget}
                onChange={(event) => setSelectedTarget(Number(event.target.value))}
              >
                {Array.from({ length: 7 }, (_, index) => index + 1).map((days) => (
                  <option key={days} value={days}>{days} {days === 1 ? 'day' : 'days'} per week</option>
                ))}
              </select>
              <button type="submit" className="secondary-button">Save goal</button>
            </form>

            <button
              type="button"
              className="primary-button log-practice-button"
              onClick={logToday}
              disabled={progress.hasLoggedToday}
            >
              <CheckCircle2 size={18} />
              {progress.hasLoggedToday ? 'Practice logged for today' : 'Log today’s practice'}
            </button>
            <p className="goal-privacy-note">Your goal and practice log are saved only in this browser. You can log once per day.</p>
          </section>
        </>
      ) : (
        <section className="panel goal-settings-panel">
          <p className="history-message">Practice goal data is unavailable. Fix the issue above and reload this page to continue.</p>
        </section>
      )}
    </div>
  )
}

export default Goals
