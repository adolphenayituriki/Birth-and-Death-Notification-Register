import { useEffect, useState } from 'react'
import { apiEndpoints, setStoredToken, setStoredUser } from '../api.js'
import Icon from '../components/Icon.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import { InlineNotice } from '../components/StateViews.jsx'

const assets = {
  logo: '/Logo%20Baby%20Footprints%20in%20Blue%20and%20Green.png',
  serviceMain: '/Celebrating%20New%20Beginnings%20Together.png',
  serviceAlt: '/Birth%20and%20Death%20Registration%20Services%20%281%29.png',
}

const navLinks = [
  { id: 'home', label: 'Home' },
  { id: 'features', label: 'Features' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'contact', label: 'Contact' },
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
    setMode(nextMode)
    setError('')
    setForm({ name: '', email: '', password: '' })
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
      setStoredToken(result.token)
      setStoredUser(result.user)
      onAuth(result.user)
    } catch (failure) {
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
          <button className="btn btn-ghost landing-signin" type="button" onClick={() => openAuth('login')}>
            Sign in
          </button>
          <button className="btn btn-primary landing-create" type="button" onClick={() => openAuth('signup')}>
            Create account
          </button>
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
                {link.label}
              </button>
            ))}
            <button className="landing-nav-link" type="button" onClick={() => openAuth('login')}>Sign in</button>
            <button className="landing-nav-link" type="button" onClick={() => openAuth('signup')}>Create account</button>
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

          <div className="showcase-copy">
            <span className="eyebrow eyebrow-light">Built for accurate civil registration</span>
            <h1>
              Every event,
              <span> one clear record.</span>
            </h1>
            <p>
              Health workers submit notifications in minutes. Registrar reviews each record, keeps the
              audit trail clear, and tracks monthly totals — all in one focused workspace.
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

          <div className="showcase-visual" id="how-it-works">
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
            <div className="secondary-copy">
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

            <div className="secondary-visual">
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
        <div className="landing-cta-copy">
          <span className="eyebrow">Start with the register</span>
          <h2>Ready to keep every notification clear?</h2>
          <p>Sign in to your account or create a health worker account in a few seconds.</p>
        </div>
        <div className="landing-cta-actions">
          <button className="btn btn-primary" type="button" onClick={() => openAuth('login')}>
            Sign in <Icon name="chevronRight" size={17} />
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => openAuth('signup')}>
            Create account
          </button>
        </div>
      </section>

      <footer className="landing-footer" id="contact">
        <div className="landing-footer-grid">
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
          <div className="auth-dialog" role="dialog" aria-modal="true" aria-label="Register account access">
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
              <div className="auth-mode-switch" role="group" aria-label="Access mode">
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

              <h2>{isSignup ? 'Create a health worker account' : 'Welcome back'}</h2>
              <p>
                {isSignup
                  ? 'New accounts can submit and track notifications.'
                  : 'Enter your account details to continue.'}
              </p>

              <form onSubmit={submit} className="login-form">
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

                <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
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

              {isSignup ? (
                <div className="auth-note">
                  <Icon name="info" size={15} />
                  <span>
                    New accounts are created as health workers. Use any email and a password of at
                    least 6 characters.
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
