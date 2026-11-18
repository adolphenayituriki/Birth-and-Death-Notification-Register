import { useEffect, useState } from 'react'
import AppFooter from './AppFooter.jsx'
import Icon from './Icon.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import { initials, roleMeta } from '../utils.js'

const commonNav = [
  {
    label: 'Workspace',
    items: [
      { path: '/overview', label: 'Overview', icon: 'dashboard' },
      { path: '/notifications', label: 'Notifications', icon: 'layers' },
      { path: '/create-notification', label: 'New notification', icon: 'plus' },
    ],
  },
]

const registrarNav = [
  {
    label: 'Registry',
    items: [
      { path: '/review-queue', label: 'Review queue', icon: 'shield' },
      { path: '/analytics', label: 'Monthly analytics', icon: 'chart' },
    ],
  },
]

const learningNav = {
  label: 'Learning lab',
  items: [{ path: '/activities', label: 'Classroom activities', icon: 'book' }],
}

const logo = '/Logo%20Baby%20Footprints%20in%20Blue%20and%20Green.png'

const titles = {
  '/overview': 'Overview',
  '/notifications': 'Notifications',
  '/create-notification': 'New notification',
  '/review-queue': 'Review queue',
  '/analytics': 'Monthly analytics',
  '/activities': 'Classroom activities',
}

function titleFor(path) {
  if (titles[path]) return titles[path]
  if (path.startsWith('/notifications/')) return 'Notification detail'
  return 'Workspace'
}

export default function Shell({ user, path, navigate, onLogout, theme, onToggleTheme, children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isRegistrar = user.role === 'registrar'
  const groups = [
    ...commonNav,
    ...(isRegistrar ? registrarNav : []),
    learningNav,
  ]

  useEffect(() => setMenuOpen(false), [path])

  const go = (nextPath) => {
    setMenuOpen(false)
    navigate(nextPath)
  }

  return (
    <div className="app-shell">
      {menuOpen ? (
        <button className="sidebar-scrim" type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
      ) : null}

      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <button className="brand" type="button" onClick={() => go('/overview')}>
          <span className="brand-mark brand-mark-logo">
            <img className="brand-logo" src={logo} alt="" />
          </span>
          <span className="brand-copy">
            <strong>Birth &amp; Death</strong>
            <small>Notification register</small>
          </span>
        </button>

        <div className="sidebar-status">
          <span className="status-beacon" />
          Registry online
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {groups.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-label">{group.label}</span>
              {group.items.map((item) => {
                const active =
                  path === item.path ||
                  (item.path === '/notifications' && path.startsWith('/notifications/'))
                return (
                  <button
                    className={`nav-item ${active ? 'nav-item-active' : ''}`}
                    type="button"
                    key={item.path}
                    onClick={() => go(item.path)}
                  >
                    <Icon name={item.icon} size={19} />
                    <span>{item.label}</span>
                    {active ? <span className="nav-active-mark" /> : null}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="avatar">{initials(user.name) || 'U'}</div>
          <div className="sidebar-user-copy">
            <strong>{user.name}</strong>
            <span>{roleMeta[user.role]?.short || user.role}</span>
          </div>
          <button className="icon-button" type="button" aria-label="Log out" onClick={onLogout}>
            <Icon name="logout" size={18} />
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              type="button"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
            >
              <Icon name="menu" size={21} />
            </button>
            <div>
              <span className="breadcrumb">Workspace / {titleFor(path)}</span>
              <h1>{titleFor(path)}</h1>
            </div>
          </div>
          <div className="topbar-actions">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            <span className={`role-chip role-${user.role}`}>
              <Icon name={isRegistrar ? 'shield' : 'user'} size={15} />
              {roleMeta[user.role]?.label || user.role}
            </span>
          </div>
        </header>

        <main className="page-content">{children}</main>
        <AppFooter />
      </div>
    </div>
  )
}
