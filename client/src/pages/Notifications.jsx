import { useCallback, useEffect, useState } from 'react'
import { apiEndpoints } from '../api.js'
import Icon from '../components/Icon.jsx'
import StatusPill from '../components/StatusPill.jsx'
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews.jsx'
import { buildQuery, formatEventDate, notificationStatusMeta, notificationTypeMeta } from '../utils.js'

const pageSize = 8

export default function Notifications({ user, navigate }) {
  const [filters, setFilters] = useState({ search: '', type: '', status: '', page: 1 })
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const query = buildQuery({
        search: filters.search,
        type: filters.type,
        status: filters.status,
        page: filters.page,
        limit: pageSize,
        sort: 'createdAt:desc',
      })
      setData(await apiEndpoints.notifications(query))
    } catch (failure) {
      setError(failure.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    load()
  }, [load])

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value, page: key === 'page' ? value : 1 }))
  }

  const meta = data?.meta || { page: 1, total: 0, totalPages: 1 }
  const notifications = data?.data || []

  return (
    <div className="page-stack">
      <section className="panel filter-panel">
        <div className="filter-bar">
          <div className="filter-grid">
            <label className="search-field">
              <Icon name="search" size={17} />
              <input
                type="search"
                value={filters.search}
                placeholder="Search by person name"
                onChange={(event) => updateFilter('search', event.target.value)}
              />
            </label>
            <label className="select-field">
              <Icon name="layers" size={17} />
              <select value={filters.type} onChange={(event) => updateFilter('type', event.target.value)}>
                <option value="">All types</option>
                {Object.entries(notificationTypeMeta).map(([key, value]) => (
                  <option value={key} key={key}>{value.label}</option>
                ))}
              </select>
            </label>
            <label className="select-field">
              <Icon name="filter" size={17} />
              <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
                <option value="">All statuses</option>
                {Object.entries(notificationStatusMeta).map(([key, value]) => (
                  <option value={key} key={key}>{value.label}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="filter-actions">
            <button className="btn btn-ghost" type="button" onClick={load} disabled={loading}>
              <Icon name="refresh" size={16} />
              Refresh
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => navigate(user.role === 'registrar' ? '/review-queue' : '/create-notification')}
            >
              <Icon name={user.role === 'registrar' ? 'shield' : 'plus'} size={17} />
              {user.role === 'registrar' ? 'Open review queue' : 'New notification'}
            </button>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Notification records</h3>
            <p>{meta.total} matching records</p>
          </div>
          <span className="live-pill"><span /> Live</span>
        </div>

        {loading ? (
          <LoadingState label="Loading notifications" rows={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : notifications.length === 0 ? (
          <EmptyState
            title="No notifications found"
            message="Try a different search or create the first notification."
            icon="book"
            actionLabel={user.role === 'registrar' ? undefined : 'Create notification'}
            onAction={user.role === 'registrar' ? undefined : () => navigate('/create-notification')}
          />
        ) : (
          <>
            <div className="point-table">
              <div className="point-list-head">
                <span>Person</span>
                <span>Type</span>
                <span>Event date</span>
                <span>Reporter</span>
                <span>Status</span>
                <span />
              </div>
              <div className="point-list">
                {notifications.map((notification) => (
                  <article className="point-row" key={notification.id}>
                    <button
                      className="point-row-main"
                      type="button"
                      onClick={() => navigate(`/notifications/${notification.id}`)}
                    >
                      <span className={`point-avatar point-avatar-${notification.type}`}>
                        <Icon name={notification.type === 'birth' ? 'sparkle' : 'book'} size={17} />
                      </span>
                      <span>
                        <strong>{notification.person_name}</strong>
                        <small>REF {notification.id.slice(-6).toUpperCase()}</small>
                      </span>
                    </button>
                    <span className="point-cell">
                      <StatusPill status={notification.type} type="notification" />
                    </span>
                    <span className="point-cell">{formatEventDate(notification.event_date)}</span>
                    <span className="point-cell point-muted">{notification.reporter?.name || '—'}</span>
                    <span>
                      <StatusPill status={notification.status} />
                    </span>
                    <span className="point-actions">
                      <button
                        className="icon-button icon-button-accent"
                        type="button"
                        aria-label={`Open ${notification.person_name}`}
                        onClick={() => navigate(`/notifications/${notification.id}`)}
                      >
                        <Icon name="chevronRight" size={17} />
                      </button>
                    </span>
                  </article>
                ))}
              </div>
            </div>

            <div className="pagination">
              <span className="pagination-info">
                Page <strong>{meta.page}</strong> of <strong>{meta.totalPages}</strong> ·{' '}
                {meta.total} records
              </span>
              <div className="pagination-controls">
                <button
                  className="page-button"
                  type="button"
                  aria-label="Previous page"
                  disabled={meta.page <= 1}
                  onClick={() => updateFilter('page', meta.page - 1)}
                >
                  <Icon name="chevronLeft" size={16} />
                </button>
                <span className="page-number page-number-active">{meta.page}</span>
                <button
                  className="page-button"
                  type="button"
                  aria-label="Next page"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => updateFilter('page', meta.page + 1)}
                >
                  <Icon name="chevronRight" size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
