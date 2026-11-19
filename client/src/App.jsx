import { useCallback, useEffect, useState } from 'react'
import {
  apiEndpoints,
  clearStoredToken,
  getStoredToken,
  getStoredUser,
  setStoredUser,
} from './api.js'
import Icon from './components/Icon.jsx'
import Shell from './components/Shell.jsx'
import Activities from './pages/Activities.jsx'
import Analytics from './pages/Analytics.jsx'
import CreateNotification from './pages/CreateNotification.jsx'
import Login from './pages/Login.jsx'
import NotificationDetail from './pages/NotificationDetail.jsx'
import Notifications from './pages/Notifications.jsx'
import Overview from './pages/Overview.jsx'
import ReviewQueue from './pages/ReviewQueue.jsx'

function readRoute() {
  const raw = window.location.hash.slice(1) || '/overview'
  const [path, search = ''] = raw.split('?')
  return {
    path: path.startsWith('/') ? path : `/${path}`,
    params: Object.fromEntries(new URLSearchParams(search)),
  }
}

const THEME_KEY = 'register-theme'

export default function App() {
  const [route, setRoute] = useState(readRoute)
  const [session, setSession] = useState(getStoredUser)
  const [checkingSession, setCheckingSession] = useState(Boolean(getStoredToken()))
  const [toast, setToast] = useState(null)
  const [theme, setTheme] = useState(() => {
    const stored = window.localStorage.getItem(THEME_KEY)
    const initial = stored === 'dark' ? 'dark' : 'light'
    document.documentElement.dataset.theme = initial
    return initial
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#071a2b' : '#ffffff')
    window.localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  useEffect(() => {
    const onHashChange = () => {
      setRoute(readRoute())
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (!getStoredToken()) {
      setCheckingSession(false)
      return
    }
    let active = true
    apiEndpoints
      .me()
      .then(({ user }) => {
        if (!active) return
        setSession(user)
        setStoredUser(user)
      })
      .catch(() => {
        if (!active) return
        clearStoredToken()
        setSession(null)
      })
      .finally(() => {
        if (active) setCheckingSession(false)
      })
    return () => {
      active = false
    }
  }, [])

  const navigate = useCallback((path) => {
    const target = path.startsWith('/') ? path : `/${path}`
    if (window.location.hash.slice(1) === target) setRoute(readRoute())
    else window.location.hash = target
  }, [])

  const notify = useCallback((message, tone = 'success') => {
    setToast({ message, tone, id: Date.now() })
  }, [])

  useEffect(() => {
    if (!session) return
    const registrarOnly = ['/review-queue', '/analytics']
    if (session.role !== 'registrar' && registrarOnly.includes(route.path)) navigate('/overview')
  }, [navigate, route.path, session])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 4200)
    return () => clearTimeout(timer)
  }, [toast])

  const onAuth = (user, message) => {
    setSession(user)
    notify(message || `Welcome, ${user.name?.split(' ')[0]}!`)
    navigate(user.role === 'registrar' ? '/review-queue' : '/overview')
  }

  const onLogout = () => {
    clearStoredToken()
    setSession(null)
    navigate('/overview')
  }

  if (checkingSession) {
    return (
      <div className="boot-screen">
        <div className="boot-mark"><Icon name="book" size={30} /></div>
        <p>Checking your session...</p>
      </div>
    )
  }

  if (!session) {
    return <Login onAuth={onAuth} theme={theme} onToggleTheme={toggleTheme} />
  }

  const registrarOnly = ['/review-queue', '/analytics']
  const blockedForHealthWorker = session.role !== 'registrar' && registrarOnly.includes(route.path)
  const detailMatch = route.path.match(/^\/notifications\/([0-9a-fA-F]{24})$/)

  let page
  if (blockedForHealthWorker) {
    page = <Overview user={session} navigate={navigate} />
  } else if (detailMatch) {
    page = (
      <NotificationDetail
        id={detailMatch[1]}
        user={session}
        navigate={navigate}
        notify={notify}
      />
    )
  } else {
    switch (route.path) {
      case '/notifications':
        page = <Notifications user={session} navigate={navigate} />
        break
      case '/create-notification':
        page = <CreateNotification navigate={navigate} notify={notify} />
        break
      case '/review-queue':
        page = <ReviewQueue navigate={navigate} notify={notify} />
        break
      case '/analytics':
        page = <Analytics />
        break
      case '/activities':
        page = <Activities user={session} navigate={navigate} notify={notify} />
        break
      default:
        page = <Overview user={session} navigate={navigate} />
    }
  }

  return (
    <>
      <Shell
        user={session}
        path={blockedForHealthWorker ? '/overview' : route.path}
        navigate={navigate}
        onLogout={onLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
      >
        {page}
      </Shell>
      {toast ? (
        <div className={`toast toast-${toast.tone}`} role="status" key={toast.id}>
          <Icon name={toast.tone === 'error' ? 'alert' : 'check'} size={18} />
          <span>{toast.message}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setToast(null)}>
            <Icon name="close" size={16} />
          </button>
        </div>
      ) : null}
    </>
  )
}
