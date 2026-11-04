import { CalendarCheck, CheckCircle2, Flame, Target } from 'lucide-react'
import { useState } from 'react'

import { getPracticeProgress, logPracticeSession, updateWeeklyPracticeGoal } from '../services/practiceGoals'

function Goals() {
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
