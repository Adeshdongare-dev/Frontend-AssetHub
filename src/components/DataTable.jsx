import { useMemo, useState, Fragment } from 'react';
import { Search, Download, SlidersHorizontal, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { exportToExcel } from '../utils/exportExcel';

/**
 * columns: [{ key, label, render?(row), sortAccessor?(row) }]
 * filters: [{ key, label, options: [{value,label}], accessor?(row) => value }]
 * searchKeys: string[] fields to fuzzy match against
 * exportMapper: (rows) => rows shaped for excel
 */
export default function DataTable({
  rows,
  columns,
  filters = [],
  tableClassName = '',
  searchKeys = [],
  searchPlaceholder = 'Search…',
  exportMapper,
  exportFilename = 'export',
  exportSheetName = 'Data',
  pageSize = 10,
  pageSizeOptions = [5, 10, 15, 20],
  emptyLabel = 'No records match your search / filters.',
  toolbarExtra = null,
  onRowClick = null,
  isRowExpanded = null,
  renderSubRow = null,
  rowClassName = null,
}) {
  const [query, setQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({});
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize || 10);

  const filtered = useMemo(() => {
    let out = rows;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      out = out.filter((row) => searchKeys.some((k) => String(row[k] ?? '').toLowerCase().includes(q)));
    }
    filters.forEach((f) => {
      const val = activeFilters[f.key];
      if (val) {
        out = out.filter((row) => {
          const rowVal = f.accessor ? f.accessor(row) : row[f.key];
          return Array.isArray(rowVal) ? rowVal.includes(val) : rowVal === val;
        });
      }
    });
    return out;
  }, [rows, query, activeFilters, filters, searchKeys]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / currentPageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * currentPageSize, safePage * currentPageSize);

  function updateFilter(key, value) {
    setActiveFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function clearFilters() {
    setActiveFilters({});
    setQuery('');
    setPage(1);
  }

  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length;

  function handleExport() {
    const shaped = exportMapper ? exportMapper(filtered) : filtered;
    exportToExcel(shaped, exportFilename, exportSheetName);
  }

  return (
    <div className="data-table-wrap">
      <div className="table-toolbar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder={searchPlaceholder}
          />
          {query && <button className="clear-x" onClick={() => setQuery('')}><X size={14} /></button>}
        </div>

        {filters.length > 0 && (
          <button className={`btn btn-ghost ${showFilters ? 'is-active' : ''}`} onClick={() => setShowFilters((s) => !s)}>
            <SlidersHorizontal size={15} />
            Filters {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
          </button>
        )}

        <div className="toolbar-spacer" />
        {toolbarExtra}
        <button className="btn btn-primary" onClick={handleExport}>
          <Download size={15} /> Export to Excel
        </button>
      </div>

      {showFilters && filters.length > 0 && (
        <div className="filter-row">
          {filters.map((f) => (
            <div className="filter-field" key={f.key}>
              <label>{f.label}</label>
              <select value={activeFilters[f.key] || ''} onChange={(e) => updateFilter(f.key, e.target.value)}>
                <option value="">All</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          ))}
          {activeFilterCount > 0 && <button className="btn-link" onClick={clearFilters}>Clear all</button>}
        </div>
      )}

      <div className="table-scroll">
        <table className={`data-table ${tableClassName}`.trim()}>
          <thead>
            <tr>
              {columns.map((c, idx) => (
                <th key={c.key || c.accessor || c.header || idx} style={c.width ? { width: c.width } : undefined}>
                  {c.label || c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr><td colSpan={columns.length} className="empty-cell">{emptyLabel}</td></tr>
            )}
            {pageRows.map((row, i) => {
              const isExpanded = isRowExpanded ? isRowExpanded(row) : false;
              const rowClasses = [
                rowClassName ? rowClassName(row) : '',
                onRowClick ? 'clickable-row' : '',
                isExpanded ? 'is-expanded' : '',
              ].filter(Boolean).join(' ');

              return (
                <Fragment key={row.id || row._key || i}>
                  <tr
                    className={rowClasses || undefined}
                    onClick={(e) => onRowClick && onRowClick(row, e)}
                  >
                    {columns.map((c) => (
                      <td key={c.key} style={c.width ? { width: c.width } : undefined}>
                        {c.render ? c.render(row, { isExpanded, index: i, total: pageRows.length }) : row[c.key]}
                      </td>
                    ))}
                  </tr>
                  {isExpanded && renderSubRow && (
                    <tr className="child-class-row">
                      <td colSpan={columns.length} className="child-class-row-cell">
                        {renderSubRow(row)}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <span className="result-count">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
        <div className="table-footer-right">
          <div className="rows-per-page">
            <span>Rows per page:</span>
            <select
              aria-label="Rows per page"
              value={currentPageSize}
              onChange={(e) => {
                setCurrentPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {pageSizeOptions.map((sz) => (
                <option key={sz} value={sz}>{sz}</option>
              ))}
            </select>
          </div>
          {totalPages > 1 && (
            <div className="pagination">
              <button className="icon-btn" disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft size={16} /></button>
              <span>Page {safePage} of {totalPages}</span>
              <button className="icon-btn" disabled={safePage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}><ChevronRight size={16} /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
