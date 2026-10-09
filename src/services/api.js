import { apiClient } from './apiClient';

const SDAEMON_EMPLOYEE_API_URL = 'https://connectapi.sdaemon.com/api/employee/getallemployeelist';



export function normalizeEmployee(emp) {
  if (!emp) return null;
  const fullName = emp.fullName || emp.FullName || [
    emp.Name || emp.FirstName || emp.firstName,
    emp.MiddleName || emp.middleName,
    emp.LastName || emp.lastName,
  ]
    .filter(Boolean)
    .join(' ')
    .trim() || emp.name || emp.EmployeeId || emp.employeeId || 'Unnamed';

  const employeeId = String(
    emp.EmpCode ||
    emp.empCode ||
    emp.EmployeeCode ||
    emp.employeeCode ||
    emp.EmpId ||
    emp.empId ||
    emp.EmployeeId ||
    emp.employeeId ||
    emp.id ||
    `EMP-${Date.now()}`
  ).trim();
  const email = emp.OfficialEmail || emp.officialEmail || emp.Email || emp.email || '';
  const phone = emp.ContactNo || emp.contactNo || emp.Phone || emp.phone || emp.Mobile || emp.mobile || '';
  const department = emp.Department || emp.department || emp.DepartmentName || emp.departmentName || 'General';
  const designation = emp.Designation || emp.designation || emp.DesignationName || emp.designationName || 'Staff';
  const location = emp.Location || emp.location || emp.LocationName || emp.locationName || 'Pune - Kharadi HQ';
  // OLD LOGIC (COMMENTED OUT):
  // const isResigned = emp.IsResign === true || emp.isResign === true || emp.status === 'Inactive' || emp.status === 'Resigned';
  // const status = isResigned ? 'Inactive' : (emp.status || 'Active');

  // NEW LOGIC: Check Active boolean field first (Active = true -> Active, Active = false -> Inactive)
  const isActiveField = emp.Active ?? emp.active ?? emp.IsActive ?? emp.isActive;
  const isResigned = isActiveField !== undefined
    ? !Boolean(isActiveField)
    : (emp.IsResign === true || emp.isResign === true || emp.status === 'Inactive' || emp.status === 'Resigned');
  const status = isResigned ? 'Inactive' : 'Active';
  const joinDate = emp.DateOfJoin || emp.dateOfJoin ? String(emp.DateOfJoin || emp.dateOfJoin).slice(0, 10) : (emp.joinDate || '');

  return {
    ...emp,
    id: String(employeeId),
    name: fullName,
    email,
    phone,
    department,
    designation,
    location,
    status,
    isResigned,
    joinDate,
    jobType: emp.JobType || emp.jobType || (emp.IsFullTime || emp.isFullTime ? 'Full Time' : ''),
  };
}

export const api = {
  // Authentication
  auth: {
    login: (credentials) => apiClient.post('/auth/login', credentials),
    getMe: () => apiClient.get('/auth/me'),
    logout: () => apiClient.post('/auth/logout').catch(() => null),
  },

  // Categories
  categories: {
    getAll: () => apiClient.get('/categories'),
    getById: (id) => apiClient.get(`/categories/${id}`),
    create: (data) => apiClient.post('/categories', data),
    update: (id, data) => apiClient.put(`/categories/${id}`, data),
    delete: (id) => apiClient.delete(`/categories/${id}`),
  },

  // Vendors
  vendors: {
    getAll: () => apiClient.get('/vendors'),
    getById: (id) => apiClient.get(`/vendors/${id}`),
    create: (data) => apiClient.post('/vendors', data),
    update: (id, data) => apiClient.put(`/vendors/${id}`, data),
    delete: (id) => apiClient.delete(`/vendors/${id}`),
  },

  // Employees
  employees: {
  getAll: async () => {
    try {
      const response = await fetch(SDAEMON_EMPLOYEE_API_URL);

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const result = await response.json();

      const list = Array.isArray(result)
        ? result
        : Array.isArray(result?.Data)
          ? result.Data
          : Array.isArray(result?.data)
            ? result.data
            : [];

      return list
        .map(normalizeEmployee)
        .filter(Boolean);

    } catch (err) {
      console.error(
        'Failed to load employees:',
        err
      );

      return [];
    }
  },

  getById: async (id) => {
    const all = await api.employees.getAll();

    return all.find(
      (e) => String(e.id) === String(id) ||
             String(e.EmployeeId) === String(id)
    ) || null;
  },

  create: (data) => apiClient.post('/employees', data),

  update: (id, data) =>
    apiClient.put(`/employees/${id}`, data),

  delete: (id) =>
    apiClient.delete(`/employees/${id}`),
},

  // Inventory Intake / Batches
  inventory: {
    getAll: () => apiClient.get('/inventory'),
    getById: (id) => apiClient.get(`/inventory/${id}`),
    create: (data) => apiClient.post('/inventory', data),
    update: (id, data) => apiClient.put(`/inventory/${id}`, data),
    delete: (id) => apiClient.delete(`/inventory/${id}`),
  },

  // Assets
  assets: {
    getAll: () => apiClient.get('/assets'),
    getById: (id) => apiClient.get(`/assets/${id}`),
    create: (data) => apiClient.post('/assets', data),
    update: (id, data) => apiClient.put(`/assets/${id}`, data),
    assign: (id, data) => apiClient.post(`/assets/${id}/assign`, data),
    unassign: (id, data) => apiClient.post(`/assets/${id}/unassign`, data),
    transfer: (id, data) => apiClient.post(`/assets/${id}/transfer`, data),
    changeStatus: (id, data) => apiClient.post(`/assets/${id}/status`, data),
    retire: (id, data) => apiClient.post(`/assets/${id}/retire`, data),
  },

  // Maintenance Tickets
  maintenance: {
    getAll: () => apiClient.get('/maintenance'),
    getById: (id) => apiClient.get(`/maintenance/${id}`),
    raise: (data) => apiClient.post('/maintenance', data),
    close: (id, data) => apiClient.post(`/maintenance/${id}/close`, data),
  },

  // Assignment History
  assignments: {
    getAll: () => apiClient.get('/assignments'),
  },

  // Activity Logs
  activity: {
    getAll: () => apiClient.get('/activity'),
    log: (data) => apiClient.post('/activity', data).catch(() => null),
  },

  // Software Subscriptions & Services
  software: {
    getAll: (params) => apiClient.get('/software', { params }),
    getById: (id) => apiClient.get(`/software/${id}`),
    create: (data) => apiClient.post('/software', data),
    update: (id, data) => apiClient.put(`/software/${id}`, data),
    delete: (id) => apiClient.delete(`/software/${id}`),
  },
};

export default api;
