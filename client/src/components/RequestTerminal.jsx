import { useEffect, useRef, useState } from 'react'
import { onApiLog } from '../api.js'
import { statusCodeText } from '../utils.js'
import Icon from './Icon.jsx'

export default function RequestTerminal({ compact = false }) {
  const [logs, setLogs] = useState([])
  const endRef = useRef(null)

  useEffect(() => onApiLog((entry) => setLogs((current) => [entry, ...current].slice(0, 40))), [])

  useEffect(() => {
    if (!compact) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [logs, compact])

  return (
    <div className={`terminal ${compact ? 'terminal-compact' : ''}`}>
      <div className="terminal-bar">
        <div className="terminal-lights">
          <span />
          <span />
          <span />
        </div>
        <span className="terminal-title">request-terminal</span>
        <button className="terminal-clear" type="button" onClick={() => setLogs([])}>
          <Icon name="trash" size={14} />
          Clear
        </button>
      </div>
      <div className="terminal-body">
        {logs.length === 0 ? (
          <div className="terminal-empty">
            <Icon name="terminal" size={22} />
            <span>Waiting for an API request...</span>
          </div>
        ) : (
          [...logs].reverse().map((log) => (
            <div className="terminal-line" key={log.id}>
              <span className="terminal-time">{new Date(log.time).toLocaleTimeString()}</span>
              <span className={`terminal-method method-${log.method.toLowerCase()}`}>
                {log.method}
              </span>
              <span className="terminal-path">{log.path}</span>
              <span className={`terminal-status ${log.ok ? 'ok' : 'fail'}`}>
                {log.status || 'ERR'} {statusCodeText(log.status)}
              </span>
              <span className="terminal-ms">{log.duration}ms</span>
              {log.code ? <span className="terminal-code">{log.code}</span> : null}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  )
}
