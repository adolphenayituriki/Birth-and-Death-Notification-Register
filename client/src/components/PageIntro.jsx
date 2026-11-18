export default function PageIntro({ eyebrow, title, description, actions }) {
  return (
    <div className="page-intro">
      <div>
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {actions ? <div className="page-intro-actions">{actions}</div> : null}
    </div>
  )
}
