import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutGrid, Boxes, PackagePlus, Truck, Users, BarChart3, LogOut, ChevronDown, Hexagon, Tag, Database, Code2, Monitor,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [assetsOpen, setAssetsOpen] = useState(true);
  const [masterOpen, setMasterOpen] = useState(true);

  const isAssetsActive = location.pathname.startsWith('/assets') || location.pathname.startsWith('/software-services');
  const isMasterActive = location.pathname.startsWith('/categories') || location.pathname.startsWith('/vendors');

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Hexagon size={20} strokeWidth={2.5} /></div>
          <div>
            <div className="brand-name">Asset Management</div>
            <div className="brand-sub">IT Asset Management</div>
          </div>
        </div>

        <nav className="side-nav">
          <NavLink to="/" end className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            <LayoutGrid size={18} strokeWidth={2} />
            <span>Dashboard</span>
          </NavLink>

          {/* Assets Group with Hardware Assets and Software Services inside */}
          <div className="side-group">
            <button
              type="button"
              className={`side-link side-group-toggle ${isAssetsActive ? 'active' : ''}`}
              onClick={() => setAssetsOpen((o) => !o)}
            >
              <div className="side-group-header">
                <Boxes size={18} strokeWidth={2} />
                <span>Assets</span>
              </div>
              <ChevronDown size={14} className={`side-group-chevron ${assetsOpen ? 'open' : ''}`} />
            </button>

            {assetsOpen && (
              <div className="side-sub-nav">
                <NavLink
                  to="/assets"
                  className={({ isActive }) => `side-sub-link ${isActive ? 'active' : ''}`}
                >
                  <Monitor size={15} strokeWidth={2} />
                  <span>Hardware Assets</span>
                </NavLink>

                <NavLink
                  to="/software-services"
                  className={({ isActive }) => `side-sub-link ${isActive ? 'active' : ''}`}
                >
                  <Code2 size={15} strokeWidth={2} />
                  <span>Software Services</span>
                </NavLink>
              </div>
            )}
          </div>

          <NavLink to="/inventory" className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            <PackagePlus size={18} strokeWidth={2} />
            <span>Inventory</span>
          </NavLink>

          {/* Master Group with Categories and Vendors inside */}
          <div className="side-group">
            <button
              type="button"
              className={`side-link side-group-toggle ${isMasterActive ? 'active' : ''}`}
              onClick={() => setMasterOpen((o) => !o)}
            >
              <div className="side-group-header">
                <Database size={18} strokeWidth={2} />
                <span>Master</span>
              </div>
              <ChevronDown size={14} className={`side-group-chevron ${masterOpen ? 'open' : ''}`} />
            </button>

            {masterOpen && (
              <div className="side-sub-nav">
                <NavLink
                  to="/categories"
                  className={({ isActive }) => `side-sub-link ${isActive ? 'active' : ''}`}
                >
                  <Tag size={15} strokeWidth={2} />
                  <span>Categories</span>
                </NavLink>

                <NavLink
                  to="/vendors"
                  className={({ isActive }) => `side-sub-link ${isActive ? 'active' : ''}`}
                >
                  <Truck size={15} strokeWidth={2} />
                  <span>Vendors</span>
                </NavLink>
              </div>
            )}
          </div>

          <NavLink to="/employees" className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            <Users size={18} strokeWidth={2} />
            <span>Employees</span>
          </NavLink>

          <NavLink to="/reports" className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            <BarChart3 size={18} strokeWidth={2} />
            <span>Reports</span>
          </NavLink>
        </nav>

        
      </aside>

      <div className="main-col">
        <header className="topbar">
          <div className="topbar-title">IT Asset &amp; Infrastructure Management</div>
          <div className="topbar-right">
            <div className="user-menu">
              <button className="user-chip" onClick={() => setMenuOpen((o) => !o)}>
                <span className="avatar">{user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2)}</span>
                <span className="user-info">
                  <span className="user-name">{user?.name}</span>
                  {/* <span className="user-role">{user?.role}</span> */}
                </span>
                <ChevronDown size={15} />
              </button>
              {menuOpen && (
                <div className="user-dropdown" onMouseLeave={() => setMenuOpen(false)}>
                  <div className="dropdown-item-static">
                    <div className="user-name">{user?.email}</div>
                  </div>
                  <button className="dropdown-item" onClick={handleLogout}>
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
