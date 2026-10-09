import { useMemo, useState } from "react";
import { Plus, Star, Mail, Phone, Boxes, Pencil, Trash2 } from "lucide-react";
import { useData } from "../context/DataContext";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import Badge from "../components/Badge";

function TruncatedText({ children, className = "" }) {
  const text = String(children ?? "");

  return (
    <span className={`table-truncate ${className}`} data-tooltip={text}>
      {text}
    </span>
  );
}

const emptyForm = {
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  city: "",
  gstNumber: "",
  address: "",
  categories: [],
  paymentTerms: "Net 30",
};

export default function Vendors() {
  const { vendors, assets, categories, addVendor, updateVendor, deleteVendor } = useData();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  const assetCountByVendor = useMemo(() => {
    const map = {};
    assets.forEach((a) => {
      map[a.vendorId] = (map[a.vendorId] || 0) + 1;
    });
    return map;
  }, [assets]);

  function openAddModal() {
    setEditingVendor(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  }

  function openEditModal(vendor) {
    setEditingVendor(vendor);
    setForm({
      name: vendor.name || "",
      contactPerson: vendor.contactPerson || "",
      email: vendor.email || "",
      phone: vendor.phone || "",
      city: vendor.city || "",
      gstNumber: vendor.gstNumber || "",
      address: vendor.address || "",
      categories: Array.isArray(vendor.categories)
        ? vendor.categories
        : vendor.category
          ? [vendor.category]
          : [],
      paymentTerms: vendor.paymentTerms || "Net 30",
    });
    setErrors({});
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingVendor(null);
    setErrors({});
  }

  async function handleDelete(vendor) {
    if (!window.confirm(`Are you sure you want to delete vendor "${vendor.name}"?`)) return;
    try {
      await deleteVendor(vendor.id);
    } catch (err) {
      console.error("Failed to delete vendor:", err);
    }
  }

  function validate() {
    const errs = {};
    if (!form.name || !form.name.trim()) {
      errs.name = "Vendor name is required.";
    }

    const phoneVal = (form.phone || "").trim();
    if (!phoneVal) {
      errs.phone = "Phone number is required.";
    } else {
      const normalizedNewPhone = phoneVal.replace(/[\s\-()]/g, "").toLowerCase();
      const duplicatePhone = vendors.some((v) => {
        if (editingVendor && v.id === editingVendor.id) return false;
        const existingPhone = String(v.phone || "").replace(/[\s\-()]/g, "").toLowerCase();
        return existingPhone && existingPhone === normalizedNewPhone;
      });
      if (duplicatePhone) {
        errs.phone = "Phone number already exists. Duplicate phone number is not allowed.";
      }
    }

    const emailVal = (form.email || "").trim().toLowerCase();
    if (!emailVal) {
      errs.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      errs.email = "Please enter a valid email address.";
    } else {
      const duplicateEmail = vendors.some((v) => {
        if (editingVendor && v.id === editingVendor.id) return false;
        return (v.email || "").trim().toLowerCase() === emailVal;
      });
      if (duplicateEmail) {
        errs.email = "Email already exists. Duplicate email is not allowed.";
      }
    }

    if (!form.gstNumber || !form.gstNumber.trim()) {
      errs.gstNumber = "GST Number is required.";
    }

    if (!form.categories || form.categories.length === 0 || !form.categories[0]) {
      errs.categories = "Category is required.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    try {
      if (editingVendor) {
        await updateVendor(editingVendor.id, form);
      } else {
        await addVendor(form);
      }
      setForm(emptyForm);
      setEditingVendor(null);
      setErrors({});
      setModalOpen(false);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        form: err.message || "Failed to save vendor.",
      }));
    }
  }

  // const columns = [
  //   {
  //     key: "id",
  //     label: "Vendor ID",
  //     render: (r) => <span className="mono-cell">{r.id}</span>,
  //   },
  //   { key: "name", label: "Vendor Name" },
  //   {
  //     key: "categories",
  //     label: "Supplies",
  //     render: (r) => (
  //       <div className="config-chip-row">
  //         {r.categories.map((c) => (
  //           <span className="config-chip" key={c}>
  //             {c}
  //           </span>
  //         ))}
  //       </div>
  //     ),
  //   },
  //   { key: "contactPerson", label: "Contact Person" },
  //   {
  //     key: "email",
  //     label: "Email",
  //     render: (r) => (
  //       <a className="link-cell" href={`mailto:${r.email}`}>
  //         <Mail size={13} /> {r.email}
  //       </a>
  //     ),
  //   },
  //   {
  //     key: "phone",
  //     label: "Phone",
  //     render: (r) => (
  //       <span>
  //         <Phone size={13} /> {r.phone}
  //       </span>
  //     ),
  //   },
  //   {
  //     key: "assetsSupplied",
  //     label: "Assets Supplied",
  //     render: (r) => (
  //       <span>
  //         <Boxes size={13} /> {assetCountByVendor[r.id] || 0}
  //       </span>
  //     ),
  //   },
  //   {
  //     key: "rating",
  //     label: "Rating",
  //     render: (r) => (
  //       <span className="rating-cell">
  //         <Star size={13} fill="currentColor" /> {r.rating}
  //       </span>
  //     ),
  //   },
  //   {
  //     key: "status",
  //     label: "Status",
  //     render: (r) => <Badge>{r.status}</Badge>,
  //   },
  // ];
  const columns = [
  {
    key: 'id',
    label: 'Vendor ID',
    width: '110px',
    render: (r) => <span className="mono-cell">{r.id}</span>,
  },

  {
    key: 'name',
    label: 'Vendor Name',
    width: '220px',
    render: (r) => <span className="vendor-full-text">{r.name}</span>,
  },

  {
    key: 'categories',
    label: 'Supplies',
    width: '190px',
    render: (r) => (
      <div className="vendor-supplies-full">
        {r.categories.map((c) => (
          <span className="config-chip" key={c}>
            {c}
          </span>
        ))}
      </div>
    ),
  },

  {
    key: 'contactPerson',
    label: 'Contact Person',
    width: '180px',
    render: (r) => (
      <span className="vendor-full-text">
        {r.contactPerson}
      </span>
    ),
  },

  {
    key: 'email',
    label: 'Email',
    width: '280px',
    render: (r) => (
      <a
        className="link-cell vendor-full-link"
        href={`mailto:${r.email}`}
      >
        <Mail size={13} />
        <span>{r.email}</span>
      </a>
    ),
  },

  {
    key: 'phone',
    label: 'Phone',
    width: '170px',
    render: (r) => (
      <span className="vendor-full-phone">
        <Phone size={13} />
        <span>{r.phone}</span>
      </span>
    ),
  },

  {
    key: 'assetsSupplied',
    label: 'Assets Supplied',
    width: '150px',
    render: (r) => (
      <span className="vendor-assets">
        <Boxes size={13} />
        {assetCountByVendor[r.id] || 0}
      </span>
    ),
  },

  // {
  //   key: 'rating',
  //   label: 'Rating',
  //   width: '110px',
  //   render: (r) => (
  //     <span className="rating-cell">
  //       <Star size={13} fill="currentColor" />
  //       {r.rating}
  //     </span>
  //   ),
  // },

  {
    key: 'status',
    label: 'Status',
    width: '110px',
    render: (r) => <Badge>{r.status}</Badge>,
  },

  {
    key: 'actions',
    label: '',
    width: '80px',
    render: (r) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          className="icon-btn"
          title="Edit vendor"
          onClick={() => openEditModal(r)}
        >
          <Pencil size={15} />
        </button>
        <button
          className="icon-btn"
          title="Delete vendor"
          style={{ color: 'var(--danger, #ef4444)' }}
          onClick={() => handleDelete(r)}
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
          <h1>Vendors</h1>
          <p className="page-sub">
            Manage supplier relationships and see how much of your estate each
            vendor supports.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={16} /> Add Vendor
        </button>
      </div>

      <DataTable
        rows={vendors}
        columns={columns}
        searchKeys={["id", "name", "contactPerson", "email", "city"]}
        searchPlaceholder="Search vendors by name, contact, email…"
        filters={[
          {
            key: "category-filter",
            label: "Category",
            accessor: (r) => r.categories,
            options: categories.map((c) => ({ value: c.name, label: c.name })),
          },
          {
            key: "status",
            label: "Status",
            options: [
              { value: "Active", label: "Active" },
              { value: "Inactive", label: "Inactive" },
            ],
          },
        ]}
        exportFilename="vendors"
        exportSheetName="Vendors"
        exportMapper={(rows) =>
          rows.map((r) => ({
            "Vendor ID": r.id,
            Name: r.name,
            Categories: r.categories.join(", "),
            "Contact Person": r.contactPerson,
            Email: r.email,
            Phone: r.phone,
            City: r.city,
            "GST Number": r.gstNumber,
            "Payment Terms": r.paymentTerms,
            "Assets Supplied": assetCountByVendor[r.id] || 0,
            Rating: r.rating,
            Status: r.status,
          }))
        }
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingVendor ? `Edit ${editingVendor.name}` : "Add Vendor"}
        subtitle={
          editingVendor
            ? "Update the vendor details below. Fields marked with an asterisk are required."
            : "Vendor ID is generated automatically. Fields marked with an asterisk are required."
        }
        width={560}
        footer={
          <>
            {errors.form && (
              <span className="field-error" style={{ width: "100%", textAlign: "left", marginBottom: "8px" }}>
                {errors.form}
              </span>
            )}
            <button
              className="btn btn-ghost"
              onClick={closeModal}
            >
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSubmit}>
              {editingVendor ? "Save Changes" : "Save Vendor"}
            </button>
          </>
        }
      >
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="form-field form-field-full">
            <label>
              Vendor Name <span className="req">*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
              }}
              placeholder="e.g. Acer India Pvt Ltd"
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>
          <div className="form-field">
            <label>Contact Person</label>
            <input
              value={form.contactPerson}
              onChange={(e) =>
                setForm({ ...form, contactPerson: e.target.value })
              }
              placeholder="e.g. Rajesh Sharma"
            />
          </div>
          <div className="form-field">
            <label>
              Phone <span className="req">*</span>
            </label>
            <input
              value={form.phone}
              onChange={(e) => {
                setForm({ ...form, phone: e.target.value });
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
              }}
              placeholder="e.g. +91 98765 43210"
            />
            {errors.phone && <span className="field-error">{errors.phone}</span>}
          </div>
          <div className="form-field">
            <label>
              Email <span className="req">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => {
                setForm({ ...form, email: e.target.value });
                if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
              }}
              placeholder="e.g. contact@vendor.com"
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>
          <div className="form-field">
            <label>City</label>
            <input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="e.g. Pune"
            />
          </div>
          <div className="form-field">
            <label>
              GST Number <span className="req">*</span>
            </label>
            <input
              value={form.gstNumber}
              onChange={(e) => {
                setForm({ ...form, gstNumber: e.target.value });
                if (errors.gstNumber) setErrors((prev) => ({ ...prev, gstNumber: "" }));
              }}
              placeholder="e.g. 27AABCU9603R1ZM"
            />
            {errors.gstNumber && <span className="field-error">{errors.gstNumber}</span>}
          </div>
          <div className="form-field">
            <label>Payment Terms</label>
            <select
              value={form.paymentTerms}
              onChange={(e) =>
                setForm({ ...form, paymentTerms: e.target.value })
              }
            >
              {["Net 15", "Net 30", "Net 45", "Net 60", "Advance 50%"].map(
                (t) => (
                  <option key={t}>{t}</option>
                ),
              )}
            </select>
          </div>
          <div className="form-field form-field-full">
            <label>Registered Address</label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="e.g. Unit 402, Business Bay"
            />
          </div>
          <div className="form-field form-field-full">
            <label>
              Category <span className="req">*</span>
            </label>
            <select
              value={form.categories[0] || ""}
              onChange={(e) => {
                const val = e.target.value;
                setForm({ ...form, categories: val ? [val] : [] });
                if (errors.categories) {
                  setErrors((prev) => ({ ...prev, categories: "" }));
                }
              }}
            >
              <option value="">Select category…</option>
              {categories.map((c) => (
                <option key={c.id || c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.categories && (
              <span className="field-error">{errors.categories}</span>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
