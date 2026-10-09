import { useMemo, useState } from 'react';
import {
  Download, Filter, RotateCcw, ChevronRight, History, Wrench, Package,
  ShieldCheck, Cpu, Calendar, MapPin, Building, Hash, Search, Server, Globe,
  Shield, AppWindow,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import DataTable from '../components/DataTable';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { exportToExcel } from '../utils/exportExcel';
import { cleanAssetId } from '../utils/idGenerator';
import { DEPARTMENT_LIST, LOCATION_LIST, STATUS_LIST } from '../data/mockData';

function getRenewalIcon(category = '') {
  const cat = String(category).toLowerCase();
  if (cat.includes('server') || cat.includes('hosting')) return Server;
  if (cat.includes('domain') || cat.includes('cloud') || cat.includes('web')) return Globe;
  if (cat.includes('security') || cat.includes('ssl') || cat.includes('antivirus')) return Shield;
  return AppWindow;
}

function resolveItemName(a) {
  if (a.item && typeof a.item === 'string' && a.item.trim()) return a.item;
  if (a.configuration && typeof a.configuration === 'object' && a.configuration.brandModel) {
    return a.configuration.brandModel;
  }
  return a.category || '—';
}

function resolveBrand(a) {
  if (a.brand && typeof a.brand === 'string' && a.brand.trim()) return a.brand;
  if (a.configuration && typeof a.configuration === 'object' && a.configuration.brandModel) {
    return String(a.configuration.brandModel).split(' ')[0];
  }
  if (a.vendorName) {
    const v = String(a.vendorName).split(' ')[0];
    if (['Dell', 'HP', 'Lenovo', 'Apple', 'Samsung', 'Cisco', 'Canon', 'Logitech', 'Microsoft'].includes(v)) {
      return v;
    }
  }
  return '—';
}

function resolveConfig(a) {
  if (typeof a.configuration === 'string' && a.configuration.trim()) return a.configuration;
  if (typeof a.configSummary === 'string' && a.configSummary.trim()) return a.configSummary;
  if (a.configuration && typeof a.configuration === 'object') {
    const parts = Object.entries(a.configuration)
      .filter(([k]) => k !== 'brandModel')
      .map(([k, v]) => `${k}: ${v}`);
    if (parts.length > 0) return parts.join(', ');
  }
  return '—';
}

export default function Reports() {
  const {
    assets,
    categories,
    employees,
    vendors,
    inventoryBatches,
    assignmentHistory,
    maintenanceRecords,
    softwareList,
  } = useData();

  // Renewals & Bills (Software Services) State
  const [renewalsSearch, setRenewalsSearch] = useState('');
  const [renewalsFilter, setRenewalsFilter] = useState('all');
  const [selectedSoftwareItem, setSelectedSoftwareItem] = useState(null);

  // Filtered Software Services for Renewals & Bills panel
  const filteredSoftwareRenewals = useMemo(() => {
    const list = softwareList || [];
    const today = new Date();

    return list.filter((s) => {
      if (renewalsSearch.trim()) {
        const q = renewalsSearch.toLowerCase();
        const matchName = (s.serviceName || '').toLowerCase().includes(q);
        const matchCode = (s.assetCode || s.id || '').toLowerCase().includes(q);
        const matchCat = (s.category || '').toLowerCase().includes(q);
        const matchVendor = (s.vendorName || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchCat && !matchVendor) return false;
      }

      if (renewalsFilter === 'due-soon') {
        if (!s.nextRenewalDate && !s.expiryDate) return false;
        const targetDate = new Date(s.nextRenewalDate || s.expiryDate);
        const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 30;
      }
      if (renewalsFilter === 'active') {
        return s.status === 'Active';
      }
      if (renewalsFilter === 'expiring') {
        return s.status === 'Expiring Soon';
      }

      return true;
    });
  }, [softwareList, renewalsSearch, renewalsFilter]);

  function handleExportSoftwareExcel(item = null) {
    const listToExport = item ? [item] : filteredSoftwareRenewals;
    const exportData = listToExport.map((s) => ({
      'Asset Code / ID': s.assetCode || s.id,
      'Software / Service Name': s.serviceName,
      Category: s.category,
      Vendor: s.vendorName || '',
      'Vendor Portal URL': s.vendorPortalUrl || '',
      'Responsible Person': s.responsiblePersonName || '',
      'Seats / User Count': s.seatsCount || '',
      'Purchase / Start Date': s.purchaseDate || '',
      'Next Renewal Date': s.nextRenewalDate || '',
      'Expiry Date': s.expiryDate || '',
      Currency: s.currency || 'INR',
      Amount: s.amount || 0,
      'Billing Type': s.billingType || 'Monthly',
      'Auto-Renewal': s.autoRenewal ? 'Yes' : 'No',
      'Payment Method': s.paymentMethod || '',
      Status: s.status || '',
      'Attachment Name': s.attachmentName || '',
      Description: s.description || '',
    }));

    const name = item ? `Software_Details_${item.assetCode || item.id}` : 'Software_Services_Renewals_Report';
    exportToExcel(exportData, name, 'Software Renewals & Bills');
  }

  // Filters (Category, Item Name, Department, Employee, Status, Location, Purchase Date, Assignment Date)
  const [filters, setFilters] = useState({
    category: '',
    itemName: '',
    department: '',
    employee: '',
    status: '',
    location: '',
    purchaseDateFrom: '',
    purchaseDateTo: '',
    assignmentDateFrom: '',
    assignmentDateTo: '',
  });

  const [expandedAssetIds, setExpandedAssetIds] = useState(new Set());

  function toggleAssetExpand(assetId) {
    setExpandedAssetIds((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  }

  function handleFilterChange(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearAllFilters() {
    setFilters({
      category: '',
      itemName: '',
      department: '',
      employee: '',
      status: '',
      location: '',
      purchaseDateFrom: '',
      purchaseDateTo: '',
      assignmentDateFrom: '',
      assignmentDateTo: '',
    });
  }

  // Pre-process all assets with resolved fields
  const enrichedAssets = useMemo(() => {
    return assets.map((a) => {
      const itemName = resolveItemName(a);
      const brand = resolveBrand(a);
      const config = resolveConfig(a);
      const employee = a.assignedToName || (a.assignedTo ? 'Assigned' : 'Unassigned');
      const department = a.assignedDept || '—';
      const serialNo = a.serialNumber || a.serialNo || '—';

      return {
        ...a,
        itemName,
        brand,
        resolvedConfig: config,
        employee,
        department,
        serialNo,
      };
    });
  }, [assets]);

  // Unique options for filter dropdowns
  const categoryOptions = useMemo(() => {
    const list = categories.map((c) => c.name);
    return [...new Set([...list, ...assets.map((a) => a.category).filter(Boolean)])].sort();
  }, [categories, assets]);

  const departmentOptions = useMemo(() => {
    const list = DEPARTMENT_LIST;
    return [...new Set([...list, ...assets.map((a) => a.assignedDept).filter(Boolean)])].sort();
  }, [assets]);

  const employeeOptions = useMemo(() => {
    const fromAssets = assets.map((a) => a.assignedToName).filter(Boolean);
    const fromEmps = employees.map((e) => e.name);
    return [...new Set([...fromEmps, ...fromAssets])].sort();
  }, [employees, assets]);

  const locationOptions = useMemo(() => {
    return [...new Set([...LOCATION_LIST, ...assets.map((a) => a.location).filter(Boolean)])].sort();
  }, [assets]);

  // Apply filters
  const filteredAssets = useMemo(() => {
    return enrichedAssets.filter((a) => {
      // 1. Category
      if (filters.category && a.category !== filters.category) return false;

      // 2. Item Name
      if (filters.itemName) {
        const q = filters.itemName.trim().toLowerCase();
        if (!a.itemName.toLowerCase().includes(q)) return false;
      }

      // 3. Department
      if (filters.department && a.department !== filters.department) return false;

      // 4. Employee
      if (filters.employee) {
        const q = filters.employee.trim().toLowerCase();
        if (!a.employee.toLowerCase().includes(q)) return false;
      }

      // 5. Status
      if (filters.status && a.status !== filters.status) return false;

      // 6. Location
      if (filters.location && a.location !== filters.location) return false;

      // 7. Purchase Date range
      if (filters.purchaseDateFrom && a.purchaseDate && a.purchaseDate < filters.purchaseDateFrom) return false;
      if (filters.purchaseDateTo && a.purchaseDate && a.purchaseDate > filters.purchaseDateTo) return false;

      // 8. Assignment Date range
      if (filters.assignmentDateFrom) {
        if (!a.assignedOn || a.assignedOn < filters.assignmentDateFrom) return false;
      }
      if (filters.assignmentDateTo) {
        if (!a.assignedOn || a.assignedOn > filters.assignmentDateTo) return false;
      }

      return true;
    });
  }, [enrichedAssets, filters]);

  // Active filters count
  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  // Executive summary counts
  const totalCount = filteredAssets.length;
  const assignedCount = filteredAssets.filter((a) => a.status === 'Assigned').length;
  const availableCount = filteredAssets.filter((a) => a.status === 'Available' || a.status === 'In Stock').length;
  const repairCount = filteredAssets.filter((a) => a.status === 'Under Repair' || a.status === 'Damaged').length;
  const totalValuation = filteredAssets.reduce((sum, a) => sum + Number(a.unitCost || 0), 0);

  // Export to Excel
  function handleExportExcel() {
    const exportData = filteredAssets.map((r) => ({
      'Asset ID': cleanAssetId(r.id),
      Category: r.category,
      Item: r.itemName,
      Brand: r.brand,
      'Serial No': r.serialNo,
      Configuration: r.resolvedConfig,
      Employee: r.employee,
      Department: r.department,
      Status: r.status,
      Location: r.location || '',
      'Purchase Date': r.purchaseDate || '',
      'Assignment Date': r.assignedOn || '',
      'Unit Cost (INR)': r.unitCost || 0,
      Vendor: r.vendorName || '',
      'PO Number': r.poNumber || '',
      'Invoice Number': r.invoiceNo || '',
      'Warranty Expiry': r.warrantyExpiry || '',
    }));

    exportToExcel(exportData, 'Asset_Hardware_Report', 'Hardware History');
  }

  // Columns definition (without Sub Category)
  const columns = [
    {
      key: 'id',
      label: 'Asset ID',
      width: 140,
      render: (r, { isExpanded } = {}) => (
        <div className="batch-id-cell">
          <button
            type="button"
            className={`expand-arrow-btn ${isExpanded ? 'is-expanded' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleAssetExpand(r.id);
            }}
            title={isExpanded ? 'Collapse complete history' : 'Expand complete history'}
            aria-label={isExpanded ? 'Collapse complete history' : 'Expand complete history'}
          >
            <ChevronRight size={14} />
          </button>
          <span className="mono-cell">{cleanAssetId(r.id)}</span>
        </div>
      ),
    },
    { key: 'category', label: 'Category', width: 110 },
    {
      key: 'itemName',
      label: 'Item',
      render: (r) => <b>{r.itemName}</b>,
    },
    { key: 'brand', label: 'Brand', width: 100 },
    {
      key: 'serialNo',
      label: 'Serial No.',
      render: (r) => <span className="mono-cell">{r.serialNo}</span>,
    },
    {
      key: 'resolvedConfig',
      label: 'Configuration',
      width: 210,
      render: (r) => <span className="config-cell">{r.resolvedConfig}</span>,
    },
    {
      key: 'employee',
      label: 'Employee',
      render: (r) => (
        r.employee !== 'Unassigned'
          ? <span>{r.employee}</span>
          : <span className="muted-text">Unassigned</span>
      ),
    },
    { key: 'department', label: 'Department', render: (r) => r.department || '—' },
    {
      key: 'status',
      label: 'Status',
      width: 110,
      render: (r) => (
        <Badge
          tone={
            r.status === 'Available' || r.status === 'In Stock'
              ? 'success'
              : r.status === 'Assigned'
                ? 'primary'
                : 'warning'
          }
        >
          {r.status || 'Available'}
        </Badge>
      ),
    },
    { key: 'location', label: 'Location', render: (r) => r.location || '—' },
    { key: 'purchaseDate', label: 'Purchase Date', render: (r) => r.purchaseDate || '—' },
    { key: 'assignedOn', label: 'Assignment Date', render: (r) => r.assignedOn || '—' },
  ];

  return (
    <div className="page">
      {/* Header */}
      <div className="page-head">
        <div>
          <h1>Reports</h1>
          <p className="page-sub">
            Complete history and lifecycle records of asset/hardware. Filter across categories, employees, departments, and dates, or export to Excel.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleExportExcel}>
          <Download size={16} /> Export to Excel
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="report-summary-bar">
        <div className="report-summary-card">
          <div className="report-summary-card-title">Filtered Assets</div>
          <div className="report-summary-card-value">{totalCount}</div>
        </div>
        <div className="report-summary-card">
          <div className="report-summary-card-title">Assigned Units</div>
          <div className="report-summary-card-value" style={{ color: 'var(--primary)' }}>{assignedCount}</div>
        </div>
        <div className="report-summary-card">
          <div className="report-summary-card-title">Available in Stock</div>
          <div className="report-summary-card-value" style={{ color: 'var(--success)' }}>{availableCount}</div>
        </div>
        <div className="report-summary-card">
          <div className="report-summary-card-title">Under Repair / Maintenance</div>
          <div className="report-summary-card-value" style={{ color: 'var(--warning)' }}>{repairCount}</div>
        </div>
        <div className="report-summary-card">
          <div className="report-summary-card-title">Total Book Value</div>
          <div className="report-summary-card-value">₹ {(totalValuation / 100000).toFixed(2)} Lakhs</div>
        </div>
      </div>

      {/* Renewals & Bills Section (Software Services & Subscriptions) */}
      <div className="renewals-bills-panel">
        <div className="renewals-bills-header">
          <div className="renewals-bills-title">Renewals &amp; Bills</div>
          <div className="renewals-bills-badge">All Software Services</div>
        </div>

        <div className="renewals-bills-controls">
          <div className="renewals-bills-search">
            <Search className="renewals-bills-search-icon" size={16} />
            <input
              type="text"
              value={renewalsSearch}
              onChange={(e) => setRenewalsSearch(e.target.value)}
              placeholder="Search assets..."
            />
          </div>

          <select
            className="renewals-bills-select"
            value={renewalsFilter}
            onChange={(e) => setRenewalsFilter(e.target.value)}
          >
            <option value="all">All Records</option>
            <option value="due-soon">Due Soon (30 Days)</option>
            <option value="active">Active Status</option>
            <option value="expiring">Expiring Soon</option>
          </select>

          <button
            className="btn btn-outline"
            style={{ borderRadius: '20px', padding: '8px 16px', fontSize: '13px' }}
            onClick={() => handleExportSoftwareExcel()}
          >
            <Download size={14} /> Export All to Excel
          </button>
        </div>

        <div className="renewals-bills-list">
          {filteredSoftwareRenewals.length === 0 ? (
            <div className="empty-cell" style={{ padding: '24px' }}>
              No software renewals or bills matching current filter.
            </div>
          ) : (
            filteredSoftwareRenewals.map((s) => {
              const IconComponent = getRenewalIcon(s.category);
              const today = new Date();
              const targetDate = s.nextRenewalDate || s.expiryDate;
              const diffDays = targetDate ? Math.ceil((new Date(targetDate) - today) / (1000 * 60 * 60 * 24)) : 999;
              const isDueSoon = diffDays >= 0 && diffDays <= 30;

              return (
                <div className="renewals-bills-item" key={s.id}>
                  <div className="renewals-bills-item-left">
                    <div className="renewals-bills-icon-box">
                      <IconComponent size={20} />
                    </div>
                    <div>
                      <div className="renewals-bills-item-title">{s.serviceName}</div>
                      <div className="renewals-bills-item-sub">
                        {s.category} · Due {s.nextRenewalDate || s.expiryDate || '—'}
                      </div>
                      <div className="renewals-bills-item-payment">
                        Payment: {s.autoRenewal ? 'Paid (Auto-Renew)' : 'Unpaid'}
                      </div>
                    </div>
                  </div>

                  <div className="renewals-bills-item-right">
                    <div className="renewals-bills-amount">
                      {s.currency || 'INR'} {Number(s.amount || 0).toLocaleString('en-IN')}
                    </div>
                    <div className="renewals-bills-item-actions">
                      <Badge tone={isDueSoon ? 'warning' : s.status === 'Active' ? 'success' : 'neutral'}>
                        {isDueSoon ? 'Due Soon' : s.status || 'Upcoming'}
                      </Badge>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ borderRadius: '20px', padding: '4px 14px', fontSize: '12px' }}
                        onClick={() => setSelectedSoftwareItem(s)}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Comprehensive Filter Panel */}
      <div className="report-filter-panel">
        <div className="report-filter-header">
          <div className="report-filter-title">
            <Filter size={16} />
            <span>Filter Asset & Hardware Report</span>
            {activeFiltersCount > 0 && (
              <span className="entity-source-badge">
                {activeFiltersCount} active filter{activeFiltersCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="report-filter-actions">
            {activeFiltersCount > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={clearAllFilters}>
                <RotateCcw size={14} /> Clear Filters
              </button>
            )}
          </div>
        </div>

        <div className="report-filter-grid">
          {/* 1. Category Filter */}
          <div className="report-filter-group">
            <label>Category</label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <option value="">All Categories</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* 2. Item Name Filter */}
          <div className="report-filter-group">
            <label>Item Name</label>
            <input
              type="text"
              value={filters.itemName}
              onChange={(e) => handleFilterChange('itemName', e.target.value)}
              placeholder="e.g. Latitude 5440…"
            />
          </div>

          {/* 3. Department Filter */}
          <div className="report-filter-group">
            <label>Department</label>
            <select
              value={filters.department}
              onChange={(e) => handleFilterChange('department', e.target.value)}
            >
              <option value="">All Departments</option>
              {departmentOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* 4. Employee Filter */}
          <div className="report-filter-group">
            <label>Employee</label>
            <select
              value={filters.employee}
              onChange={(e) => handleFilterChange('employee', e.target.value)}
            >
              <option value="">All Employees</option>
              {employeeOptions.map((emp) => (
                <option key={emp} value={emp}>{emp}</option>
              ))}
            </select>
          </div>

          {/* 5. Status Filter */}
          <div className="report-filter-group">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Statuses</option>
              {STATUS_LIST.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* 6. Location Filter */}
          <div className="report-filter-group">
            <label>Location</label>
            <select
              value={filters.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
            >
              <option value="">All Locations</option>
              {locationOptions.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* 7. Purchase Date Filter (Date Range) */}
          <div className="report-filter-group">
            <label>Purchase Date (From / To)</label>
            <div className="report-date-range">
              <input
                type="date"
                value={filters.purchaseDateFrom}
                onChange={(e) => handleFilterChange('purchaseDateFrom', e.target.value)}
                title="Purchase Date From"
              />
              <span className="report-date-sep">to</span>
              <input
                type="date"
                value={filters.purchaseDateTo}
                onChange={(e) => handleFilterChange('purchaseDateTo', e.target.value)}
                title="Purchase Date To"
              />
            </div>
          </div>

          {/* 8. Assignment Date Filter (Date Range) */}
          <div className="report-filter-group">
            <label>Assignment Date (From / To)</label>
            <div className="report-date-range">
              <input
                type="date"
                value={filters.assignmentDateFrom}
                onChange={(e) => handleFilterChange('assignmentDateFrom', e.target.value)}
                title="Assignment Date From"
              />
              <span className="report-date-sep">to</span>
              <input
                type="date"
                value={filters.assignmentDateTo}
                onChange={(e) => handleFilterChange('assignmentDateTo', e.target.value)}
                title="Assignment Date To"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Report Table with Complete History sub-row */}
      <DataTable
        rows={filteredAssets}
        columns={columns}
        searchKeys={['id', 'itemName', 'category', 'brand', 'serialNo', 'employee', 'department', 'location']}
        searchPlaceholder="Search by Asset ID, Item, Brand, Serial, Employee…"
        pageSize={10}
        onRowClick={(row) => toggleAssetExpand(row.id)}
        isRowExpanded={(row) => expandedAssetIds.has(row.id)}
        renderSubRow={(row) => {
          const historyItems = assignmentHistory
            .filter((h) => h.assetId === row.id)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

          const maintenanceItems = maintenanceRecords
            .filter((m) => m.assetId === row.id)
            .sort((a, b) => new Date(b.openedOn) - new Date(a.openedOn));

          const inventoryBatch = inventoryBatches.find(
            (b) => b.id === row.batchId || b.inventoryId === row.batchId,
          );

          return (
            <div className="child-class-entry">
              <div className="child-class-header">
                <div className="child-class-title">
                  <History size={16} />
                  <strong>Complete History & Lifecycle: <code>{row.id}</code> ({row.itemName})</strong>
                  <span className="child-badge">{historyItems.length} Assignment Events</span>
                  <span className="child-badge">{maintenanceItems.length} Maintenance Tickets</span>
                </div>
                <div className="child-class-meta">
                  <span>Category: <b>{row.category}</b></span>
                  <span>Brand: <b>{row.brand}</b></span>
                  <span>Serial No: <code>{row.serialNo}</code></span>
                  <span>Status: <b>{row.status}</b></span>
                </div>
              </div>

              <div className="report-history-grid">
                {/* 1. Assignment History */}
                <div className="report-history-card">
                  <div className="entity-section-header">
                    <div className="entity-section-title">
                      <History size={15} />
                      <span>Assignment & Movement History</span>
                    </div>
                    <span className="entity-source-badge">{historyItems.length} records</span>
                  </div>
                  {historyItems.length === 0 ? (
                    <div className="empty-cell" style={{ padding: '12px' }}>
                      No assignment movements recorded yet for this asset.
                    </div>
                  ) : (
                    <div className="timeline">
                      {historyItems.map((h) => (
                        <div className="timeline-item" key={h.id}>
                          <div
                            className={`timeline-dot ${
                              h.action === 'Assigned'
                                ? 'dot-success'
                                : h.action === 'Transferred'
                                  ? 'dot-warning'
                                  : 'dot-muted'
                            }`}
                          />
                          <div className="timeline-content">
                            <div className="timeline-title">
                              {h.action} {h.action === 'Returned' ? 'from' : 'to'} {h.employeeName || '—'}
                            </div>
                            <div className="timeline-meta">
                              {h.department} · Date: <b>{h.date}</b>
                              {h.performedBy ? ` · Handled by ${h.performedBy}` : ''}
                            </div>
                            {h.remarks && <div className="timeline-remarks">{h.remarks}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Maintenance & Service History */}
                <div className="report-history-card">
                  <div className="entity-section-header">
                    <div className="entity-section-title">
                      <Wrench size={15} />
                      <span>Maintenance & Service Tickets</span>
                    </div>
                    <span className="entity-source-badge">{maintenanceItems.length} records</span>
                  </div>
                  {maintenanceItems.length === 0 ? (
                    <div className="empty-cell" style={{ padding: '12px' }}>
                      No repair or maintenance tickets recorded.
                    </div>
                  ) : (
                    <div className="timeline">
                      {maintenanceItems.map((m) => (
                        <div className="timeline-item" key={m.id}>
                          <div className={`timeline-dot ${m.status === 'Closed' ? 'dot-success' : 'dot-warning'}`} />
                          <div className="timeline-content">
                            <div className="timeline-title">
                              {m.issueType}{' '}
                              <Badge tone={m.status === 'Closed' ? 'success' : 'warning'}>
                                {m.status}
                              </Badge>
                            </div>
                            <div className="timeline-meta">
                              Ticket: <code>{m.id}</code> · Opened: {m.openedOn}
                              {m.completedOn ? ` · Closed: ${m.completedOn}` : ''}
                            </div>
                            {m.description && <div className="timeline-remarks">{m.description}</div>}
                            <div className="timeline-meta" style={{ marginTop: '4px' }}>
                              Vendor: {m.vendorName} · Cost: ₹ {Number(m.cost || 0).toLocaleString('en-IN')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Procurement & Hardware Specs Info */}
              <div className="report-history-card" style={{ marginTop: '16px' }}>
                <div className="entity-section-header">
                  <div className="entity-section-title">
                    <Package size={15} />
                    <span>Procurement & Hardware Intake Details</span>
                  </div>
                  <span className="entity-source-badge">Hardware Record</span>
                </div>
                <div className="detail-grid">
                  <div className="info-row">
                    <div className="detail-label"><Building size={12} /> Supplier / Vendor</div>
                    <div className="detail-value">{row.vendorName || inventoryBatch?.vendorName || '—'}</div>
                  </div>
                  <div className="info-row">
                    <div className="detail-label"><Hash size={12} /> PO Number</div>
                    <div className="detail-value mono">{row.poNumber || inventoryBatch?.poNumber || '—'}</div>
                  </div>
                  <div className="info-row">
                    <div className="detail-label"><Hash size={12} /> Invoice Number</div>
                    <div className="detail-value mono">{row.invoiceNo || inventoryBatch?.invoiceNo || '—'}</div>
                  </div>
                  <div className="info-row">
                    <div className="detail-label"><Calendar size={12} /> Purchase Date</div>
                    <div className="detail-value">{row.purchaseDate || '—'}</div>
                  </div>
                  <div className="info-row">
                    <div className="detail-label"><ShieldCheck size={12} /> Warranty Expiry</div>
                    <div className="detail-value">{row.warrantyExpiry || inventoryBatch?.warrantyEndDate || '—'}</div>
                  </div>
                  <div className="info-row">
                    <div className="detail-label"><MapPin size={12} /> Current Location</div>
                    <div className="detail-value">{row.location || '—'}</div>
                  </div>
                  <div className="detail-full">
                    <div className="detail-label"><Cpu size={12} /> Hardware Configuration</div>
                    <div className="detail-value" style={{ marginTop: '4px', fontWeight: 'normal' }}>
                      {row.resolvedConfig || '—'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }}
        exportFilename="Asset_Hardware_Report"
        exportSheetName="Hardware History"
        exportMapper={(rows) =>
          rows.map((r) => ({
            'Asset ID': cleanAssetId(r.id),
            Category: r.category,
            Item: r.itemName,
            Brand: r.brand,
            'Serial No': r.serialNo,
            Configuration: r.resolvedConfig,
            Employee: r.employee,
            Department: r.department,
            Status: r.status,
            Location: r.location || '',
            'Purchase Date': r.purchaseDate || '',
            'Assignment Date': r.assignedOn || '',
            'Unit Cost (INR)': r.unitCost || 0,
            Vendor: r.vendorName || '',
            'PO Number': r.poNumber || '',
            'Invoice Number': r.invoiceNo || '',
            'Warranty Expiry': r.warrantyExpiry || '',
          }))
        }
      />

      {/* View Software Details Modal */}
      {selectedSoftwareItem && (
        <Modal
          open={Boolean(selectedSoftwareItem)}
          onClose={() => setSelectedSoftwareItem(null)}
          title={`Software Details — ${selectedSoftwareItem.serviceName}`}
          subtitle={`Asset Code: ${selectedSoftwareItem.assetCode || selectedSoftwareItem.id}`}
          width={650}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setSelectedSoftwareItem(null)}>
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleExportSoftwareExcel(selectedSoftwareItem)}
              >
                <Download size={15} /> Export to Excel
              </button>
            </>
          }
        >
          <div className="drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <table className="modal-details-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '9px 12px', fontWeight: 600, color: 'var(--muted)', width: '35%', borderBottom: '1px solid var(--border)' }}>Asset Code / ID</td>
                  <td style={{ padding: '9px 12px', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>{selectedSoftwareItem.assetCode || selectedSoftwareItem.id}</td>
                </tr>
                <tr>
                  <td style={{ padding: '9px 12px', fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>Software / Service Name</td>
                  <td style={{ padding: '9px 12px', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>{selectedSoftwareItem.serviceName}</td>
                </tr>
                <tr>
                  <td style={{ padding: '9px 12px', fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>Category</td>
                  <td style={{ padding: '9px 12px', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{selectedSoftwareItem.category}</td>
                </tr>
                <tr>
                  <td style={{ padding: '9px 12px', fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>Vendor / Provider</td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)' }}>{selectedSoftwareItem.vendorName || '—'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '9px 12px', fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>Responsible Person</td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)' }}>{selectedSoftwareItem.responsiblePersonName}</td>
                </tr>
                <tr>
                  <td style={{ padding: '9px 12px', fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>Seats / User Count</td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)' }}>{selectedSoftwareItem.seatsCount || '—'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '9px 12px', fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>Billing Cycle</td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)' }}>{selectedSoftwareItem.billingType}</td>
                </tr>
                <tr>
                  <td style={{ padding: '9px 12px', fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>Amount &amp; Currency</td>
                  <td style={{ padding: '9px 12px', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>{selectedSoftwareItem.currency || 'INR'} {Number(selectedSoftwareItem.amount || 0).toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td style={{ padding: '9px 12px', fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>Auto-Renewal</td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)' }}>{selectedSoftwareItem.autoRenewal ? 'Yes (Paid)' : 'No (Unpaid)'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '9px 12px', fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>Payment Method</td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)' }}>{selectedSoftwareItem.paymentMethod || '—'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '9px 12px', fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>Next Renewal Date</td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)' }}>{selectedSoftwareItem.nextRenewalDate || '—'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '9px 12px', fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>Expiry Date</td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)' }}>{selectedSoftwareItem.expiryDate || '—'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '9px 12px', fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>Status</td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)' }}>
                    <Badge tone={selectedSoftwareItem.status === 'Active' ? 'success' : 'warning'}>{selectedSoftwareItem.status}</Badge>
                  </td>
                </tr>
                {selectedSoftwareItem.attachmentName && (
                  <tr>
                    <td style={{ padding: '9px 12px', fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>Attachment</td>
                    <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)' }}>{selectedSoftwareItem.attachmentName}</td>
                  </tr>
                )}
                {selectedSoftwareItem.description && (
                  <tr>
                    <td style={{ padding: '9px 12px', fontWeight: 600, color: 'var(--muted)' }}>Description / Notes</td>
                    <td style={{ padding: '9px 12px' }}>{selectedSoftwareItem.description}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}
