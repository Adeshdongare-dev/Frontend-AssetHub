import { useMemo, useState } from 'react';
import {
  X, Layers, User, Package, Truck, Tag, Cpu, ShieldCheck, History, Wrench,
  MapPin, Calendar, IndianRupee, Mail, Phone, Building, FileText, CheckCircle2,
  Info,
} from 'lucide-react';
import Badge from './Badge';
import { useData } from '../context/DataContext';
import { cleanAssetId } from '../utils/idGenerator';

const TABS = [
  { key: 'all', label: 'All Information', icon: Layers },
  { key: 'maintenance', label: 'Maintenance', icon: Wrench },
  { key: 'history', label: 'History', icon: History },
];

function daysUntil(dateStr) {
  if (!dateStr) return 0;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function parseDeviceInfoText(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];
  const text = rawText.replace(/^(?:specs|configuration|device\s+info):\s*/i, '').trim();
  if (!text) return [];

  // 1. If text is multi-line (separated by \n)
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    const list = [];
    for (const line of lines) {
      const m = line.match(/^([^:\t]+)[:\t]\s*(.+)$/);
      if (m) {
        list.push({ label: m[1].trim(), value: m[2].trim() });
      }
    }
    if (list.length > 1) {
      return list;
    }
  }

  // 2. Space / single-line concatenated string (e.g. pasted into single-line input)
  const knownKeys = [
    'Device name',
    'Processor',
    'Installed RAM',
    'Graphics card',
    'Graphics',
    'Storage',
    'Device ID',
    'Product ID',
    'System type',
    'Pen and touch',
    'Edition',
    'Version',
    'Installed on',
    'OS build',
    'Experience',
    'Serial number',
  ];

  const matches = [];
  for (const key of knownKeys) {
    const regex = new RegExp(`(?:^|[\\r\\n\\t\\s])(${key})(?::|\\s+|$)`, 'g');
    let m;
    while ((m = regex.exec(text)) !== null) {
      const keyIndex = m.index + m[0].indexOf(m[1]);
      // Avoid false positive "processor" in "x64-based processor" or "32-bit processor"
      const before = text.slice(Math.max(0, keyIndex - 12), keyIndex);
      if (/based[\s-]*$/i.test(before)) {
        continue;
      }
      matches.push({
        key: m[1],
        startIndex: keyIndex,
        endIndex: keyIndex + m[1].length,
      });
    }
  }

  if (matches.length === 0) return [];

  // Sort by starting index
  matches.sort((a, b) => a.startIndex - b.startIndex);

  // Filter overlapping matches (e.g. "Graphics card" vs "Graphics")
  const uniqueMatches = [];
  let lastEnd = -1;
  for (const m of matches) {
    if (m.startIndex >= lastEnd) {
      uniqueMatches.push(m);
      lastEnd = m.endIndex;
    }
  }

  const result = [];
  for (let i = 0; i < uniqueMatches.length; i++) {
    const curr = uniqueMatches[i];
    const next = uniqueMatches[i + 1];
    const valStart = curr.endIndex;
    const valEnd = next ? next.startIndex : text.length;
    let val = text.substring(valStart, valEnd).trim();
    val = val.replace(/^[:\t]\s*/, '').trim();
    if (val) {
      result.push({ label: curr.key, value: val });
    }
  }

  return result;
}

function extractDeviceInfo(asset) {
  if (!asset) return [];

  let raw = '';
  let configObj = null;

  if (typeof asset.configuration === 'string' && asset.configuration.trim()) {
    try {
      configObj = JSON.parse(asset.configuration);
    } catch {
      raw = asset.configuration;
    }
  } else if (asset.configuration && typeof asset.configuration === 'object') {
    configObj = asset.configuration;
  }

  if (configObj) {
    if (configObj.specs && typeof configObj.specs === 'string') {
      raw = configObj.specs;
    }
  }

  if (!raw && typeof asset.specs === 'string') {
    raw = asset.specs;
  }

  // If we have a raw string containing specs (like in the screenshots)
  if (raw && typeof raw === 'string') {
    const parsed = parseDeviceInfoText(raw);
    if (parsed.length > 0) {
      return parsed;
    }
  }

  // If configObj is an object with explicit keys:
  if (configObj && typeof configObj === 'object') {
    const entries = Object.entries(configObj).filter(([k, v]) => v && k !== 'specs' && k !== 'brandModel' && k !== 'brand');
    if (entries.length > 0) {
      const KEY_MAP = {
        cpu: 'Processor',
        ram: 'Installed RAM',
        storage: 'Storage',
        gpu: 'Graphics card',
        graphics: 'Graphics card',
        os: 'System type',
        deviceId: 'Device ID',
        productId: 'Product ID',
        systemType: 'System type',
        penTouch: 'Pen and touch',
      };

      const result = [];
      for (const [k, v] of entries) {
        if (typeof v === 'string' || typeof v === 'number') {
          const label = KEY_MAP[k] || k.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
          result.push({ label, value: String(v) });
        }
      }
      if (result.length > 0) return result;
    }
  }

  // Fallback: check if raw text has colon or tab separated lines
  if (raw && typeof raw === 'string') {
    const lines = raw.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      const result = [];
      for (const line of lines) {
        const idx = line.indexOf(':');
        if (idx !== -1) {
          result.push({ label: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() });
        } else {
          const tabIdx = line.indexOf('\t');
          if (tabIdx !== -1) {
            result.push({ label: line.slice(0, tabIdx).trim(), value: line.slice(tabIdx + 1).trim() });
          }
        }
      }
      if (result.length > 0) return result;
    }
  }

  return [];
}

export default function AssetDetailDrawer({ asset, onClose }) {
  const {
    assignmentHistory,
    maintenanceRecords,
    vendors,
    employees,
    categories,
    inventoryBatches,
  } = useData();

  const [tab, setTab] = useState('all');

  // 1. Fetch Employee
  const assignedEmployee = useMemo(() => {
    if (!asset) return null;
    return employees.find(
      (e) => e.id === asset.assignedTo || (asset.assignedToName && e.name === asset.assignedToName),
    ) || null;
  }, [employees, asset]);

  // 2. Fetch Inventory
  const inventoryBatch = useMemo(() => {
    if (!asset) return null;
    const bId = asset.batchId || asset.inventoryBatchId;
    if (!bId) return null;
    return inventoryBatches.find(
      (b) => b.id === bId || b.inventoryId === bId,
    ) || null;
  }, [inventoryBatches, asset]);

  // 3. Fetch Vendor
  const vendor = useMemo(() => {
    if (!asset) return null;
    return vendors.find(
      (v) => v.id === asset.vendorId || v.id === inventoryBatch?.vendorId || v.name === asset.vendorName || (inventoryBatch?.vendorName && v.name === inventoryBatch.vendorName),
    ) || null;
  }, [vendors, asset, inventoryBatch]);

  // 4. Fetch Category
  const category = useMemo(() => {
    if (!asset) return null;
    return categories.find(
      (c) => c.name === asset.category || c.id === asset.categoryId || (inventoryBatch?.category && c.name === inventoryBatch.category),
    ) || null;
  }, [categories, asset, inventoryBatch]);

  // History & Maintenance
  const history = useMemo(
    () => assignmentHistory.filter((h) => h.assetId === asset?.id).sort((a, b) => new Date(b.date) - new Date(a.date)),
    [assignmentHistory, asset],
  );

  const maintenance = useMemo(
    () =>
      maintenanceRecords
        .filter(
          (m) =>
            m.assetId === asset?.id ||
            m.assetId === asset?.rawId ||
            m.assetId === asset?.assetId ||
            m.rawAssetId === asset?.id ||
            m.rawAssetId === asset?.rawId
        )
        .sort((a, b) => new Date(b.openedOn) - new Date(a.openedOn)),
    [maintenanceRecords, asset],
  );

  const deviceInfoList = useMemo(() => {
    return extractDeviceInfo(asset);
  }, [asset]);

  if (!asset) return null;

  const invStart = inventoryBatch?.warrantyStartDate || inventoryBatch?.purchaseDate;
  const invEnd = inventoryBatch?.warrantyEndDate || inventoryBatch?.warrantyExpiry;

  const hasInventoryWarranty = Boolean(invEnd || invStart);
  const hasAssetWarranty = Boolean(asset.fromInventory && (asset.warrantyExpiry || asset.warrantyEndDate || asset.warrantyStartDate || (asset.warrantyMonths && asset.warrantyMonths > 0)));

  const hasWarranty = hasInventoryWarranty || hasAssetWarranty;

  const warrantyStartDate = hasInventoryWarranty ? (inventoryBatch?.warrantyStartDate || asset.warrantyStartDate || inventoryBatch?.purchaseDate || '—') : (hasAssetWarranty ? (asset.warrantyStartDate || asset.purchaseDate || '—') : '—');
  const warrantyEndDate = hasInventoryWarranty ? (inventoryBatch?.warrantyEndDate || asset.warrantyExpiry || asset.warrantyEndDate || '—') : (hasAssetWarranty ? (asset.warrantyExpiry || asset.warrantyEndDate || '—') : '—');

  const warrantyDays = hasWarranty && warrantyEndDate !== '—' ? daysUntil(warrantyEndDate) : null;
  const warrantyTone = warrantyDays === null ? 'muted' : warrantyDays < 0 ? 'danger' : warrantyDays <= 60 ? 'warning' : 'success';

    // 1. Parse configuration safely
  let configObj = null;
  if (typeof asset.configuration === 'object' && asset.configuration !== null) {
    configObj = asset.configuration;
  } else if (typeof asset.configuration === 'string' && asset.configuration.trim()) {
    try {
      configObj = JSON.parse(asset.configuration);
    } catch {
      configObj = null;
    }
  }

  // 2. Extract parts from ConfigSummary (e.g. "Mobile · LAVA · 4GB")
  const summaryParts = (asset.configSummary || '')
    .split(/[·•]/)
    .map((s) => s.trim())
    .filter(Boolean);

  // 3. Define itemTitle
  const itemTitle = asset.item
    || asset.itemName
    || configObj?.brandModel
    || configObj?.item
    || (summaryParts.length >= 1 ? summaryParts[0] : asset.category);

  // 4. Define brandTitle
  const brandTitle = asset.brand
    || configObj?.brand
    || configObj?.Brand
    || (configObj && Object.entries(configObj).find(([k]) => k.toLowerCase() === 'brand')?.[1])
    || (summaryParts.length >= 2 ? summaryParts[1] : '—');

  const configText = (typeof asset.configuration === 'string' && asset.configuration.trim())
    ? asset.configuration
    : (typeof asset.configSummary === 'string' && asset.configSummary.trim()
        ? asset.configSummary
        : (asset.configuration && typeof asset.configuration === 'object'
            ? Object.entries(asset.configuration).filter(([k]) => k !== 'brandModel').map(([k, v]) => `${k}: ${v}`).join(', ')
            : '—'));

  const configChips = asset.configuration && typeof asset.configuration === 'object'
    ? Object.entries(asset.configuration).filter(([, v]) => v).map(([k, v]) => `${k !== 'brandModel' ? `${k}: ` : ''}${v}`)
    : [];

  const drawerSubtitle = deviceInfoList.length > 0
    ? (() => {
        const proc = deviceInfoList.find((d) => d.label.toLowerCase() === 'processor')?.value;
        const ram = deviceInfoList.find((d) => d.label.toLowerCase() === 'installed ram')?.value;
        if (proc && ram) {
          return `${proc.split('@')[0].trim()} · ${ram}`;
        }
        if (proc) return proc;
        return [itemTitle, brandTitle].filter((s) => s && s !== '—').join(' · ') || 'Device specifications';
      })()
    : configText;

  return (
    <div className="drawer-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="drawer-panel">
        {/* Drawer Header */}
        <div className="drawer-header">
          <div>
            <div className="drawer-eyebrow">
              {category?.name || asset.category} · {itemTitle}
            </div>
            <h2>{cleanAssetId(asset.id)}</h2>
            <p className="drawer-sub">{drawerSubtitle}</p>
          </div>
          <div className="drawer-header-right">
            <Badge tone={asset.status === 'Available' || asset.status === 'In Stock' ? 'success' : asset.status === 'Assigned' ? 'primary' : 'warning'}>
              {asset.status || 'Available'}
            </Badge>
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation: ONLY All Information, Maintenance, and History */}
        <div className="drawer-tabs">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`drawer-tab ${tab === key ? 'active' : ''}`}
              onClick={() => setTab(key)}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* Drawer Body */}
        <div className="drawer-body">
          {/* TAB 1: ALL INFORMATION */}
          {tab === 'all' && (
            <>
              {/* Asset Record Details */}
              <div className="entity-section-card">
                <div className="entity-section-header">
                  <div className="entity-section-title">
                    <Cpu size={16} />
                    <span>Asset Record & Hardware Details</span>
                  </div>
                  <span className="entity-source-badge">Asset Record</span>
                </div>
                <div className="detail-grid">
                  <InfoRow label="Asset ID" value={cleanAssetId(asset.id)} mono />
                  <InfoRow label="Item" value={itemTitle} />
                  <InfoRow label="Brand" value={brandTitle} />
                  <InfoRow label="Serial Number" value={asset.serialNumber || '—'} mono />
                  <InfoRow label="Current Status" value={<Badge tone={asset.status === 'Available' || asset.status === 'In Stock' ? 'success' : asset.status === 'Assigned' ? 'primary' : 'warning'}>{asset.status || 'Available'}</Badge>} />
                  <InfoRow label="Current Condition" value={asset.condition || 'New'} />
                  <InfoRow label="Current Location" value={asset.location || '—'} icon={MapPin} />
                  <InfoRow label="Warranty Expiry" value={asset.warrantyExpiry || inventoryBatch?.warrantyEndDate || '—'} icon={Calendar} />
                  <div className="detail-full">
                    <div className="detail-label">Configuration Details</div>
                    {deviceInfoList.length > 0 ? (
                      <div className="device-info-card">
                        <div className="device-info-header">
                          <div className="device-info-icon">
                            <Info size={17} strokeWidth={2} />
                          </div>
                          <span className="device-info-title">Device info</span>
                        </div>
                        <div className="device-info-divider" />
                        <div className="device-info-rows">
                          {deviceInfoList.map((item, idx) => (
                            <div className="device-info-row" key={idx}>
                              <div className="device-info-label">{item.label}</div>
                              <div className="device-info-value">{item.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="config-chip-row" style={{ marginTop: '6px' }}>
                        {configChips.length > 0 ? (
                          configChips.map((chip, idx) => (
                            <span className="config-chip" key={idx}>{chip}</span>
                          ))
                        ) : (
                          <span className="config-chip">{configText}</span>
                        )}
                      </div>
                    )}
                  </div>
                  {asset.notes && (
                    <div className="detail-full">
                      <div className="detail-label">Asset Notes</div>
                      <div className="detail-note">{asset.notes}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Employee Information (Fetched from Employee) */}
              <div className="entity-section-card">
                <div className="entity-section-header">
                  <div className="entity-section-title">
                    <User size={16} />
                    <span>Employee Information</span>
                  </div>
                  <span className="entity-source-badge">Fetched from Employee</span>
                </div>

                {assignedEmployee ? (
                  <div className="detail-grid">
                    <InfoRow label="Employee ID" value={assignedEmployee.id} mono />
                    <InfoRow label="Employee Name" value={assignedEmployee.name} />
                    <InfoRow label="Email Address" value={assignedEmployee.email || '—'} icon={Mail} />
                    <InfoRow label="Department" value={assignedEmployee.department || asset.assignedDept || '—'} icon={Building} />
                    <InfoRow label="Designation" value={assignedEmployee.designation || '—'} />
                    <InfoRow label="Work Location" value={assignedEmployee.location || '—'} icon={MapPin} />
                    <InfoRow label="Phone Number" value={assignedEmployee.phone || '—'} icon={Phone} />
                    <InfoRow label="Reporting Manager" value={assignedEmployee.reportingManager || '—'} />
                    <InfoRow
                      label="Employment Status"
                      value={
                        <Badge tone={assignedEmployee.status === 'Active' ? 'success' : 'muted'}>
                          {assignedEmployee.status || 'Active'}
                        </Badge>
                      }
                    />
                    <InfoRow label="Joining Date" value={assignedEmployee.joinDate || '—'} icon={Calendar} />
                  </div>
                ) : (
                  <div className="unassigned-notice">
                    <Info size={16} />
                    <span>
                      This asset is currently <b>Unassigned</b> ({asset.assignedToName ? `formerly assigned to ${asset.assignedToName}` : `in stock at ${asset.location || 'Pune - Kharadi HQ'}`}).
                    </span>
                  </div>
                )}
              </div>

              {/* Inventory Information (Fetched from Inventory) */}
              <div className="entity-section-card">
                <div className="entity-section-header">
                  <div className="entity-section-title">
                    <Package size={16} />
                    <span>Inventory Information</span>
                  </div>
                  <span className="entity-source-badge">Fetched from Inventory</span>
                </div>

                <div className="detail-grid">
                  <InfoRow
                    label="Inventory ID"
                    value={inventoryBatch?.inventoryId || inventoryBatch?.id || asset.batchId || '—'}
                    mono
                  />
                  <InfoRow label="Procurement Category" value={inventoryBatch?.category || asset.category || '—'} />
                  <InfoRow label="Department" value={inventoryBatch?.department || asset.assignedDept || '—'} icon={Building} />
                  <InfoRow label="Invoice Number" value={inventoryBatch?.invoiceNo || asset.invoiceNo || '—'} mono />
                  <InfoRow label="PO Number" value={inventoryBatch?.poNumber || asset.poNumber || '—'} mono />
                  <InfoRow label="Purchase Date" value={inventoryBatch?.purchaseDate || asset.purchaseDate || '—'} icon={Calendar} />
                  <InfoRow
                    label="Purchase Cost"
                    value={
                      inventoryBatch?.purchaseCost !== undefined && inventoryBatch?.purchaseCost !== ''
                        ? `₹ ${Number(inventoryBatch.purchaseCost).toLocaleString('en-IN')}`
                        : asset.unitCost
                          ? `₹ ${Number(asset.unitCost).toLocaleString('en-IN')}`
                          : '—'
                    }
                    icon={IndianRupee}
                  />
                  <InfoRow label="Batch Intake Quantity" value={`${inventoryBatch?.quantity || 1} units`} />
                  <InfoRow label="Intake Location" value={inventoryBatch?.location || asset.location || '—'} icon={MapPin} />
                  <InfoRow label="Intake Condition" value={inventoryBatch?.condition || asset.condition || 'New'} />
                  <InfoRow label="Intake Status" value={inventoryBatch?.status || 'Available'} />
                  <InfoRow label="Received By" value={inventoryBatch?.receivedBy || 'IT Asset Desk'} />
                  {inventoryBatch?.attachmentName && (
                    <InfoRow label="Attachment" value={inventoryBatch.attachmentName} icon={FileText} />
                  )}
                  {inventoryBatch?.description && (
                    <div className="detail-full">
                      <div className="detail-label">Intake Description</div>
                      <div className="detail-note">{inventoryBatch.description}</div>
                    </div>
                  )}
                  {inventoryBatch?.remarks && (
                    <div className="detail-full">
                      <div className="detail-label">Inventory Remarks</div>
                      <div className="detail-note">{inventoryBatch.remarks}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Vendor Information (Fetched from Vendor) */}
              <div className="entity-section-card">
                <div className="entity-section-header">
                  <div className="entity-section-title">
                    <Truck size={16} />
                    <span>Vendor Information</span>
                  </div>
                  <span className="entity-source-badge">Fetched from Vendor</span>
                </div>

                <div className="detail-grid">
                  <InfoRow label="Vendor ID" value={vendor?.id || asset.vendorId || inventoryBatch?.vendorId || '—'} mono />
                  <InfoRow label="Vendor Name" value={vendor?.name || asset.vendorName || inventoryBatch?.vendorName || '—'} />
                  <InfoRow label="Contact Person" value={vendor?.contactPerson || '—'} />
                  <InfoRow label="Email Address" value={vendor?.email || '—'} icon={Mail} />
                  <InfoRow label="Phone Number" value={vendor?.phone || '—'} icon={Phone} />
                  <InfoRow label="City" value={vendor?.city || '—'} icon={MapPin} />
                  <InfoRow label="GST Number" value={vendor?.gstNumber || '—'} mono />
                  <InfoRow label="Supplier Rating" value={vendor?.rating ? `${vendor.rating} ★` : '—'} />
                  <InfoRow label="Payment Terms" value={vendor?.paymentTerms || '—'} />
                  <InfoRow
                    label="Vendor Status"
                    value={
                      <Badge tone={vendor?.status === 'Active' ? 'success' : 'muted'}>
                        {vendor?.status || 'Active'}
                      </Badge>
                    }
                  />
                  {vendor?.address && (
                    <div className="detail-full">
                      <div className="detail-label">Vendor Office Address</div>
                      <div className="detail-note">{vendor.address}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Category Information (Fetched from Category) */}
              <div className="entity-section-card">
                <div className="entity-section-header">
                  <div className="entity-section-title">
                    <Tag size={16} />
                    <span>Category Information</span>
                  </div>
                  <span className="entity-source-badge">Fetched from Category</span>
                </div>

                <div className="detail-grid">
                  <InfoRow label="Category ID" value={category?.id || '—'} mono />
                  <InfoRow label="Category Name" value={category?.name || asset.category || '—'} />
                  <InfoRow label="Tag Prefix" value={category?.prefix || '—'} mono />
                  <InfoRow
                    label="Category Status"
                    value={
                      <Badge tone={category?.status === 'Active' ? 'success' : 'muted'}>
                        {category?.status || 'Active'}
                      </Badge>
                    }
                  />
                  {category?.description ? (
                    <div className="detail-full">
                      <div className="detail-label">Category Description</div>
                      <div className="detail-note">{category.description}</div>
                    </div>
                  ) : (
                    <InfoRow label="Description" value="Standard IT Asset Category" />
                  )}
                </div>
              </div>

              {/* Warranty Coverage */}
              <div className="entity-section-card">
                <div className="entity-section-header">
                  <div className="entity-section-title">
                    <ShieldCheck size={16} />
                    <span>Warranty Status</span>
                  </div>
                  <span className="entity-source-badge">Coverage</span>
                </div>
                <div className="warranty-panel">
                  {!hasWarranty ? (
                    <div className="warranty-banner tone-muted" style={{ background: '#F1F5F9', color: '#475569' }}>
                      <ShieldCheck size={22} />
                      <div>
                        <div className="warranty-headline">No Warranty Recorded</div>
                        <div className="warranty-sub">No warranty period or expiration date specified for this asset.</div>
                      </div>
                    </div>
                  ) : (
                    <div className={`warranty-banner tone-${warrantyTone}`}>
                      <ShieldCheck size={22} />
                      <div>
                        <div className="warranty-headline">
                          {warrantyDays < 0 ? 'Warranty expired' : `${warrantyDays} day${warrantyDays === 1 ? '' : 's'} remaining`}
                        </div>
                        <div className="warranty-sub">
                          Covered by {vendor?.name || asset.vendorName || 'Vendor'}{asset.warrantyMonths ? ` · ${asset.warrantyMonths} month plan` : ''}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="detail-grid">
                    <InfoRow label="Warranty Period" value={hasWarranty && asset.warrantyMonths ? `${asset.warrantyMonths} months` : (hasWarranty ? 'Inventory Plan' : '—')} />
                    <InfoRow label="Start Date" value={hasWarranty ? warrantyStartDate : '—'} />
                    <InfoRow label="Expiry Date" value={hasWarranty ? warrantyEndDate : '—'} />
                    <InfoRow label="Support Provider" value={hasWarranty ? (vendor?.name || asset.vendorName || inventoryBatch?.vendorName || '—') : '—'} />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: MAINTENANCE */}
          {tab === 'maintenance' && (
            <div className="entity-section-card">
              <div className="entity-section-header">
                <div className="entity-section-title">
                  <Wrench size={16} />
                  <span>Maintenance Records</span>
                </div>
                <span className="entity-source-badge">{maintenance.length} records</span>
              </div>
              <div className="timeline">
                {maintenance.length === 0 && <div className="empty-cell">No maintenance records for this asset.</div>}
                {maintenance.map((m) => (
                  <div className="timeline-item" key={m.id}>
                    <div className={`timeline-dot ${m.status === 'Closed' ? 'dot-success' : 'dot-warning'}`} />
                    <div className="timeline-content">
                      <div className="timeline-title">
                        {m.issueType} <Badge tone={m.status === 'Closed' ? 'success' : m.status === 'Open' ? 'warning' : 'info'}>{m.status}</Badge>
                      </div>
                      <div className="timeline-meta">Ticket {m.id} · Opened {m.openedOn}{m.completedOn ? ` · Closed ${m.completedOn}` : ''}</div>
                      <div className="timeline-remarks">{m.description}</div>
                      <div className="timeline-meta">Vendor: {m.vendorName} · Cost: ₹ {Number(m.cost).toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: HISTORY */}
          {tab === 'history' && (
            <div className="entity-section-card">
              <div className="entity-section-header">
                <div className="entity-section-title">
                  <History size={16} />
                  <span>Assignment History</span>
                </div>
                <span className="entity-source-badge">{history.length} records</span>
              </div>
              <div className="timeline">
                {history.length === 0 && <div className="empty-cell">No assignment activity recorded yet.</div>}
                {history.map((h) => (
                  <div className="timeline-item" key={h.id}>
                    <div className={`timeline-dot ${h.action === 'Assigned' ? 'dot-success' : h.action === 'Transferred' ? 'dot-warning' : 'dot-muted'}`} />
                    <div className="timeline-content">
                      <div className="timeline-title">
                        {h.action} {h.action === 'Returned' ? 'from' : h.action === 'Transferred' ? 'to' : 'to'} {h.employeeName || '—'}
                      </div>
                      <div className="timeline-meta">{h.department} · {h.date}{h.performedBy ? ` · by ${h.performedBy}` : ''}</div>
                      {h.remarks && <div className="timeline-remarks">{h.remarks}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono, icon: Icon }) {
  return (
    <div className="info-row">
      <div className="detail-label">
        {Icon && <Icon size={13} />} {label}
      </div>
      <div className={`detail-value ${mono ? 'mono' : ''}`}>{value}</div>
    </div>
  );
}
