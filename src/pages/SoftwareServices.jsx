import { useState, useMemo } from 'react';
import {
  Code2, Plus, Search, Filter, Pencil, Eye, Calendar, RefreshCcw, IndianRupee,
  AlertTriangle, CheckCircle2, FileText, ExternalLink, UserCheck, ShieldCheck, Sparkles, X, Upload
} from 'lucide-react';
import { useData } from '../context/DataContext';
import Modal from '../components/Modal';
import DataTable from '../components/DataTable';
import Badge from '../components/Badge';

const BILLING_TYPES = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'One-Time'];
const PAYMENT_METHODS = ['Credit Card', 'Bank Transfer', 'Corporate UPI', 'Direct Debit', 'Cheque / PO'];
const STATUS_OPTIONS = ['Active', 'Expiring Soon', 'Inactive'];
const CURRENCY_OPTIONS = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'CAD', 'AUD', 'SGD'];

export default function SoftwareServices() {
  const {
    softwareList,
    categories,
    vendors,
    employees,
    addSoftware,
    updateSoftware,
    deleteSoftware,
  } = useData();

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBilling, setFilterBilling] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    assetCode: '',
    serviceName: '',
    category: '',
    vendorId: '',
    vendorName: '',
    vendorPortalUrl: '',
    responsiblePersonId: '',
    responsiblePersonName: '',
    seatsCount: '',
    purchaseDate: '',
    nextRenewalDate: new Date().toISOString().slice(0, 10),
    expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    billingType: 'Monthly',
    currency: 'INR',
    amount: '',
    autoRenewal: 'Yes',
    paymentMethod: 'Credit Card',
    status: 'Active',
    attachmentName: '',
    description: '',
  });

  const [formErrors, setFormErrors] = useState({});

  // Dynamic Categories from Categories Page
  const activeCategories = useMemo(
    () => categories.filter((c) => c.status === 'Active'),
    [categories]
  );

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = softwareList.length;
    const active = softwareList.filter((s) => s.status === 'Active').length;

    const today = new Date();
    const expiringSoon = softwareList.filter((s) => {
      if (!s.nextRenewalDate && !s.expiryDate) return false;
      const targetDate = new Date(s.nextRenewalDate || s.expiryDate);
      const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 30;
    }).length;

    const monthlySpend = softwareList.reduce((sum, s) => {
      const amt = Number(s.amount) || 0;
      if (s.billingType === 'Monthly') return sum + amt;
      if (s.billingType === 'Quarterly') return sum + amt / 3;
      if (s.billingType === 'Half-Yearly') return sum + amt / 6;
      if (s.billingType === 'Yearly') return sum + amt / 12;
      return sum;
    }, 0);

    return { total, active, expiringSoon, monthlySpend };
  }, [softwareList]);

  function openAddModal() {
    const nextCode = `SW-${String(softwareList.length + 1).padStart(5, '0')}`;
    setForm({
      assetCode: nextCode,
      serviceName: '',
      category: activeCategories[0]?.name || 'Software',
      vendorId: '',
      vendorName: '',
      vendorPortalUrl: '',
      responsiblePersonId: '',
      responsiblePersonName: employees[0]?.name || '',
      seatsCount: '',
      purchaseDate: '',
      nextRenewalDate: new Date().toISOString().slice(0, 10),
      expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      billingType: 'Monthly',
      currency: 'INR',
      amount: '',
      autoRenewal: 'Yes',
      paymentMethod: 'Credit Card',
      status: 'Active',
      attachmentName: '',
      description: '',
    });
    setEditingItem(null);
    setFormErrors({});
    setModalOpen(true);
  }

  function openEditModal(item) {
    setEditingItem(item);
    setForm({
      assetCode: item.assetCode || item.id,
      serviceName: item.serviceName || '',
      category: item.category || '',
      vendorId: item.vendorId || '',
      vendorName: item.vendorName || '',
      vendorPortalUrl: item.vendorPortalUrl || '',
      responsiblePersonId: item.responsiblePersonId || '',
      responsiblePersonName: item.responsiblePersonName || '',
      seatsCount: item.seatsCount ?? '',
      purchaseDate: item.purchaseDate || '',
      nextRenewalDate: item.nextRenewalDate || '',
      expiryDate: item.expiryDate || '',
      billingType: item.billingType || 'Monthly',
      currency: item.currency || 'INR',
      amount: item.amount || '',
      autoRenewal: item.autoRenewal ? 'Yes' : 'No',
      paymentMethod: item.paymentMethod || 'Credit Card',
      status: item.status || 'Active',
      attachmentName: item.attachmentName || '',
      description: item.description || '',
    });
    setFormErrors({});
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = {};
    if (!form.serviceName.trim()) errors.serviceName = 'Service name is required';
    if (!form.category) errors.category = 'Category is required';
    if (!form.responsiblePersonName.trim()) errors.responsiblePersonName = 'Responsible person is required';
    if (!form.nextRenewalDate) errors.nextRenewalDate = 'Renewal date is required';
    if (!form.expiryDate) errors.expiryDate = 'Expiry date is required';
    if (!form.amount || Number(form.amount) <= 0) errors.amount = 'Valid amount is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const payload = {
      assetCode: form.assetCode,
      serviceName: form.serviceName.trim(),
      category: form.category,
      vendorId: form.vendorId || null,
      vendorName: form.vendorName || vendors.find(v => v.id === form.vendorId)?.name || '',
      vendorPortalUrl: form.vendorPortalUrl ? form.vendorPortalUrl.trim() : '',
      responsiblePersonId: form.responsiblePersonId || null,
      responsiblePersonName: form.responsiblePersonName.trim(),
      seatsCount: form.seatsCount ? Number(form.seatsCount) : null,
      purchaseDate: form.purchaseDate || null,
      nextRenewalDate: form.nextRenewalDate,
      expiryDate: form.expiryDate,
      billingType: form.billingType,
      currency: form.currency || 'INR',
      amount: Number(form.amount),
      autoRenewal: form.autoRenewal === 'Yes',
      paymentMethod: form.paymentMethod,
      status: form.status,
      attachmentName: form.attachmentName,
      description: form.description ? form.description.trim() : '',
    };

    try {
      setIsSubmitting(true);
      if (editingItem) {
        await updateSoftware(editingItem.id, payload);
      } else {
        await addSoftware(payload);
      }
      setModalOpen(false);
    } catch (err) {
      alert('Failed to save software subscription: ' + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteItem(item) {
    if (window.confirm(`Are you sure you want to delete ${item.serviceName} (${item.assetCode || item.id})?`)) {
      try {
        await deleteSoftware(item.id);
      } catch (err) {
        alert('Failed to delete: ' + (err.message || err));
      }
    }
  }

  const columns = [
    {
      key: 'assetCode',
      label: 'Asset Code',
      header: 'Asset Code',
      accessor: 'assetCode',
      render: (r) => <span className="mono-cell"><b>{r.assetCode || r.id}</b></span>,
    },
    {
      key: 'serviceName',
      label: 'Service Name',
      header: 'Service Name',
      accessor: 'serviceName',
      render: (r) => (
        <div>
          <strong>{r.serviceName}</strong>
          {r.description && <div className="muted-text text-sm">{r.description}</div>}
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      header: 'Category',
      accessor: 'category',
      render: (r) => <Badge tone="info">{r.category}</Badge>,
    },
    {
      key: 'vendorName',
      label: 'Vendor',
      header: 'Vendor',
      accessor: 'vendorName',
      render: (r) => (
        <div>
          <span>{r.vendorName || '—'}</span>
          {r.vendorPortalUrl && (
            <a href={r.vendorPortalUrl} target="_blank" rel="noreferrer" style={{ marginLeft: '6px', color: 'var(--primary)' }}>
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      ),
    },
    {
      key: 'responsiblePersonName',
      label: 'Responsible Person',
      header: 'Responsible Person',
      accessor: 'responsiblePersonName',
      render: (r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <UserCheck size={14} className="muted-text" />
          <span>{r.responsiblePersonName}</span>
        </div>
      ),
    },
    {
      key: 'nextRenewalDate',
      label: 'Next Renewal',
      header: 'Next Renewal',
      accessor: 'nextRenewalDate',
      render: (r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={14} className="muted-text" />
          <span>{r.nextRenewalDate || '—'}</span>
        </div>
      ),
    },
    {
      key: 'expiryDate',
      label: 'Expiry Date',
      header: 'Expiry Date',
      accessor: 'expiryDate',
      render: (r) => <span>{r.expiryDate || '—'}</span>,
    },
    {
      key: 'amount',
      label: 'Billing & Amount',
      header: 'Billing & Amount',
      accessor: 'amount',
      render: (r) => (
        <div>
          <b>{r.currency || 'INR'} {Number(r.amount || 0).toLocaleString('en-IN')}</b>
          <span className="muted-text text-xs" style={{ display: 'block' }}>{r.billingType}</span>
        </div>
      ),
    },
    {
      key: 'autoRenewal',
      label: 'Auto-Renew',
      header: 'Auto-Renew',
      accessor: 'autoRenewal',
      render: (r) => (
        <Badge tone={r.autoRenewal ? 'success' : 'neutral'}>
          {r.autoRenewal ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      header: 'Status',
      accessor: 'status',
      render: (r) => (
        <Badge tone={r.status === 'Active' ? 'success' : r.status === 'Expiring Soon' ? 'warning' : 'neutral'}>
          {r.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      header: 'Actions',
      accessor: 'actions',
      render: (r) => (
        <div className="action-row" style={{ justifyContent: 'flex-end' }}>
          <button className="icon-btn" title="View details" onClick={() => setViewingItem(r)}>
            <Eye size={15} />
          </button>
          <button className="icon-btn" title="Edit" onClick={() => openEditModal(r)}>
            <Pencil size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Software Services &amp; Subscriptions</h1>
          <p className="page-sub">Manage software licenses, SaaS applications, broadband Wi-Fi bills, and recurring cloud accounts.</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={16} /> Add Software Service
        </button>
      </div>

      {/* Metrics Header */}
      <div className="report-summary-cards">
        <div className="report-summary-card">
          <div className="report-summary-card-icon tone-purple"><Code2 size={20} /></div>
          <div className="report-summary-card-body">
            <div className="report-summary-card-val">{metrics.total}</div>
            <div className="report-summary-card-title">Total Subscriptions</div>
          </div>
        </div>

        <div className="report-summary-card">
          <div className="report-summary-card-icon tone-green"><CheckCircle2 size={20} /></div>
          <div className="report-summary-card-body">
            <div className="report-summary-card-val">{metrics.active}</div>
            <div className="report-summary-card-title">Active Subscriptions</div>
          </div>
        </div>

        <div className="report-summary-card">
          <div className="report-summary-card-icon tone-orange"><AlertTriangle size={20} /></div>
          <div className="report-summary-card-body">
            <div className="report-summary-card-val">{metrics.expiringSoon}</div>
            <div className="report-summary-card-title">Expiring / Due Soon (30 days)</div>
          </div>
        </div>

        <div className="report-summary-card">
          <div className="report-summary-card-icon tone-blue"><IndianRupee size={20} /></div>
          <div className="report-summary-card-body">
            <div className="report-summary-card-val">₹ {Math.round(metrics.monthlySpend).toLocaleString('en-IN')}</div>
            <div className="report-summary-card-title">Est. Monthly Spend</div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <DataTable
        rows={softwareList}
        columns={columns}
        searchKeys={['assetCode', 'id', 'serviceName', 'category', 'vendorName', 'responsiblePersonName']}
        searchPlaceholder="Search by Asset Code, Service Name, Category, Vendor, Owner…"
        filters={[
          { key: 'category', label: 'Category', options: activeCategories.map((c) => ({ value: c.name, label: c.name })) },
          { key: 'status', label: 'Status', options: STATUS_OPTIONS.map((s) => ({ value: s, label: s })) },
          { key: 'billingType', label: 'Billing Type', options: BILLING_TYPES.map((b) => ({ value: b, label: b })) },
        ]}
      />

      {/* Add / Edit Software Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? `Edit Software Service — ${editingItem.assetCode || editingItem.id}` : 'Add Software Service'}
        subtitle="Fill out the subscription & licensing details below."
        width={780}
        footer={
          <>
            <button className="btn btn-ghost" disabled={isSubmitting} onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" disabled={isSubmitting} onClick={handleSubmit}>
              <Sparkles size={15} /> {isSubmitting ? 'Saving...' : editingItem ? 'Update Software' : 'Save Software'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          
          {/* 1. Asset Code */}
          <div className="form-field">
            <label>Asset Code</label>
            <input
              type="text"
              value={form.assetCode}
              onChange={(e) => setForm({ ...form, assetCode: e.target.value })}
              placeholder="e.g. SW-00001"
            />
          </div>

          {/* 2. Service Name */}
          <div className="form-field">
            <label>Service Name <span className="req">*</span></label>
            <input
              type="text"
              value={form.serviceName}
              onChange={(e) => {
                setForm({ ...form, serviceName: e.target.value });
                if (formErrors.serviceName) setFormErrors((prev) => ({ ...prev, serviceName: '' }));
              }}
              placeholder="e.g. Microsoft 365 E3, Zoom Pro, Airtel Fiber"
              className={formErrors.serviceName ? 'input-error' : ''}
            />
            {formErrors.serviceName && <span className="field-error">{formErrors.serviceName}</span>}
          </div>

          {/* 3. Category (Populated from Categories Page) */}
          <div className="form-field">
            <label>Category <span className="req">*</span></label>
            <select
              value={form.category}
              onChange={(e) => {
                setForm({ ...form, category: e.target.value });
                if (formErrors.category) setFormErrors((prev) => ({ ...prev, category: '' }));
              }}
              className={formErrors.category ? 'input-error' : ''}
            >
              <option value="">Select category…</option>
              {activeCategories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
            {formErrors.category && <span className="field-error">{formErrors.category}</span>}
          </div>

          {/* 4. Vendor (Optional) */}
          <div className="form-field">
            <label>Vendor (Optional)</label>
            <select
              value={form.vendorId}
              onChange={(e) => {
                const selectedVen = vendors.find((v) => v.id === e.target.value);
                setForm({
                  ...form,
                  vendorId: e.target.value,
                  vendorName: selectedVen ? selectedVen.name : '',
                });
              }}
            >
              <option value="">Select vendor (optional)…</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          {/* 5. Vendor Portal URL */}
          <div className="form-field">
            <label>Vendor Portal URL (Optional)</label>
            <input
              type="url"
              value={form.vendorPortalUrl}
              onChange={(e) => setForm({ ...form, vendorPortalUrl: e.target.value })}
              placeholder="e.g. https://portal.airtel.in"
            />
          </div>

          {/* 6. Responsible Person */}
          <div className="form-field">
            <label>Responsible Person <span className="req">*</span></label>
            <select
              value={form.responsiblePersonName}
              onChange={(e) => {
                const emp = employees.find((emp) => emp.name === e.target.value);
                setForm({
                  ...form,
                  responsiblePersonName: e.target.value,
                  responsiblePersonId: emp ? emp.id : '',
                });
                if (formErrors.responsiblePersonName) setFormErrors((prev) => ({ ...prev, responsiblePersonName: '' }));
              }}
              className={formErrors.responsiblePersonName ? 'input-error' : ''}
            >
              <option value="">Select responsible person…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.name}>{e.name} ({e.department || 'Staff'})</option>
              ))}
            </select>
            {formErrors.responsiblePersonName && <span className="field-error">{formErrors.responsiblePersonName}</span>}
          </div>

          {/* 7. Seats / User Count (Optional) */}
          <div className="form-field">
            <label>Seats / User Count (Optional)</label>
            <input
              type="number"
              value={form.seatsCount}
              onChange={(e) => setForm({ ...form, seatsCount: e.target.value })}
              placeholder="e.g. 50"
            />
          </div>

          {/* 8. Purchase / Start Date (Optional) */}
          <div className="form-field">
            <label>Start / Purchase Date (Optional)</label>
            <input
              type="date"
              value={form.purchaseDate}
              onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
            />
          </div>

          {/* 9. Next Renewal / Due Date */}
          <div className="form-field">
            <label>Next Renewal / Due Date <span className="req">*</span></label>
            <input
              type="date"
              value={form.nextRenewalDate}
              onChange={(e) => setForm({ ...form, nextRenewalDate: e.target.value })}
              className={formErrors.nextRenewalDate ? 'input-error' : ''}
            />
          </div>

          {/* 10. Expiry Date */}
          <div className="form-field">
            <label>Expiry Date <span className="req">*</span></label>
            <input
              type="date"
              value={form.expiryDate}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
              className={formErrors.expiryDate ? 'input-error' : ''}
            />
          </div>

          {/* 11. Billing Type */}
          <div className="form-field">
            <label>Billing Type <span className="req">*</span></label>
            <select
              value={form.billingType}
              onChange={(e) => setForm({ ...form, billingType: e.target.value })}
            >
              {BILLING_TYPES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* 12. Currency */}
          <div className="form-field">
            <label>Currency <span className="req">*</span></label>
            <select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            >
              {CURRENCY_OPTIONS.map((curr) => (
                <option key={curr} value={curr}>{curr}</option>
              ))}
            </select>
          </div>

          {/* 13. Amount */}
          <div className="form-field">
            <label>Amount <span className="req">*</span></label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="e.g. 3500"
              className={formErrors.amount ? 'input-error' : ''}
            />
          </div>

          {/* 13. Auto-Renewal */}
          <div className="form-field">
            <label>Auto-Renewal <span className="req">*</span></label>
            <select
              value={form.autoRenewal}
              onChange={(e) => setForm({ ...form, autoRenewal: e.target.value })}
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          {/* 14. Payment Method */}
          <div className="form-field">
            <label>Payment Method (Optional)</label>
            <select
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
            >
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm} value={pm}>{pm}</option>
              ))}
            </select>
          </div>

          {/* 15. Status */}
          <div className="form-field">
            <label>Record Status <span className="req">*</span></label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* 16. Attachment File */}
          <div className="form-field">
            <label>Contract / Bill Document (Optional)</label>
            <input
              type="text"
              value={form.attachmentName}
              onChange={(e) => setForm({ ...form, attachmentName: e.target.value })}
              placeholder="e.g. Invoice_Airtel_Oct2026.pdf"
            />
          </div>

          {/* 17. Description / Notes */}
          <div className="form-field" style={{ gridColumn: 'span 2' }}>
            <label>Description / Notes (Optional)</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Enter plan notes or account description…"
            />
          </div>

        </form>
      </Modal>

      {/* View Details Drawer */}
      {viewingItem && (
        <div className="drawer-overlay" onClick={() => setViewingItem(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()} style={{ width: '540px' }}>
            <div className="drawer-header">
              <div>
                <h2>{viewingItem.serviceName}</h2>
                <div className="muted-text">{viewingItem.assetCode || viewingItem.id} · {viewingItem.category}</div>
              </div>
              <button className="icon-btn" onClick={() => setViewingItem(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="info-grid">
                <div><span className="muted-text">Asset Code:</span> <b>{viewingItem.assetCode || viewingItem.id}</b></div>
                <div><span className="muted-text">Category:</span> <b>{viewingItem.category}</b></div>
                <div><span className="muted-text">Vendor:</span> <b>{viewingItem.vendorName || '—'}</b></div>
                <div><span className="muted-text">Responsible Person:</span> <b>{viewingItem.responsiblePersonName}</b></div>
                <div><span className="muted-text">Seats Count:</span> <b>{viewingItem.seatsCount || '—'}</b></div>
                <div><span className="muted-text">Billing Cycle:</span> <b>{viewingItem.billingType}</b></div>
                <div><span className="muted-text">Amount:</span> <b>{viewingItem.currency || 'INR'} {Number(viewingItem.amount || 0).toLocaleString('en-IN')}</b></div>
                <div><span className="muted-text">Auto-Renewal:</span> <b>{viewingItem.autoRenewal ? 'Yes' : 'No'}</b></div>
                <div><span className="muted-text">Next Renewal Date:</span> <b>{viewingItem.nextRenewalDate}</b></div>
                <div><span className="muted-text">Expiry Date:</span> <b>{viewingItem.expiryDate}</b></div>
                <div><span className="muted-text">Status:</span> <Badge tone={viewingItem.status === 'Active' ? 'success' : 'warning'}>{viewingItem.status}</Badge></div>
              </div>
              {viewingItem.description && (
                <div>
                  <h4>Description / Notes</h4>
                  <p>{viewingItem.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
