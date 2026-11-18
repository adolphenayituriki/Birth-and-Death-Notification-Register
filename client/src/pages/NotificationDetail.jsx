import { useCallback, useEffect, useState } from 'react'
import { apiEndpoints } from '../api.js'
import Icon from '../components/Icon.jsx'
import PageIntro from '../components/PageIntro.jsx'
import StatusPill from '../components/StatusPill.jsx'
import { ErrorState, LoadingState } from '../components/StateViews.jsx'
import { formatDate, formatEventDate, formatRelative, notificationStatusMeta } from '../utils.js'

const statusFlow = ['pending', 'under_review', 'registered', 'rejected']

export default function NotificationDetail({ id, user, navigate, notify }) {
  const [notification, setNotification] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setNotification(await apiEndpoints.notification(id))
    } catch (failure) {
      setError(failure.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const changeStatus = async (status) => {
    setSaving(true)
    try {
      const updated = await apiEndpoints.updateNotification(id, { status })
      setNotification(updated)
      notify(`Status changed to ${notificationStatusMeta[status].label}.`)
    } catch (failure) {
      notify(failure.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!window.confirm('Delete this notification record permanently?')) return
    setSaving(true)
    try {
      await apiEndpoints.deleteNotification(id)
      notify('Notification deleted.')
      navigate('/notifications')
    } catch (failure) {
      notify(failure.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <>
        <PageIntro eyebrow="Register" title="Notification detail" description="Loading record..." />
        <LoadingState label="Loading notification" rows={5} />
      </>
    )
  }

  if (error || !notification) {
    return (
      <>
        <PageIntro eyebrow="Register" title="Notification detail" description="Record lookup." />
        <ErrorState message={error || 'Notification not found.'} onRetry={load} />
      </>
    )
  }

  const isRegistrar = user.role === 'registrar'
  const currentIndex = statusFlow.indexOf(notification.status)

  return (
    <div className="page-stack">
      <button className="back-link" type="button" onClick={() => navigate('/notifications')}>
        <Icon name="arrowLeft" size={16} />
        Back to notifications
      </button>

      <PageIntro
        eyebrow={`REF ${notification.id.slice(-8).toUpperCase()}`}
        title={notification.person_name}
        description={`${notification.type === 'birth' ? 'Birth' : 'Death'} notification submitted ${
          formatRelative(notification.createdAt)
        }.`}
        actions={
          <div className="detail-hero-actions">
            <StatusPill status={notification.type} type="notification" showHint />
            <StatusPill status={notification.status} showHint />
          </div>
        }
      />

      <section className={`detail-hero detail-hero-${notification.type}`}>
        <div className="detail-hero-main">
          <span className="detail-hero-icon">
            <Icon name={notification.type === 'birth' ? 'sparkle' : 'book'} size={26} />
          </span>
          <div>
            <h3>{notification.person_name}</h3>
            <p>
              <span>{formatEventDate(notification.event_date)}</span>
              <span className="dot-separator" />
              <span>Reported by {notification.reporter?.name || 'Unknown reporter'}</span>
              <span className="dot-separator" />
              <span>{notification.reporter?.role?.replace('_', ' ') || 'registry user'}</span>
            </p>
          </div>
        </div>
        <div className="detail-hero-note">
          <Icon name={isRegistrar ? 'shield' : 'info'} size={17} />
          {isRegistrar ? 'Registrar controls are enabled.' : 'Read-only view for health workers.'}
        </div>
      </section>

      <div className="detail-stat-grid">
        <div className="detail-stat">
          <span>Event type</span>
          <strong>{notification.type === 'birth' ? 'Birth' : 'Death'}</strong>
        </div>
        <div className="detail-stat">
          <span>Event date</span>
          <strong>{formatEventDate(notification.event_date)}</strong>
        </div>
        <div className="detail-stat">
          <span>Current status</span>
          <strong>{notification.status.replace('_', ' ')}</strong>
        </div>
        <div className="detail-stat">
          <span>Last updated</span>
          <strong>{formatRelative(notification.updatedAt)}</strong>
        </div>
      </div>

      <div className="report-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Record timeline</h3>
              <p>How this notification moved through the register</p>
            </div>
          </div>
          <div className="fault-timeline">
            <div className="timeline-item">
              <div className="timeline-rail">
                <span className="timeline-node"><Icon name="check" size={14} /></span>
                <span className="timeline-line" />
              </div>
              <div className="timeline-content">
                <div className="timeline-top">
                  <div>
                    <strong>Notification submitted</strong>
                    <small>By {notification.reporter?.name || 'a registry user'}</small>
                  </div>
                </div>
                <div className="timeline-footer">
                  <span>{formatDate(notification.createdAt, { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="priority-tag">created</span>
                </div>
              </div>
            </div>

            <div className={`timeline-item ${currentIndex >= 1 ? 'timeline-in_progress' : ''}`}>
              <div className="timeline-rail">
                <span className="timeline-node"><Icon name="shield" size={14} /></span>
                <span className="timeline-line" />
              </div>
              <div className="timeline-content">
                <div className="timeline-top">
                  <div>
                    <strong>Registrar review</strong>
                    <small>
                      {currentIndex >= 1
                        ? `Status set to ${notification.status.replace('_', ' ')}`
                        : 'Waiting for a registrar to review the record'}
                    </small>
                  </div>
                </div>
                <div className="timeline-footer">
                  <span>{formatDate(notification.updatedAt, { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="priority-tag">{notification.status.replace('_', ' ')}</span>
                </div>
              </div>
            </div>

            <div className={`timeline-item ${currentIndex >= 2 ? 'timeline-resolved' : ''}`}>
              <div className="timeline-rail">
                <span className="timeline-node"><Icon name="check" size={14} /></span>
              </div>
              <div className="timeline-content">
                <div className="timeline-top">
                  <div>
                    <strong>Final register decision</strong>
                    <small>
                      {notification.status === 'registered'
                        ? 'This event has been registered'
                        : notification.status === 'rejected'
                          ? 'This notification was rejected'
                          : 'A decision is still required'}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="report-side">
          {isRegistrar ? (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Update status</h3>
                  <p>Only registrars can change this record.</p>
                </div>
              </div>
              <div className="status-actions">
                {statusFlow.map((status) => (
                  <button
                    className={`mini-button ${status === 'registered' ? 'mini-button-success' : ''} ${
                      status === 'rejected' ? 'mini-button-danger' : ''
                    } ${notification.status === status ? 'mini-button-active' : ''}`}
                    type="button"
                    key={status}
                    disabled={saving || notification.status === status}
                    onClick={() => changeStatus(status)}
                  >
                    {notificationStatusMeta[status].label}
                  </button>
                ))}
              </div>
              <button className="btn btn-danger btn-block" type="button" disabled={saving} onClick={remove}>
                <Icon name="trash" size={16} />
                Delete notification
              </button>
            </section>
          ) : (
            <div className="tip-card tip-card-muted">
              <span className="tip-icon"><Icon name="shield" size={18} /></span>
              <div>
                <strong>Registrar only</strong>
                <p>Status changes and deletion are restricted to the registrar role.</p>
              </div>
            </div>
          )}

          <div className="tip-card">
            <span className="tip-icon"><Icon name="book" size={18} /></span>
            <div>
              <strong>Reference number</strong>
              <p><code>{notification.id}</code></p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
