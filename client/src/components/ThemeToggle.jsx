import Icon from './Icon.jsx'

export default function ThemeToggle({ theme, onToggle, className = '' }) {
  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      className={`theme-toggle ${className}`}
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${nextTheme} theme`}
      title={`Switch to ${nextTheme} theme`}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
    </button>
  )
}
