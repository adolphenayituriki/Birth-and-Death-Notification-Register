import { useCallback, useEffect, useState } from 'react'
import { apiEndpoints } from '../api.js'
import Icon from '../components/Icon.jsx'
import StatusPill from '../components/StatusPill.jsx'
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews.jsx'
import { formatEventDate, formatRelative } from '../utils.js'

export default function Overview({ user, navigate }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [stats, notifications] = await Promise.all([
        apiEndpoints.stats(),
        apiEndpoints.notifications('?limit=5&sort=createdAt:desc'),
      ])
      setData({ stats, notifications: notifications.data })
    } catch (failure) {
      setError(failure.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const isRegistrar = user.role === 'registrar'
  const firstName = user.name?.split(' ')[0] || 'there'
  const total = data?.stats.total ?? 0
  const birthShare = total ? Math.round((data.stats.births / total) * 100) : 0
  const deathShare = total ? Math.round((data.stats.deaths / total) * 100) : 0

  const cards = [
    {
      label: 'Notifications',
      value: data?.stats.total ?? '—',
      note: `${data?.stats.thisMonth ?? 0} this month`,
      icon: 'layers',
      tone: 'neutral',
    },
    {
      label: 'Pending review',
      value: data?.stats.pending ?? '—',
      note: `${data?.stats.underReview ?? 0} under review`,
      icon: 'clock',
      tone: 'amber',
    },
    {
      label: 'Births',
      value: data?.stats.births ?? '—',
      note: `${birthShare}% of records`,
      icon: 'sparkle',
      tone: 'cyan',
    },
    {
      label: 'Deaths',
      value: data?.stats.deaths ?? '—',
      note: `${deathShare}% of records`,
      icon: 'book',
      tone: 'rose',
    },
  ]

  if (loading) {
    return (
      <div className="page-stack">
        <LoadingState label="Loading dashboard" rows={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-stack">
        <ErrorState message={error} onRetry={load} />
      </div>
    )
  }

  const registered = data.stats.registered
  const completion = Math.round((registered / Math.max(1, data.stats.total)) * 100)
  const statusRows = [
    { key: 'pending', label: 'Pending', value: data.stats.pending, tone: 'amber' },
    { key: 'under_review', label: 'Under review', value: data.stats.underReview, tone: 'blue' },
    { key: 'registered', label: 'Registered', value: data.stats.registered, tone: 'emerald' },
    { key: 'rejected', label: 'Rejected', value: data.stats.rejected, tone: 'rose' },
  ]

  return (
    <div className="page-stack">
      <section className="overview-hero">
        <div className="overview-hero-main">
          <span className="overview-eyebrow">Command centre</span>
          <h2>Welcome, {firstName}!</h2>
          <p>
            {isRegistrar
              ? 'Review incoming notifications and keep the register accurate.'
              : 'Submit a birth or death notification in a few guided steps.'}
          </p>
        </div>
        <div className="overview-hero-actions">
          <span className="overview-live"><span /> Live register</span>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => navigate(isRegistrar ? '/review-queue' : '/create-notification')}
          >
            <Icon name={isRegistrar ? 'shield' : 'plus'} size={17} />
            {isRegistrar ? 'Open review queue' : 'New notification'}
          </button>
        </div>
      </section>

      <div className="stat-grid">
        {cards.map((card) => (
          <article className={`stat-card stat-${card.tone}`} key={card.label}>
            <span className="stat-icon"><Icon name={card.icon} size={18} /></span>
            <div className="stat-copy">
              <strong>{card.value}</strong>
              <span className="stat-label">{card.label}</span>
              <small>{card.note}</small>
            </div>
          </article>
        ))}
      </div>

      <div className="dashboard-grid">
        <section className="panel recent-panel">
          <div className="panel-heading">
            <div>
              <h3>Recent notifications</h3>
              <p>Latest reports from health workers</p>
            </div>
            <button className="text-button" type="button" onClick={() => navigate('/notifications')}>
              View all <Icon name="chevronRight" size={15} />
            </button>
          </div>
          {data.notifications.length === 0 ? (
            <EmptyState title="No notifications yet" message="New reports will appear here." icon="book" />
          ) : (
            <div className="activity-list">
              {data.notifications.map((notification) => (
                <button
                  className="activity-item"
                  type="button"
                  key={notification.id}
                  onClick={() => navigate(`/notifications/${notification.id}`)}
                >
                  <span className={`activity-marker activity-${notification.status}`}>
                    <Icon name={notification.type === 'birth' ? 'sparkle' : 'book'} size={15} />
                  </span>
                  <span className="activity-copy">
                    <strong>{notification.person_name}</strong>
                    <small>
                      {notification.type === 'birth' ? 'Birth' : 'Death'} ·{' '}
                      {formatEventDate(notification.event_date)} · by{' '}
                      {notification.reporter?.name || 'Unknown reporter'}
                    </small>
                  </span>
                  <span className="activity-meta">
                    <StatusPill status={notification.status} />
                    <small>{formatRelative(notification.createdAt)}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="panel pulse-panel">
          <div className="panel-heading">
            <div>
              <h3>Register pulse</h3>
              <p>Completed registrations</p>
            </div>
            <span className="pulse-icon"><Icon name="activity" size={20} /></span>
          </div>
          <div className="health-ring" style={{ '--health': `${completion}%` }}>
            <div className="health-ring-inner">
              <strong>{completion}%</strong>
              <span>complete</span>
            </div>
          </div>
          <div className="pulse-legend">
            <div><span className="legend-dot legend-success" /> Registered</div>
            <strong>{data.stats.registered}</strong>
            <div><span className="legend-dot legend-danger" /> Awaiting action</div>
            <strong>{data.stats.pending + data.stats.underReview + data.stats.rejected}</strong>
          </div>
        </aside>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Status breakdown</h3>
            <p>Where the register stands right now</p>
          </div>
          <button className="text-button" type="button" onClick={() => navigate('/notifications')}>
            All notifications <Icon name="chevronRight" size={15} />
          </button>
        </div>
        <div className="status-breakdown">
          {statusRows.map((row) => {
            const percent = Math.round((row.value / Math.max(1, data.stats.total)) * 100)
            return (
              <div className="status-breakdown-row" key={row.key}>
                <div className="status-breakdown-top">
                  <span>
                    <i className={`status-breakdown-dot status-breakdown-dot-${row.tone}`} />
                    {row.label}
                  </span>
                  <strong>{row.value} <small>{percent}%</small></strong>
                </div>
                <div className="status-breakdown-track">
                  <span
                    className={`status-breakdown-fill status-breakdown-fill-${row.tone}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
