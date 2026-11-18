import Icon from './Icon.jsx'

export default function Pagination({ meta, onChange }) {
  const { page = 1, totalPages = 1, total = 0 } = meta || {}
  if (total === 0) return null

  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1)
  const start = Math.max(1, Math.min(page - 2, totalPages - 4))
  const visible = pages.map((_, index) => start + index).filter((value) => value <= totalPages)

  return (
    <div className="pagination">
      <span className="pagination-info">
        Page <strong>{page}</strong> of {totalPages} · {total} records
      </span>
      <div className="pagination-controls">
        <button
          className="page-button"
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Previous page"
        >
          <Icon name="chevronLeft" size={16} />
        </button>
        {visible.map((value) => (
          <button
            className={`page-number ${value === page ? 'page-number-active' : ''}`}
            type="button"
            key={value}
            onClick={() => onChange(value)}
          >
            {value}
          </button>
        ))}
        <button
          className="page-button"
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
        >
          <Icon name="chevronRight" size={16} />
        </button>
      </div>
    </div>
  )
}
