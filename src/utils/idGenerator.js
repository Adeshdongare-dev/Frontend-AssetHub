// Central sequence store so every auto-generated code is unique & incremental.
// In the real .NET backend this responsibility moves to a DB sequence / identity column.

const SEQ_KEY = 'assethub_sequences_v1';

function loadSeq() {
  try {
    const raw = localStorage.getItem(SEQ_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSeq(seq) {
  localStorage.setItem(SEQ_KEY, JSON.stringify(seq));
}

function next(key, start = 1) {
  const seq = loadSeq();
  const val = (seq[key] ?? start - 1) + 1;
  seq[key] = val;
  saveSeq(seq);
  return val;
}

export function peekNext(key, start = 1) {
  const seq = loadSeq();
  return (seq[key] ?? start - 1) + 1;
}

export const CATEGORY_PREFIX = {
  Laptop: 'LAP',
  Desktop: 'DSK',
  Monitor: 'MNT',
  Server: 'SRV',
  Networking: 'NET',
  Mobile: 'MOB',
  Printer: 'PRN',
  Peripheral: 'PER',
  Software: 'SFT',
  Tablet: 'TAB',
  'IT Assets': 'IT',
  Stationary: 'ST',
  'Laptop Charger': 'ALC',
  LaptopCharger: 'ALC',
  'Mobile Charger': 'AMC',
  MobileCharger: 'AMC',
  Mouse: 'MOU',
  Other: 'OTH',
};

// Resolve the short code used in generated tags/serials for a category.
// Pass an explicit prefix (e.g. from the Categories module) when available;
// otherwise falls back to the built-in map, then to the category's own initials.
export function resolveCategoryPrefix(category, explicitPrefix) {
  if (explicitPrefix) {
    const clean = String(explicitPrefix)
      .replace(/-?#+/g, '')
      .replace(/^AST-?/i, '')
      .trim()
      .toUpperCase();
    if (clean) return clean;
  }

  const catKey = (category || '').trim();
  if (CATEGORY_PREFIX[catKey]) return CATEGORY_PREFIX[catKey];

  const foundKey = Object.keys(CATEGORY_PREFIX).find(
    (k) => k.toLowerCase() === catKey.toLowerCase()
  );
  if (foundKey) return CATEGORY_PREFIX[foundKey];

  const words = catKey.split(/[\s-_]+/).filter(Boolean);
  if (words.length > 1) {
    const acronym = words.map((w) => w[0]).join('').toUpperCase();
    if (acronym.length >= 2) return acronym;
  }

  return catKey.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'OTH';
}

export function cleanAssetId(id, categoryName, categoriesList) {
  if (!id) return '';
  const clean = String(id).replace(/^AST-?/i, '').trim();
  if (!categoryName) return clean;

  const catObj = categoriesList?.find(
    (c) => c.name && c.name.trim().toLowerCase() === String(categoryName).trim().toLowerCase()
  );
  const correctPrefix = resolveCategoryPrefix(categoryName, catObj?.prefix);

  const isLaptopCat = String(categoryName).trim().toLowerCase() === 'laptop';
  if (!isLaptopCat && clean.toUpperCase().startsWith('LAP-')) {
    return clean.replace(/^LAP-/i, `${correctPrefix}-`);
  }

  return clean;
}

// Asset tag pattern: <CATPREFIX>-<5 digit running number>  e.g. ALC-00001
export function generateAssetTag(category, explicitPrefix, count) {
  const prefix = resolveCategoryPrefix(category, explicitPrefix).replace(/^AST-?/i, '');
  let n;
  if (typeof count === 'number' && count >= 0) {
    n = count + 1;
    const seq = loadSeq();
    seq[`asset_${prefix}`] = n;
    saveSeq(seq);
  } else {
    n = next(`asset_${prefix}`, 1);
  }
  return `${prefix}-${String(n).padStart(5, '0')}`;
}


// Internal serial placeholder suggested until a real manufacturer serial is
// entered/scanned. Kept distinct so it's clear when it's system-suggested.
export function generateInternalSerial(category, explicitPrefix) {
  const prefix = resolveCategoryPrefix(category, explicitPrefix);
  const n = next(`serial_${prefix}`, 100000);
  const year = new Date().getFullYear().toString().slice(-2);
  return `SN${year}${prefix}${n}`;
}

// Category ID: CAT-101
export function generateCategoryId() {
  const n = next('cat', 100);
  return `CAT-${n}`;
}

// Inventory batch / GRN number: GRN-2026-000012
export function generateBatchId() {
  const year = new Date().getFullYear();
  const n = next(`grn_${year}`);
  return `GRN-${year}-${String(n).padStart(6, '0')}`;
}

// Purchase order number: PO-2026-0341
export function generatePoNumber() {
  const year = new Date().getFullYear();
  const n = next(`po_${year}`);
  return `PO-${year}-${String(n).padStart(4, '0')}`;
}

// Employee ID: EMP-1042
export function generateEmployeeId() {
  const n = next('emp', 1000);
  return `EMP-${n}`;
}

// Vendor ID: VEN-118
export function generateVendorId() {
  const n = next('ven', 100);
  return `VEN-${n}`;
}

// Ticket / maintenance ticket ID: MT-2026-00231
export function generateMaintenanceId() {
  const year = new Date().getFullYear();
  const n = next(`mt_${year}`);
  return `MT-${year}-${String(n).padStart(5, '0')}`;
}

export function seedSequenceFloor(key, floor) {
  const seq = loadSeq();
  if (!seq[key] || seq[key] < floor) {
    seq[key] = floor;
    saveSeq(seq);
  }
}

export function resetAllSequences() {
  localStorage.removeItem(SEQ_KEY);
}
