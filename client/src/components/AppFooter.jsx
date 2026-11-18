const student = {
  id: '223010709',
  name: 'Adolphe Nayituriki',
  college: 'College of Business and Economics',
  campus: 'UR Huye',
}

const logo = '/Logo%20Baby%20Footprints%20in%20Blue%20and%20Green.png'

export default function AppFooter() {
  return (
    <footer className="app-footer">
      <div className="app-footer-owner">
        <span className="app-footer-mark">
          <img className="app-footer-logo" src={logo} alt="" />
        </span>
        <div>
          <strong>{student.id} · {student.name}</strong>
          <span>{student.college} · {student.campus}</span>
        </div>
      </div>
      <div className="app-footer-meta">
        <span>Birth &amp; Death Notification Register</span>
        <span className="app-footer-pill">Academic project · 2026</span>
      </div>
    </footer>
  )
}
