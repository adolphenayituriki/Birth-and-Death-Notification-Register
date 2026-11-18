import Icon from './Icon.jsx'
import RequestTerminal from './RequestTerminal.jsx'

export default function TerminalDrawer({ open, onClose }) {
  if (!open) return null

  return (
    <div className="drawer-layer">
      <button className="drawer-scrim" type="button" aria-label="Close terminal" onClick={onClose} />
      <aside className="terminal-drawer" aria-label="Live request terminal">
        <div className="drawer-header">
          <div>
            <span className="eyebrow">Developer view</span>
            <h2>Live request terminal</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close" onClick={onClose}>
            <Icon name="close" size={20} />
          </button>
        </div>
        <p className="drawer-copy">
          Every browser request is shown here. The Express server writes the same event to its
          terminal with a matching request id.
        </p>
        <RequestTerminal />
      </aside>
    </div>
  )
}
