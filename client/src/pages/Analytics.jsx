import { useCallback, useEffect, useState } from 'react'
import { apiEndpoints } from '../api.js'
import Icon from '../components/Icon.jsx'
import { ErrorState, LoadingState } from '../components/StateViews.jsx'

function barHeight(value, max) {
  return value ? Math.max(5, (value / max) * 100) : 0
}

export default function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await apiEndpoints.monthlyAnalytics())
    } catch (failure) {
      setError(failure.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return <LoadingState label="Building analytics" rows={6} />
  }

  if (error) {
    return <ErrorState message={error} onRetry={load} />
  }

  const months = data?.months || []
  const total = data?.total || 0
  const births = data?.births ?? months.reduce((sum, month) => sum + month.births, 0)
  const deaths = data?.deaths ?? months.reduce((sum, month) => sum + month.deaths, 0)
  const birthShare = total ? Math.round((births / total) * 100) : 0
  const deathShare = total ? 100 - birthShare : 0
  const maxMonth = Math.max(1, ...months.map((month) => Math.max(month.births, month.deaths)))
  const busiest = months.reduce(
    (best, month) => (!best || month.total > best.total ? month : best),
    null,
  )
  const average = months.length ? (total / months.length).toFixed(1) : '0'

  return (
    <div className="page-stack">
      <section className="analytics-hero">
        <div className="analytics-hero-main">
          <div>
            <span className="eyebrow eyebrow-light">Notification totals</span>
            <h2>{total}</h2>
          </div>
          <p>Records captured across {months.length} reporting months</p>
        </div>
        <div className="analytics-hero-split">
          <span>{births} births</span>
          <span>{deaths} deaths</span>
        </div>
      </section>

      <div className="analytics-metrics">
        <div className="metric-card">
          <span className="metric-icon"><Icon name="sparkle" size={19} /></span>
          <div>
            <strong>{births}</strong>
            <small>Births · {birthShare}% of records</small>
          </div>
        </div>
        <div className="metric-card">
          <span className="metric-icon metric-icon-rose"><Icon name="book" size={19} /></span>
          <div>
            <strong>{deaths}</strong>
            <small>Deaths · {deathShare}% of records</small>
          </div>
        </div>
        <div className="metric-card">
          <span className="metric-icon metric-icon-neutral"><Icon name="clock" size={19} /></span>
          <div>
            <strong>{months.length}</strong>
            <small>Reporting months · {average}/month</small>
          </div>
        </div>
        <div className="metric-card">
          <span className="metric-icon metric-icon-neutral"><Icon name="chart" size={19} /></span>
          <div>
            <strong>{busiest?.label || '—'}</strong>
            <small>{busiest ? `Busiest month · ${busiest.total} records` : 'No records yet'}</small>
          </div>
        </div>
      </div>

      <div className="analytics-layout">
        <section className="panel analytics-chart-panel">
          <div className="panel-heading">
            <div>
              <h3>Notifications per month</h3>
              <p>Grouped from each record's event date</p>
            </div>
            <div className="analytics-legend">
              <span><i className="legend-dot legend-birth" /> Births</span>
              <span><i className="legend-dot legend-death" /> Deaths</span>
            </div>
          </div>

          {months.length === 0 ? (
            <div className="state-block empty-state">
              <div className="state-icon"><Icon name="chart" size={26} /></div>
              <h3>No data yet</h3>
              <p>Submit notifications to see monthly totals.</p>
            </div>
          ) : (
            <div className="monthly-chart" role="img" aria-label="Births and deaths grouped by month">
              {months.map((month) => (
                <div className="monthly-column" key={month.month}>
                  <div className="monthly-bar-area">
                    <span
                      className="monthly-bar monthly-bar-birth"
                      style={{ height: `${barHeight(month.births, maxMonth)}%` }}
                      title={`${month.label}: ${month.births} births`}
                    />
                    <span
                      className="monthly-bar monthly-bar-death"
                      style={{ height: `${barHeight(month.deaths, maxMonth)}%` }}
                      title={`${month.label}: ${month.deaths} deaths`}
                    />
                  </div>
                  <strong>{month.label}</strong>
                  <small>{month.births}B · {month.deaths}D · {month.total} total</small>
                </div>
              ))}
            </div>
          )}

          <p className="formula-note">
            <Icon name="info" size={15} />
            Totals use <code>event_date</code> and include all statuses. This matches the registrar
            analytics endpoint.
          </p>
        </section>

        <section className="panel analytics-split-panel">
          <div className="panel-heading">
            <div>
              <h3>Birth vs death split</h3>
              <p>All records by event type</p>
            </div>
          </div>

          <div className="analytics-split">
            <div className="analytics-donut-wrap">
              <svg
                className="analytics-donut"
                viewBox="0 0 42 42"
                role="img"
                aria-label={`${births} births and ${deaths} deaths`}
              >
                <circle className="donut-track" cx="21" cy="21" r="15.9155" />
                <circle className="donut-death" cx="21" cy="21" r="15.9155" />
                <circle
                  className="donut-birth"
                  cx="21"
                  cy="21"
                  r="15.9155"
                  strokeDasharray={`${birthShare} ${100 - birthShare}`}
                />
              </svg>
              <div className="analytics-donut-label">
                <strong>{total}</strong>
                <span>records</span>
              </div>
            </div>

            <div className="analytics-split-legend">
              <div>
                <i className="legend-dot legend-birth" />
                <span>Births</span>
                <strong>{births}</strong>
                <small>{birthShare}%</small>
              </div>
              <div>
                <i className="legend-dot legend-death" />
                <span>Deaths</span>
                <strong>{deaths}</strong>
                <small>{deathShare}%</small>
              </div>
            </div>
          </div>

          <div className="analytics-highlight">
            <span>Busiest month</span>
            <strong>{busiest?.label || '—'}</strong>
            <small>{busiest ? `${busiest.total} records captured` : 'No records yet'}</small>
          </div>
        </section>
      </div>
    </div>
  )
}
