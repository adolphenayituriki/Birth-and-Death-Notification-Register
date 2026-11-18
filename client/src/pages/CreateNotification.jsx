import { useState } from 'react'
import { apiEndpoints } from '../api.js'
import Icon from '../components/Icon.jsx'
import { InlineNotice } from '../components/StateViews.jsx'
import { formatEventDate, notificationTypeMeta, todayInputValue } from '../utils.js'

const steps = ['Event type', 'Person details', 'Review']

export default function CreateNotification({ navigate, notify }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ type: '', person_name: '', event_date: todayInputValue() })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState(null)

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
    setServerError('')
  }

  const validate = (targetStep) => {
    const next = {}
    if (targetStep >= 1 && !form.type) next.type = 'Choose birth or death.'
    if (targetStep >= 2) {
      if (form.person_name.trim().length < 2) next.person_name = 'Enter at least 2 characters.'
      if (!form.event_date) next.event_date = 'Choose the event date.'
      else if (form.event_date > todayInputValue()) next.event_date = 'The event date cannot be in the future.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const nextStep = () => {
    if (validate(step)) setStep((current) => Math.min(3, current + 1))
  }

  const submit = async () => {
    if (!validate(3)) {
      setStep(errors.type ? 1 : 2)
      return
    }
    setSaving(true)
    setServerError('')
    try {
      const notification = await apiEndpoints.createNotification({
        type: form.type,
        person_name: form.person_name.trim(),
        event_date: form.event_date,
      })
      setCreated(notification)
      notify('Notification submitted successfully.')
    } catch (failure) {
      setServerError(failure.message)
      if (failure.code === 'DUPLICATE_NOTIFICATION') setStep(2)
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setCreated(null)
    setStep(1)
    setForm({ type: '', person_name: '', event_date: todayInputValue() })
    setErrors({})
    setServerError('')
  }

  if (created) {
    return (
      <div className="page-stack narrow-stack">
        <section className="success-card">
          <div className="success-icon"><Icon name="check" size={24} /></div>
          <h3>Record created</h3>
          <p>
            A new {notificationTypeMeta[created.type].label.toLowerCase()} notification for{' '}
            <strong>{created.person_name}</strong> is waiting for review.
          </p>
          <div className="success-meta">
            <span>Reference</span><code>{created.id.slice(-8).toUpperCase()}</code>
            <span>Person</span><strong>{created.person_name}</strong>
            <span>Event date</span><strong>{formatEventDate(created.event_date)}</strong>
            <span>Status</span><strong>{created.status.replace('_', ' ')}</strong>
          </div>
          <div className="form-actions">
            <button className="btn btn-secondary" type="button" onClick={reset}>
              Add another
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => navigate(`/notifications/${created.id}`)}
            >
              View record <Icon name="chevronRight" size={16} />
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page-stack">
      <div className="report-grid">
        <section className="panel form-panel">
          <div className="form-panel-top">
            <div className="stepper">
              {steps.map((label, index) => {
                const number = index + 1
                return (
                  <div
                    className={`stepper-item ${step === number ? 'stepper-item-active' : ''} ${
                      step > number ? 'stepper-item-done' : ''
                    }`}
                    key={label}
                  >
                    <span className="stepper-number">
                      {step > number ? <Icon name="check" size={14} /> : number}
                    </span>
                    <span>{label}</span>
                  </div>
                )
              })}
            </div>
            <button className="btn btn-ghost" type="button" onClick={() => navigate('/notifications')}>
              <Icon name="arrowLeft" size={16} />
              Back to list
            </button>
          </div>

          {step === 1 ? (
            <div className="app-form">
              <div>
                <h3 className="form-section-title">What are you reporting?</h3>
                <p className="form-section-copy">Choose the type of event first.</p>
              </div>
              <div className="type-grid">
                {Object.entries(notificationTypeMeta).map(([key, value]) => (
                  <label
                    className={`type-card type-${key} ${form.type === key ? 'type-active' : ''}`}
                    key={key}
                  >
                    <input
                      type="radio"
                      name="type"
                      value={key}
                      checked={form.type === key}
                      onChange={() => update('type', key)}
                    />
                    <span className="type-card-icon">
                      <Icon name={key === 'birth' ? 'sparkle' : 'book'} size={22} />
                    </span>
                    <strong>{value.label}</strong>
                    <small>{value.hint}</small>
                  </label>
                ))}
              </div>
              {errors.type ? <InlineNotice tone="error">{errors.type}</InlineNotice> : null}
              <div className="form-actions">
                <button className="btn btn-primary" type="button" onClick={nextStep}>
                  Continue <Icon name="chevronRight" size={16} />
                </button>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="app-form">
              <div>
                <h3 className="form-section-title">Who and when?</h3>
                <p className="form-section-copy">
                  Enter the full name as it should appear in the register.
                </p>
              </div>
              <label className="field">
                <span>Person name</span>
                <div className="input-with-icon">
                  <Icon name="user" size={18} />
                  <input
                    type="text"
                    value={form.person_name}
                    placeholder="e.g. Amara Wanjiku"
                    maxLength={100}
                    onChange={(event) => update('person_name', event.target.value)}
                  />
                </div>
                {errors.person_name ? <small className="field-error">{errors.person_name}</small> : null}
              </label>
              <label className="field">
                <span>Event date</span>
                <div className="input-with-icon">
                  <Icon name="clock" size={18} />
                  <input
                    type="date"
                    value={form.event_date}
                    max={todayInputValue()}
                    onChange={(event) => update('event_date', event.target.value)}
                  />
                </div>
                {errors.event_date ? <small className="field-error">{errors.event_date}</small> : null}
              </label>
              {serverError ? (
                <InlineNotice tone="error" title="Submission not saved">
                  {serverError}
                </InlineNotice>
              ) : null}
              <div className="form-actions">
                <button className="btn btn-ghost" type="button" onClick={() => setStep(1)}>
                  Back
                </button>
                <button className="btn btn-primary" type="button" onClick={nextStep}>
                  Review <Icon name="chevronRight" size={16} />
                </button>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="app-form">
              <div>
                <h3 className="form-section-title">Review before submitting</h3>
                <p className="form-section-copy">Check that every detail is correct.</p>
              </div>
              <div className="review-list">
                <div><span>Event type</span><strong>{notificationTypeMeta[form.type]?.label}</strong></div>
                <div><span>Person name</span><strong>{form.person_name}</strong></div>
                <div><span>Event date</span><strong>{formatEventDate(form.event_date)}</strong></div>
                <div><span>Initial status</span><strong>Pending</strong></div>
              </div>
              {serverError ? (
                <InlineNotice tone="error" title="Submission not saved">
                  {serverError}
                </InlineNotice>
              ) : null}
              <div className="form-actions">
                <button className="btn btn-ghost" type="button" onClick={() => setStep(2)} disabled={saving}>
                  Back
                </button>
                <button className="btn btn-primary" type="button" onClick={submit} disabled={saving}>
                  {saving ? 'Submitting...' : 'Submit notification'}
                  {!saving ? <Icon name="check" size={16} /> : null}
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <aside className="report-side">
          <div className="tip-card tip-card-muted">
            <span className="tip-icon"><Icon name="shield" size={18} /></span>
            <div>
              <strong>Duplicate protection</strong>
              <p>
                The same person name and event date cannot be submitted twice. The register will
                block a repeated record.
              </p>
            </div>
          </div>
          <div className="tip-card">
            <span className="tip-icon"><Icon name="clock" size={18} /></span>
            <div>
              <strong>Date rule</strong>
              <p>Event dates cannot be in the future. Check the date with the source before submitting.</p>
            </div>
          </div>
          <div className="tip-card">
            <span className="tip-icon"><Icon name="info" size={18} /></span>
            <div>
              <strong>What happens next</strong>
              <p>Your record starts as pending. A registrar reviews it and updates the final status.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
