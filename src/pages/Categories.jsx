import { useMemo, useState } from 'react';
import { Plus, Tag, Pencil, Boxes } from 'lucide-react';
import { useData } from '../context/DataContext';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import Badge from '../components/Badge';

const emptyForm = { name: '', prefix: '', description: '', status: 'Active' };

export default function Categories() {
  const { categories, assets, inventoryBatches, addCategory, updateCategory } = useData();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const assetCountByCategory = useMemo(() => {
    const map = {};
    assets.forEach((a) => { map[a.category] = (map[a.category] || 0) + 1; });
    return map;
  }, [assets]);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  }

  function openEdit(cat) {
    setEditing(cat);
    setForm({ name: cat.name, prefix: cat.prefix, description: cat.description || '', status: cat.status });
    setError('');
    setModalOpen(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.prefix.trim()) {
      setError('Category name and prefix are both required.');
      return;
    }
    const prefixTaken = categories.some((c) => c.prefix.toUpperCase() === form.prefix.toUpperCase() && c.id !== editing?.id);
    if (prefixTaken) {
      setError('This prefix is already used by another category — asset tags need a unique prefix.');
      return;
    }
    if (editing) {
      updateCategory(editing.id, form);
    } else {
      addCategory(form);
    }
    setModalOpen(false);
  }

  const columns = [
    { key: 'id', label: 'Category ID', render: (r) => <span className="mono-cell">{r.id}</span> },
    { key: 'name', label: 'Category Name' },
    { key: 'prefix', label: 'Tag Prefix', render: (r) => <span className="mono-cell">{r.prefix ? `${String(r.prefix).replace(/^AST-?/i, '')}-#####` : '—'}</span> },
    { key: 'description', label: 'Description', render: (r) => r.description || <span className="muted-text">—</span> },
    { key: 'assetCount', label: 'Assets', render: (r) => <span><Boxes size={13} /> {assetCountByCategory[r.name] || 0}</span> },
    { key: 'status', label: 'Status', render: (r) => <Badge tone={r.status === 'Active' ? 'success' : 'muted'}>{r.status}</Badge> },
    { key: 'actions', label: '', width: 60, render: (r) => <button className="icon-btn" title="Edit category" onClick={() => openEdit(r)}><Pencil size={15} /></button> },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Categories</h1>
          <p className="page-sub">The category list drives the Inventory dropdown, the asset-tag prefix, and the Dashboard's category-wise breakdown.</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Category</button>
      </div>

      <DataTable
        rows={categories}
        columns={columns}
        searchKeys={['id', 'name', 'prefix', 'description']}
        searchPlaceholder="Search categories…"
        filters={[{ key: 'status', label: 'Status', options: [{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }] }]}
        exportFilename="categories"
        exportSheetName="Categories"
        pageSize={10}
        exportMapper={(rows) => rows.map((r) => ({
          'Category ID': r.id, Name: r.name, 'Tag Prefix': r.prefix, Description: r.description,
          'Assets in Category': assetCountByCategory[r.name] || 0, Status: r.status,
        }))}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.name}` : 'Add Category'}
        subtitle={editing ? 'Renaming will not retag existing assets already generated under this category.' : 'Category ID is generated automatically.'}
        width={460}
        footer={(
          <>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit}>{editing ? 'Save Changes' : 'Add Category'}</button>
          </>
        )}
      >
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="form-field form-field-full">
            <label>Category Name <span className="req">*</span></label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Tablet" />
          </div>
          <div className="form-field">
            <label>Tag Prefix <span className="req">*</span></label>
            <input
              value={form.prefix}
              maxLength={4}
              onChange={(e) => setForm({ ...form, prefix: e.target.value.toUpperCase() })}
              placeholder="e.g. TAB"
            />
          </div>
          <div className="form-field">
            <label>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
          <div className="form-field form-field-full">
            <label>Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional short note" />
          </div>
          {error && <div className="field-error form-field-full">{error}</div>}
          <div className="form-note form-field-full">
            <Tag size={14} />
            <span>Assets in this category will be tagged like <code>{form.prefix ? `${String(form.prefix).replace(/^AST-?/i, '')}-00001` : 'XXX-00001'}</code>.</span>
          </div>
        </form>
      </Modal>

      {inventoryBatches.length > 0 && (
        <p className="muted-text small" style={{ marginTop: 12 }}>
          Tip: categories already used in Inventory can be renamed but not deleted, to keep historical batches consistent — set status to Inactive instead to hide them from new intake.
        </p>
      )}
    </div>
  );
}
