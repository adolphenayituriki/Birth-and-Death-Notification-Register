import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiEndpoints } from '../api.js'
import Icon from '../components/Icon.jsx'
import StatusPill from '../components/StatusPill.jsx'
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews.jsx'
import { formatEventDate, formatRelative } from '../utils.js'

const filters = [
  { key: 'all', label: 'All records' },
  { key: 'pending', label: 'Pending' },
  { key: 'under_review', label: 'Under review' },
]

export default function ReviewQueue({ navigate, notify }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [filter, setFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [pending, underReview] = await Promise.all([
        apiEndpoints.notifications('?status=pending&limit=50&sort=createdAt:asc'),
        apiEndpoints.notifications('?status=under_review&limit=50&sort=createdAt:asc'),
      ])
      setItems([...pending.data, ...underReview.data])
    } catch (failure) {
      setError(failure.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const counts = useMemo(
    () => ({
      all: items.length,
      pending: items.filter((item) => item.status === 'pending').length,
      under_review: items.filter((item) => item.status === 'under_review').length,
    }),
    [items],
  )

  const filteredItems = useMemo(
    () => (filter === 'all' ? items : items.filter((item) => item.status === filter)),
    [filter, items],
  )

  const oldest = useMemo(
    () =>
      items.reduce(
        (current, item) =>
          !current || new Date(item.createdAt) < new Date(current.createdAt) ? item : current,
        null,
      ),
    [items],
  )

  const updateStatus = async (id, status) => {
    setBusyId(id)
    try {
      await apiEndpoints.updateNotification(id, { status })
      notify(`Record marked as ${status.replace('_', ' ')}.`)
      await load()
    } catch (failure) {
      notify(failure.message, 'error')
    } finally {
      setBusyId('')
    }
  }

  return (
    <div className="page-stack">
      <div className="queue-summary">
        <article className="queue-summary-item">
          <span className="queue-summary-icon"><Icon name="clock" size={16} /></span>
          <div>
            <strong>{counts.pending}</strong>
            <span>Pending review</span>
          </div>
          <small>Waiting for a first decision</small>
        </article>
        <article className="queue-summary-item">
          <span className="queue-summary-icon"><Icon name="shield" size={16} /></span>
          <div>
            <strong>{counts.under_review}</strong>
            <span>Under review</span>
          </div>
          <small>Registrar is checking the record</small>
        </article>
        <article className="queue-summary-item">
          <span className="queue-summary-icon"><Icon name="layers" size={16} /></span>
          <div>
            <strong>{counts.all}</strong>
            <span>In the queue</span>
          </div>
          <small>{oldest ? `Oldest record ${formatRelative(oldest.createdAt)}` : 'Queue is clear'}</small>
        </article>
      </div>

      <section className="panel queue-panel">
        <div className="panel-heading queue-panel-head">
          <div>
            <h3>Awaiting action</h3>
            <p>{filteredItems.length} of {items.length} records shown</p>
          </div>
          <div className="queue-panel-tools">
            <div className="queue-tabs" role="tablist" aria-label="Filter review queue">
              {filters.map((item) => (
                <button
                  className={`queue-tab ${filter === item.key ? 'is-active' : ''}`}
                  type="button"
                  role="tab"
                  aria-selected={filter === item.key}
                  key={item.key}
                  onClick={() => setFilter(item.key)}
                >
                  {item.label}
                  <span>{counts[item.key]}</span>
                </button>
              ))}
            </div>
            <button className="queue-refresh" type="button" onClick={load} disabled={loading}>
              <Icon name="refresh" size={13} />
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingState label="Loading review queue" rows={5} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title={items.length === 0 ? 'Queue is clear' : `No ${filter === 'pending' ? 'pending' : 'under-review'} records`}
            message={
              items.length === 0
                ? 'Every notification has been reviewed. New submissions will appear here.'
                : 'Try another filter to see the rest of the queue.'
            }
            icon="check"
          />
        ) : (
          <div className="queue-table">
            <div className="queue-list-head">
              <span>Record</span>
              <span>Reporter</span>
              <span>Waiting</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            <div className="queue-list">
              {filteredItems.map((notification) => (
                <article className="queue-row" key={notification.id}>
                  <div className="queue-record">
                    <span className={`queue-type queue-type-${notification.type}`}>
                      <Icon name={notification.type === 'birth' ? 'sparkle' : 'book'} size={16} />
                    </span>
                    <div>
                      <strong>{notification.person_name}</strong>
                      <small>
                        {notification.type === 'birth' ? 'Birth' : 'Death'} ·{' '}
                        {formatEventDate(notification.event_date)} · REF{' '}
                        {notification.id.slice(-6).toUpperCase()}
                      </small>
                    </div>
                  </div>
                  <span className="queue-reporter">{notification.reporter?.name || 'Unknown reporter'}</span>
                  <span className="queue-waiting">{formatRelative(notification.createdAt)}</span>
                  <span className="queue-status"><StatusPill status={notification.status} /></span>
                  <div className="queue-actions">
                    <button
                      className="queue-open"
                      type="button"
                      onClick={() => navigate(`/notifications/${notification.id}`)}
                    >
                      Open
                    </button>
                    {notification.status === 'pending' ? (
                      <button
                        className="queue-action"
                        type="button"
                        disabled={busyId === notification.id}
                        onClick={() => updateStatus(notification.id, 'under_review')}
                      >
                        Start review
                      </button>
                    ) : null}
                    <button
                      className="queue-action queue-action-register"
                      type="button"
                      disabled={busyId === notification.id}
                      onClick={() => updateStatus(notification.id, 'registered')}
                    >
                      Register
                    </button>
                    <button
                      className="queue-action queue-action-reject"
                      type="button"
                      disabled={busyId === notification.id}
                      onClick={() => updateStatus(notification.id, 'rejected')}
                    >
                      Reject
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
