import { useEffect, useRef, useState } from 'react'
import { ApiError, apiEndpoints, setStoredToken, setStoredUser } from '../api.js'
import Icon from '../components/Icon.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import { InlineNotice } from '../components/StateViews.jsx'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()

let googleScriptPromise = null

function loadGoogleIdentity() {
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google)

  if (!googleScriptPromise) {
    googleScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => {
        if (window.google?.accounts?.oauth2) {
          resolve(window.google)
          return
        }
        googleScriptPromise = null
        reject(new Error('Google Identity Services did not load'))
      }
      script.onerror = () => {
        googleScriptPromise = null
        reject(new Error('Google Identity Services could not be loaded'))
      }
      document.head.appendChild(script)
    })
  }

  return googleScriptPromise
}

function GoogleIcon() {
  return (
    <svg className="google-icon" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65Z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59a14.1 14.1 0 0 1 0-9.18l-7.98-6.19A24 24 0 0 0 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19Z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
      />
    </svg>
  )
}

const assets = {
  logo: '/Logo%20Baby%20Footprints%20in%20Blue%20and%20Green.png',
  serviceMain: '/Celebrating%20New%20Beginnings%20Together.png',
  serviceAlt: '/Birth%20and%20Death%20Registration%20Services%20%281%29.png',
}

const navLinks = [
  { id: 'home', label: 'Home', icon: 'dashboard' },
  { id: 'features', label: 'Features', icon: 'sparkle' },
  { id: 'how-it-works', label: 'How it works', icon: 'book' },
  { id: 'contact', label: 'Contact', icon: 'mail' },
]

export default function Login({ onAuth, theme, onToggleTheme }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('home')
  const [googleLoading, setGoogleLoading] = useState(false)
  const tokenClientRef = useRef(null)
  const onAuthRef = useRef(onAuth)

  useEffect(() => {
    onAuthRef.current = onAuth
  }, [onAuth])

  const completeAuth = (result, fallbackMessage) => {
    setStoredToken(result.token)
    setStoredUser(result.user)
    onAuthRef.current(result.user, result.message || fallbackMessage)
  }

  useEffect(() => {
    if (!authOpen || !googleClientId) return undefined
    let active = true

    loadGoogleIdentity()
      .then((google) => {
        if (!active) return
        tokenClientRef.current = google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'openid email profile',
          callback: async (tokenResponse) => {
            setError('')
            setGoogleLoading(true)
            try {
              if (tokenResponse.error) {
                throw new Error(tokenResponse.error_description || 'Google sign-in was cancelled')
              }
              if (!tokenResponse.access_token) {
                throw new Error('Google did not return an access token')
              }
              const result = await apiEndpoints.google({
                accessToken: tokenResponse.access_token,
              })
              completeAuth(result, 'Signed in with Google.')
            } catch (failure) {
              setError(failure.message)
            } finally {
              setGoogleLoading(false)
            }
          },
        })
      })
      .catch(() => {
        if (active) setError('Google sign-in is unavailable right now. Please try again.')
      })

    return () => {
      active = false
      tokenClientRef.current = null
    }
  }, [authOpen])

  useEffect(() => {
    if (!authOpen) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setAuthOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [authOpen])

  useEffect(() => {
    const updateActiveSection = () => {
      let current = 'home'
      for (const link of navLinks) {
        const section = document.getElementById(link.id)
        if (section && section.getBoundingClientRect().top <= 120) current = link.id
      }
      setActiveSection(current)
    }
    updateActiveSection()
    window.addEventListener('scroll', updateActiveSection, { passive: true })
    return () => window.removeEventListener('scroll', updateActiveSection)
  }, [])

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return undefined
    if (!('IntersectionObserver' in window)) return undefined
    const nodes = Array.from(document.querySelectorAll('[data-reveal]'))
    if (!nodes.length) return undefined

    document.documentElement.classList.add('motion-ready')
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    )
    nodes.forEach((node) => observer.observe(node))

    return () => {
      observer.disconnect()
      document.documentElement.classList.remove('motion-ready')
    }
  }, [])

  const scrollTo = (id) => {
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const openAuth = (nextMode = 'login') => {
    setMode(nextMode)
    setError('')
    setMenuOpen(false)
    setAuthOpen(true)
    setForm({ name: '', email: '', password: '' })
  }

  const switchMode = (nextMode) => {
    if (nextMode === mode) return
    setMode(nextMode)
    setError('')
    setForm({ name: '', email: '', password: '' })
  }

  const startGoogle = () => {
    if (!googleClientId) {
      setError('Google sign-in is not configured for this app yet.')
      return
    }
    if (!tokenClientRef.current) {
      setError('Google sign-in is still loading. Please try again in a moment.')
      return
    }

    setError('')
    try {
      tokenClientRef.current.requestAccessToken({ prompt: 'select_account' })
    } catch {
      setError('Google sign-in could not be started. Please try again.')
    }
  }

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const submit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result =
        mode === 'signup'
          ? await apiEndpoints.signup({
              name: form.name,
              email: form.email,
              password: form.password,
            })
          : await apiEndpoints.login({ email: form.email, password: form.password })
      completeAuth(result, mode === 'signup' ? 'Account created. Welcome!' : 'Signed in successfully.')
    } catch (failure) {
      if (failure instanceof ApiError) {
        if (failure.code === 'EMAIL_TAKEN') {
          setMode('login')
          setForm((current) => ({ ...current, password: '' }))
          setError('That email is already registered. Sign in instead, or continue with Google.')
          return
        }
        if (failure.code === 'EMAIL_NOT_REGISTERED') {
          setError('No account is registered with that email. Switch to Create account or continue with Google.')
          return
        }
        if (failure.code === 'GOOGLE_SIGNIN_REQUIRED') {
          setError('This email is linked to Google. Continue with Google, or check your password.')
          return
        }
      }
      setError(failure.message)
    } finally {
      setLoading(false)
    }
  }

  const isSignup = mode === 'signup'

  return (
    <div className="landing-shell">
      <header className="landing-nav">
        <button className="landing-nav-brand" type="button" onClick={() => scrollTo('home')}>
          <span className="brand-mark brand-mark-logo">
            <img className="brand-logo" src={assets.logo} alt="" />
          </span>
          <span>
            <strong>Birth &amp; Death Register</strong>
            <small>Notification register</small>
          </span>
        </button>

        <nav className="landing-nav-links" aria-label="Landing navigation">
          {navLinks.map((link) => (
            <button
              className={`landing-nav-link ${activeSection === link.id ? 'landing-nav-link-active' : ''}`}
              type="button"
              key={link.id}
              aria-current={activeSection === link.id ? 'page' : undefined}
              onClick={() => scrollTo(link.id)}
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="landing-nav-actions">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} className="theme-toggle-landing" />
          <div className="landing-auth-actions">
            <button className="btn btn-ghost landing-signin" type="button" onClick={() => openAuth('login')}>
              <Icon name="user" size={15} />
              Sign in
            </button>
            <button className="btn btn-primary landing-create" type="button" onClick={() => openAuth('signup')}>
              <Icon name="plus" size={15} />
              Create account
            </button>
          </div>
          <button
            className="icon-button landing-menu-button"
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} size={20} />
          </button>
        </div>

        {menuOpen ? (
          <nav className="landing-nav-mobile" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <button
                className={`landing-nav-link ${activeSection === link.id ? 'landing-nav-link-active' : ''}`}
                type="button"
                key={link.id}
                aria-current={activeSection === link.id ? 'page' : undefined}
                onClick={() => scrollTo(link.id)}
              >
                <Icon name={link.icon} size={16} />
                {link.label}
              </button>
            ))}
            <div className="landing-nav-mobile-auth">
              <button className="landing-nav-link" type="button" onClick={() => openAuth('login')}>
                <Icon name="user" size={16} />
                Sign in
              </button>
              <button className="landing-nav-link" type="button" onClick={() => openAuth('signup')}>
                <Icon name="plus" size={16} />
                Create account
              </button>
            </div>
          </nav>
        ) : null}
      </header>

      <main className="login-page" id="home">
        <section className="login-showcase">
          <div className="hero-bg-image">
            <div className="hero-bg-slide hero-bg-slide-one" />
            <div className="hero-bg-slide hero-bg-slide-two" />
          </div>
          <div className="login-aurora login-aurora-one" />
          <div className="login-aurora login-aurora-two" />

          <div className="login-brand">
            <span className="brand-mark brand-mark-large brand-mark-logo">
              <img className="brand-logo" src={assets.logo} alt="" />
            </span>
            <div>
              <strong>Birth &amp; Death Register</strong>
              <small>Notification register</small>
            </div>
          </div>

          <div className="showcase-copy" data-reveal>
            <span className="eyebrow eyebrow-light">Built for accurate civil registration</span>
            <h1>
              Every event,
              <span> one clear record.</span>
            </h1>
            <p>
              Health workers submit notifications in minutes. Registrar reviews each record, keeps the
              audit trail clear, and tracks monthly totals, all in one focused workspace.
            </p>
            <div className="showcase-actions">
              <button className="btn btn-light" type="button" onClick={() => openAuth('signup')}>
                Start a notification <Icon name="chevronRight" size={17} />
              </button>
              <button className="btn btn-outline-light" type="button" onClick={() => scrollTo('features')}>
                See how it works
              </button>
            </div>
          </div>

          <div className="showcase-visual" id="how-it-works" data-reveal="late">
            <div className="showcase-image-frame">
              <img
                src={assets.serviceMain}
                alt="Celebrating New Beginnings Together"
              />
            </div>
          </div>
        </section>

        <section className="hero-secondary" id="features">
          <div className="hero-secondary-inner">
            <div className="secondary-copy" data-reveal>
              <div className="kids-logo-row" aria-hidden="true">
                <img className="kids-logo kids-logo-left" src={assets.logo} alt="" />
                <img className="kids-logo kids-logo-right" src={assets.logo} alt="" />
              </div>
              <span className="eyebrow">How the system works</span>
              <h2>From notification to certified record in three steps.</h2>
              <p>
                Each event moves through a clear workflow so the right people capture, verify, and
                track it.
              </p>
              <div className="work-steps">
                <div className="work-step">
                  <span className="work-step-number">1</span>
                  <div>
                    <strong>Capture the event</strong>
                    <small>Health workers submit birth or death details.</small>
                  </div>
                </div>
                <div className="work-step">
                  <span className="work-step-number">2</span>
                  <div>
                    <strong>Verify the record</strong>
                    <small>Registrars review duplicates and confirm details.</small>
                  </div>
                </div>
                <div className="work-step">
                  <span className="work-step-number">3</span>
                  <div>
                    <strong>Track the outcome</strong>
                    <small>Status changes and monthly totals stay visible.</small>
                  </div>
                </div>
              </div>
              <div className="secondary-features">
                <span><Icon name="shield" size={15} /> Role-based access</span>
                <span><Icon name="bolt" size={15} /> Duplicate checks</span>
                <span><Icon name="chart" size={15} /> Monthly analytics</span>
                <span><Icon name="clock" size={15} /> Audit trail</span>
              </div>
            </div>

            <div className="secondary-visual" data-reveal="late">
              <div className="showcase-thumb">
                <img
                  src={assets.serviceAlt}
                  alt="Birth and Death Registration Services overview"
                />
                <span><Icon name="shield" size={13} /> Registrar review view</span>
              </div>
              <div className="secondary-visual-caption">
                <span className="secondary-visual-icon"><Icon name="check" size={16} strokeWidth={3} /></span>
                <span>
                  <strong>One record, one clear history.</strong>
                  <small>Every review stays linked to the original notification.</small>
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <section className="landing-cta" id="get-started">
        <div className="landing-cta-copy" data-reveal>
          <span className="eyebrow">Start with the register</span>
          <h2>Ready to keep every notification clear?</h2>
          <p>Sign in to your account or create a health worker account in a few seconds.</p>
        </div>
        <div className="landing-cta-actions" data-reveal="late">
          <button className="btn btn-primary" type="button" onClick={() => openAuth('login')}>
            Sign in <Icon name="chevronRight" size={17} />
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => openAuth('signup')}>
            Create account
          </button>
        </div>
      </section>

      <footer className="landing-footer" id="contact">
        <div className="landing-footer-grid" data-reveal>
          <div className="landing-footer-brand">
            <div className="landing-footer-brand-row">
              <span className="landing-footer-mark">
                <img className="landing-footer-logo" src={assets.logo} alt="" />
              </span>
              <div>
                <strong>Birth &amp; Death Register</strong>
                <span className="landing-footer-kicker">Notification register</span>
              </div>
            </div>
            <p>
              A classroom notification register for capturing, reviewing and tracking birth and
              death events with a clear audit trail.
            </p>
          </div>

          <nav className="landing-footer-links" aria-label="Footer navigation">
            <h4>Explore</h4>
            <ul>
              <li><button type="button" onClick={() => scrollTo('home')}>Home</button></li>
              <li><button type="button" onClick={() => scrollTo('features')}>Features</button></li>
              <li><button type="button" onClick={() => scrollTo('how-it-works')}>How it works</button></li>
              <li><button type="button" onClick={() => scrollTo('get-started')}>Get started</button></li>
            </ul>
          </nav>

          <div className="landing-footer-project">
            <h4>Project details</h4>
            <div className="landing-footer-details">
              <span><Icon name="user" size={14} /> 223010709 · Adolphe Nayituriki</span>
              <span><Icon name="book" size={14} /> College of Business and Economics</span>
              <span><Icon name="pin" size={14} /> UR Huye</span>
              <span><Icon name="info" size={14} /> Academic project · 2026</span>
            </div>
          </div>

          <div className="landing-footer-contact">
            <h4>Contact</h4>
            <div className="landing-footer-contact-list">
              <a href="https://www.nayituriki.com" target="_blank" rel="noreferrer">
                <Icon name="mail" size={14} />
                www.nayituriki.com
              </a>
              <a href="tel:+250780505948">
                <Icon name="phone" size={14} />
                +250 780505948
              </a>
              <a href="https://adolpheict.vercel.app" target="_blank" rel="noreferrer">
                <Icon name="globe" size={14} />
                adolpheict.vercel.app
              </a>
            </div>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <span>© 2026 Birth &amp; Death Notification Register. Learning project.</span>
          <div className="landing-footer-bottom-meta">
            <span>Built with React, Express and MongoDB.</span>
            <button className="landing-footer-top" type="button" onClick={() => scrollTo('home')}>
              Back to top <span aria-hidden="true">↑</span>
            </button>
          </div>
        </div>
      </footer>

      {authOpen ? (
        <div
          className="auth-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setAuthOpen(false)
          }}
        >
          <div
            className={`auth-dialog ${isSignup ? 'auth-dialog-compact' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Register account access"
          >
            <button
              className="icon-button auth-close"
              type="button"
              aria-label="Close"
              onClick={() => setAuthOpen(false)}
            >
              <Icon name="close" size={19} />
            </button>

            <div className="auth-dialog-head">
              <span className="brand-mark brand-mark-logo">
                <img className="brand-logo" src={assets.logo} alt="" />
              </span>
              <div>
                <strong>Birth &amp; Death Register</strong>
                <small>Notification register</small>
              </div>
            </div>

            <div className="login-card">
              <div
                className={`auth-mode-switch ${isSignup ? 'auth-mode-switch-signup' : ''}`}
                role="group"
                aria-label="Access mode"
              >
                <span className="auth-mode-switch-thumb" aria-hidden="true" />
                <button
                  className={!isSignup ? 'is-active' : ''}
                  type="button"
                  aria-pressed={!isSignup}
                  onClick={() => switchMode('login')}
                >
                  Sign in
                </button>
                <button
                  className={isSignup ? 'is-active' : ''}
                  type="button"
                  aria-pressed={isSignup}
                  onClick={() => switchMode('signup')}
                >
                  Create account
                </button>
              </div>

              <div key={mode} className={`auth-mode-content auth-mode-content-${mode}`}>
                <h2>{isSignup ? 'Create your account' : 'Welcome back'}</h2>
                <p>
                  {isSignup
                    ? 'Submit and track health event notifications.'
                    : 'Enter your account details to continue.'}
                </p>

                <form onSubmit={submit} className="login-form" aria-busy={loading || googleLoading}>
                  {isSignup ? (
                    <label className="field">
                      <span>Full name</span>
                      <div className="input-with-icon">
                        <Icon name="user" size={18} />
                        <input
                          type="text"
                          value={form.name}
                          onChange={(event) => update('name', event.target.value)}
                          placeholder="Your full name"
                          autoComplete="name"
                          minLength={2}
                          required
                        />
                      </div>
                    </label>
                  ) : null}

                  <label className="field">
                    <span>Email address</span>
                    <div className="input-with-icon">
                      <Icon name="mail" size={18} />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(event) => update('email', event.target.value)}
                        placeholder="name@example.com"
                        autoComplete="email"
                        required
                      />
                    </div>
                  </label>

                  <label className="field">
                    <span>Password</span>
                    <div className="input-with-icon">
                      <Icon name="lock" size={18} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={(event) => update('password', event.target.value)}
                        placeholder={isSignup ? 'At least 6 characters' : 'Enter your password'}
                        autoComplete={isSignup ? 'new-password' : 'current-password'}
                        minLength={6}
                        required
                      />
                      <button
                        className="password-toggle"
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </label>

                  {error ? <InlineNotice tone="error" title="Please check">{error}</InlineNotice> : null}

                  <button className="btn btn-primary btn-block" type="submit" disabled={loading || googleLoading}>
                    {loading
                      ? isSignup
                        ? 'Creating account...'
                        : 'Signing in...'
                      : isSignup
                        ? 'Create account'
                        : 'Sign in'}
                    {!loading ? <Icon name="chevronRight" size={17} /> : null}
                  </button>
                </form>

                <div className="auth-divider">
                  <span>or continue with</span>
                </div>

                <button
                  className="google-button"
                  type="button"
                  onClick={startGoogle}
                  disabled={googleLoading}
                  aria-busy={googleLoading}
                >
                  <GoogleIcon />
                  <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
                </button>

                  {isSignup ? (
                    <div className="auth-note">
                      <Icon name="info" size={15} />
                      <span>New accounts are health workers. Password: 6+ characters.</span>
                    </div>
                  ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
