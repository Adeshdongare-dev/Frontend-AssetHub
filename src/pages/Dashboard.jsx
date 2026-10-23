//  import { useMemo, useState, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import {
//   Boxes, PackageCheck, Wrench, ShieldAlert, Truck, Users, ArrowUpRight, Clock,
//   Laptop, Smartphone, Monitor, Server, Network, Printer, Mouse, AppWindow, Tag,
//   Eye, X,
// } from 'lucide-react';
// import { useData } from '../context/DataContext';
// import StatCard from '../components/StatCard';
// import DataTable from '../components/DataTable';
// import Badge from '../components/Badge';
// import AssetDetailDrawer from '../components/AssetDetailDrawer';
// import { cleanAssetId } from '../utils/idGenerator';

// const CATEGORY_ICONS = {
//   Laptop, Desktop: Laptop, Monitor, Server, Networking: Network, Mobile: Smartphone,
//   Printer, Peripheral: Mouse, Software: AppWindow,
// };

// function daysUntil(dateStr) {
//   if (!dateStr) return 0;
//   return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
// }

// export default function Dashboard() {
//   const { assets, vendors, employees, categories, maintenanceRecords, activityLog, inventoryBatches } = useData();
//   const navigate = useNavigate();

//   const [activeTab, setActiveTab] = useState(null);
//   const [selectedAsset, setSelectedAsset] = useState(null);
//   const tableRef = useRef(null);

//   function handleTabSelect(key) {
//     setActiveTab((prev) => {
//       const next = prev === key ? null : key;
//       if (next) {
//         setTimeout(() => {
//           tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
//         }, 50);
//       }
//       return next;
//     });
//   }

//   const stats = useMemo(() => {
//     const total = assets.length;
//     const assigned = assets.filter((a) => a.status === 'Assigned').length;
//     const inStock = assets.filter((a) => a.status === 'Available').length;
//     const maintenance = assets.filter((a) => a.status === 'Under Repair').length;
//     const retired = assets.filter((a) => a.status === 'Retired').length;
//     const warrantyExpiring = assets.filter((a) => {
//       const d = daysUntil(a.warrantyExpiry);
//       return d >= 0 && d <= 60 && !['Retired','Disposed','Lost'].includes(a.status);
//     }).length;
//     const totalValue = assets.reduce((sum, a) => sum + Number(a.unitCost || 0), 0);
//     return { total, assigned, inStock, maintenance, retired, warrantyExpiring, totalValue };
//   }, [assets]);

//   const byCategory = useMemo(() => {
//     const map = {};
//     assets.forEach((a) => { map[a.category] = (map[a.category] || 0) + 1; });
//     return Object.entries(map).sort((a, b) => b[1] - a[1]);
//   }, [assets]);
//   const maxCategory = Math.max(...byCategory.map(([, v]) => v), 1);

//   const categoryCards = useMemo(() => {
//     const countMap = Object.fromEntries(byCategory);
//     return categories
//       .filter((c) => c.status === 'Active')
//       .map((c) => ({ ...c, count: countMap[c.name] || 0 }))
//       .sort((a, b) => b.count - a.count);
//   }, [categories, byCategory]);

//   const openTickets = maintenanceRecords.filter((m) => m.status !== 'Closed').slice(0, 5);
//   const expiringSoon = assets
//     .filter((a) => !['Retired','Disposed','Lost'].includes(a.status))
//     .map((a) => ({ ...a, days: daysUntil(a.warrantyExpiry) }))
//     .filter((a) => a.days >= 0 && a.days <= 60)
//     .sort((a, b) => a.days - b.days)
//     .slice(0, 5);

//   // Determine active table data and metadata
//   const tableData = useMemo(() => {
//     if (!activeTab) return { rows: [], title: '', subtitle: '', filename: 'export', isVendor: false };

//     if (activeTab === 'vendors') {
//       return {
//         rows: vendors,
//         title: 'Active Vendors',
//         subtitle: 'Complete list of onboarded suppliers and procurement vendors.',
//         filename: 'Dashboard_Active_Vendors',
//         sheetName: 'Vendors',
//         isVendor: true,
//       };
//     }

//     if (activeTab === 'total') {
//       return {
//         rows: assets,
//         title: 'Total Assets',
//         subtitle: 'Showing all assets and complete specifications across your IT estate.',
//         filename: 'Dashboard_Total_Assets',
//         sheetName: 'All Assets',
//         isVendor: false,
//       };
//     }

//     if (activeTab === 'assigned') {
//       return {
//         rows: assets.filter((a) => a.status === 'Assigned'),
//         title: 'Assigned Assets',
//         subtitle: 'Showing all assets currently issued to employees across all offices.',
//         filename: 'Dashboard_Assigned_Assets',
//         sheetName: 'Assigned Assets',
//         isVendor: false,
//       };
//     }

//     if (activeTab === 'available') {
//       return {
//         rows: assets.filter((a) => a.status === 'Available' || a.status === 'In Stock'),
//         title: 'Available Assets',
//         subtitle: 'Showing all in-stock assets available for immediate deployment.',
//         filename: 'Dashboard_Available_Assets',
//         sheetName: 'Available Assets',
//         isVendor: false,
//       };
//     }

//     if (activeTab === 'under-repair') {
//       return {
//         rows: assets.filter((a) => a.status === 'Under Repair'),
//         title: 'Under Repair Assets',
//         subtitle: 'Showing all assets currently undergoing maintenance or ticket repair.',
//         filename: 'Dashboard_Under_Repair_Assets',
//         sheetName: 'Under Repair',
//         isVendor: false,
//       };
//     }

//     if (activeTab === 'warranty-expiring') {
//       return {
//         rows: assets.filter((a) => {
//           const d = daysUntil(a.warrantyExpiry);
//           return d >= 0 && d <= 60 && !['Retired', 'Disposed', 'Lost'].includes(a.status);
//         }),
//         title: 'Warranty Expiring Soon',
//         subtitle: 'Showing assets with manufacturer warranty ending in the next 60 days.',
//         filename: 'Dashboard_Warranty_Expiring_Assets',
//         sheetName: 'Warranty Expiring',
//         isVendor: false,
//       };
//     }

//     if (activeTab.startsWith('cat:')) {
//       const catName = activeTab.slice(4);
//       return {
//         rows: assets.filter((a) => (a.category || '').toLowerCase() === catName.toLowerCase()),
//         title: `${catName} Assets`,
//         subtitle: `Showing all ${catName} assets with full hardware and allocation details.`,
//         filename: `Dashboard_${catName.replace(/\s+/g, '_')}_Assets`,
//         sheetName: `${catName} Assets`,
//         isVendor: false,
//       };
//     }

//     return { rows: [], title: '', subtitle: '', filename: 'export', isVendor: false };
//   }, [activeTab, assets, vendors]);

//   const assetColumns = [
//     {
//       key: 'id',
//       label: 'Asset ID',
//       width: 125,
//       render: (r) => <span className="mono-cell">{cleanAssetId(r.id)}</span>,
//     },
//     {
//       key: 'item',
//       label: 'Item',
//       width: 160,
//       render: (r) => {
//         const val =
//           r.item ||
//           (typeof r.configuration === 'object' && r.configuration?.brandModel
//             ? r.configuration.brandModel
//             : r.category);
//         return <b>{val || '—'}</b>;
//       },
//     },
//     {
//       key: 'category',
//       label: 'Category',
//       width: 110,
//       render: (r) => <span className="tag-pill">{r.category || '—'}</span>,
//     },
//     {
//       key: 'serialNumber',
//       label: 'Serial Number',
//       width: 130,
//       render: (r) => <span className="mono-cell">{r.serialNumber || '—'}</span>,
//     },
//     {
//       key: 'configSummary',
//       label: 'Configuration',
//       width: 220,
//       render: (r) => {
//         const configText =
//           typeof r.configuration === 'string' && r.configuration.trim()
//             ? r.configuration
//             : typeof r.configSummary === 'string' && r.configSummary.trim()
//               ? r.configSummary
//               : r.configuration && typeof r.configuration === 'object'
//                 ? Object.entries(r.configuration)
//                     .filter(([k]) => k !== 'brandModel')
//                     .map(([k, v]) => `${k}: ${v}`)
//                     .join(', ')
//                 : '—';
//         return <span className="config-cell">{configText}</span>;
//       },
//     },
//     {
//       key: 'status',
//       label: 'Status',
//       width: 115,
//       render: (r) => (
//         <Badge
//           tone={
//             r.status === 'Available' || r.status === 'In Stock'
//               ? 'success'
//               : r.status === 'Assigned'
//                 ? 'primary'
//                 : r.status === 'Under Repair'
//                   ? 'warning'
//                   : 'danger'
//           }
//         >
//           {r.status || 'Available'}
//         </Badge>
//       ),
//     },
//     {
//       key: 'assignedToName',
//       label: 'Assigned To',
//       width: 150,
//       render: (r) =>
//         r.assignedToName ? (
//           <div>
//             <div style={{ fontWeight: 600 }}>{r.assignedToName}</div>
//             {r.assignedDept && <div className="muted-text small">{r.assignedDept}</div>}
//           </div>
//         ) : (
//           <span className="muted-text">Unassigned</span>
//         ),
//     },
//     {
//       key: 'location',
//       label: 'Location',
//       width: 135,
//       render: (r) => <span>{r.location || '—'}</span>,
//     },
//     {
//       key: 'vendorName',
//       label: 'Vendor',
//       width: 135,
//       render: (r) => <span>{r.vendorName || '—'}</span>,
//     },
//     {
//       key: 'unitCost',
//       label: 'Cost',
//       width: 105,
//       render: (r) => (
//         <span className="mono-cell">
//           {r.unitCost !== undefined && r.unitCost !== null && r.unitCost !== ''
//             ? `₹ ${Number(r.unitCost).toLocaleString('en-IN')}`
//             : '—'}
//         </span>
//       ),
//     },
//     {
//       key: 'warrantyExpiry',
//       label: 'Warranty Expiry',
//       width: 130,
//       render: (r) => {
//         if (!r.warrantyExpiry) return <span className="muted-text">—</span>;
//         const days = daysUntil(r.warrantyExpiry);
//         return (
//           <div>
//             <span>{r.warrantyExpiry}</span>
//             {days >= 0 && days <= 60 && (
//               <span className="pill pill-warning" style={{ fontSize: 10, marginLeft: 4, padding: '1px 4px' }}>
//                 {days}d left
//               </span>
//             )}
//           </div>
//         );
//       },
//     },
//     {
//       key: 'condition',
//       label: 'Condition',
//       width: 95,
//       render: (r) => (
//         <Badge tone={r.condition === 'Damaged' ? 'danger' : r.condition === 'Fair' ? 'warning' : 'info'}>
//           {r.condition || 'Good'}
//         </Badge>
//       ),
//     },
//     {
//       key: 'actions',
//       label: 'Action',
//       width: 70,
//       render: (r) => (
//         <button
//           className="icon-btn"
//           title="View full details"
//           onClick={() => setSelectedAsset(r)}
//         >
//           <Eye size={16} />
//         </button>
//       ),
//     },
//   ];

//   const vendorColumns = [
//     {
//       key: 'id',
//       label: 'Vendor ID',
//       width: 110,
//       render: (r) => <span className="mono-cell">{r.id}</span>,
//     },
//     {
//       key: 'name',
//       label: 'Vendor Name',
//       render: (r) => <b>{r.name}</b>,
//     },
//     {
//       key: 'categories',
//       label: 'Supplies',
//       render: (r) => (
//         <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
//           {(r.categories || []).map((cat) => (
//             <span key={cat} className="tag-pill">{cat}</span>
//           ))}
//         </div>
//       ),
//     },
//     {
//       key: 'contactPerson',
//       label: 'Contact Person',
//       render: (r) => r.contactPerson || '—',
//     },
//     {
//       key: 'email',
//       label: 'Email',
//       render: (r) => (r.email ? <a className="link-cell" href={`mailto:${r.email}`}>{r.email}</a> : '—'),
//     },
//     {
//       key: 'phone',
//       label: 'Phone',
//       render: (r) => r.phone || '—',
//     },
//     {
//       key: 'rating',
//       label: 'Rating',
//       render: (r) => <span className="rating-cell">★ {r.rating}</span>,
//     },
//     {
//       key: 'status',
//       label: 'Status',
//       render: (r) => <Badge tone={r.status === 'Active' ? 'success' : 'muted'}>{r.status}</Badge>,
//     },
//   ];

//   return (
//     <div className="page">
//       <div className="page-head">
//         <div>
//           <h1>Dashboard</h1>
//           <p className="page-sub">Live snapshot of your IT asset estate across all offices.</p>
//         </div>
//       </div>

//       <div className="stat-grid">
//         <StatCard
//           icon={Boxes}
//           label="Total Assets"
//           value={stats.total}
//           hint={`Worth ₹ ${(stats.totalValue / 100000).toFixed(1)} L`}
//           tone="primary"
//           active={activeTab === 'total'}
//           onClick={() => handleTabSelect('total')}
//         />
//         <StatCard
//           icon={PackageCheck}
//           label="Assigned"
//           value={stats.assigned}
//           hint={`${((stats.assigned / stats.total) * 100).toFixed(0)}% utilization`}
//           tone="success"
//           active={activeTab === 'assigned'}
//           onClick={() => handleTabSelect('assigned')}
//         />
//         <StatCard
//           icon={Boxes}
//           label="Available"
//           value={stats.inStock}
//           hint="Available to assign"
//           tone="info"
//           active={activeTab === 'available'}
//           onClick={() => handleTabSelect('available')}
//         />
//         <StatCard
//           icon={Wrench}
//           label="Under Repair"
//           value={stats.maintenance}
//           hint="Under repair asset"
//           tone="warning"
//           active={activeTab === 'under-repair'}
//           onClick={() => handleTabSelect('under-repair')}
//         />
//         <StatCard
//           icon={ShieldAlert}
//           label="Warranty Expiring"
//           value={stats.warrantyExpiring}
//           hint="Within 60 days"
//           tone="danger"
//           active={activeTab === 'warranty-expiring'}
//           onClick={() => handleTabSelect('warranty-expiring')}
//         />
//         <StatCard
//           icon={Truck}
//           label="Active Vendors"
//           value={vendors.length}
//           hint="Purchase Order"
//           tone="accent"
//           active={activeTab === 'vendors'}
//           onClick={() => handleTabSelect('vendors')}
//         />
//       </div>

//       <div className="panel">
//         <div className="panel-head">
//           <h3>Category-wise Overview</h3>
//           <button className="btn-link" onClick={() => navigate('/categories')}><Tag size={13} /> Manage Categories</button>
//         </div>
//         <div className="category-tile-grid">
//           {categoryCards.map((c) => {
//             const Icon = CATEGORY_ICONS[c.name] || Boxes;
//             const isCatActive = activeTab === `cat:${c.name}`;
//             return (
//               <button
//                 className={`category-tile ${isCatActive ? 'is-active' : ''}`}
//                 key={c.id}
//                 onClick={() => handleTabSelect(`cat:${c.name}`)}
//                 title={`View ${c.name} assets table`}
//               >
//                 <div className="category-tile-icon"><Icon size={18} /></div>
//                 <div className="category-tile-value">{c.count}</div>
//                 <div className="category-tile-label">{c.name}</div>
//               </button>
//             );
//           })}
//         </div>
//       </div>

//       {/* DASHBOARD TAB DATA TABLE */}
//       {activeTab && (
//         <div className="panel dashboard-table-panel" ref={tableRef}>
//           <div className="panel-head" style={{ alignItems: 'flex-start' }}>
//             <div>
//               <h3 style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800 }}>
//                 <span>{tableData.title}</span>
//                 <span className="pill pill-info" style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: '#eff6ff', color: '#2563eb', fontWeight: 700 }}>
//                   {tableData.rows.length} {tableData.isVendor ? 'Vendors' : 'Assets'}
//                 </span>
//               </h3>
//               <p className="muted-text small" style={{ marginTop: '4px', color: '#64748b', fontSize: '13.5px' }}>{tableData.subtitle}</p>
//             </div>
//             <button
//               className="close-table-btn"
//               onClick={() => setActiveTab(null)}
//               title="Close Table"
//             >
//               <X size={15} /> Close Table
//             </button>
//           </div>

//           {tableData.isVendor ? (
//             <DataTable
//               rows={tableData.rows}
//               columns={vendorColumns}
//               searchKeys={['id', 'name', 'contactPerson', 'email', 'city']}
//               searchPlaceholder="Search vendors by name, contact, email…"
//               exportFilename={tableData.filename}
//               exportSheetName={tableData.sheetName}
//               pageSize={10}
//               exportMapper={(rows) =>
//                 rows.map((r) => ({
//                   'Vendor ID': r.id,
//                   Name: r.name,
//                   Supplies: (r.categories || []).join(', '),
//                   'Contact Person': r.contactPerson,
//                   Email: r.email,
//                   Phone: r.phone,
//                   Rating: r.rating,
//                   Status: r.status,
//                 }))
//               }
//             />
//           ) : (
//             <DataTable
//               rows={tableData.rows}
//               columns={assetColumns}
//               searchKeys={[
//                 'id',
//                 'item',
//                 'serialNumber',
//                 'assignedToName',
//                 'configSummary',
//                 'category',
//                 'location',
//                 'vendorName',
//               ]}
//               searchPlaceholder={`Search ${tableData.title.toLowerCase()}…`}
//               exportFilename={tableData.filename}
//               exportSheetName={tableData.sheetName}
//               pageSize={10}
//               exportMapper={(rows) =>
//                 rows.map((r) => {
//                   const itemVal =
//                     r.item ||
//                     (typeof r.configuration === 'object' && r.configuration?.brandModel
//                       ? r.configuration.brandModel
//                       : r.category);
//                   const configText =
//                     typeof r.configuration === 'string' && r.configuration.trim()
//                       ? r.configuration
//                       : typeof r.configSummary === 'string' && r.configSummary.trim()
//                         ? r.configSummary
//                         : r.configuration && typeof r.configuration === 'object'
//                           ? Object.entries(r.configuration)
//                               .filter(([k]) => k !== 'brandModel')
//                               .map(([k, v]) => `${k}: ${v}`)
//                               .join(', ')
//                           : '';
//                   return {
//                     'Asset ID': cleanAssetId(r.id),
//                     Item: itemVal || '',
//                     Category: r.category || '',
//                     'Serial Number': r.serialNumber || '',
//                     Configuration: configText,
//                     Status: r.status || '',
//                     'Assigned To': r.assignedToName || 'Unassigned',
//                     Department: r.assignedDept || '',
//                     Location: r.location || '',
//                     Vendor: r.vendorName || '',
//                     'Purchase Cost (₹)': r.unitCost ? Number(r.unitCost) : 0,
//                     'Purchase Date': r.purchaseDate || '',
//                     'Warranty Expiry': r.warrantyExpiry || '',
//                     Condition: r.condition || '',
//                   };
//                 })
//               }
//             />
//           )}
//         </div>
//       )}

//       {selectedAsset && (
//         <AssetDetailDrawer
//           asset={selectedAsset}
//           onClose={() => setSelectedAsset(null)}
//         />
//       )}

//       <div className="dash-grid">
//         <div className="panel">
//           <div className="panel-head">
//             <h3>Assets by Category</h3>
//             <button className="btn-link" onClick={() => handleTabSelect('total')}>View all <ArrowUpRight size={14} /></button>
//           </div>
//           <div className="bar-chart">
//             {byCategory.map(([cat, count]) => (
//               <div
//                 className="bar-row bar-row-clickable"
//                 key={cat}
//                 onClick={() => handleTabSelect(`cat:${cat}`)}
//                 style={{ cursor: 'pointer' }}
//                 title={`View ${cat} assets`}
//               >
//                 <span className="bar-label">{cat}</span>
//                 <div className="bar-track">
//                   <div className="bar-fill" style={{ width: `${(count / maxCategory) * 100}%` }} />
//                 </div>
//                 <span className="bar-value">{count}</span>
//               </div>
//             ))}
//           </div>
//         </div>

//         <div className="panel">
//           <div className="panel-head">
//             <h3>Warranty Expiring Soon</h3>
//             <button className="btn-link" onClick={() => handleTabSelect('warranty-expiring')}>View all <ArrowUpRight size={14} /></button>
//           </div>
//           {expiringSoon.length === 0 && <div className="empty-cell">Nothing expiring in the next 60 days.</div>}
//           <ul className="mini-list">
//             {expiringSoon.map((a) => (
//               <li key={a.id}>
//                 <div>
//                   <div className="mini-list-title">{a.id} <span className="muted-text">· {a.category}</span></div>
//                   <div className="mini-list-sub">{a.vendorName}</div>
//                 </div>
//                 <span className={`pill ${a.days <= 15 ? 'pill-danger' : 'pill-warning'}`}>{a.days}d left</span>
//               </li>
//             ))}
//           </ul>
//         </div>

//         <div className="panel">
//           <div className="panel-head">
//             <h3>Open Maintenance Tickets</h3>
//             <button className="btn-link" onClick={() => handleTabSelect('under-repair')}>View all <ArrowUpRight size={14} /></button>
//           </div>
//           {openTickets.length === 0 && <div className="empty-cell">No open tickets. All clear.</div>}
//           <ul className="mini-list">
//             {openTickets.map((m) => (
//               <li key={m.id}>
//                 <div>
//                   <div className="mini-list-title">{m.assetId} <span className="muted-text">· {m.issueType}</span></div>
//                   <div className="mini-list-sub">Opened {m.openedOn}</div>
//                 </div>
//                 <span className="pill pill-info">{m.status}</span>
//               </li>
//             ))}
//           </ul>
//         </div>

//         <div className="panel">
//           <div className="panel-head">
//             <h3>Recent Activity</h3>
//             <span className="muted-text small"><Clock size={13} /> live feed</span>
//           </div>
//           <ul className="activity-list">
//             {activityLog.slice(0, 6).map((a) => (
//               <li key={a.id}>
//                 <span className="activity-dot" />
//                 <div>
//                   <div className="activity-text">{a.text}</div>
//                   <div className="activity-time">{new Date(a.ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
//                 </div>
//               </li>
//             ))}
//           </ul>
//         </div>
//       </div>

//       <div className="panel">
//         <div className="panel-head">
//           <h3>Workforce Coverage</h3>
//         </div>
//         <div className="coverage-row">
//           <div className="coverage-stat">
//             <Users size={16} />
//             <div>
//               <div className="stat-value" style={{ fontSize: 22 }}>{employees.length}</div>
//               <div className="stat-label">Employees on record</div>
//             </div>
//           </div>
//           <div className="coverage-stat">
//             <PackageCheck size={16} />
//             <div>
//               <div className="stat-value" style={{ fontSize: 22 }}>{(stats.assigned / employees.length).toFixed(1)}</div>
//               <div className="stat-label">Avg. assets / employee</div>
//             </div>
//           </div>
//           <div className="coverage-stat">
//             <Truck size={16} />
//             <div>
//               <div className="stat-value" style={{ fontSize: 22 }}>{vendors.length}</div>
//               <div className="stat-label">Vendors onboarded</div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
 import { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes, PackageCheck, Wrench, ShieldAlert, Truck, Users, ArrowUpRight, Clock,
  Laptop, Smartphone, Monitor, Server, Network, Printer, Mouse, AppWindow, Tag,
  Eye, X, Code2, CheckCircle2, AlertTriangle, IndianRupee,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import Badge from '../components/Badge';
import AssetDetailDrawer from '../components/AssetDetailDrawer';
import { cleanAssetId } from '../utils/idGenerator';

const CATEGORY_ICONS = {
  Laptop, Desktop: Laptop, Monitor, Server, Networking: Network, Mobile: Smartphone,
  Printer, Peripheral: Mouse, Software: AppWindow,
};

function daysUntil(dateStr) {
  if (!dateStr) return 0;
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
}

export default function Dashboard() {
  const { assets, vendors, employees, categories, maintenanceRecords, activityLog, inventoryBatches, softwareList } = useData();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const tableRef = useRef(null);

  function handleTabSelect(key) {
    setActiveTab((prev) => {
      const next = prev === key ? null : key;
      if (next) {
        setTimeout(() => {
          tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      }
      return next;
    });
  }

  const stats = useMemo(() => {
    const total = assets.length;
    const assigned = assets.filter((a) => a.status === 'Assigned').length;
    const inStock = assets.filter((a) => a.status === 'Available').length;
    const maintenance = assets.filter((a) => a.status === 'Under Repair').length;
    const retired = assets.filter((a) => a.status === 'Retired').length;
    const warrantyExpiring = assets.filter((a) => {
      const d = daysUntil(a.warrantyExpiry);
      return d >= 0 && d <= 60 && !['Retired','Disposed','Lost'].includes(a.status);
    }).length;
    const totalValue = assets.reduce((sum, a) => sum + Number(a.unitCost || 0), 0);
    return { total, assigned, inStock, maintenance, retired, warrantyExpiring, totalValue };
  }, [assets]);

  const softwareMetrics = useMemo(() => {
    const total = softwareList.length;
    const active = softwareList.filter((s) => s.status === 'Active').length;

    const today = new Date();
    const expiringSoon = softwareList.filter((s) => {
      if (!s.nextRenewalDate && !s.expiryDate) return false;
      const targetDate = new Date(s.nextRenewalDate || s.expiryDate);
      const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
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

  const byCategory = useMemo(() => {
    const map = {};
    assets.forEach((a) => {
      if ((a.category || '').toLowerCase() !== 'software') {
        map[a.category] = (map[a.category] || 0) + 1;
      }
    });
    map['Software'] = softwareList.length;
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [assets, softwareList]);
  const maxCategory = Math.max(...byCategory.map(([, v]) => v), 1);

  const categoryCards = useMemo(() => {
    const countMap = Object.fromEntries(byCategory);
    return categories
      .filter((c) => c.status === 'Active')
      .map((c) => {
        if (c.name.toLowerCase() === 'software') {
          return { ...c, count: softwareList.length };
        }
        return { ...c, count: countMap[c.name] || 0 };
      })
      .sort((a, b) => b.count - a.count);
  }, [categories, byCategory, softwareList]);

  const openTickets = maintenanceRecords.filter((m) => m.status !== 'Closed').slice(0, 5);
  const expiringSoon = assets
    .filter((a) => !['Retired','Disposed','Lost'].includes(a.status))
    .map((a) => ({ ...a, days: daysUntil(a.warrantyExpiry) }))
    .filter((a) => a.days >= 0 && a.days <= 60)
    .sort((a, b) => a.days - b.days)
    .slice(0, 5);

  // Determine active table data and metadata
  const tableData = useMemo(() => {
    if (!activeTab) return { rows: [], title: '', subtitle: '', filename: 'export', isVendor: false };

    if (activeTab === 'vendors') {
      return {
        rows: vendors,
        title: 'Active Vendors',
        subtitle: 'Complete list of onboarded suppliers and procurement vendors.',
        filename: 'Dashboard_Active_Vendors',
        sheetName: 'Vendors',
        isVendor: true,
      };
    }

    if (activeTab === 'total') {
      return {
        rows: assets,
        title: 'Total Assets',
        subtitle: 'Showing all assets and complete specifications across your IT estate.',
        filename: 'Dashboard_Total_Assets',
        sheetName: 'All Assets',
        isVendor: false,
      };
    }

    if (activeTab === 'assigned') {
      return {
        rows: assets.filter((a) => a.status === 'Assigned'),
        title: 'Assigned Assets',
        subtitle: 'Showing all assets currently issued to employees across all offices.',
        filename: 'Dashboard_Assigned_Assets',
        sheetName: 'Assigned Assets',
        isVendor: false,
      };
    }

    if (activeTab === 'available') {
      return {
        rows: assets.filter((a) => a.status === 'Available' || a.status === 'In Stock'),
        title: 'Available Assets',
        subtitle: 'Showing all in-stock assets available for immediate deployment.',
        filename: 'Dashboard_Available_Assets',
        sheetName: 'Available Assets',
        isVendor: false,
      };
    }

    if (activeTab === 'under-repair') {
      return {
        rows: assets.filter((a) => a.status === 'Under Repair'),
        title: 'Under Repair Assets',
        subtitle: 'Showing all assets currently undergoing maintenance or ticket repair.',
        filename: 'Dashboard_Under_Repair_Assets',
        sheetName: 'Under Repair',
        isVendor: false,
      };
    }

    if (activeTab === 'warranty-expiring') {
      return {
        rows: assets.filter((a) => {
          const d = daysUntil(a.warrantyExpiry);
          return d >= 0 && d <= 60 && !['Retired', 'Disposed', 'Lost'].includes(a.status);
        }),
        title: 'Warranty Expiring Soon',
        subtitle: 'Showing assets with manufacturer warranty ending in the next 60 days.',
        filename: 'Dashboard_Warranty_Expiring_Assets',
        sheetName: 'Warranty Expiring',
        isVendor: false,
      };
    }

    if (activeTab === 'sw-total') {
      return {
        rows: softwareList,
        title: 'Total Software Subscriptions',
        subtitle: 'Showing all software licenses, SaaS applications, and accounts on record.',
        filename: 'Dashboard_Total_Software_Subscriptions',
        sheetName: 'All Subscriptions',
        isSoftware: true,
        isVendor: false,
      };
    }

    if (activeTab === 'sw-active') {
      return {
        rows: softwareList.filter((s) => s.status === 'Active'),
        title: 'Active Software Subscriptions',
        subtitle: 'Showing software licenses currently active and in use.',
        filename: 'Dashboard_Active_Software_Subscriptions',
        sheetName: 'Active Subscriptions',
        isSoftware: true,
        isVendor: false,
      };
    }

    if (activeTab === 'sw-expiring') {
      const today = new Date();
      return {
        rows: softwareList.filter((s) => {
          if (!s.nextRenewalDate && !s.expiryDate) return false;
          const targetDate = new Date(s.nextRenewalDate || s.expiryDate);
          const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
          return diffDays >= 0 && diffDays <= 7;
        }),
        title: 'Expiring / Due Soon Subscriptions (7 days)',
        subtitle: 'Showing software subscriptions due for renewal in the next 7 days.',
        filename: 'Dashboard_Expiring_Software_Subscriptions',
        sheetName: 'Expiring Subscriptions',
        isSoftware: true,
        isVendor: false,
      };
    }

    if (activeTab === 'sw-spend') {
      return {
        rows: softwareList,
        title: 'Software Monthly Spend Breakdown',
        subtitle: 'Showing all software subscriptions and recurring costs.',
        filename: 'Dashboard_Software_Monthly_Spend',
        sheetName: 'Monthly Spend',
        isSoftware: true,
        isVendor: false,
      };
    }

    if (activeTab.startsWith('cat:')) {
      const catName = activeTab.slice(4);
      if (catName.toLowerCase() === 'software') {
        return {
          rows: softwareList,
          title: 'Software Services & Subscriptions',
          subtitle: 'Showing all active software licenses and subscriptions.',
          filename: 'Dashboard_Software_Services',
          sheetName: 'Software Services',
          isSoftware: true,
          isVendor: false,
        };
      }
      return {
        rows: assets.filter((a) => (a.category || '').toLowerCase() === catName.toLowerCase()),
        title: `${catName} Assets`,
        subtitle: `Showing all ${catName} assets with full hardware and allocation details.`,
        filename: `Dashboard_${catName.replace(/\s+/g, '_')}_Assets`,
        sheetName: `${catName} Assets`,
        isVendor: false,
      };
    }

    return { rows: [], title: '', subtitle: '', filename: 'export', isVendor: false };
  }, [activeTab, assets, vendors, softwareList]);

  const softwareColumns = [
    {
      key: 'assetCode',
      label: 'Asset Code',
      width: 120,
      render: (r) => <span className="mono-cell"><b>{r.assetCode || r.id}</b></span>,
    },
    {
      key: 'serviceName',
      label: 'Service Name',
      width: 160,
      render: (r) => <b>{r.serviceName}</b>,
    },
    {
      key: 'category',
      label: 'Category',
      width: 110,
      render: (r) => <span className="tag-pill">{r.category}</span>,
    },
    {
      key: 'vendorName',
      label: 'Vendor',
      width: 130,
      render: (r) => <span>{r.vendorName || '—'}</span>,
    },
    {
      key: 'responsiblePersonName',
      label: 'Responsible Person',
      width: 150,
      render: (r) => <span>{r.responsiblePersonName}</span>,
    },
    {
      key: 'nextRenewalDate',
      label: 'Next Renewal',
      width: 125,
      render: (r) => <span>{r.nextRenewalDate || '—'}</span>,
    },
    {
      key: 'expiryDate',
      label: 'Expiry Date',
      width: 125,
      render: (r) => <span>{r.expiryDate || '—'}</span>,
    },
    {
      key: 'amount',
      label: 'Amount',
      width: 120,
      render: (r) => (
        <span className="mono-cell">
          <b>{r.currency || 'INR'} {Number(r.amount || 0).toLocaleString('en-IN')}</b>
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: 100,
      render: (r) => (
        <Badge tone={r.status === 'Active' ? 'success' : r.status === 'Expiring Soon' ? 'warning' : 'neutral'}>
          {r.status}
        </Badge>
      ),
    },
  ];

  const assetColumns = [
    {
      key: 'id',
      label: 'Asset ID',
      width: 125,
      render: (r) => <span className="mono-cell">{cleanAssetId(r.id)}</span>,
    },
    {
      key: 'item',
      label: 'Item',
      width: 160,
      render: (r) => {
        const val =
          r.item ||
          (typeof r.configuration === 'object' && r.configuration?.brandModel
            ? r.configuration.brandModel
            : r.category);
        return <b>{val || '—'}</b>;
      },
    },
    {
      key: 'category',
      label: 'Category',
      width: 110,
      render: (r) => <span className="tag-pill">{r.category || '—'}</span>,
    },
    {
      key: 'serialNumber',
      label: 'Serial Number',
      width: 130,
      render: (r) => <span className="mono-cell">{r.serialNumber || '—'}</span>,
    },
    {
      key: 'configSummary',
      label: 'Configuration',
      width: 220,
      render: (r) => {
        const configText =
          typeof r.configuration === 'string' && r.configuration.trim()
            ? r.configuration
            : typeof r.configSummary === 'string' && r.configSummary.trim()
              ? r.configSummary
              : r.configuration && typeof r.configuration === 'object'
                ? Object.entries(r.configuration)
                    .filter(([k]) => k !== 'brandModel')
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(', ')
                : '—';
        return <span className="config-cell">{configText}</span>;
      },
    },
    {
      key: 'status',
      label: 'Status',
      width: 115,
      render: (r) => (
        <Badge
          tone={
            r.status === 'Available' || r.status === 'In Stock'
              ? 'success'
              : r.status === 'Assigned'
                ? 'primary'
                : r.status === 'Under Repair'
                  ? 'warning'
                  : 'danger'
          }
        >
          {r.status || 'Available'}
        </Badge>
      ),
    },
    {
      key: 'assignedToName',
      label: 'Assigned To',
      width: 150,
      render: (r) =>
        r.assignedToName ? (
          <div>
            <div style={{ fontWeight: 600 }}>{r.assignedToName}</div>
            {r.assignedDept && <div className="muted-text small">{r.assignedDept}</div>}
          </div>
        ) : (
          <span className="muted-text">Unassigned</span>
        ),
    },
    {
      key: 'location',
      label: 'Location',
      width: 135,
      render: (r) => <span>{r.location || '—'}</span>,
    },
    {
      key: 'vendorName',
      label: 'Vendor',
      width: 135,
      render: (r) => <span>{r.vendorName || '—'}</span>,
    },
    {
      key: 'unitCost',
      label: 'Cost',
      width: 105,
      render: (r) => (
        <span className="mono-cell">
          {r.unitCost !== undefined && r.unitCost !== null && r.unitCost !== ''
            ? `₹ ${Number(r.unitCost).toLocaleString('en-IN')}`
            : '—'}
        </span>
      ),
    },
    {
      key: 'warrantyExpiry',
      label: 'Warranty Expiry',
      width: 130,
      render: (r) => {
        if (!r.warrantyExpiry) return <span className="muted-text">—</span>;
        const days = daysUntil(r.warrantyExpiry);
        return (
          <div>
            <span>{r.warrantyExpiry}</span>
            {days >= 0 && days <= 60 && (
              <span className="pill pill-warning" style={{ fontSize: 10, marginLeft: 4, padding: '1px 4px' }}>
                {days}d left
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'condition',
      label: 'Condition',
      width: 95,
      render: (r) => (
        <Badge tone={r.condition === 'Damaged' ? 'danger' : r.condition === 'Fair' ? 'warning' : 'info'}>
          {r.condition || 'Good'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Action',
      width: 70,
      render: (r) => (
        <button
          className="icon-btn"
          title="View full details"
          onClick={() => setSelectedAsset(r)}
        >
          <Eye size={16} />
        </button>
      ),
    },
  ];

  const vendorColumns = [
    {
      key: 'id',
      label: 'Vendor ID',
      width: 110,
      render: (r) => <span className="mono-cell">{r.id}</span>,
    },
    {
      key: 'name',
      label: 'Vendor Name',
      render: (r) => <b>{r.name}</b>,
    },
    {
      key: 'categories',
      label: 'Supplies',
      render: (r) => (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {(r.categories || []).map((cat) => (
            <span key={cat} className="tag-pill">{cat}</span>
          ))}
        </div>
      ),
    },
    {
      key: 'contactPerson',
      label: 'Contact Person',
      render: (r) => r.contactPerson || '—',
    },
    {
      key: 'email',
      label: 'Email',
      render: (r) => (r.email ? <a className="link-cell" href={`mailto:${r.email}`}>{r.email}</a> : '—'),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (r) => r.phone || '—',
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (r) => <span className="rating-cell">★ {r.rating}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <Badge tone={r.status === 'Active' ? 'success' : 'muted'}>{r.status}</Badge>,
    },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="page-sub">Live snapshot of your IT asset estate across all offices.</p>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard
          icon={Boxes}
          label="Total Assets"
          value={stats.total}
          hint={`Worth ₹ ${(stats.totalValue / 100000).toFixed(1)} L`}
          tone="primary"
          active={activeTab === 'total'}
          onClick={() => handleTabSelect('total')}
        />
        <StatCard
          icon={PackageCheck}
          label="Assigned"
          value={stats.assigned}
          hint={`${((stats.assigned / stats.total) * 100).toFixed(0)}% utilization`}
          tone="success"
          active={activeTab === 'assigned'}
          onClick={() => handleTabSelect('assigned')}
        />
        <StatCard
          icon={Boxes}
          label="Available"
          value={stats.inStock}
          hint="Available to assign"
          tone="info"
          active={activeTab === 'available'}
          onClick={() => handleTabSelect('available')}
        />
        <StatCard
          icon={Wrench}
          label="Under Repair"
          value={stats.maintenance}
          hint="Under repair asset"
          tone="warning"
          active={activeTab === 'under-repair'}
          onClick={() => handleTabSelect('under-repair')}
        />
        <StatCard
          icon={ShieldAlert}
          label="Warranty Expiring"
          value={stats.warrantyExpiring}
          hint="Within 60 days"
          tone="danger"
          active={activeTab === 'warranty-expiring'}
          onClick={() => handleTabSelect('warranty-expiring')}
        />
        <StatCard
          icon={Truck}
          label="Active Vendors"
          value={vendors.length}
          hint="Purchase Order"
          tone="accent"
          active={activeTab === 'vendors'}
          onClick={() => handleTabSelect('vendors')}
        />
      </div>

      {/* Software Services Summary Cards */}
      <div className="report-summary-cards" style={{ marginBottom: '24px' }}>
        <div
          className={`report-summary-card is-clickable ${activeTab === 'sw-total' ? 'is-active' : ''}`}
          onClick={() => handleTabSelect('sw-total')}
          title="Click to view total software subscriptions"
        >
          <div className="report-summary-card-icon tone-purple"><Code2 size={20} /></div>
          <div className="report-summary-card-body">
            <div className="report-summary-card-val">{softwareMetrics.total}</div>
            <div className="report-summary-card-title">Total Subscriptions</div>
          </div>
        </div>

        <div
          className={`report-summary-card is-clickable ${activeTab === 'sw-active' ? 'is-active' : ''}`}
          onClick={() => handleTabSelect('sw-active')}
          title="Click to view active software subscriptions"
        >
          <div className="report-summary-card-icon tone-green"><CheckCircle2 size={20} /></div>
          <div className="report-summary-card-body">
            <div className="report-summary-card-val">{softwareMetrics.active}</div>
            <div className="report-summary-card-title">Active Subscriptions</div>
          </div>
        </div>

        <div
          className={`report-summary-card is-clickable ${activeTab === 'sw-expiring' ? 'is-active' : ''}`}
          onClick={() => handleTabSelect('sw-expiring')}
          title="Click to view expiring software subscriptions"
        >
          <div className="report-summary-card-icon tone-orange"><AlertTriangle size={20} /></div>
          <div className="report-summary-card-body">
            <div className="report-summary-card-val">{softwareMetrics.expiringSoon}</div>
            <div className="report-summary-card-title">Expiring / Due Soon (7 days)</div>
          </div>
        </div>

        <div
          className={`report-summary-card is-clickable ${activeTab === 'sw-spend' ? 'is-active' : ''}`}
          onClick={() => handleTabSelect('sw-spend')}
          title="Click to view software monthly spend breakdown"
        >
          <div className="report-summary-card-icon tone-blue"><IndianRupee size={20} /></div>
          <div className="report-summary-card-body">
            <div className="report-summary-card-val">₹ {Math.round(softwareMetrics.monthlySpend).toLocaleString('en-IN')}</div>
            <div className="report-summary-card-title">Est. Monthly Spend</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Category-wise Overview</h3>
          <button className="btn-link" onClick={() => navigate('/categories')}><Tag size={13} /> Manage Categories</button>
        </div>
        <div className="category-tile-grid">
          {categoryCards.map((c) => {
            const Icon = CATEGORY_ICONS[c.name] || Boxes;
            const isCatActive = activeTab === `cat:${c.name}`;
            return (
              <button
                className={`category-tile ${isCatActive ? 'is-active' : ''}`}
                key={c.id}
                onClick={() => handleTabSelect(`cat:${c.name}`)}
                title={`View ${c.name} assets table`}
              >
                <div className="category-tile-icon"><Icon size={18} /></div>
                <div className="category-tile-value">{c.count}</div>
                <div className="category-tile-label">{c.name}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* DASHBOARD TAB DATA TABLE */}
      {activeTab && (
        <div className="panel dashboard-table-panel" ref={tableRef}>
          <div className="panel-head" style={{ alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{tableData.title}</span>
                <span className="pill pill-info" style={{ fontSize: '11px', padding: '2px 8px' }}>
                  {tableData.rows.length} {tableData.isVendor ? 'Vendors' : tableData.isSoftware ? 'Services' : 'Assets'}
                </span>
              </h3>
              <p className="muted-text small" style={{ marginTop: '3px' }}>{tableData.subtitle}</p>
            </div>
            <button
              className="btn btn-ghost"
              style={{ padding: '6px 12px', fontSize: '12.5px' }}
              onClick={() => setActiveTab(null)}
              title="Close Table"
            >
              <X size={15} /> Close Table
            </button>
          </div>

          {tableData.isVendor ? (
            <DataTable
              rows={tableData.rows}
              columns={vendorColumns}
              searchKeys={['id', 'name', 'contactPerson', 'email', 'city']}
              searchPlaceholder="Search vendors by name, contact, email…"
              exportFilename={tableData.filename}
              exportSheetName={tableData.sheetName}
              pageSize={10}
              exportMapper={(rows) =>
                rows.map((r) => ({
                  'Vendor ID': r.id,
                  Name: r.name,
                  Supplies: (r.categories || []).join(', '),
                  'Contact Person': r.contactPerson,
                  Email: r.email,
                  Phone: r.phone,
                  Rating: r.rating,
                  Status: r.status,
                }))
              }
            />
          ) : tableData.isSoftware ? (
            <DataTable
              rows={tableData.rows}
              columns={softwareColumns}
              searchKeys={['assetCode', 'id', 'serviceName', 'category', 'vendorName', 'responsiblePersonName']}
              searchPlaceholder="Search software services by code, name, vendor, owner…"
              exportFilename={tableData.filename}
              exportSheetName={tableData.sheetName}
              pageSize={10}
              exportMapper={(rows) =>
                rows.map((r) => ({
                  'Asset Code': r.assetCode || r.id,
                  'Service Name': r.serviceName,
                  Category: r.category,
                  Vendor: r.vendorName || '',
                  'Responsible Person': r.responsiblePersonName,
                  'Seats Count': r.seatsCount || '',
                  'Next Renewal': r.nextRenewalDate,
                  Expiry: r.expiryDate,
                  Currency: r.currency || 'INR',
                  Amount: r.amount,
                  Billing: r.billingType,
                  Status: r.status,
                }))
              }
            />
          ) : (
            <DataTable
              rows={tableData.rows}
              columns={assetColumns}
              searchKeys={[
                'id',
                'item',
                'serialNumber',
                'assignedToName',
                'configSummary',
                'category',
                'location',
                'vendorName',
              ]}
              searchPlaceholder={`Search ${tableData.title.toLowerCase()}…`}
              exportFilename={tableData.filename}
              exportSheetName={tableData.sheetName}
              pageSize={10}
              exportMapper={(rows) =>
                rows.map((r) => {
                  const itemVal =
                    r.item ||
                    (typeof r.configuration === 'object' && r.configuration?.brandModel
                      ? r.configuration.brandModel
                      : r.category);
                  const configText =
                    typeof r.configuration === 'string' && r.configuration.trim()
                      ? r.configuration
                      : typeof r.configSummary === 'string' && r.configSummary.trim()
                        ? r.configSummary
                        : r.configuration && typeof r.configuration === 'object'
                          ? Object.entries(r.configuration)
                              .filter(([k]) => k !== 'brandModel')
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(', ')
                          : '';
                  return {
                    'Asset ID': cleanAssetId(r.id),
                    Item: itemVal || '',
                    Category: r.category || '',
                    'Serial Number': r.serialNumber || '',
                    Configuration: configText,
                    Status: r.status || '',
                    'Assigned To': r.assignedToName || 'Unassigned',
                    Department: r.assignedDept || '',
                    Location: r.location || '',
                    Vendor: r.vendorName || '',
                    'Purchase Cost (₹)': r.unitCost ? Number(r.unitCost) : 0,
                    'Purchase Date': r.purchaseDate || '',
                    'Warranty Expiry': r.warrantyExpiry || '',
                    Condition: r.condition || '',
                  };
                })
              }
            />
          )}
        </div>
      )}

      {selectedAsset && (
        <AssetDetailDrawer
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
        />
      )}

      <div className="dash-grid">
        <div className="panel">
          <div className="panel-head">
            <h3>Assets by Category</h3>
            <button className="btn-link" onClick={() => handleTabSelect('total')}>View all <ArrowUpRight size={14} /></button>
          </div>
          <div className="bar-chart">
            {byCategory.map(([cat, count]) => (
              <div
                className="bar-row bar-row-clickable"
                key={cat}
                onClick={() => handleTabSelect(`cat:${cat}`)}
                style={{ cursor: 'pointer' }}
                title={`View ${cat} assets`}
              >
                <span className="bar-label">{cat}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(count / maxCategory) * 100}%` }} />
                </div>
                <span className="bar-value">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>Warranty Expiring Soon</h3>
            <button className="btn-link" onClick={() => handleTabSelect('warranty-expiring')}>View all <ArrowUpRight size={14} /></button>
          </div>
          {expiringSoon.length === 0 && <div className="empty-cell">Nothing expiring in the next 60 days.</div>}
          <ul className="mini-list">
            {expiringSoon.map((a) => (
              <li key={a.id}>
                <div>
                  <div className="mini-list-title">{a.id} <span className="muted-text">· {a.category}</span></div>
                  <div className="mini-list-sub">{a.vendorName}</div>
                </div>
                <span className={`pill ${a.days <= 15 ? 'pill-danger' : 'pill-warning'}`}>{a.days}d left</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>Open Maintenance Tickets</h3>
            <button className="btn-link" onClick={() => handleTabSelect('under-repair')}>View all <ArrowUpRight size={14} /></button>
          </div>
          {openTickets.length === 0 && <div className="empty-cell">No open tickets. All clear.</div>}
          <ul className="mini-list">
            {openTickets.map((m) => (
              <li key={m.id}>
                <div>
                  <div className="mini-list-title">{m.assetId} <span className="muted-text">· {m.issueType}</span></div>
                  <div className="mini-list-sub">Opened {m.openedOn}</div>
                </div>
                <span className="pill pill-info">{m.status}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>Recent Activity</h3>
            <span className="muted-text small"><Clock size={13} /> live feed</span>
          </div>
          <ul className="activity-list">
            {activityLog.slice(0, 6).map((a) => (
              <li key={a.id}>
                <span className="activity-dot" />
                <div>
                  <div className="activity-text">{a.text}</div>
                  <div className="activity-time">{new Date(a.ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Workforce Coverage</h3>
        </div>
        <div className="coverage-row">
          <div className="coverage-stat">
            <Users size={16} />
            <div>
              <div className="stat-value" style={{ fontSize: 22 }}>{employees.length}</div>
              <div className="stat-label">Employees on record</div>
            </div>
          </div>
          <div className="coverage-stat">
            <PackageCheck size={16} />
            <div>
              <div className="stat-value" style={{ fontSize: 22 }}>{(stats.assigned / employees.length).toFixed(1)}</div>
              <div className="stat-label">Avg. assets / employee</div>
            </div>
          </div>
          <div className="coverage-stat">
            <Truck size={16} />
            <div>
              <div className="stat-value" style={{ fontSize: 22 }}>{vendors.length}</div>
              <div className="stat-label">Vendors onboarded</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
