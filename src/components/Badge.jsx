const MAP = {
  Available: 'info',
  Assigned: 'success',
  'Under Repair': 'warning',
  Lost: 'danger',
  Damaged: 'danger',
  Retired: 'muted',
  Disposed: 'muted',
  Active: 'success',
  Inactive: 'muted',
  Open: 'warning',
  'In Progress': 'info',
  'Awaiting Vendor Parts': 'danger',
  Closed: 'success',
  Returned: 'muted',
  Transferred: 'info',
};

export default function Badge({ children, tone }) {
  const resolvedTone = tone || MAP[children] || 'muted';
  return <span className={`badge badge-${resolvedTone}`}>{children}</span>;
}
