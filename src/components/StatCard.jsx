export default function StatCard({ icon: Icon, label, value, hint, tone = 'primary', onClick, active }) {
  return (
    <div
      className={`stat-card ${onClick ? 'is-clickable' : ''} ${active ? 'is-active' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      title={onClick ? `View ${label} details` : undefined}
    >
      <div className={`stat-icon tone-${tone}`}><Icon size={19} /></div>
      <div className="stat-body">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {hint && <div className="stat-hint">{hint}</div>}
      </div>
    </div>
  );
}
