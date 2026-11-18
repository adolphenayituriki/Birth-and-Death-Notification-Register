import { notificationStatusMeta, notificationTypeMeta } from '../utils.js'

export default function StatusPill({ status, type = 'status', showHint = false }) {
  const meta = type === 'notification' ? notificationTypeMeta[status] : notificationStatusMeta[status]

  if (!meta) return <span className="pill pill-neutral">Unknown</span>

  return (
    <span className={`pill pill-${meta.tone}`} title={meta.hint}>
      <span className="pill-dot" />
      {meta.label}
      {showHint && meta.hint ? <span className="pill-hint">{meta.hint}</span> : null}
    </span>
  )
}
