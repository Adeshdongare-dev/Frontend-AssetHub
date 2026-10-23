import { createContext, useContext, useMemo, useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import { apiClient } from "../services/apiClient";
import { generateAssetTag, cleanAssetId } from "../utils/idGenerator";

const DataContext = createContext(null);
const todayISO = () => new Date().toISOString().slice(0, 10);

export function DataProvider({ children }) {
  // Database-driven state: empty by default until loaded from backend
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [inventoryBatches, setInventoryBatches] = useState([]);
  const [assets, setAssets] = useState([]);
  const [assignmentHistory, setAssignmentHistory] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [softwareList, setSoftwareList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetch all domain data from the backend database on initial mount or manual refresh.
   */
  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const results = await Promise.allSettled([
        api.categories.getAll(),
        api.vendors.getAll(),
        api.employees.getAll(),
        api.inventory.getAll(),
        api.assets.getAll(),
        api.assignments.getAll(),
        api.maintenance.getAll(),
        api.activity.getAll(),
        api.software.getAll(),
      ]);

      const [catRes, venRes, empRes, invRes, astRes, asgRes, mntRes, actRes, swRes] = results;

      if (catRes.status === "fulfilled" && Array.isArray(catRes.value)) setCategories(catRes.value);
      if (catRes.status === "fulfilled" && Array.isArray(catRes.value)) setCategories(catRes.value);
      if (venRes.status === "fulfilled" && Array.isArray(venRes.value)) {
        setVendors(venRes.value);
      }
      let activeEmpIdSet = new Set();
      if (empRes.status === "fulfilled" && Array.isArray(empRes.value)) {
        setEmployees(empRes.value);
        const activeEmps = empRes.value.filter((e) => !e.isResigned && (e.status === "Active" || !e.status));
        activeEmpIdSet = new Set(activeEmps.map((e) => String(e.id).toLowerCase().trim()));
      }

      if (invRes.status === "fulfilled" && Array.isArray(invRes.value)) setInventoryBatches(invRes.value);
      if (astRes.status === "fulfilled" && Array.isArray(astRes.value)) {
        const dbAssets = astRes.value.map((a) => {
          const rawClean = cleanAssetId(a.id || a.assetId, a.category, catRes.value || categories);
          const isFromInventory = Boolean(a.fromInventory || a.batchId || a.inventoryBatchId);
          const cleanId = cleanAssetId(a.id || a.assetId || rawClean, a.category, catRes.value || categories);

          const dbAssignedTo = a.assignedTo || a.AssignedTo || a.employeeId || a.EmployeeId || null;
          const dbAssignedToName = a.assignedToName || a.AssignedToName || a.employeeName || a.EmployeeName || null;
          const dbAssignedDept = a.assignedDept || a.AssignedDept || a.department || a.Department || null;
          const dbAssignedOn = a.assignedOn || a.AssignedOn || null;

          let isDbAssigned = Boolean(
            dbAssignedTo &&
            dbAssignedToName &&
            String(dbAssignedTo).trim() !== "" &&
            String(dbAssignedToName).trim() !== "" &&
            dbAssignedTo !== "null" &&
            dbAssignedToName !== "null"
          );

          // Auto-unassign if assigned employee is removed or inactive in 3rd party API (DISABLED: Assets only show available when explicitly returned)
          // if (isDbAssigned && activeEmpIdSet.size > 0 && !activeEmpIdSet.has(String(dbAssignedTo).toLowerCase().trim())) {
          //   isDbAssigned = false;
          //   const targetBackendId = a.rawId || a.id || cleanId;
          //   api.assets.unassign(targetBackendId, { remarks: "Auto-unassigned: employee removed from 3rd party system", performedBy: "System Sync" }).catch(() => null);
          // }

          const assignedTo = isDbAssigned ? dbAssignedTo : null;
          const assignedToName = isDbAssigned ? dbAssignedToName : null;
          const assignedDept = isDbAssigned ? dbAssignedDept : null;
          const assignedOn = isDbAssigned ? dbAssignedOn : null;

          let status = a.status || a.Status || "Available";
          if (!isDbAssigned && status === "Assigned") {
            status = "Available";
          } else if (isDbAssigned) {
            status = "Assigned";
          }

          return {
            ...a,
            rawId: a.rawId || a.id || a.assetId || cleanId,
            id: cleanId,
            assetId: cleanId,
            status,
            assignedTo,
            assignedToName,
            assignedDept,
            assignedOn,
            fromInventory: isFromInventory,
            warrantyMonths: isFromInventory ? (a.warrantyMonths || 0) : 0,
            warrantyStartDate: isFromInventory ? (a.warrantyStartDate || null) : null,
            warrantyEndDate: isFromInventory ? (a.warrantyEndDate || null) : null,
            warrantyExpiry: isFromInventory ? (a.warrantyExpiry || a.warrantyEndDate || null) : null,
          };
        });
        setAssets(dbAssets);
      }
      if (asgRes.status === "fulfilled" && Array.isArray(asgRes.value)) {
        setAssignmentHistory(asgRes.value);
      }
      if (mntRes.status === "fulfilled" && Array.isArray(mntRes.value)) {
        const loadedAssets = (astRes.status === "fulfilled" && Array.isArray(astRes.value)) ? astRes.value : [];
        const processedRecords = mntRes.value.map((m) => {
          const matchedAsset = loadedAssets.find(
            (a) => a.id === m.assetId || a.rawId === m.assetId || a.assetId === m.assetId
          );
          const cleanAssetIdVal = matchedAsset ? (matchedAsset.id || matchedAsset.assetId) : m.assetId;
          return {
            ...m,
            assetId: cleanAssetIdVal,
            rawAssetId: m.assetId,
          };
        });
        setMaintenanceRecords(processedRecords);
      }
      if (actRes.status === "fulfilled" && Array.isArray(actRes.value)) setActivityLog(actRes.value);
      if (swRes.status === "fulfilled" && Array.isArray(swRes.value)) setSoftwareList(swRes.value);
    } catch (err) {
      console.error("Error loading data from backend:", err);
      setError(err.message || "Failed to load database records.");
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch employee list directly from sdaemon API
   */
  const fetchEmployees = useCallback(async () => {
    try {
      const data = await api.employees.getAll();
      if (Array.isArray(data)) {
        setEmployees(data);
      }
      return data;
    } catch (err) {
      console.error("Failed to fetch employees from sdaemon API:", err);
      return [];
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  function logActivity(text) {
    const newEntry = { id: Date.now(), ts: new Date().toISOString(), text };
    setActivityLog((prev) => [newEntry, ...prev].slice(0, 40));
    api.activity.log({ text }).catch(() => null);
  }

  /**
   * Create an inventory batch in the backend and update local state.
   */
  async function addInventoryBatch(payload) {
    let response = null;
    try {
      response = await api.inventory.create(payload);
    } catch (err) {
      console.warn("Backend create inventory failed, keeping in local state:", err);
    }

    let record = response?.batch || response?.inventory || response || payload;
    if (record && (!record.items || record.items.length === 0) && payload.items?.length > 0) {
      record = { ...record, items: payload.items };
    }
    setInventoryBatches((prev) => [record, ...prev]);

    let batchAssets = [];
    if (response?.assets && Array.isArray(response.assets) && response.assets.length > 0) {
      batchAssets = response.assets;
    } else if (payload.items && Array.isArray(payload.items) && payload.items.length > 0) {
      batchAssets = payload.items.map((it, idx) => {
        const cat = it.category || payload.category || "Laptop";
        const catObj = categories.find((c) => c.name.trim().toLowerCase() === cat.trim().toLowerCase());
        const catPrefix = catObj?.prefix;
        const catCount = assets.filter((a) => a.category?.trim().toLowerCase() === cat.trim().toLowerCase()).length;
        const tag = cleanAssetId(it.id || generateAssetTag(cat, catPrefix, catCount + idx), cat, categories);
        return {
          id: tag,
          assetId: tag,
          item: (it.item || it.itemName || "").trim(),
          itemName: (it.itemName || it.item || "").trim(),
          category: cat,
          brand: (it.brand || "").trim(),
          configuration: (it.configuration || "").trim(),
          configSummary: (it.configuration || "").trim(),
          serialNumber: (it.serialNo || it.serialNumber || "").trim(),
          serialNo: (it.serialNo || it.serialNumber || "").trim(),
          status: payload.status || "Available",
          condition: payload.condition || "New",
          location: payload.location || "Pune - Kharadi HQ",
          vendorId: payload.vendorId,
          vendorName: payload.vendorName || "",
          unitCost: payload.purchaseCost ? Number(payload.purchaseCost) : 0,
          purchaseCost: payload.purchaseCost ? Number(payload.purchaseCost) : 0,
          purchaseDate: payload.purchaseDate,
          warrantyStartDate: payload.warrantyStartDate,
          warrantyEndDate: payload.warrantyEndDate,
          warrantyExpiry: payload.warrantyEndDate,
          invoiceNo: payload.invoiceNo,
          poNumber: payload.poNumber,
          batchId: record.id || record.inventoryId || payload.inventoryId,
          inventoryBatchId: record.id || record.inventoryId || payload.inventoryId,
          fromInventory: true,
          notes: payload.remarks || payload.description || "",
          assignedTo: null,
          assignedToName: null,
          assignedDept: null,
          assignedOn: null,
        };
      });

      // Save each asset to backend /api/assets so it persists in the database
      batchAssets.forEach((ast) => {
        api.assets.create(ast).catch(() => null);
      });
    }

    if (batchAssets.length > 0) {
      setAssets((prev) => [...batchAssets, ...prev]);
      try {
        const overrides = JSON.parse(localStorage.getItem("assethub_asset_overrides") || "{}");
        batchAssets.forEach((ast) => {
          overrides[ast.id] = ast;
        });
        localStorage.setItem("assethub_asset_overrides", JSON.stringify(overrides));
      } catch (_) { }
    }

    logActivity(`Inventory item ${record.id || record.inventoryId} recorded.`);
    return { batch: record, assets: batchAssets };
  }

  /**
   * Update an inventory item in the backend and update local state.
   */
  async function updateInventoryBatch(batchId, updates) {
    const { items, ...batchPayload } = updates;
    let response = null;
    try {
      response = await api.inventory.update(batchId, batchPayload);
    } catch (err) {
      console.warn(`Backend update inventory failed (${batchId}), updating local state:`, err);
    }

    setInventoryBatches((prev) =>
      prev.map((b) => {
        if (b.id === batchId || b.inventoryId === batchId) {
          const base = response || { ...b, ...batchPayload };
          return {
            ...base,
            quantity: updates.quantity || (items ? items.length : base.quantity),
            items: items || base.items || b.items,
          };
        }
        return b;
      })
    );

    if (Array.isArray(items)) {
      setAssets((prev) =>
        prev.map((asset) => {
          if (asset.batchId === batchId || asset.batchId === updates.inventoryId) {
            const matched = items.find(
              (it) => (it.id && it.id === asset.id) || (it.serialNo && it.serialNo === asset.serialNumber)
            );
            if (matched) {
              return {
                ...asset,
                category: matched.category || asset.category,
                item: matched.item || matched.itemName || asset.item,
                serialNumber: matched.serialNo || asset.serialNumber,
                serialNo: matched.serialNo || asset.serialNo,
                configuration: matched.configuration || asset.configuration,
                configSummary: typeof matched.configuration === 'string' ? matched.configuration : asset.configSummary,
              };
            }
          }
          return asset;
        })
      );
    }

    logActivity(`Inventory item ${batchId} updated.`);
    return response;
  }

  /**
   * Delete an inventory item in the backend and update local state.
   */
  async function deleteInventoryBatch(batchId) {
    try {
      await api.inventory.delete(batchId);
    } catch (err) {
      console.warn(`Backend delete inventory failed (${batchId}), updating local state:`, err);
    }
    setInventoryBatches((prev) =>
      prev.filter((b) => b.id !== batchId && b.inventoryId !== batchId)
    );
    setAssets((prev) =>
      prev.filter((a) => a.inventoryBatchId !== batchId && a.batchId !== batchId)
    );
    logActivity(`Inventory item ${batchId} deleted.`);
  }

  /**
   * Add a single asset directly, saving to backend database and updating local state.
   */
  async function addAsset(assetData) {
    let response = null;
    try {
      response = await api.assets.create(assetData);
    } catch (err) {
      console.warn("Backend create asset failed:", err);
    }

    const base = response || assetData;
    const catName = assetData.category || base.category || "Other";
    const catObj = categories.find((c) => c.name?.trim().toLowerCase() === catName.trim().toLowerCase());
    const catPrefix = catObj?.prefix;
    const catAssetsCount = assets.filter((a) => a.category?.trim().toLowerCase() === catName.trim().toLowerCase()).length;
    // const rawTargetId = assetData.id || assetData.assetId || (base.id && !base.id.startsWith("LAP-") ? base.id : "") || base.assetId || generateAssetTag(catName, catPrefix, catAssetsCount);
    const rawTargetId = base.id || base.assetId || assetData.id || assetData.assetId || generateAssetTag(catName, catPrefix, catAssetsCount);

    const cleanId = cleanAssetId(rawTargetId, catName, categories);
    const isFromInventory = Boolean(assetData.fromInventory || base.fromInventory || base.batchId || assetData.batchId || base.inventoryBatchId || assetData.inventoryBatchId);
    const finalAsset = {
      ...assetData,
      ...base,
      rawId: base.id || assetData.id || cleanId,
      id: cleanId,
      assetId: cleanId,
      serialNo: base.serialNumber || assetData.serialNo || assetData.serialNumber || "",
      serialNumber: base.serialNumber || assetData.serialNumber || assetData.serialNo || "",
      item: assetData.itemName || assetData.item || (typeof base.configuration === "object" ? base.configuration?.brandModel : "") || base.category,
      itemName: assetData.itemName || assetData.item || (typeof base.configuration === "object" ? base.configuration?.brandModel : "") || base.category,
      brand: assetData.brand || (typeof base.configuration === "object" ? base.configuration?.brand : "") || "",
      configuration: assetData.configuration || base.configSummary || base.configuration || "",
      configSummary: base.configSummary || assetData.configSummary || "",
      status: base.status || assetData.status || "Available",
      condition: base.condition || assetData.condition || "New",
      location: base.location || assetData.location || "Pune - Kharadi HQ",
      fromInventory: isFromInventory,
      warrantyMonths: isFromInventory ? (base.warrantyMonths || assetData.warrantyMonths || 0) : 0,
      warrantyStartDate: isFromInventory ? (base.warrantyStartDate || assetData.warrantyStartDate || null) : null,
      warrantyEndDate: isFromInventory ? (base.warrantyEndDate || assetData.warrantyEndDate || null) : null,
      warrantyExpiry: isFromInventory ? (base.warrantyExpiry || base.warrantyEndDate || assetData.warrantyExpiry || assetData.warrantyEndDate || null) : null,
    };

    setAssets((prev) => [finalAsset, ...prev.filter((a) => a.id !== cleanId)]);

    try {
      const overrides = JSON.parse(localStorage.getItem("assethub_asset_overrides") || "{}");
      overrides[cleanId] = finalAsset;
      localStorage.setItem("assethub_asset_overrides", JSON.stringify(overrides));
    } catch (_) { }

    logActivity(`Asset ${cleanId} created.`);
    return finalAsset;
  }

  /**
   * Correct/update asset specifications in the backend and update local state.
   */
  async function updateAsset(assetId, updates) {
    const cleanId = cleanAssetId(assetId);
    const existing = assets.find((a) => a.id === cleanId || a.id === assetId || a.rawId === assetId);
    const backendId = existing?.rawId || assetId;
    let response = null;
    try {
      response = await api.assets.update(backendId, updates);
    } catch (err) {
      console.warn(`Backend update asset failed (${backendId}), updating local state:`, err);
    }
    const updated = response || updates;
    const cleanUpdatedId = cleanAssetId(updated.id || cleanId);
    setAssets((prev) =>
      prev.map((a) => (a.id === cleanId || a.id === assetId || a.rawId === backendId ? { ...a, ...updated, id: cleanUpdatedId, assetId: cleanUpdatedId } : a))
    );
    try {
      const overrides = JSON.parse(localStorage.getItem("assethub_asset_overrides") || "{}");
      overrides[cleanUpdatedId] = {
        ...(overrides[cleanUpdatedId] || {}),
        ...updated,
        id: cleanUpdatedId,
        assetId: cleanUpdatedId,
      };
      if (cleanUpdatedId !== assetId && overrides[assetId]) {
        delete overrides[assetId];
      }
      localStorage.setItem("assethub_asset_overrides", JSON.stringify(overrides));
    } catch (_) { }
    logActivity(`${cleanUpdatedId} details updated.`);
    return response || updated;
  }

  /**
   * Assign an asset to an employee.
   */
  async function assignAsset(assetId, employeeId, remarks, performedBy) {
    const cleanId = cleanAssetId(assetId);
    const asset = assets.find((a) => a.id === cleanId || a.id === assetId || a.rawId === assetId);
    const targetBackendId = asset?.rawId || assetId;

    const emp = employees.find(
      (e) => e.id === employeeId || String(e.id).toLowerCase() === String(employeeId).toLowerCase()
    );

    if (asset && ["Damaged", "Disposed", "Under Repair", "Retired"].includes(asset.status)) {
      logActivity(`${assetId} assignment blocked because asset status is ${asset.status}.`);
      return;
    }

    const assignedOn = todayISO();
    const targetEmpId = emp?.id || employeeId;
    const targetEmpName = emp?.name || emp?.fullName || targetEmpId;
    const targetEmpDept = emp?.department || "General";



    const assignPayload = {
      id: targetBackendId,
      rawId: targetBackendId,
      assetId: cleanId,
      employeeId: targetEmpId,
      EmployeeId: targetEmpId,
      assignedTo: targetEmpId,
      AssignedTo: targetEmpId,
      assignedToName: targetEmpName,
      AssignedToName: targetEmpName,
      employeeName: targetEmpName,
      EmployeeName: targetEmpName,
      assignedDept: targetEmpDept,
      AssignedDept: targetEmpDept,
      assignedOn,
      AssignedOn: assignedOn,
      status: "Assigned",
      Status: "Assigned",
      remarks,
      performedBy,
    };

    let response = null;
    try {
      response = await api.assets.assign(targetBackendId, assignPayload);
    } catch (err) {
      console.warn(`Backend assign endpoint failed for ${targetBackendId}:`, err?.message || err);
    }

    // Direct update to asset record to guarantee AssignedTo and AssignedToName in DB
    try {
      const dbUpdatePayload = {
        ...(asset || {}),
        id: targetBackendId,
        rawId: targetBackendId,
        assetId: asset?.assetId || cleanId,
        status: "Assigned",
        Status: "Assigned",
        assignedTo: targetEmpId,
        AssignedTo: targetEmpId,
        assignedToName: targetEmpName,
        AssignedToName: targetEmpName,
        employeeId: targetEmpId,
        EmployeeId: targetEmpId,
        employeeName: targetEmpName,
        EmployeeName: targetEmpName,
        assignedDept: targetEmpDept,
        AssignedDept: targetEmpDept,
        assignedOn,
        AssignedOn: assignedOn,
      };
      await api.assets.update(targetBackendId, dbUpdatePayload);
    } catch (err) {
      console.warn(`Direct asset update for assign failed for ${targetBackendId}:`, err?.message || err);
      if (targetBackendId !== assetId) {
        try {
          await api.assets.update(assetId, {
            id: assetId,
            status: "Assigned",
            Status: "Assigned",
            assignedTo: targetEmpId,
            AssignedTo: targetEmpId,
            assignedToName: targetEmpName,
            AssignedToName: targetEmpName,
            employeeId: targetEmpId,
            EmployeeId: targetEmpId,
            employeeName: targetEmpName,
            EmployeeName: targetEmpName,
            assignedDept: targetEmpDept,
            AssignedDept: targetEmpDept,
            assignedOn,
            AssignedOn: assignedOn,
          });
        } catch (_) {}
      }
    }

    const updatedAsset = {
      status: "Assigned",
      assignedTo: targetEmpId,
      assignedToName: targetEmpName,
      assignedDept: targetEmpDept,
      assignedOn,
    };

    setAssets((prev) =>
      prev.map((a) => (a.id === cleanId || a.id === assetId || a.rawId === targetBackendId ? { ...a, ...updatedAsset } : a))
    );

    try {
      const overrides = JSON.parse(localStorage.getItem("assethub_asset_overrides") || "{}");
      overrides[cleanId] = {
        ...(overrides[cleanId] || {}),
        ...updatedAsset,
      };
      if (cleanId !== assetId && overrides[assetId]) {
        overrides[assetId] = { ...(overrides[assetId] || {}), ...updatedAsset };
      }
      localStorage.setItem("assethub_asset_overrides", JSON.stringify(overrides));
    } catch (e) {
      console.warn("Failed to persist asset override to localStorage:", e);
    }

    const historyItem = {
      id: `${cleanId}-A${Date.now()}`,
      assetId: cleanId,
      employeeId: targetEmpId,
      employeeName: targetEmpName,
      department: targetEmpDept,
      action: "Assigned",
      date: assignedOn,
      remarks: remarks || "Assigned via Assets module",
      performedBy: performedBy || "IT Asset Desk",
    };

    setAssignmentHistory((prev) => {
      const next = [historyItem, ...prev];
      try {
        localStorage.setItem("assethub_assignment_history", JSON.stringify(next.slice(0, 100)));
      } catch (_) { }
      return next;
    });

    logActivity(`${cleanId} assigned to ${targetEmpName}.`);
    return response || { ...asset, ...updatedAsset };
  }

  /**
   * Unassign an asset and return it to stock.
   */
  async function unassignAsset(assetId, remarks, performedBy) {
    const cleanId = cleanAssetId(assetId);
    const asset = assets.find((a) => a.id === cleanId || a.id === assetId || a.rawId === assetId);
    const targetBackendId = asset?.rawId || assetId;

    let response = null;
    try {
      response = await api.assets.unassign(targetBackendId, {
        status: "Available",
        Status: "Available",
        assignedTo: null,
        AssignedTo: null,
        assignedToName: null,
        AssignedToName: null,
        assignedDept: null,
        AssignedDept: null,
        assignedOn: null,
        AssignedOn: null,
        remarks,
        performedBy,
      });
    } catch (err) {
      console.warn(`Backend unassign failed for ${targetBackendId}:`, err?.message || err);
    }

    try {
      await api.assets.update(targetBackendId, {
        ...(asset || {}),
        id: targetBackendId,
        rawId: targetBackendId,
        assetId: asset?.assetId || cleanId,
        status: "Available",
        Status: "Available",
        assignedTo: null,
        AssignedTo: null,
        assignedToName: null,
        AssignedToName: null,
        employeeId: null,
        EmployeeId: null,
        employeeName: null,
        EmployeeName: null,
        assignedDept: null,
        AssignedDept: null,
        assignedOn: null,
        AssignedOn: null,
      });
    } catch (err) {
      console.warn(`Direct asset update for unassign failed for ${targetBackendId}:`, err?.message || err);
      if (targetBackendId !== assetId) {
        try {
          await api.assets.update(assetId, {
            id: assetId,
            status: "Available",
            Status: "Available",
            assignedTo: null,
            AssignedTo: null,
            assignedToName: null,
            AssignedToName: null,
            employeeId: null,
            EmployeeId: null,
            employeeName: null,
            EmployeeName: null,
            assignedDept: null,
            AssignedDept: null,
            assignedOn: null,
            AssignedOn: null,
          });
        } catch (_) {}
      }
    }

    const date = todayISO();
    const updatedAsset = {
      status: "Available",
      assignedTo: null,
      assignedToName: null,
      assignedDept: null,
      assignedOn: null,
    };

    setAssets((prev) =>
      prev.map((a) => (a.id === cleanId || a.id === assetId || a.rawId === targetBackendId ? { ...a, ...updatedAsset } : a))
    );

    try {
      const overrides = JSON.parse(localStorage.getItem("assethub_asset_overrides") || "{}");
      overrides[cleanId] = {
        ...(overrides[cleanId] || {}),
        ...updatedAsset,
      };
      if (cleanId !== assetId && overrides[assetId]) {
        overrides[assetId] = { ...(overrides[assetId] || {}), ...updatedAsset };
      }
      localStorage.setItem("assethub_asset_overrides", JSON.stringify(overrides));
    } catch (_) { }

    const historyItem = {
      id: `${cleanId}-R${Date.now()}`,
      assetId: cleanId,
      employeeId: asset?.assignedTo,
      employeeName: asset?.assignedToName,
      department: asset?.assignedDept,
      action: "Returned",
      date,
      remarks: remarks || "Returned to inventory",
      performedBy: performedBy || "IT Asset Desk",
    };

    setAssignmentHistory((prev) => {
      const next = [historyItem, ...prev];
      try {
        localStorage.setItem("assethub_assignment_history", JSON.stringify(next.slice(0, 100)));
      } catch (_) { }
      return next;
    });

    logActivity(`${cleanId} returned to stock.`);
    return response || { ...asset, ...updatedAsset };
  }

  /**
   * Move an asset directly from current employee to a new one.
   */
  async function transferAsset(assetId, newEmployeeId, remarks, performedBy) {
    const cleanId = cleanAssetId(assetId);
    const asset = assets.find((a) => a.id === cleanId || a.id === assetId || a.rawId === assetId);
    const targetBackendId = asset?.rawId || assetId;

    const newEmp = employees.find(
      (e) => e.id === newEmployeeId || String(e.id).toLowerCase() === String(newEmployeeId).toLowerCase()
    );

    const targetEmpId = newEmp?.id || newEmployeeId;
    const targetEmpName = newEmp?.name || newEmp?.fullName || targetEmpId;
    const targetEmpDept = newEmp?.department || "General";
    const date = todayISO();



    const transferPayload = {
      newEmployeeId: targetEmpId,
      NewEmployeeId: targetEmpId,
      assignedTo: targetEmpId,
      AssignedTo: targetEmpId,
      assignedToName: targetEmpName,
      AssignedToName: targetEmpName,
      employeeName: targetEmpName,
      EmployeeName: targetEmpName,
      assignedDept: targetEmpDept,
      AssignedDept: targetEmpDept,
      assignedOn: date,
      AssignedOn: date,
      status: "Assigned",
      Status: "Assigned",
      remarks,
      performedBy,
    };

    let response = null;
    try {
      response = await api.assets.transfer(targetBackendId, transferPayload);
    } catch (err) {
      console.warn(`Backend transfer failed for ${targetBackendId}:`, err?.message || err);
    }

    try {
      await api.assets.update(targetBackendId, {
        ...(asset || {}),
        id: targetBackendId,
        rawId: targetBackendId,
        assetId: asset?.assetId || cleanId,
        status: "Assigned",
        Status: "Assigned",
        assignedTo: targetEmpId,
        AssignedTo: targetEmpId,
        assignedToName: targetEmpName,
        AssignedToName: targetEmpName,
        employeeId: targetEmpId,
        EmployeeId: targetEmpId,
        employeeName: targetEmpName,
        EmployeeName: targetEmpName,
        assignedDept: targetEmpDept,
        AssignedDept: targetEmpDept,
        assignedOn: date,
        AssignedOn: date,
      });
    } catch (err) {
      console.warn(`Direct asset update for transfer failed for ${targetBackendId}:`, err?.message || err);
      if (targetBackendId !== assetId) {
        try {
          await api.assets.update(assetId, {
            id: assetId,
            status: "Assigned",
            Status: "Assigned",
            assignedTo: targetEmpId,
            AssignedTo: targetEmpId,
            assignedToName: targetEmpName,
            AssignedToName: targetEmpName,
            employeeId: targetEmpId,
            EmployeeId: targetEmpId,
            employeeName: targetEmpName,
            EmployeeName: targetEmpName,
            assignedDept: targetEmpDept,
            AssignedDept: targetEmpDept,
            assignedOn: date,
            AssignedOn: date,
          });
        } catch (_) {}
      }
    }

    const fromName = asset?.assignedToName;
    const fromDept = asset?.assignedDept;
    const updatedAsset = {
      status: "Assigned",
      assignedTo: targetEmpId,
      assignedToName: targetEmpName,
      assignedDept: targetEmpDept,
      assignedOn: date,
    };

    setAssets((prev) =>
      prev.map((a) => (a.id === cleanId || a.id === assetId || a.rawId === targetBackendId ? { ...a, ...updatedAsset } : a))
    );

    try {
      const overrides = JSON.parse(localStorage.getItem("assethub_asset_overrides") || "{}");
      overrides[cleanId] = {
        ...(overrides[cleanId] || {}),
        ...updatedAsset,
      };
      if (cleanId !== assetId && overrides[assetId]) {
        overrides[assetId] = { ...(overrides[assetId] || {}), ...updatedAsset };
      }
      localStorage.setItem("assethub_asset_overrides", JSON.stringify(overrides));
    } catch (_) { }

    const historyItem = {
      id: `${assetId}-T${Date.now()}`,
      assetId,
      employeeId: targetEmpId,
      employeeName: targetEmpName,
      department: targetEmpDept,
      action: "Transferred",
      date,
      remarks: remarks || `Transferred from ${fromName || "previous holder"} (${fromDept || "—"})`,
      performedBy: performedBy || "IT Asset Desk",
    };

    setAssignmentHistory((prev) => {
      const next = [historyItem, ...prev];
      try {
        localStorage.setItem("assethub_assignment_history", JSON.stringify(next.slice(0, 100)));
      } catch (_) { }
      return next;
    });

    logActivity(`${assetId} transferred to ${targetEmpName}.`);
    return response || { ...asset, ...updatedAsset };
  }

  /**
   * Raise a maintenance ticket.
   */
  async function raiseMaintenance({ assetId, issueType, description, reportedBy }) {
    const asset = assets.find((a) => a.id === assetId || a.rawId === assetId || a.assetId === assetId);
    const targetBackendId = asset?.rawId || asset?.id || assetId;
    try {
      const response = await api.maintenance.raise({ assetId: targetBackendId, issueType, description, reportedBy });
      const openedOn = todayISO();
      const rawRecord = response || {
        id: `MNT-${Date.now()}`,
        assetId: targetBackendId,
        issueType,
        description,
        reportedBy: reportedBy || asset?.assignedToName || "IT Helpdesk",
        openedOn,
        expectedCompletion: openedOn,
        status: "Open",
        cost: 0,
        vendorId: asset?.vendorId,
        vendorName: asset?.vendorName,
      };

      const record = {
        ...rawRecord,
        assetId: asset?.id || rawRecord.assetId || assetId,
        rawAssetId: rawRecord.assetId || targetBackendId,
      };

      setMaintenanceRecords((prev) => [record, ...prev]);
      setAssets((prev) =>
        prev.map((a) =>
          a.id === asset?.id || a.rawId === targetBackendId || a.id === assetId
            ? { ...a, status: "Under Repair" }
            : a
        )
      );
      logActivity(`Maintenance ticket ${record.id} raised for ${asset?.id || assetId} (${issueType}).`);
      return record.id;
    } catch (err) {
      console.error("Failed to raise maintenance ticket:", err);
      throw err;
    }
  }

  /**
   * Close a maintenance ticket.
   */
  async function closeMaintenance(ticketId, { cost, resolutionNotes, restoreStatus }) {
    try {
      const response = await api.maintenance.close(ticketId, { cost, resolutionNotes, restoreStatus });
      setMaintenanceRecords((prev) =>
        prev.map((m) =>
          m.id === ticketId
            ? {
              ...m,
              status: "Closed",
              completedOn: todayISO(),
              cost: Number(cost) || m.cost,
              resolutionNotes,
            }
            : m
        )
      );

      const ticket = maintenanceRecords.find((m) => m.id === ticketId);
      if (ticket) {
        setAssets((prev) =>
          prev.map((a) =>
            a.id === ticket.assetId || a.rawId === ticket.rawAssetId || a.rawId === ticket.assetId || a.id === ticket.rawAssetId
              ? {
                ...a,
                status: restoreStatus || (a.assignedTo ? "Assigned" : "Available"),
              }
              : a
          )
        );
        logActivity(`Maintenance ticket ${ticketId} closed for ${ticket.assetId}.`);
      }
      return response;
    } catch (err) {
      console.error(`Failed to close maintenance ticket ${ticketId}:`, err);
      throw err;
    }
  }

  /**
   * Change status of an asset (e.g. Under Repair, Lost, Damaged, Retired).
   */
  async function changeAssetStatus(assetId, status, remarks, performedBy) {
    const asset = assets.find((a) => a.id === assetId);
    let response = null;
    try {
      response = await api.assets.changeStatus(assetId, { status, remarks, performedBy });
    } catch (err) {
      console.warn(`Backend changeStatus failed for ${assetId}, updating locally:`, err?.message || err);
      try {
        await api.assets.update(assetId, {
          status,
          notes: remarks || asset?.notes,
        });
      } catch (_) { }
    }

    const date = todayISO();
    if (asset?.status === "Assigned" && asset.assignedTo) {
      setAssignmentHistory((prev) => [
        {
          id: `${assetId}-R${Date.now()}`,
          assetId,
          employeeId: asset.assignedTo,
          employeeName: asset.assignedToName,
          department: asset.assignedDept,
          action: "Returned",
          date,
          remarks: `Auto-returned — status changed to ${status}.`,
          performedBy: performedBy || "IT Asset Desk",
        },
        ...prev,
      ]);
    }

    const updatedAsset = {
      status,
      assignedTo: null,
      assignedToName: null,
      assignedDept: null,
      assignedOn: null,
      notes: remarks || asset?.notes,
    };

    setAssets((prev) =>
      prev.map((a) => (a.id === assetId ? { ...a, ...updatedAsset } : a))
    );

    try {
      const overrides = JSON.parse(localStorage.getItem("assethub_asset_overrides") || "{}");
      overrides[assetId] = {
        ...(overrides[assetId] || {}),
        ...updatedAsset,
      };
      localStorage.setItem("assethub_asset_overrides", JSON.stringify(overrides));
    } catch (_) { }

    logActivity(`${assetId} status changed to ${status}${performedBy ? ` by ${performedBy}` : ""}.`);
    return response || { ...asset, ...updatedAsset };
  }

  /**
   * Retire an asset.
   */
  async function retireAsset(assetId, reason) {
    try {
      const response = await api.assets.retire(assetId, { reason });
      setAssets((prev) =>
        prev.map((a) =>
          a.id === assetId
            ? {
              ...a,
              status: "Retired",
              assignedTo: null,
              assignedToName: null,
              assignedDept: null,
              notes: reason || "Retired",
            }
            : a
        )
      );
      logActivity(`${assetId} marked as Retired.`);
      return response;
    } catch (err) {
      console.error(`Failed to retire asset ${assetId}:`, err);
      throw err;
    }
  }

  /**
   * Add a new category.
   */
  async function addCategory(payload) {
    try {
      const response = await api.categories.create(payload);
      const category = response || {
        id: `CAT-${Date.now()}`,
        status: "Active",
        description: "",
        ...payload,
        prefix: payload.prefix.toUpperCase(),
      };
      setCategories((prev) => [category, ...prev]);
      logActivity(`New category added: ${category.name} (${category.prefix}).`);
      return category;
    } catch (err) {
      console.error("Failed to add category:", err);
      throw err;
    }
  }

  /**
   * Update category details.
   */
  async function updateCategory(id, updates) {
    try {
      const response = await api.categories.update(id, updates);
      setCategories((prev) =>
        prev.map((c) =>
          c.id === id
            ? (response || {
              ...c,
              ...updates,
              prefix: (updates.prefix || c.prefix).toUpperCase(),
            })
            : c
        )
      );
      logActivity(`Category ${id} updated.`);
      return response;
    } catch (err) {
      console.error(`Failed to update category ${id}:`, err);
      throw err;
    }
  }

  /**
   * Delete category.
   */
  async function deleteCategory(id) {
    try {
      await api.categories.delete(id);
    } catch (err) {
      console.warn(`Backend delete category failed (${id}), updating local state:`, err);
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
    logActivity(`Category ${id} deleted.`);
  }

  /**
   * Add a new vendor.
   */
  async function addVendor(payload) {
    try {
      const response = await api.vendors.create(payload);
      const vendor = response || {
        id: `VEN-${Date.now()}`,
        status: "Active",
        rating: 4.0,
        onboardedOn: todayISO(),
        ...payload,
      };
      setVendors((prev) => [vendor, ...prev]);
      logActivity(`New vendor onboarded: ${vendor.name}.`);
      return vendor;
    } catch (err) {
      console.error("Failed to add vendor:", err);
      throw err;
    }
  }

  /**
   * Update vendor details.
   */
  async function updateVendor(id, updates) {
    let response = null;
    try {
      response = await api.vendors.update(id, updates);
    } catch (err) {
      console.warn(`Backend update vendor failed (${id}, status ${err.status || 405}), updating local state:`, err);
    }

    const updatedVendor = response || updates;
    setVendors((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...updatedVendor } : v))
    );

    try {
      const overrides = JSON.parse(localStorage.getItem("assethub_vendor_overrides") || "{}");
      overrides[id] = { ...(overrides[id] || {}), ...updatedVendor };
      localStorage.setItem("assethub_vendor_overrides", JSON.stringify(overrides));
    } catch (_) {
      // Ignore storage errors
    }

    logActivity(`Vendor ${updates.name || id} updated.`);
    return updatedVendor;
  }

  /**
   * Delete a vendor.
   */
  async function deleteVendor(id) {
    try {
      await api.vendors.delete(id);
    } catch (err) {
      console.warn(`Backend delete vendor failed (${id}), updating local state:`, err);
    }
    setVendors((prev) => prev.filter((v) => v.id !== id));

    try {
      const overrides = JSON.parse(localStorage.getItem("assethub_vendor_overrides") || "{}");
      delete overrides[id];
      localStorage.setItem("assethub_vendor_overrides", JSON.stringify(overrides));

      const deletedIds = JSON.parse(localStorage.getItem("assethub_vendor_deleted") || "[]");
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem("assethub_vendor_deleted", JSON.stringify(deletedIds));
      }
    } catch (_) {
      // Ignore storage errors
    }

    logActivity(`Vendor ${id} deleted.`);
  }

  /**
   * Add a new employee.
   */
  async function addEmployee(payload) {
    let response = null;
    try {
      response = await api.employees.create(payload);
    } catch (err) {
      console.warn("Backend create employee failed, keeping in local state:", err);
    }
    const employee = response || {
      id: `EMP-${Date.now()}`,
      status: "Active",
      joinDate: todayISO(),
      ...payload,
    };
    setEmployees((prev) => [employee, ...prev]);
    logActivity(`New employee added: ${employee.name} (${employee.department}).`);
    return employee;
  }

  async function addSoftware(payload) {
    try {
      const response = await api.software.create(payload);
      if (response) {
        setSoftwareList((prev) => [response, ...prev]);
        logActivity(`Software subscription ${response.assetCode || response.id} (${response.serviceName}) created.`);
      }
      return response;
    } catch (err) {
      console.error("Failed to add software subscription:", err);
      throw err;
    }
  }

  async function updateSoftware(id, payload) {
    try {
      const response = await api.software.update(id, payload);
      setSoftwareList((prev) => prev.map((s) => (s.id === id ? { ...s, ...response } : s)));
      logActivity(`Software subscription ${id} updated.`);
      return response;
    } catch (err) {
      console.error("Failed to update software subscription:", err);
      throw err;
    }
  }

  async function deleteSoftware(id) {
    try {
      await api.software.delete(id);
      setSoftwareList((prev) => prev.filter((s) => s.id !== id));
      logActivity(`Software subscription ${id} deleted.`);
    } catch (err) {
      console.error("Failed to delete software subscription:", err);
      throw err;
    }
  }

  async function checkSoftwareExpirations() {
    try {
      const res = await api.software.checkExpirations();
      logActivity("Triggered manual 7-day software expiration email check.");
      return res;
    } catch (err) {
      console.error("Failed to trigger software expiration check:", err);
      throw err;
    }
  }

  async function sendSoftwareReminder(id) {
    try {
      const res = await api.software.sendReminder(id);
      logActivity(`Sent manual reminder email for software subscription ${id}.`);
      return res;
    } catch (err) {
      console.error(`Failed to send reminder for software subscription ${id}:`, err);
      throw err;
    }
  }

  const value = useMemo(
    () => ({
      categories,
      vendors,
      employees,
      inventoryBatches,
      assets,
      assignmentHistory,
      maintenanceRecords,
      activityLog,
      softwareList,
      loading,
      error,
      refreshData: loadAllData,
      fetchEmployees,
      addInventoryBatch,
      updateInventoryBatch,
      deleteInventoryBatch,
      addAsset,
      updateAsset,
      assignAsset,
      unassignAsset,
      transferAsset,
      changeAssetStatus,
      raiseMaintenance,
      closeMaintenance,
      retireAsset,
      addVendor,
      updateVendor,
      deleteVendor,
      addEmployee,
      addCategory,
      updateCategory,
      deleteCategory,
      addSoftware,
      updateSoftware,
      deleteSoftware,
      checkSoftwareExpirations,
      sendSoftwareReminder,
      logActivity,
    }),
    [
      categories,
      vendors,
      employees,
      inventoryBatches,
      assets,
      assignmentHistory,
      maintenanceRecords,
      activityLog,
      softwareList,
      loading,
      error,
      loadAllData,
      fetchEmployees,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
