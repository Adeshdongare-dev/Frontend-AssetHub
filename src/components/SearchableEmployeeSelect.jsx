import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export default function SearchableEmployeeSelect({
  employees = [],
  value,
  onChange,
  placeholder = "Search employee by name, ID, or dept..."
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Include active or all employees if status field varies
  const activeEmployees = employees.length > 0
    ? (employees.filter((e) => !e.status || e.status === "Active" || e.status === "active").length > 0
        ? employees.filter((e) => !e.status || e.status === "Active" || e.status === "active")
        : employees)
    : [];

  const selectedEmp = activeEmployees.find((e) => String(e.id) === String(value));

  const displayValue = isOpen
    ? query
    : (selectedEmp ? `${selectedEmp.name} · ${selectedEmp.department} (${selectedEmp.id})` : "");

  const filteredEmployees = activeEmployees.filter((e) => {
    const q = (isOpen ? query : "").toLowerCase().trim();
    if (!q) return true;
    const nameMatch = (e.name || "").toLowerCase().includes(q);
    const idMatch = (e.id || "").toLowerCase().includes(q);
    const deptMatch = (e.department || "").toLowerCase().includes(q);
    const desigMatch = (e.designation || "").toLowerCase().includes(q);
    return nameMatch || idMatch || deptMatch || desigMatch;
  });

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (empId) => {
    onChange(empId);
    setIsOpen(false);
    setQuery("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
    setQuery("");
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div className="searchable-select-container" ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div
        className={`searchable-input-wrapper ${isOpen ? 'active' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: 'var(--card-bg, #ffffff)',
          border: isOpen ? '1.5px solid var(--primary, #6366f1)' : '1px solid var(--border, #cbd5e1)',
          borderRadius: '8px',
          boxShadow: isOpen ? '0 0 0 3px rgba(99, 102, 241, 0.15)' : 'none',
          transition: 'all 0.2s ease',
          minHeight: '42px',
        }}
      >
        <Search size={16} style={{ color: 'var(--text-muted, #94a3b8)', flexShrink: 0 }} />
        
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setQuery("");
          }}
          placeholder={placeholder}
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: '0.9rem',
            color: 'var(--text-primary, #0f172a)',
            fontWeight: selectedEmp && !isOpen ? 600 : 400,
          }}
        />

        {value && (
          <button
            type="button"
            onClick={handleClear}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px', display: 'flex' }}
            title="Clear selection"
          >
            <X size={15} style={{ color: 'var(--text-muted, #94a3b8)' }} />
          </button>
        )}

        <ChevronDown
          size={16}
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen && inputRef.current) inputRef.current.focus();
          }}
          style={{
            color: 'var(--text-muted, #94a3b8)',
            cursor: 'pointer',
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease',
            flexShrink: 0,
          }}
        />
      </div>

      {isOpen && (
        <div
          className="searchable-select-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 99999,
            background: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--border, #cbd5e1)',
            borderRadius: '8px',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.2)',
            maxHeight: '220px',
            overflowY: 'auto',
            padding: '4px',
          }}
        >
          {filteredEmployees.length === 0 ? (
            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)', fontSize: '0.875rem' }}>
              No matching employees found
            </div>
          ) : (
            filteredEmployees.map((e) => {
              const isSelected = String(e.id) === String(value);
              return (
                <div
                  key={e.id}
                  onMouseDown={(evt) => {
                    evt.preventDefault();
                    handleSelect(e.id);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(evt) => {
                    if (!isSelected) evt.currentTarget.style.background = 'var(--bg-hover, #f1f5f9)';
                  }}
                  onMouseLeave={(evt) => {
                    evt.currentTarget.style.background = isSelected ? 'rgba(99, 102, 241, 0.08)' : 'transparent';
                  }}
                >
                  <div>
                    <div style={{ fontWeight: isSelected ? 600 : 500, color: 'var(--text-primary, #1e293b)', fontSize: '0.9rem' }}>
                      {e.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', display: 'flex', gap: '6px', marginTop: '2px', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--primary, #4f46e5)' }}>{e.id}</span>
                      <span>·</span>
                      <span>{e.department}</span>
                      {e.designation && (
                        <>
                          <span>·</span>
                          <span>{e.designation}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {isSelected && <Check size={16} style={{ color: 'var(--primary, #6366f1)' }} />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
