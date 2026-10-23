import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Eye,
  UserPlus,
  Undo2,
  Wrench,
  ArrowLeftRight,
  RefreshCcw,
  MoreVertical,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import DataTable from "../components/DataTable";
import Badge from "../components/Badge";
import Modal from "../components/Modal";
import AssetDetailDrawer from "../components/AssetDetailDrawer";
import SearchableEmployeeSelect from "../components/SearchableEmployeeSelect";
import { STATUS_LIST, LOCATION_LIST } from "../data/mockData";
import { generateAssetTag, cleanAssetId } from "../utils/idGenerator";

const todayISO = () => new Date().toISOString().slice(0, 10);
const CONDITION_OPTIONS = ["New", "Excellent", "Good", "Fair", "Damaged"];

function generateInventoryId() {
  const yr = new Date().getFullYear();
  const randNum = Math.floor(1000 + Math.random() * 9000);
  return `INV-${yr}-${randNum}`;
}

function blankAssetForm(defaultCategory) {
  return {
    items: [
      {
        category: defaultCategory || "",
        item: "",
        itemName: "",
        brand: "",
        configuration: "",
        serialNo: "",
      },
    ],
  };
}

function daysUntil(dateStr) {
  if (!dateStr) return 0;
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
}

const NON_ASSIGNED_STATUSES = STATUS_LIST.filter((s) => s !== "Assigned");

export default function Assets() {
  const {
    assets,
    employees,
    categories,
    vendors,
    inventoryBatches,
    addInventoryBatch,
    addAsset,
    assignAsset,
    unassignAsset,
    transferAsset,
    changeAssetStatus,
    raiseMaintenance,
    closeMaintenance,
    updateAsset,
    maintenanceRecords,
  } = useData();
  const { user } = useAuth();
  const { tab, categoryName } = useParams();
  const navigate = useNavigate();

  const [selectedAsset, setSelectedAsset] = useState(null);

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
  const [actionMenuFor, setActionMenuFor] = useState(null);
  const [assignModal, setAssignModal] = useState(null);
  const [transferModal, setTransferModal] = useState(null);
  const [statusModal, setStatusModal] = useState(null);
  const [maintenanceModal, setMaintenanceModal] = useState(null);
  const [closeModal, setCloseModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [empId, setEmpId] = useState("");
  const [issueType, setIssueType] = useState("Hardware Fault");
  const [issueDesc, setIssueDesc] = useState("");
  const [closeCost, setCloseCost] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [newStatus, setNewStatus] = useState("Available");
  const [statusRemarks, setStatusRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeCategories = useMemo(
    () => categories.filter((c) => c.status === "Active"),
    [categories]
  );
  const defaultCategory = activeCategories[0]?.name || "Laptop";

  const [addAssetModalOpen, setAddAssetModalOpen] = useState(false);
  const [addAssetForm, setAddAssetForm] = useState(() => blankAssetForm(defaultCategory));
  const [addAssetErrors, setAddAssetErrors] = useState({});

  function openAddAssetModal() {
    setAddAssetForm(blankAssetForm(defaultCategory));
    setAddAssetErrors({});
    setAddAssetModalOpen(true);
  }

  function handleAddRow() {
    setAddAssetForm((f) => ({
      ...f,
      items: [
        ...(f.items || []),
        {
          category: defaultCategory || "",
          item: "",
          itemName: "",
          brand: "",
          configuration: "",
          serialNo: "",
        },
      ],
    }));
  }

  function handleRemoveRow(index) {
    setAddAssetForm((f) => {
      const next = [...(f.items || [])];
      next.splice(index, 1);
      return {
        ...f,
        items:
          next.length > 0
            ? next
            : [
                {
                  category: defaultCategory || "",
                  item: "",
                  itemName: "",
                  brand: "",
                  configuration: "",
                  serialNo: "",
                },
              ],
      };
    });
  }

  function handleChildItemChange(index, field, value) {
    setAddAssetForm((f) => {
      const nextItems = [...(f.items || [])];
      if (field === "item" || field === "itemName") {
        nextItems[index] = { ...nextItems[index], item: value, itemName: value };
      } else {
        nextItems[index] = { ...nextItems[index], [field]: value };
      }
      return { ...f, items: nextItems };
    });
  }

  function validateAddAsset() {
    const errs = {};
    const items = addAssetForm.items || [];
    if (items.length === 0) {
      errs.general = "At least one item is required.";
    }
    items.forEach((it, i) => {
      if (!it.category || !it.category.trim()) {
        errs[`item_${i}_category`] = "Required";
      }
      const sNo = it.serialNo || it.serialNumber;
      if (!sNo || !sNo.trim()) {
        errs[`item_${i}_serialNo`] = "Required";
      }
    });

    setAddAssetErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleAddAssetSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!validateAddAsset()) return;

    const payloadItems = (addAssetForm.items || []).map((it) => ({
      category: it.category || defaultCategory || "",
      item: (it.item || it.itemName || "").trim(),
      itemName: (it.itemName || it.item || "").trim(),
      brand: (it.brand || "").trim(),
      configuration: (it.configuration || "").trim(),
      serialNo: (it.serialNo || it.serialNumber || "").trim(),
    }));

    let addedCountMap = {};
    for (const it of payloadItems) {
      const cat = it.category || defaultCategory || "Other";
      const configDict = {};
      const itemName = it.itemName || it.item || "";
      if (itemName) configDict.brandModel = itemName;
      if (it.brand) configDict.brand = it.brand;
      if (it.configuration) configDict.specs = it.configuration;

      const catObj = activeCategories.find((c) => c.name.trim().toLowerCase() === cat.trim().toLowerCase());
      const catPrefix = catObj?.prefix;
      const catKey = cat.trim().toLowerCase();
      const currentCatCount = assets.filter((a) => a.category?.trim().toLowerCase() === catKey).length;
      const offset = addedCountMap[catKey] || 0;
      const cleanTag = cleanAssetId(it.id || generateAssetTag(cat, catPrefix, currentCatCount + offset), cat, activeCategories);
      addedCountMap[catKey] = offset + 1;

      const assetPayload = {
        id: cleanTag,
        assetId: cleanTag,
        category: cat,
        serialNumber: (it.serialNo || it.serialNumber || "").trim(),
        configuration: configDict,
        condition: "New",
        status: "Available",
        location: "Pune - Kharadi HQ",
        purchaseDate: "",
        unitCost: 0,
        poNumber: "",
        invoiceNo: "",
        warrantyMonths: 0,
        warrantyExpiry: "",
        notes: "",
        item: itemName || cat,
        itemName: itemName || cat,
        brand: it.brand || "",
        configSummary: [itemName, it.brand, it.configuration].filter(Boolean).join(" • "),
      };

      try {
        await addAsset(assetPayload);
      } catch (err) {
        console.error("Asset creation error:", err);
      }
    }

    setAddAssetModalOpen(false);
  }

  function openEdit(asset) {
    setEditModal(asset);
    setEditForm({
      id: asset.id,
      item: asset.item || (typeof asset.configuration === "object" ? asset.configuration?.brandModel : "") || "",
      category: asset.category || "",
      brand: asset.brand || (typeof asset.configuration === "object" ? asset.configuration?.brand : "") || "",
      configuration:
        typeof asset.configuration === "string"
          ? asset.configuration
          : typeof asset.configSummary === "string"
            ? asset.configSummary
            : "",
      serialNumber: asset.serialNumber || asset.serialNo || "",
      condition: asset.condition || "Good",
      status: asset.status || "Available",
      location: asset.location || "",
      vendorId: asset.vendorId || "",
      notes: asset.notes || "",
    });
    setActionMenuFor(null);
  }

  function openStatusModal(asset) {
    setStatusModal(asset);
    setNewStatus(asset.status === "Assigned" ? "Available" : asset.status);
    setStatusRemarks("");
    setActionMenuFor(null);
  }

  // Calculate counts for each tab
  const tabCounts = useMemo(() => {
    const total = assets.length;
    const assigned = assets.filter((a) => a.status === "Assigned").length;
    const available = assets.filter(
      (a) => a.status === "Available" || a.status === "In Stock"
    ).length;
    const underRepair = assets.filter((a) => a.status === "Under Repair").length;
    const warrantyExpiring = assets.filter((a) => {
      const d = daysUntil(a.warrantyExpiry);
      return d >= 0 && d <= 60 && !["Retired", "Disposed", "Lost"].includes(a.status);
    }).length;
    return { total, assigned, available, underRepair, warrantyExpiring };
  }, [assets]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const map = {};
    assets.forEach((a) => {
      map[a.category] = (map[a.category] || 0) + 1;
    });
    return map;
  }, [assets]);

  // Determine active tab & category
  const activeCategory = categoryName ? decodeURIComponent(categoryName) : null;
  const activeTab = categoryName
    ? "category"
    : tab === "assigned"
      ? "assigned"
      : tab === "available"
        ? "available"
        : tab === "under-repair"
          ? "under-repair"
          : tab === "warranty-expiring"
            ? "warranty-expiring"
            : "total";

  // Filter rows strictly to active tab
  const tabFilteredAssets = useMemo(() => {
    if (activeCategory) {
      return assets.filter(
        (a) => (a.category || "").toLowerCase() === activeCategory.toLowerCase()
      );
    }
    switch (activeTab) {
      case "assigned":
        return assets.filter((a) => a.status === "Assigned");
      case "available":
        return assets.filter(
          (a) => a.status === "Available" || a.status === "In Stock"
        );
      case "under-repair":
        return assets.filter((a) => a.status === "Under Repair");
      case "warranty-expiring":
        return assets.filter((a) => {
          const d = daysUntil(a.warrantyExpiry);
          return (
            d >= 0 &&
            d <= 60 &&
            !["Retired", "Disposed", "Lost"].includes(a.status)
          );
        });
      case "total":
      default:
        return assets;
    }
  }, [assets, activeTab, activeCategory]);

  // Dynamic meta for heading, description and export file
  const pageMeta = useMemo(() => {
    if (activeCategory) {
      return {
        title: `${activeCategory} Assets`,
        subtitle: `Showing ${tabFilteredAssets.length} ${activeCategory} assets with complete hardware, allocation, and warranty records.`,
        filename: `${activeCategory.replace(/\s+/g, "_")}_Assets`,
        sheetName: `${activeCategory} Assets`,
      };
    }
    switch (activeTab) {
      case "assigned":
        return {
          title: "Assigned Assets",
          subtitle: `Showing ${tabFilteredAssets.length} assets currently assigned to active employees with department details.`,
          filename: "Assigned_Assets",
          sheetName: "Assigned Assets",
        };
      case "available":
        return {
          title: "Available Assets",
          subtitle: `Showing ${tabFilteredAssets.length} in-stock assets available for immediate deployment.`,
          filename: "Available_Assets",
          sheetName: "Available Assets",
        };
      case "under-repair":
        return {
          title: "Under Repair Assets",
          subtitle: `Showing ${tabFilteredAssets.length} assets currently undergoing maintenance or service repairs.`,
          filename: "Under_Repair_Assets",
          sheetName: "Under Repair",
        };
      case "warranty-expiring":
        return {
          title: "Warranty Expiring Soon",
          subtitle: `Showing ${tabFilteredAssets.length} assets with manufacturer warranty ending within 60 days.`,
          filename: "Warranty_Expiring_Assets",
          sheetName: "Warranty Expiring",
        };
      case "total":
      default:
        return {
          title: "Total Assets",
          subtitle: `Showing all ${tabFilteredAssets.length} assets and complete information across your entire IT estate.`,
          filename: "Total_Assets",
          sheetName: "All Assets",
        };
    }
  }, [activeCategory, activeTab, tabFilteredAssets.length]);

  const columns = [
    {
      key: "id",
      label: "Asset ID",
      width: "15%",
      render: (r) => <span className="mono-cell">{cleanAssetId(r.id)}</span>,
    },
    {
      key: "item",
      label: "Item",
      width: "20%",
      /* OLD CODE (COMMENTED OUT):
      render: (r) => {
        const val =
          r.item ||
          (typeof r.configuration === "object" && r.configuration?.brandModel
            ? r.configuration.brandModel
            : r.category);
        return <b>{val || "—"}</b>;
      },
      */
      render: (r) => {
        const val =
          r.item ||
          (typeof r.configuration === "object" && r.configuration?.brandModel
            ? r.configuration.brandModel
            : r.category) || "—";
        return <b className="item-cell" title={val}>{val}</b>;
      },
    },
    {
      key: "configSummary",
      label: "Configuration",
      width: "26%",
      render: (r) => {
        const configText =
          typeof r.configuration === "string" && r.configuration.trim()
            ? r.configuration
            : typeof r.configSummary === "string" && r.configSummary.trim()
              ? r.configSummary
              : r.configuration && typeof r.configuration === "object"
                ? Object.entries(r.configuration)
                    .filter(([k]) => k !== "brandModel")
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(", ")
                : "—";
        return <span className="config-cell">{configText}</span>;
      },
    },
    {
      key: "status",
      label: "Status",
      width: "14%",
      render: (r) => (
        <Badge
          tone={
            r.status === "Available" || r.status === "In Stock"
              ? "success"
              : r.status === "Assigned"
                ? "primary"
                : r.status === "Under Repair"
                  ? "warning"
                  : "danger"
          }
        >
          {r.status || "Available"}
        </Badge>
      ),
    },
    {
      key: "assignedToName",
      label: "Assigned To",
      width: "17%",
      render: (r) =>
        r.assignedToName ? (
          <div>
            <div style={{ fontWeight: 600 }}>{r.assignedToName}</div>
            {r.assignedDept && (
              <div className="muted-text small">{r.assignedDept}</div>
            )}
          </div>
        ) : (
          <span className="muted-text">Unassigned</span>
        ),
    },
    {
      key: "actions",
      label: "Action",
      width: "10%",
      render: (r, meta) => {
        const index = meta?.index;
        const total = meta?.total;
        const isOpen = actionMenuFor?.id === r.id;
        const isUpward = actionMenuFor?.openUp;

        return (
          <div className="row-actions">
            <button
              className="icon-btn"
              title="View full details"
              aria-label="View full details"
              onClick={() => setSelectedAsset(r)}
            >
              <Eye size={17} />
            </button>
            <button
              className="icon-btn"
              title="Edit asset"
              aria-label="Edit asset"
              onClick={() => openEdit(r)}
            >
              <Pencil size={15} />
            </button>
            <div className="row-menu-wrap">
              <button
                className="icon-btn"
                title="More actions"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isOpen) {
                    setActionMenuFor(null);
                  } else {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const spaceBelow = window.innerHeight - rect.bottom;
                    const spaceAbove = rect.top;
                    const openUp = spaceBelow < 320 && spaceAbove > 320;
                    setActionMenuFor({ id: r.id, openUp, rect });
                  }
                }}
              >
                <MoreVertical size={16} />
              </button>
              {isOpen && actionMenuFor?.rect && (
                <>
                  <div
                    className="row-menu-backdrop"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActionMenuFor(null);
                    }}
                  />
                  <div
                    className={`row-menu ${isUpward ? "row-menu-up" : ""}`}
                    style={{
                      top: isUpward ? "auto" : `${actionMenuFor.rect.bottom + 4}px`,
                      bottom: isUpward ? `${window.innerHeight - actionMenuFor.rect.top + 4}px` : "auto",
                      right: `${Math.max(10, window.innerWidth - actionMenuFor.rect.right)}px`,
                    }}
                    onMouseLeave={() => setActionMenuFor(null)}
                  >
                    <button
                      onClick={() => {
                        setSelectedAsset(r);
                        setActionMenuFor(null);
                      }}
                    >
                      <Eye size={14} /> View details
                    </button>
                    <button onClick={() => openEdit(r)}>
                      <Pencil size={14} /> Edit details (fix typo)
                    </button>
                    {!["Assigned", "Damaged", "Disposed", "Under Repair", "Retired"].includes(
                      r.status
                    ) && (
                      <button
                        onClick={() => {
                          setAssignModal(r);
                          setEmpId("");
                          setActionMenuFor(null);
                        }}
                      >
                        <UserPlus size={14} /> Assign to employee
                      </button>
                    )}
                    {r.status === "Assigned" && (
                      <button
                        onClick={() => {
                          unassignAsset(r.id, undefined, user?.name);
                          setActionMenuFor(null);
                        }}
                      >
                        <Undo2 size={14} /> Return to stock
                      </button>
                    )}
                    {r.status === "Assigned" && (
                      <button
                        onClick={() => {
                          setTransferModal(r);
                          setEmpId("");
                          setActionMenuFor(null);
                        }}
                      >
                        <ArrowLeftRight size={14} /> Transfer to another employee
                      </button>
                    )}
                    {r.status !== "Under Repair" &&
                      r.status !== "Retired" &&
                      r.status !== "Disposed" && (
                        <button
                          onClick={() => {
                            setMaintenanceModal(r);
                            setIssueDesc("");
                            setIssueType("Hardware Fault");
                            setActionMenuFor(null);
                          }}
                        >
                          <Wrench size={14} /> Raise maintenance
                        </button>
                      )}
                    {r.status === "Under Repair" && (
                      <button
                        onClick={() => {
                          const openTicket = maintenanceRecords.find(
                            (m) => m.assetId === r.id && m.status !== "Closed"
                          );
                          setCloseModal({ asset: r, ticket: openTicket });
                          setCloseCost("");
                          setCloseNotes("");
                          setActionMenuFor(null);
                        }}
                      >
                        <Wrench size={14} /> Close maintenance
                      </button>
                    )}
                    <button
                      className="danger-item"
                      onClick={() => openStatusModal(r)}
                    >
                      <RefreshCcw size={14} /> Change status…
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{pageMeta.title}</h1>
          <p className="page-sub">{pageMeta.subtitle}</p>
        </div>
        <button className="btn btn-primary" onClick={openAddAssetModal}>
          <Plus size={16} /> Add Asset
        </button>
      </div>

      {/* Tabs navigation for Unique Page Views */}
      <div className="asset-tabs-container">
        <div className="asset-tabs-nav" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === "total" && !activeCategory}
            className={`asset-tab-btn ${activeTab === "total" && !activeCategory ? "is-active" : ""}`}
            onClick={() => navigate("/assets")}
          >
            <span>Total Assets</span>
            <span className="asset-tab-badge">{tabCounts.total}</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "assigned" && !activeCategory}
            className={`asset-tab-btn ${activeTab === "assigned" && !activeCategory ? "is-active" : ""}`}
            onClick={() => navigate("/assets/assigned")}
          >
            <span>Assigned</span>
            <span className="asset-tab-badge badge-primary">{tabCounts.assigned}</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "available" && !activeCategory}
            className={`asset-tab-btn ${activeTab === "available" && !activeCategory ? "is-active" : ""}`}
            onClick={() => navigate("/assets/available")}
          >
            <span>Available</span>
            <span className="asset-tab-badge badge-success">{tabCounts.available}</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "under-repair" && !activeCategory}
            className={`asset-tab-btn ${activeTab === "under-repair" && !activeCategory ? "is-active" : ""}`}
            onClick={() => navigate("/assets/under-repair")}
          >
            <span>Under Repair</span>
            <span className="asset-tab-badge badge-warning">{tabCounts.underRepair}</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "warranty-expiring" && !activeCategory}
            className={`asset-tab-btn ${activeTab === "warranty-expiring" && !activeCategory ? "is-active" : ""}`}
            onClick={() => navigate("/assets/warranty-expiring")}
          >
            <span>Warranty Expiring</span>
            <span className="asset-tab-badge badge-danger">{tabCounts.warrantyExpiring}</span>
          </button>
        </div>

        {/* Category Pills Bar */}
        <div className="asset-cat-pills-bar">
          <span className="cat-pills-label">Categories:</span>
          <button
            className={`cat-pill-btn ${!activeCategory ? "is-active" : ""}`}
            onClick={() =>
              navigate(
                activeTab !== "category" && activeTab !== "total"
                  ? `/assets/${activeTab}`
                  : "/assets"
              )
            }
          >
            All
          </button>
          {categories
            .filter((c) => c.status === "Active")
            .map((c) => {
              const count = categoryCounts[c.name] || 0;
              const isCatActive =
                activeCategory?.toLowerCase() === c.name.toLowerCase();
              return (
                <button
                  key={c.id}
                  className={`cat-pill-btn ${isCatActive ? "is-active" : ""}`}
                  onClick={() =>
                    navigate(`/assets/category/${encodeURIComponent(c.name)}`)
                  }
                >
                  <span>{c.name}</span>
                  <span className="cat-pill-count">{count}</span>
                </button>
              );
            })}
        </div>
      </div>

      <DataTable
        rows={tabFilteredAssets}
        columns={columns}
        tableClassName="assets-table"
        searchKeys={[
          "id",
          "item",
          "serialNumber",
          "assignedToName",
          "configSummary",
          "category",
          "location",
          "vendorName",
        ]}
        searchPlaceholder={`Search ${pageMeta.title.toLowerCase()} by ID, serial, item, employee, vendor…`}
        filters={[
          {
            key: "category",
            label: "Category",
            options: categories.map((c) => ({ value: c.name, label: c.name })),
          },
          {
            key: "status",
            label: "Status",
            options: STATUS_LIST.map((s) => ({ value: s, label: s })),
          },
        ]}
        exportFilename={pageMeta.filename}
        exportSheetName={pageMeta.sheetName}
        pageSize={10}
        exportMapper={(rows) =>
          rows.map((r) => {
            const itemVal =
              r.item ||
              (typeof r.configuration === "object" &&
              r.configuration?.brandModel
                ? r.configuration.brandModel
                : r.category);
            const configText =
              typeof r.configuration === "string" && r.configuration.trim()
                ? r.configuration
                : typeof r.configSummary === "string" &&
                    r.configSummary.trim()
                  ? r.configSummary
                  : r.configuration && typeof r.configuration === "object"
                    ? Object.entries(r.configuration)
                        .filter(([k]) => k !== "brandModel")
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(", ")
                    : "";
            return {
              "Asset ID": cleanAssetId(r.id),
              Item: itemVal || "",
              Category: r.category || "",
              "Serial Number": r.serialNumber || "",
              Configuration: configText,
              Status: r.status || "",
              "Assigned To": r.assignedToName || "Unassigned",
              Department: r.assignedDept || "",
              Location: r.location || "",
              Vendor: r.vendorName || "",
              "Purchase Cost (₹)": r.unitCost ? Number(r.unitCost) : 0,
              "Purchase Date": r.purchaseDate || "",
              "Warranty Expiry": r.warrantyExpiry || "",
              Condition: r.condition || "",
            };
          })
        }
      />

      {selectedAsset && (
        <AssetDetailDrawer
          asset={assets.find((a) => a.id === selectedAsset.id) || selectedAsset}
          onClose={() => setSelectedAsset(null)}
        />
      )}

      <Modal
        open={!!editModal}
        onClose={() => setEditModal(null)}
        title={`Edit ${editModal?.id || ""}`}
        subtitle="Update asset specifications, serial number, condition or location."
        width={560}
        footer={
          <>
            <button
              className="btn btn-ghost"
              onClick={() => setEditModal(null)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                updateAsset(editModal.id, editForm);
                setEditModal(null);
              }}
            >
              Save Changes
            </button>
          </>
        }
      >
        {editForm && (
          <div className="form-grid">
            <div className="form-field">
              <label>Asset ID</label>
              <input
                value={editForm.id}
                disabled
                readOnly
                className="readonly-input mono-cell"
              />
            </div>
            <div className="form-field">
              <label>Category</label>
              <select
                value={editForm.category}
                onChange={(e) =>
                  setEditForm({ ...editForm, category: e.target.value })
                }
              >
                <option value="">Select category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Item Name</label>
              <input
                value={editForm.item}
                onChange={(e) =>
                  setEditForm({ ...editForm, item: e.target.value })
                }
                placeholder="e.g. Latitude 5440"
              />
            </div>
            <div className="form-field">
              <label>Brand</label>
              <input
                value={editForm.brand}
                onChange={(e) =>
                  setEditForm({ ...editForm, brand: e.target.value })
                }
                placeholder="e.g. Dell / HP"
              />
            </div>
            <div className="form-field form-field-full">
              <label>Configuration</label>
              <input
                value={editForm.configuration}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    configuration: e.target.value,
                    configSummary: e.target.value,
                  })
                }
                placeholder="e.g. i7, 16GB, 512GB"
              />
            </div>
            <div className="form-field">
              <label>Serial Number</label>
              <input
                value={editForm.serialNumber}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    serialNumber: e.target.value,
                    serialNo: e.target.value,
                  })
                }
                placeholder="Serial number"
              />
            </div>
            <div className="form-field">
              <label>Condition</label>
              <select
                value={editForm.condition}
                onChange={(e) =>
                  setEditForm({ ...editForm, condition: e.target.value })
                }
              >
                {CONDITION_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Location</label>
              {/* CURRENT LOGIC (COMMENTED OUT):
              <select
                value={editForm.location}
                onChange={(e) =>
                  setEditForm({ ...editForm, location: e.target.value })
                }
              >
                <option value="">Select location…</option>
                {LOCATION_LIST.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
              */}

              {/* NEW LOGIC: Manual typing supported + dropdown suggestions fetched from Database */}
              <input
                type="text"
                list="db-asset-locations"
                placeholder="Type or select location…"
                value={editForm.location}
                onChange={(e) =>
                  setEditForm({ ...editForm, location: e.target.value })
                }
              />
              <datalist id="db-asset-locations">
                {dbLocations.map((loc) => (
                  <option key={loc} value={loc} />
                ))}
              </datalist>
            </div>
            <div className="form-field form-field-full">
              <label>Notes</label>
              <textarea
                rows={3}
                value={editForm.notes}
                onChange={(e) =>
                  setEditForm({ ...editForm, notes: e.target.value })
                }
                placeholder="Asset notes or remarks…"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Add Asset Modal */}
      <Modal
        open={addAssetModalOpen}
        onClose={() => setAddAssetModalOpen(false)}
        title="Add Asset"
        subtitle="Fill in the asset details below. Fields marked with an asterisk are required."
        width={880}
        footer={
          <>
            <button
              className="btn btn-ghost"
              onClick={() => setAddAssetModalOpen(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleAddAssetSubmit}
            >
              <Sparkles size={15} /> Save Asset
            </button>
          </>
        }
      >
        <form onSubmit={handleAddAssetSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="inventory-items-container" style={{ margin: 0 }}>
            <div className="inventory-items-table-wrap">
              <table className="inventory-items-form-table">
                <thead>
                  <tr>
                    <th style={{ width: "38px" }}>#</th>
                    <th style={{ width: "18%" }}>Category <span className="req">*</span></th>
                    <th style={{ width: "20%" }}>Item Name</th>
                    <th style={{ width: "16%" }}>Brand</th>
                    <th style={{ width: "24%" }}>Configuration</th>
                    <th style={{ width: "22%" }}>Serial Number <span className="req">*</span></th>
                    {addAssetForm.items?.length > 1 && <th style={{ width: "36px" }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {addAssetForm.items?.map((item, i) => (
                    <tr key={i} className="inventory-item-form-row">
                      <td className="item-num-cell">
                        <span className="serial-index">#{i + 1}</span>
                      </td>
                      <td>
                        <select
                          value={item.category || ""}
                          onChange={(e) => {
                            handleChildItemChange(i, "category", e.target.value);
                            if (addAssetErrors[`item_${i}_category`]) {
                              setAddAssetErrors((prev) => ({ ...prev, [`item_${i}_category`]: "" }));
                            }
                          }}
                          className={addAssetErrors[`item_${i}_category`] ? "input-error" : ""}
                        >
                          <option value="">Select category…</option>
                          {activeCategories.map((c) => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                        {addAssetErrors[`item_${i}_category`] && (
                          <span className="field-error">{addAssetErrors[`item_${i}_category`]}</span>
                        )}
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.item ?? item.itemName ?? ""}
                          onChange={(e) => handleChildItemChange(i, "item", e.target.value)}
                          placeholder="e.g. Latitude 5440"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.brand || ""}
                          onChange={(e) => handleChildItemChange(i, "brand", e.target.value)}
                          placeholder="e.g. Dell / HP"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.configuration || ""}
                          onChange={(e) => handleChildItemChange(i, "configuration", e.target.value)}
                          placeholder="e.g. i7, 16GB, 512GB"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.serialNo ?? item.serialNumber ?? ""}
                          onChange={(e) => {
                            handleChildItemChange(i, "serialNo", e.target.value);
                            if (addAssetErrors[`item_${i}_serialNo`]) {
                              setAddAssetErrors((prev) => ({ ...prev, [`item_${i}_serialNo`]: "" }));
                            }
                          }}
                          placeholder="Serial number"
                          className={addAssetErrors[`item_${i}_serialNo`] ? "input-error" : ""}
                        />
                        {addAssetErrors[`item_${i}_serialNo`] && (
                          <span className="field-error">{addAssetErrors[`item_${i}_serialNo`]}</span>
                        )}
                      </td>
                      {addAssetForm.items?.length > 1 && (
                        <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                          <button
                            type="button"
                            className="btn-icon"
                            title="Remove row"
                            onClick={() => handleRemoveRow(i)}
                            style={{
                              border: "none",
                              background: "transparent",
                              cursor: "pointer",
                              color: "var(--danger, #ef4444)",
                              padding: "4px",
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleAddRow}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Plus size={14} /> Add Row
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!assignModal}
        onClose={() => setAssignModal(null)}
        title={`Assign ${assignModal?.id || ""}`}
        subtitle="Select the employee this asset should be issued to."
        width={440}
        footer={
          <>
            <button
              className="btn btn-ghost"
              onClick={() => setAssignModal(null)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={!empId}
              onClick={() => {
                const targetId = assignModal?.id;
                const selectedEmpId = empId;
                setAssignModal(null);
                if (targetId) {
                  assignAsset(targetId, selectedEmpId, undefined, user?.name);
                }
              }}
            >
              Assign
            </button>
          </>
        }
      >
        <div className="form-field">
          <label>Employee</label>
          <SearchableEmployeeSelect
            employees={employees}
            value={empId}
            onChange={setEmpId}
            placeholder="Search employee by name, ID (e.g. E00161), or dept..."
          />
        </div>
      </Modal>

      <Modal
        open={!!transferModal}
        onClose={() => setTransferModal(null)}
        title={`Transfer ${transferModal?.id || ""}`}
        subtitle={
          transferModal
            ? `Currently with ${transferModal.assignedToName} (${transferModal.assignedDept}).`
            : ""
        }
        width={440}
        footer={
          <>
            <button
              className="btn btn-ghost"
              onClick={() => setTransferModal(null)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={!empId}
              onClick={() => {
                const targetId = transferModal?.id;
                const selectedEmpId = empId;
                setTransferModal(null);
                if (targetId) {
                  transferAsset(targetId, selectedEmpId, undefined, user?.name);
                }
              }}
            >
              Transfer
            </button>
          </>
        }
      >
        <div className="form-field">
          <label>New Employee</label>
          <SearchableEmployeeSelect
            employees={employees.filter((e) => e.id !== transferModal?.assignedTo)}
            value={empId}
            onChange={setEmpId}
            placeholder="Search new employee by name, ID, or dept..."
          />
        </div>
      </Modal>

      <Modal
        open={!!statusModal}
        onClose={() => setStatusModal(null)}
        title={`Change status — ${statusModal?.id || ""}`}
        subtitle={
          statusModal?.status === "Assigned"
            ? "This asset is currently assigned — changing status will automatically return it first."
            : undefined
        }
        width={440}
        footer={
          <>
            <button
              className="btn btn-ghost"
              onClick={() => setStatusModal(null)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                changeAssetStatus(
                  statusModal.id,
                  newStatus,
                  statusRemarks,
                  user?.name,
                );
                setStatusModal(null);
              }}
            >
              Save Status
            </button>
          </>
        }
      >
        <div className="form-field">
          <label>New Status</label>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
          >
            {NON_ASSIGNED_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label>Remarks</label>
          <textarea
            rows={3}
            value={statusRemarks}
            onChange={(e) => setStatusRemarks(e.target.value)}
            placeholder="Optional note, e.g. reported lost by employee on exit"
          />
        </div>
      </Modal>

      <Modal
        open={!!maintenanceModal}
        onClose={() => setMaintenanceModal(null)}
        title={`Raise maintenance — ${maintenanceModal?.id || ""}`}
        width={480}
        footer={
          <>
            <button
              className="btn btn-ghost"
              disabled={isSubmitting}
              onClick={() => setMaintenanceModal(null)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={!issueDesc || isSubmitting}
              onClick={async () => {
                try {
                  setIsSubmitting(true);
                  await raiseMaintenance({
                    assetId: maintenanceModal.id,
                    issueType,
                    description: issueDesc,
                  });
                  setIssueDesc("");
                  setMaintenanceModal(null);
                } catch (err) {
                  alert("Failed to raise maintenance ticket: " + (err.message || err));
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              {isSubmitting ? "Saving..." : "Raise Ticket"}
            </button>
          </>
        }
      >
        <div className="form-field">
          <label>Issue Type</label>
          <select
            value={issueType}
            onChange={(e) => setIssueType(e.target.value)}
          >
            {[
              "Hardware Fault",
              "Software Issue",
              "Battery Replacement",
              "Screen Damage",
              "Preventive Maintenance",
              "Other",
            ].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label>Description</label>
          <textarea
            rows={3}
            value={issueDesc}
            onChange={(e) => setIssueDesc(e.target.value)}
            placeholder="Describe the issue…"
          />
        </div>
      </Modal>

      <Modal
        open={!!closeModal}
        onClose={() => setCloseModal(null)}
        title={`Close maintenance ticket`}
        subtitle={
          closeModal?.ticket
            ? `Ticket ${closeModal.ticket.id} · ${closeModal.asset.id}`
            : ""
        }
        width={440}
        footer={
          <>
            <button
              className="btn btn-ghost"
              disabled={isSubmitting}
              onClick={() => setCloseModal(null)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={isSubmitting}
              onClick={async () => {
                try {
                  if (closeModal?.ticket) {
                    setIsSubmitting(true);
                    await closeMaintenance(closeModal.ticket.id, {
                      cost: closeCost,
                      resolutionNotes: closeNotes,
                    });
                  }
                  setCloseModal(null);
                } catch (err) {
                  alert("Failed to close maintenance ticket: " + (err.message || err));
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              {isSubmitting ? "Saving..." : "Close Ticket"}
            </button>
          </>
        }
      >
        <div className="form-field">
          <label>Service Cost (₹)</label>
          <input
            type="number"
            value={closeCost}
            onChange={(e) => setCloseCost(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="form-field">
          <label>Resolution Notes</label>
          <textarea
            rows={3}
            value={closeNotes}
            onChange={(e) => setCloseNotes(e.target.value)}
            placeholder="What was done to resolve this?"
          />
        </div>
      </Modal>
    </div>
  );
}
