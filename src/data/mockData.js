import { CONFIG_SCHEMA } from './categoryConfig';

export const DEPARTMENTS = [
  'Engineering',
  'Quality Assurance',
  'DevOps',
  'IT Infrastructure',
  'Human Resources',
  'Finance',
  'Sales',
  'Customer Success',
  'Design',
  'Product',
];

export const LOCATIONS = [
  'Pune - Kharadi HQ',
  'Pune - Hinjewadi Annex',
  'Bengaluru - Whitefield',
  'Mumbai - BKC',
  'Remote / WFH',
];

export const CATEGORY_LIST = Object.keys(CONFIG_SCHEMA);
export const STATUS_LIST = [
  'Available',
  'Assigned',
  'Under Repair',
  'Lost',
  'Damaged',
  'Retired',
  'Disposed',
];
export const LOCATION_LIST = LOCATIONS;
export const DEPARTMENT_LIST = DEPARTMENTS;

// Empty defaults for database-driven mode (all data is retrieved live from the backend API)
export const vendors = [];
export const employees = [];
export const inventoryBatches = [];
export const assets = [];
export const assignmentHistory = [];
export const maintenanceRecords = [];
