import { useState } from 'react'
import { apiEndpoints } from '../api.js'
import Icon from '../components/Icon.jsx'
import { InlineNotice } from '../components/StateViews.jsx'
import { formatEventDate, todayInputValue } from '../utils.js'

const roleTasks = {
  health_worker: [
    'Open the new notification form.',
    'Submit a birth or death event.',
    'Try to submit the same name and date again.',
  ],
  registrar: [
    'Open the review queue.',
    'Move a record to under review.',
    'Register or reject the record.',
  ],
}

const reviewCode = `if (!req.user) return next(unauthorized())
if (!roles.includes(req.user.role)) return next(forbidden())
next()`

export default function Activities({ user, navigate, notify }) {
  const [role, setRole] = useState(user.role)
  const [checked, setChecked] = useState([])
  const [reviewResult, setReviewResult] = useState('')
  const [duplicate, setDuplicate] = useState({ person_name: 'Amara Wanjiku', event_date: '' })
  const [duplicateResult, setDuplicateResult] = useState(null)
  const [testing, setTesting] = useState(false)
  const canOpenRolePage = role === 'health_worker' || user.role === 'registrar'

  const toggleTask = (index) => {
    setChecked((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : [...current, index],
    )
  }

  const loadSample = async () => {
    try {
      const result = await apiEndpoints.notifications('?limit=1&sort=createdAt:desc')
      const sample = result.data[0]
      if (!sample) throw new Error('No seeded notification found')
      setDuplicate({
        person_name: sample.person_name,
        event_date: sample.event_date.slice(0, 10),
      })
      setDuplicateResult(null)
      notify('Sample record loaded. Try submitting it again.')
    } catch (failure) {
      notify(failure.message, 'error')
    }
  }

  const testDuplicate = async () => {
    setTesting(true)
    setDuplicateResult(null)
    try {
      const record = await apiEndpoints.createNotification({
        type: 'birth',
        person_name: duplicate.person_name,
        event_date: duplicate.event_date || todayInputValue(),
      })
      setDuplicateResult({ ok: true, message: `Unexpectedly saved ${record.person_name}.` })
    } catch (failure) {
      setDuplicateResult({
        ok: false,
        message: failure.message,
        code: failure.code,
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="page-stack">
      <div className="activity-grid">
        <section className="panel activity-card">
          <span className="activity-number">01</span>
          <span className="activity-icon activity-icon-cyan"><Icon name="user" size={21} /></span>
          <h3>Role play</h3>
          <p>Pick a role and complete its workflow.</p>
          <div className="role-picker role-picker-compact">
            {Object.entries(roleTasks).map(([key, label]) => (
              <button
                className={`role-option ${role === key ? 'role-option-active' : ''}`}
                type="button"
                key={key}
                onClick={() => {
                  setRole(key)
                  setChecked([])
                }}
              >
                <Icon name={key === 'registrar' ? 'shield' : 'user'} size={17} />
                <span>{key === 'registrar' ? 'Registrar' : 'Health worker'}</span>
              </button>
            ))}
          </div>
          <div className="checklist">
            {roleTasks[role].map((task, index) => (
              <button
                className={`checklist-item ${checked.includes(index) ? 'checklist-done' : ''}`}
                type="button"
                key={task}
                onClick={() => toggleTask(index)}
              >
                <span className="checklist-mark">
                  {checked.includes(index) ? <Icon name="check" size={12} /> : null}
                </span>
                {task}
              </button>
            ))}
          </div>
          <div className="activity-actions">
            <button
              className="btn btn-secondary"
              type="button"
              disabled={!canOpenRolePage}
              onClick={() => navigate(role === 'registrar' ? '/review-queue' : '/create-notification')}
            >
              Open {role === 'registrar' ? 'review queue' : 'form'}
            </button>
          </div>
          {!canOpenRolePage ? (
            <small className="mini-result">
              Sign in with a registrar account to open the review queue.
            </small>
          ) : null}
        </section>

        <section className="panel activity-card">
          <span className="activity-number">02</span>
          <span className="activity-icon activity-icon-violet"><Icon name="shield" size={21} /></span>
          <h3>Code review</h3>
          <p>Who can pass this middleware?</p>
          <div className="log-example">
            <span>server/auth.js</span>
            <code>{reviewCode}</code>
          </div>
          <div className="activity-actions">
            <button className="btn btn-secondary" type="button" onClick={() => setReviewResult('registrar only')}>
              Reveal answer
            </button>
          </div>
          {reviewResult ? (
            <div className="mini-result">Allowed roles: <strong>{reviewResult}</strong></div>
          ) : null}
        </section>

        <section className="panel activity-card">
          <span className="activity-number">03</span>
          <span className="activity-icon activity-icon-rose"><Icon name="bolt" size={21} /></span>
          <h3>Break the duplicate check</h3>
          <p>Load a sample, then submit it again.</p>
          <div className="prediction-form">
            <label className="field">
              <span>Person name</span>
              <input
                type="text"
                value={duplicate.person_name}
                onChange={(event) =>
                  setDuplicate((current) => ({ ...current, person_name: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Event date</span>
              <input
                type="date"
                value={duplicate.event_date}
                max={todayInputValue()}
                onChange={(event) =>
                  setDuplicate((current) => ({ ...current, event_date: event.target.value }))
                }
              />
            </label>
          </div>
          <div className="activity-actions">
            <button className="btn btn-ghost" type="button" onClick={loadSample}>
              <Icon name="refresh" size={15} />
              Load sample
            </button>
            <button className="btn btn-secondary" type="button" disabled={testing} onClick={testDuplicate}>
              {testing ? 'Testing...' : 'Test duplicate'}
            </button>
          </div>
          {duplicateResult ? (
            <InlineNotice tone={duplicateResult.ok ? 'error' : 'success'} title={duplicateResult.ok ? 'Check failed' : 'Duplicate blocked'}>
              {duplicateResult.message}
              {duplicateResult.code ? <code> {duplicateResult.code}</code> : null}
            </InlineNotice>
          ) : null}
          {duplicate.event_date ? (
            <small className="mini-result">Loaded event date: {formatEventDate(duplicate.event_date)}</small>
          ) : null}
        </section>
      </div>
    </div>
  )
}
