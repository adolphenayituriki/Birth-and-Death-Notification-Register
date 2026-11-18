import Icon from './Icon.jsx'

export function LoadingState({ label = 'Loading data', rows = 4 }) {
  return (
    <div className="state-block" role="status" aria-live="polite">
      <div className="loading-orbit">
        <span />
        <span />
        <span />
      </div>
      <p>{label}...</p>
      <div className="skeleton-stack">
        {Array.from({ length: rows }, (_, index) => (
          <div className="skeleton-row" key={index} />
        ))}
      </div>
    </div>
  )
}

export function EmptyState({ title, message, actionLabel, onAction, icon = 'layers' }) {
  return (
    <div className="state-block empty-state">
      <div className="state-icon">
        <Icon name={icon} size={26} />
      </div>
      <h3>{title}</h3>
      <p>{message}</p>
      {actionLabel && onAction ? (
        <button className="btn btn-primary" type="button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}

export function ErrorState({ message, onRetry, title = 'Something went wrong' }) {
  return (
    <div className="state-block error-state" role="alert">
      <div className="state-icon">
        <Icon name="alert" size={26} />
      </div>
      <h3>{title}</h3>
      <p>{message}</p>
      {onRetry ? (
        <button className="btn btn-secondary" type="button" onClick={onRetry}>
          <Icon name="refresh" size={17} />
          Try again
        </button>
      ) : null}
    </div>
  )
}

export function InlineNotice({ tone = 'info', title, children, icon }) {
  return (
    <div className={`notice notice-${tone}`} role="status">
      <div className="notice-icon">
        <Icon name={icon || (tone === 'error' ? 'alert' : tone === 'success' ? 'check' : 'info')} size={19} />
      </div>
      <div>
        {title ? <strong>{title}</strong> : null}
        <div>{children}</div>
      </div>
    </div>
  )
}
