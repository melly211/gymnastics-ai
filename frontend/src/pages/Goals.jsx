import { CalendarCheck, CheckCircle2, ChevronLeft, ChevronRight, Flame, Target } from 'lucide-react'
import { useState } from 'react'

import { getPracticeProgress, localDateKey, logPracticeSession, updateWeeklyPracticeGoal } from '../services/practiceGoals'

function Goals() {
  const [today] = useState(() => new Date())
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [initialState] = useState(() => {
    try {
      const savedProgress = getPracticeProgress()
      return { progress: savedProgress, selectedTarget: savedProgress.targetDays, error: '' }
    } catch (loadError) {
      return {
        progress: null,
        selectedTarget: 3,
        error: loadError.message || 'Practice goals could not be loaded.',
      }
    }
  })
  const [progress, setProgress] = useState(initialState.progress)
  const [selectedTarget, setSelectedTarget] = useState(initialState.selectedTarget)
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
    setError('')
    try {
      setProgress(logPracticeSession())
    } catch (logError) {
      setError(logError.message || 'Today’s practice could not be logged.')
    }
  }

  function logPracticeDate(date) {
    setError('')
    try {
      setProgress(logPracticeSession(date))
    } catch (logError) {
      setError(logError.message || 'The selected practice day could not be logged.')
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
                const isFuture = date > new Date(today.getFullYear(), today.getMonth(), today.getDate())

                return (
                  <button
                    type="button"
                    className={`calendar-day${isLogged ? ' calendar-day-logged' : ''}${isToday ? ' calendar-day-today' : ''}`}
                    key={dateKey}
                    onClick={() => logPracticeDate(date)}
                    disabled={isLogged || isFuture}
                    aria-label={`${date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}${isLogged ? ', practice logged' : isFuture ? ', future date' : ', log practice'}`}
                    aria-pressed={isLogged}
                    role="gridcell"
                    title={isLogged ? 'Practice logged' : isFuture ? 'Future dates cannot be logged' : 'Log a practice day'}
                  >
                    {day}
                    {isLogged ? <CheckCircle2 size={13} aria-hidden="true" /> : null}
                  </button>
                )
              })}
            </div>
            <div className="calendar-legend">
              <span><i className="calendar-legend-dot" /> Practice logged</span>
              <span>Select any past or current day to log a session.</span>
            </div>
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
