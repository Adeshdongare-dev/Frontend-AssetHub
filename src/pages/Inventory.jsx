import { useMemo, useState } from 'react';
import { Plus, Sparkles, CheckCircle2, Pencil, Trash2, Upload, X, ChevronRight, Layers } from 'lucide-react';
import { useData } from '../context/DataContext';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
// CURRENT LOGIC (COMMENTED OUT):
// import { LOCATION_LIST } from '../data/mockData';

const todayISO = () => new Date().toISOString().slice(0, 10);

const CONDITION_OPTIONS = ['New', 'Excellent', 'Good', 'Fair', 'Damaged'];
const STATUS_OPTIONS = ['Available', 'Assigned', 'In Stock', 'Under Repair', 'Damaged', 'Retired'];

function generateInventoryId() {
  const yr = new Date().getFullYear();
  const randNum = Math.floor(1000 + Math.random() * 9000);
  return `INV-${yr}-${randNum}`;
}

function blankForm(defaultCategory) {
  const invId = generateInventoryId();
  return {
    inventoryId: invId,
    category: '',
    department: '',
    quantity: 1,
    vendorId: '',
    condition: 'New',
    status: 'Available',
    purchaseDate: todayISO(),
    purchaseCost: '',
    warrantyStartDate: todayISO(),
    warrantyEndDate: '',
    // CURRENT LOGIC (COMMENTED OUT):
    // location: 'Pune - Kharadi HQ',
    // NEW LOGIC: Empty by default so user can type or choose dynamically
    location: '',
    invoiceNo: '',
    poNumber: '',
    description: '',
    remarks: '',
    attachment: null,
    attachmentName: '',
    items: [
      {
        category: defaultCategory || '',
        item: '',
        itemName: '',
        brand: '',
        configuration: '',
        serialNo: '',
      },
    ],
  };
}

export default function Inventory() {
  const { inventoryBatches, vendors, categories, assets, employees, addInventoryBatch, updateInventoryBatch, deleteInventoryBatch } = useData();
  const activeCategories = useMemo(() => categories.filter((c) => c.status === 'Active'), [categories]);
  const defaultCategory = activeCategories[0]?.name || 'Laptop';

  // Dynamic location list fetched from Database records (inventoryBatches, assets, employees)
  const dbLocations = useMemo(() => {
    const set = new Set();
    (inventoryBatches || []).forEach((b) => {
      if (b.location && b.location.trim()) set.add(b.location.trim());
    });
    (assets || []).forEach((a) => {
      if (a.location && a.location.trim()) set.add(a.location.trim());
    });
    (employees || []).forEach((e) => {
      if (e.location && e.location.trim()) set.add(e.location.trim());
    });
    return Array.from(set).sort();
  }, [inventoryBatches, assets, employees]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [form, setForm] = useState(() => blankForm(defaultCategory));
  const [errors, setErrors] = useState({});
  const [successInfo, setSuccessInfo] = useState(null);
  const [expandedBatchIds, setExpandedBatchIds] = useState(new Set());

  function toggleBatchExpand(batchId) {
    setExpandedBatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(batchId)) {
        next.delete(batchId);
      } else {
        next.add(batchId);
      }
      return next;
    });
  }

  function openAddModal() {
    setEditingBatch(null);
    setForm(blankForm(defaultCategory));
    setErrors({});
    setModalOpen(true);
  }

  function openEditModal(item) {
    setEditingBatch(item);

    const existingChildren = (Array.isArray(item.items) && item.items.length > 0)
      ? item.items
      : (Array.isArray(assets) ? assets.filter((a) => a && (a.batchId === item.id || a.batchId === item.inventoryId)) : []);

    const loadedItems = existingChildren.length > 0
      ? existingChildren.map((it) => {
          const cat = (typeof it.category === 'string' && it.category.trim())
            ? it.category
            : (item.category || defaultCategory || '');
          const name = (typeof it.item === 'string' && it.item.trim())
            ? it.item
            : (typeof it.itemName === 'string' && it.itemName.trim())
              ? it.itemName
              : (typeof it.name === 'string' && it.name.trim())
                ? it.name
                : (typeof it.configuration === 'object' && it.configuration?.brandModel ? it.configuration.brandModel : '');
          const brand = (typeof it.brand === 'string' && it.brand.trim())
            ? it.brand
            : (typeof it.configuration === 'object' && it.configuration?.brand ? it.configuration.brand : '');
          const config = typeof it.configuration === 'string'
            ? it.configuration
            : typeof it.configSummary === 'string'
              ? it.configSummary
              : (it.configuration && typeof it.configuration === 'object'
                  ? Object.entries(it.configuration).filter(([k]) => k !== 'brandModel' && k !== 'brand').map(([k, v]) => `${k}: ${v}`).join(', ')
                  : '');
          const serial = (typeof it.serialNo === 'string' && it.serialNo.trim())
            ? it.serialNo
            : (typeof it.serialNumber === 'string' && it.serialNumber.trim())
              ? it.serialNumber
              : (it.id || '');

          return {
            id: it.id,
            category: cat,
            item: name,
            itemName: name,
            brand: brand,
            configuration: config,
            serialNo: serial,
          };
        })
      : Array.from({ length: item.quantity || 1 }, () => ({
          category: item.category || defaultCategory || '',
          item: '',
          itemName: '',
          brand: '',
          configuration: '',
          serialNo: '',
        }));

    setForm({
      inventoryId: item.inventoryId || item.id,
      category: item.category || defaultCategory,
      department: item.department || '',
      quantity: item.quantity || loadedItems.length || 1,
      description: item.description || '',
      purchaseDate: item.purchaseDate || '',
      purchaseCost: item.purchaseCost ?? item.unitCost ?? '',
      vendorId: item.vendorId || '',
      warrantyStartDate: item.warrantyStartDate || item.purchaseDate || '',
      warrantyEndDate: item.warrantyEndDate || item.warrantyExpiry || '',
      // CURRENT LOGIC (COMMENTED OUT):
      // location: item.location || 'Pune - Kharadi HQ',
      // NEW LOGIC:
      location: item.location || '',
      condition: item.condition || 'New',
      status: item.status || 'Available',
      invoiceNo: item.invoiceNo || '',
      poNumber: item.poNumber || '',
      remarks: item.remarks || '',
      attachment: null,
      attachmentName: item.attachmentName || '',
      items: loadedItems,
    });
    setErrors({});
    setModalOpen(true);
  }

  async function handleDelete(item) {
    const id = item.inventoryId || item.id;
    if (!window.confirm(`Are you sure you want to delete inventory item "${id}"?`)) return;
    try {
      await deleteInventoryBatch(id);
    } catch (err) {
      console.error('Failed to delete inventory batch:', err);
    }
  }

  function handleQuantityChange(rawVal) {
    const val = rawVal === '' ? '' : Math.max(1, Math.min(100, parseInt(rawVal, 10) || 1));
    setForm((f) => {
      const targetCount = typeof val === 'number' ? val : 1;
      const currentItems = f.items || [];
      const nextItems = [...currentItems];

      if (nextItems.length < targetCount) {
        for (let i = nextItems.length; i < targetCount; i++) {
          nextItems.push({
            category: defaultCategory || '',
            item: '',
            itemName: '',
            brand: '',
            configuration: '',
            serialNo: '',
          });
        }
      } else if (nextItems.length > targetCount) {
        nextItems.splice(targetCount);
      }

      return {
        ...f,
        quantity: val,
        items: nextItems,
      };
    });
  }

  function handleItemChange(index, field, value) {
    setForm((f) => {
      const nextItems = [...(f.items || [])];
      if (field === 'item' || field === 'itemName') {
        nextItems[index] = { ...nextItems[index], item: value, itemName: value };
      } else {
        nextItems[index] = { ...nextItems[index], [field]: value };
      }
      return { ...f, items: nextItems };
    });
  }

  function validate() {
    const errs = {};
    if (!form.vendorId || !String(form.vendorId).trim()) errs.vendorId = 'Vendor is required.';
    if (!form.invoiceNo || !form.invoiceNo.trim()) errs.invoiceNo = 'Invoice Number is required.';
    if (!form.poNumber || !form.poNumber.trim()) errs.poNumber = 'PO Number is required.';
    if (!form.condition) errs.condition = 'Condition is required.';
    if (!form.status) errs.status = 'Status is required.';
    if (!form.quantity || Number(form.quantity) < 1) errs.quantity = 'Quantity must be at least 1.';

    if (form.items) {
      form.items.forEach((it, i) => {
        const cat = it.category;
        if (!cat || !cat.trim()) {
          errs[`item_${i}_category`] = 'Required';
        }
        if (!it.serialNo || !it.serialNo.trim()) {
          errs[`item_${i}_serialNo`] = 'Required';
        }
      });
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    const batchCategory = (form.items && form.items.length > 0)
      ? Array.from(new Set(form.items.map((it) => it.category).filter(Boolean))).join(', ')
      : (form.category || 'General');

    const payloadItems = (form.items || []).map((it) => ({
      ...it,
      category: it.category || defaultCategory || '',
      item: (it.item || it.itemName || '').trim(),
      itemName: (it.itemName || it.item || '').trim(),
      brand: (it.brand || '').trim(),
      configuration: (it.configuration || '').trim(),
      serialNo: (it.serialNo || '').trim(),
    }));

    if (editingBatch) {
      await updateInventoryBatch(editingBatch.id, {
        category: batchCategory,
        department: form.department,
        description: form.description,
        purchaseDate: form.purchaseDate,
        purchaseCost: form.purchaseCost ? Number(form.purchaseCost) : 0,
        unitCost: form.purchaseCost ? Number(form.purchaseCost) : 0,
        totalCost: form.purchaseCost ? Number(form.purchaseCost) : 0,
        vendorId: form.vendorId,
        warrantyStartDate: form.warrantyStartDate,
        warrantyEndDate: form.warrantyEndDate,
        location: form.location,
        condition: form.condition,
        status: form.status,
        invoiceNo: form.invoiceNo,
        poNumber: form.poNumber,
        remarks: form.remarks,
        attachmentName: form.attachmentName,
        quantity: Number(form.quantity) || payloadItems.length,
        items: payloadItems,
      });
      setModalOpen(false);
      return;
    }

    let createdBatch = null;
    try {
      const result = await addInventoryBatch({
        inventoryId: form.inventoryId,
        id: form.inventoryId,
        category: batchCategory,
        department: form.department,
        description: form.description,
        purchaseDate: form.purchaseDate,
        purchaseCost: form.purchaseCost ? Number(form.purchaseCost) : 0,
        unitCost: form.purchaseCost ? Number(form.purchaseCost) : 0,
        totalCost: form.purchaseCost ? Number(form.purchaseCost) : 0,
        vendorId: form.vendorId,
        warrantyStartDate: form.warrantyStartDate,
        warrantyEndDate: form.warrantyEndDate,
        location: form.location,
        condition: form.condition,
        status: form.status,
        invoiceNo: form.invoiceNo,
        poNumber: form.poNumber,
        remarks: form.remarks,
        attachmentName: form.attachmentName,
        quantity: Number(form.quantity) || form.items.length,
        items: payloadItems,
      });
      createdBatch = result?.batch;
    } catch (err) {
      console.error('Failed to create inventory batch in backend:', err);
    }

    const savedId = createdBatch?.inventoryId || createdBatch?.id || form.inventoryId;
    setModalOpen(false);
    setSuccessInfo({
      id: savedId,
      category: batchCategory,
      department: form.department,
      count: form.items.length,
    });
    setExpandedBatchIds((prev) => new Set(prev).add(savedId));
  }

  const columns = [
    {
      key: 'inventoryId',
      label: 'Inventory ID',
      render: (r, { isExpanded } = {}) => (
        <div className="batch-id-cell">
          <button
            type="button"
            className={`expand-arrow-btn ${isExpanded ? 'is-expanded' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleBatchExpand(r.id);
            }}
            title={isExpanded ? 'Collapse child data' : 'Expand child data'}
            aria-label={isExpanded ? 'Collapse child data' : 'Expand child data'}
          >
            <ChevronRight size={14} />
          </button>
          <span className="mono-cell">{r.inventoryId || r.id}</span>
        </div>
      ),
    },
    { key: 'category', label: 'Category' },
    { key: 'vendorName', label: 'Vendor', render: (r) => r.vendorName || '—' },
    {
      key: 'quantity',
      label: 'Qty',
      render: (r) => <b className="qty-highlight">{r.quantity || (r.items ? r.items.length : 1)}</b>,
    },
    {
      key: 'purchaseCost',
      label: 'Purchase Cost',
      render: (r) => {
        const val = r.purchaseCost ?? r.unitCost ?? r.totalCost;
        return val !== undefined && val !== null && val !== ''
          ? `₹ ${Number(val).toLocaleString('en-IN')}`
          : '—';
      },
    },
    { key: 'purchaseDate', label: 'Purchase Date', render: (r) => r.purchaseDate || '—' },
    { key: 'warrantyEndDate', label: 'Warranty End', render: (r) => r.warrantyEndDate || r.warrantyExpiry || '—' },
    { key: 'location', label: 'Location', render: (r) => r.location || '—' },
    {
      key: 'condition',
      label: 'Condition',
      render: (r) => (r.condition ? <Badge tone={r.condition === 'Damaged' ? 'danger' : 'info'}>{r.condition}</Badge> : '—'),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => (
        <Badge tone={r.status === 'Available' || r.status === 'In Stock' ? 'success' : r.status === 'Assigned' ? 'primary' : 'warning'}>
          {r.status || 'Available'}
        </Badge>
      ),
    },
    { key: 'invoiceNo', label: 'Invoice No', render: (r) => <span className="mono-cell">{r.invoiceNo || '—'}</span> },
    { key: 'poNumber', label: 'PO Number', render: (r) => <span className="mono-cell">{r.poNumber || '—'}</span> },
    {
      key: 'actions',
      label: '',
      width: 80,
      render: (r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            className="icon-btn"
            title="Edit this item"
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(r);
            }}
          >
            <Pencil size={15} />
          </button>
          <button
            className="icon-btn"
            title="Delete this item"
            style={{ color: 'var(--danger, #ef4444)' }}
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(r);
            }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Inventory</h1>
          <p className="page-sub">Manage and track procurement records, warranties, and stock status.</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}><Plus size={16} /> Add Inventory</button>
      </div>

      <DataTable
        rows={inventoryBatches}
        columns={columns}
        searchKeys={['id', 'inventoryId', 'poNumber', 'invoiceNo', 'vendorName', 'category', 'location']}
        searchPlaceholder="Search by Inventory ID, Category, Vendor, Location…"
        filters={[
          { key: 'category', label: 'Category', options: activeCategories.map((c) => ({ value: c.name, label: c.name })) },
          { key: 'status', label: 'Status', options: STATUS_OPTIONS.map((s) => ({ value: s, label: s })) },
          { key: 'condition', label: 'Condition', options: CONDITION_OPTIONS.map((c) => ({ value: c, label: c })) },
        ]}
        onRowClick={(row) => toggleBatchExpand(row.id)}
        isRowExpanded={(row) => expandedBatchIds.has(row.id)}
        renderSubRow={(row) => {
          if (!row) return null;
          const childData = (Array.isArray(row.items) && row.items.length > 0)
            ? row.items
            : (Array.isArray(assets) ? assets.filter((a) => a && (a.batchId === row.id || a.batchId === row.inventoryId)) : []);

          return (
            <div className="child-class-entry">
              <div className="child-class-header">
                <div className="child-class-title">
                  <Layers size={16} />
                  <strong>Child Data for Inventory ID: <code>{row.inventoryId || row.id}</code></strong>
                  <span className="child-badge">{childData.length || row.quantity || 1} units</span>
                </div>
                <div className="child-class-meta">
                  <span>Category: <b>{row.category}</b></span>
                  <span>Invoice No: <code>{row.invoiceNo || '—'}</code></span>
                  <span>PO Number: <code>{row.poNumber || '—'}</code></span>
                </div>
              </div>

              {childData.length === 0 ? (
                <div className="child-empty-state">No child items recorded.</div>
              ) : (
                <div className="child-table-wrap">
                  <table className="child-class-table">
                    <thead>
                      <tr>
                        <th style={{ width: '45px' }}>#</th>
                        <th style={{ width: '18%' }}>Serial Number</th>
                        <th style={{ width: '18%' }}>Item Name</th>
                        <th style={{ width: '16%' }}>Category</th>
                        <th style={{ width: '16%' }}>Brand</th>
                        <th style={{ width: '32%' }}>Configuration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {childData.map((child, idx) => {
                        const catText = (typeof child.category === 'string' && child.category.trim())
                          ? child.category
                          : (row.category || '—');
                        const itemText = (typeof child.item === 'string' && child.item.trim())
                          ? child.item
                          : (typeof child.itemName === 'string' && child.itemName.trim())
                            ? child.itemName
                            : (typeof child.name === 'string' && child.name.trim())
                              ? child.name
                              : (typeof child.configuration === 'object' && child.configuration?.brandModel
                                  ? child.configuration.brandModel
                                  : '—');
                        const brandText = (typeof child.brand === 'string' && child.brand.trim())
                          ? child.brand
                          : (typeof child.configuration === 'object' && child.configuration?.brand
                              ? child.configuration.brand
                              : (typeof child.configuration === 'object' && child.configuration?.brandModel
                                  ? String(child.configuration.brandModel).split(' ')[0]
                                  : (row.vendorName ? String(row.vendorName).split(' ')[0] : '—')));
                        const configText = (typeof child.configuration === 'string' && child.configuration.trim())
                          ? child.configuration
                          : (typeof child.configSummary === 'string' && child.configSummary.trim()
                              ? child.configSummary
                              : (child.configuration && typeof child.configuration === 'object'
                                  ? Object.entries(child.configuration).filter(([k]) => k !== 'brandModel' && k !== 'brand').map(([k, v]) => `${k}: ${v}`).join(', ')
                                  : (row.description || '—')));
                        const serialText = (typeof child.serialNo === 'string' && child.serialNo.trim())
                          ? child.serialNo
                          : (typeof child.serialNumber === 'string' && child.serialNumber.trim())
                            ? child.serialNumber
                            : (child.id || '—');

                        return (
                          <tr key={child.id || child.serialNo || child.serialNumber || idx}>
                            <td><span className="serial-index">#{idx + 1}</span></td>
                            <td><span className="mono-cell">{serialText}</span></td>
                            <td><b>{itemText}</b></td>
                            <td>{catText}</td>
                            <td>{brandText}</td>
                            <td><span className="config-cell">{configText}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        }}
        exportFilename="inventory_records"
        exportSheetName="Inventory"
        exportMapper={(rows) => rows.map((r) => ({
          'Inventory ID': r.inventoryId || r.id,
          Category: r.category,
          Vendor: r.vendorName || '',
          Quantity: r.quantity || 1,
          'Purchase Cost (INR)': r.purchaseCost ?? r.unitCost ?? '',
          'Purchase Date': r.purchaseDate || '',
          'Warranty Start Date': r.warrantyStartDate || '',
          'Warranty End Date': r.warrantyEndDate || r.warrantyExpiry || '',
          Location: r.location || '',
          Condition: r.condition || '',
          Status: r.status || '',
          'Invoice Number': r.invoiceNo || '',
          'PO Number': r.poNumber || '',
          Description: r.description || '',
          Remarks: r.remarks || '',
          Attachment: r.attachmentName || '',
        }))}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingBatch ? `Edit inventory ${editingBatch.inventoryId || editingBatch.id}` : 'Add Inventory'}
        subtitle="Fill in the inventory details below. Fields marked with an asterisk are required."
        width={880}
        footer={(
          <>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit}>
              {editingBatch ? 'Save Changes' : <><Sparkles size={15} /> Save Inventory</>}
            </button>
          </>
        )}
      >
        <form className="form-grid" onSubmit={handleSubmit}>
          {/* 1. Inventory ID (Auto-generated, Required) */}
          <div className="form-field">
            <label>Inventory ID <span className="req">*</span></label>
            <input
              type="text"
              value={form.inventoryId}
              disabled
              readOnly
              className="readonly-input mono-cell"
            />
            <span className="muted-text small">Auto-generated (same for all child items)</span>
          </div>

          {/* 2. Vendor (Dropdown, Required: Yes) */}
          <div className="form-field">
            <label>Vendor <span className="req">*</span></label>
            <select
              value={form.vendorId}
              onChange={(e) => {
                setForm({ ...form, vendorId: e.target.value });
                if (errors.vendorId) setErrors((prev) => ({ ...prev, vendorId: '' }));
              }}
            >
              <option value="">Select vendor…</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            {errors.vendorId && <span className="field-error">{errors.vendorId}</span>}
          </div>

          {/* 5. Condition (Dropdown, Required: Yes) */}
          <div className="form-field">
            <label>Condition <span className="req">*</span></label>
            <select
              value={form.condition}
              onChange={(e) => setForm({ ...form, condition: e.target.value })}
            >
              {CONDITION_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {errors.condition && <span className="field-error">{errors.condition}</span>}
          </div>

          {/* 6. Status (Dropdown, Required: Yes) */}
          <div className="form-field">
            <label>Status <span className="req">*</span></label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {errors.status && <span className="field-error">{errors.status}</span>}
          </div>

          {/* 7. Quantity (Number, Required: Yes) */}
          <div className="form-field">
            <label>Quantity <span className="req">*</span></label>
            <input
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              placeholder="e.g. 4"
            />
            {errors.quantity && <span className="field-error">{errors.quantity}</span>}
          </div>

          {/* 8. Purchase Cost (Number, Required: No) */}
          <div className="form-field">
            <label>Purchase Cost (₹)</label>
            <input
              type="number"
              min="0"
              value={form.purchaseCost}
              onChange={(e) => setForm({ ...form, purchaseCost: e.target.value })}
              placeholder="e.g. 75000"
            />
          </div>

          {/* 9. Purchase Date (Date, Required: No) */}
          <div className="form-field">
            <label>Purchase Date</label>
            <input
              type="date"
              value={form.purchaseDate}
              onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
            />
          </div>

          {/* 10. Warranty Start Date (Date, Required: No) */}
          <div className="form-field">
            <label>Warranty Start Date</label>
            <input
              type="date"
              value={form.warrantyStartDate}
              onChange={(e) => setForm({ ...form, warrantyStartDate: e.target.value })}
            />
          </div>

          {/* 11. Warranty End Date (Date, Required: No) */}
          <div className="form-field">
            <label>Warranty End Date</label>
            <input
              type="date"
              value={form.warrantyEndDate}
              onChange={(e) => setForm({ ...form, warrantyEndDate: e.target.value })}
            />
          </div>

          {/* 12. Location (Manual Type + DB Suggestions) */}
          {/* CURRENT LOGIC (COMMENTED OUT):
          <div className="form-field">
            <label>Location</label>
            <select
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            >
              <option value="">Select location…</option>
              {LOCATION_LIST.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
          */}

          {/* NEW LOGIC: Manual typing supported + dropdown suggestions fetched from Database */}
          <div className="form-field">
            <label>Location</label>
            <input
              type="text"
              list="db-inventory-locations"
              placeholder="Type or select location…"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
            <datalist id="db-inventory-locations">
              {dbLocations.map((loc) => (
                <option key={loc} value={loc} />
              ))}
            </datalist>
          </div>

          {/* 13. Invoice Number (Text, Required: Yes) */}
          <div className="form-field">
            <label>Invoice Number <span className="req">*</span></label>
            <input
              type="text"
              value={form.invoiceNo}
              onChange={(e) => {
                setForm({ ...form, invoiceNo: e.target.value });
                if (errors.invoiceNo) setErrors((prev) => ({ ...prev, invoiceNo: '' }));
              }}
              placeholder="e.g. INV-2026-001"
            />
            {errors.invoiceNo && <span className="field-error">{errors.invoiceNo}</span>}
          </div>

          {/* 14. PO Number (Text, Required: Yes) */}
          <div className="form-field">
            <label>PO Number <span className="req">*</span></label>
            <input
              type="text"
              value={form.poNumber}
              onChange={(e) => {
                setForm({ ...form, poNumber: e.target.value });
                if (errors.poNumber) setErrors((prev) => ({ ...prev, poNumber: '' }));
              }}
              placeholder="e.g. PO-98210"
            />
            {errors.poNumber && <span className="field-error">{errors.poNumber}</span>}
          </div>

          {/* 15. Description (Text Area, Required: No) */}
          <div className="form-field form-field-full">
            <label>Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Enter item description…"
            />
          </div>

          {/* 16. Remarks (Text Area, Required: No) */}
          <div className="form-field form-field-full">
            <label>Remarks</label>
            <textarea
              rows={2}
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="Any additional remarks or procurement notes…"
            />
          </div>

          {/* 17. Attachment (File Upload, Required: No) */}
          <div className="form-field form-field-full">
            <label>Attachment</label>
            <div className="file-upload-box">
              <input
                type="file"
                id="inventory-attachment-file"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setForm((f) => ({ ...f, attachment: file, attachmentName: file.name }));
                  }
                }}
              />
              <label htmlFor="inventory-attachment-file" className="file-upload-btn">
                <Upload size={14} /> Choose File
              </label>
              {form.attachmentName ? (
                <span className="file-upload-name">
                  {form.attachmentName}
                  <button
                    type="button"
                    className="clear-file-btn"
                    onClick={() => setForm((f) => ({ ...f, attachment: null, attachmentName: '' }))}
                  >
                    <X size={13} />
                  </button>
                </span>
              ) : (
                <span className="file-upload-hint">No file chosen</span>
              )}
            </div>
          </div>

          {/* Dynamic Child Items: 4 lines when Quantity is 4 */}
          <div className="form-divider">
            <span>
              Child Item Details ({form.items?.length || 0} {form.items?.length === 1 ? 'Unit' : 'Units'}) <span className="req">*</span>
            </span>
          </div>

              <div className="form-field-full inventory-items-container">
                <div className="inventory-items-table-wrap">
                  <table className="inventory-items-form-table">
                    <thead>
                      <tr>
                        <th style={{ width: '38px' }}>#</th>
                        <th style={{ width: '18%' }}>Category <span className="req">*</span></th>
                        <th style={{ width: '20%' }}>Item Name</th>
                        <th style={{ width: '16%' }}>Brand</th>
                        <th style={{ width: '24%' }}>Configuration</th>
                        <th style={{ width: '22%' }}>Serial Number <span className="req">*</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items?.map((item, i) => (
                        <tr key={i} className="inventory-item-form-row">
                          <td className="item-num-cell">
                            <span className="serial-index">#{i + 1}</span>
                          </td>
                          <td>
                            <select
                              value={item.category || ''}
                              onChange={(e) => handleItemChange(i, 'category', e.target.value)}
                              className={errors[`item_${i}_category`] ? 'input-error' : ''}
                            >
                              <option value="">Select category…</option>
                              {activeCategories.map((c) => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                              ))}
                            </select>
                            {errors[`item_${i}_category`] && <span className="field-error">{errors[`item_${i}_category`]}</span>}
                          </td>
                          <td>
                            <input
                              type="text"
                              value={item.item ?? item.itemName ?? ''}
                              onChange={(e) => handleItemChange(i, 'item', e.target.value)}
                              placeholder="e.g. Latitude 5440"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={item.brand}
                              onChange={(e) => handleItemChange(i, 'brand', e.target.value)}
                              placeholder="e.g. Dell / HP"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={item.configuration}
                              onChange={(e) => handleItemChange(i, 'configuration', e.target.value)}
                              placeholder="e.g. i7, 16GB, 512GB"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={item.serialNo}
                              onChange={(e) => handleItemChange(i, 'serialNo', e.target.value)}
                              placeholder="Serial number"
                              className={errors[`item_${i}_serialNo`] ? 'input-error' : ''}
                            />
                            {errors[`item_${i}_serialNo`] && <span className="field-error">{errors[`item_${i}_serialNo`]}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
        </form>
      </Modal>

      <Modal
        open={!!successInfo}
        onClose={() => setSuccessInfo(null)}
        title="Inventory Recorded"
        width={480}
        footer={<button className="btn btn-primary" onClick={() => setSuccessInfo(null)}>Done</button>}
      >
        {successInfo && (
          <div className="success-body">
            <CheckCircle2 size={40} color="var(--success)" />
            <p>Inventory item <code>{successInfo.id}</code> with <b>{successInfo.count}</b> child unit{successInfo.count > 1 ? 's' : ''} has been successfully recorded.</p>
            <p className="muted-text">Category: <b>{successInfo.category}</b></p>
            <p className="muted-text">Click the row in the table to view the child data for all units.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

