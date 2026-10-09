import { useMemo, useState, useEffect } from 'react';
import { Plus, Mail, Boxes, Eye } from 'lucide-react';
import { useData } from '../context/DataContext';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { DEPARTMENT_LIST, LOCATION_LIST } from '../data/mockData';
import { cleanAssetId } from '../utils/idGenerator';

const emptyForm = { name: '', email: '', department: DEPARTMENT_LIST[0], designation: '', location: LOCATION_LIST[0], reportingManager: '', phone: '' };

export default function Employees() {
  const { employees, assets, addEmployee, fetchEmployees } = useData();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [viewEmp, setViewEmp] = useState(null);

  useEffect(() => {
    if (fetchEmployees) {
      fetchEmployees();
    }
  }, [fetchEmployees]);

  const assetCountByEmp = useMemo(() => {
    const map = {};
    assets.forEach((a) => { if (a.assignedTo) map[a.assignedTo] = (map[a.assignedTo] || 0) + 1; });
    return map;
  }, [assets]);

  const departmentOptions = useMemo(() => {
    const list = [...new Set([...DEPARTMENT_LIST, ...employees.map((e) => e.department).filter(Boolean)])].sort();
    return list.map((d) => ({ value: d, label: d }));
  }, [employees]);

  const locationOptions = useMemo(() => {
    const list = [...new Set([...LOCATION_LIST, ...employees.map((e) => e.location).filter(Boolean)])].sort();
    return list.map((l) => ({ value: l, label: l }));
  }, [employees]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.email) return;
    addEmployee(form);
    setForm(emptyForm);
    setModalOpen(false);
  }

  const columns = [
    { key: 'id', label: 'Employee ID', render: (r) => <span className="mono-cell">{r.id}</span> },
    { key: 'name', label: 'Name' },
    { key: 'department', label: 'Department' },
    { key: 'designation', label: 'Designation' },
    { key: 'location', label: 'Location' },
    { key: 'email', label: 'Email', render: (r) => r.email ? <a className="link-cell" href={`mailto:${r.email}`}><Mail size={13} /> {r.email}</a> : '—' },
    { key: 'assetsAssigned', label: 'Assets Assigned', render: (r) => <span><Boxes size={13} /> {assetCountByEmp[r.id] || 0}</span> },
    { key: 'status', label: 'Status', render: (r) => <Badge tone={r.status === 'Active' ? 'success' : 'muted'}>{r.status}</Badge> },
    { key: 'actions', label: '', width: 60, render: (r) => <button className="icon-btn" onClick={() => setViewEmp(r)} title="View employee details and assigned assets"><Eye size={17} /></button> },
  ];

  const empAssets = viewEmp ? assets.filter((a) => a.assignedTo === viewEmp.id) : [];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Employees</h1>
          <p className="page-sub">Directory of staff and the IT assets currently issued to them.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}><Plus size={16} /> Add Employee</button>
      </div>

      <DataTable
        rows={employees}
        columns={columns}
        searchKeys={['id', 'name', 'email', 'phone', 'department', 'designation']}
        searchPlaceholder="Search employees by name, ID, email, department…"
        filters={[
          { key: 'department', label: 'Department', options: departmentOptions },
          { key: 'location', label: 'Location', options: locationOptions },
          { key: 'status', label: 'Status', options: [{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }] },
        ]}
        exportFilename="employees"
        exportSheetName="Employees"
        pageSize={10}
        exportMapper={(rows) => rows.map((r) => ({
          'Employee ID': r.id, Name: r.name, Department: r.department, Designation: r.designation, Location: r.location,
          Email: r.email, Phone: r.phone, 'Join Date': r.joinDate, 'Reporting Manager': r.reportingManager,
          'Assets Assigned': assetCountByEmp[r.id] || 0, Status: r.status,
        }))}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Employee"
        subtitle="Employee ID is generated automatically."
        width={520}
        footer={(
          <>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit}>Save Employee</button>
          </>
        )}
      >
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="form-field form-field-full">
            <label>Full Name <span className="req">*</span></label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-field">
            <label>Work Email <span className="req">*</span></label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="form-field">
            <label>Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="form-field">
            <label>Department</label>
            <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
              {DEPARTMENT_LIST.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Designation</label>
            <input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Software Engineer" />
          </div>
          <div className="form-field">
            <label>Location</label>
            <select value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}>
              {LOCATION_LIST.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Reporting Manager</label>
            <input value={form.reportingManager} onChange={(e) => setForm({ ...form, reportingManager: e.target.value })} />
          </div>
        </form>
      </Modal>

      <Modal
        open={!!viewEmp}
        onClose={() => setViewEmp(null)}
        title={viewEmp?.name}
        subtitle={`${viewEmp?.designation || 'Staff'} · ${viewEmp?.department || 'General'}`}
        width={560}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', marginBottom: '16px', padding: '12px 16px', background: 'var(--bg-alt, #f8fafc)', borderRadius: 'var(--radius-sm, 6px)', fontSize: '13px', border: '1px solid var(--border, #e2e8f0)' }}>
          <div><span className="muted-text">Employee ID:</span> <b className="mono-cell">{viewEmp?.id}</b></div>
          <div><span className="muted-text">Status:</span> <Badge tone={viewEmp?.status === 'Active' ? 'success' : 'muted'}>{viewEmp?.status || 'Active'}</Badge></div>
          <div><span className="muted-text">Email:</span> <b>{viewEmp?.email || '—'}</b></div>
          <div><span className="muted-text">Phone:</span> <b>{viewEmp?.phone || '—'}</b></div>
          <div><span className="muted-text">Department:</span> <b>{viewEmp?.department || '—'}</b></div>
          <div><span className="muted-text">Join Date:</span> <b>{viewEmp?.joinDate || '—'}</b></div>
        </div>

        <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)' }}>
          Assigned IT Assets ({empAssets.length})
        </div>

        {empAssets.length === 0 ? (
          <div className="empty-cell">No assets currently assigned to this employee.</div>
        ) : (
          <ul className="mini-list">
            {empAssets.map((a) => (
              <li key={a.id}>
                <div>
                  <div className="mini-list-title">{cleanAssetId(a.id)} <span className="muted-text">· {a.category}</span></div>
                  <div className="mini-list-sub">{a.configSummary}</div>
                </div>
                <span className="muted-text small">since {a.assignedOn}</span>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
