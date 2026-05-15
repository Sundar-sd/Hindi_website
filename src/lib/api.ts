import {
  Engineer, Site, Worker, Duty, Advance, Expense, Transaction
} from "../types";

const API_BASE = "/api-manpower";

const MANPOWER_ENDPOINTS = {
  engineers: `${API_BASE}/engineers/`,
  sites: `${API_BASE}/sites/`,
  worker_categories: `${API_BASE}/worker-categories/`,
  workers: `${API_BASE}/workers/`,
  worker_database: `${API_BASE}/worker-database/`,
  duties: `${API_BASE}/duties/`,
  advances: `${API_BASE}/advances/`,
  expenses: `${API_BASE}/expenses/`,
  company_expenses: `${API_BASE}/company-expenses/`,
  transactions: `${API_BASE}/transactions/`, // Back to using slash as the user provided this
  payouts: `${API_BASE}/payouts/`,
  balancesheet: `${API_BASE}/balancesheet/`
};

const STORAGE_KEYS = {
  ENGINEERS: 'ha_engineers',
  SITES: 'ha_sites',
  WORKERS: 'ha_workers',
  DUTIES: 'ha_duties',
  ADVANCES: 'ha_advances',
  TRANSACTIONS: 'ha_transactions',
  GLOBAL_STATUS: 'ha_global_status',
  GENERAL_EXPENSES: 'ha_general_expenses',
  COMPANY_EXPENSES: 'ha_company_expenses',
  CATEGORIES: 'ha_categories'
};

const getStorage = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  try {
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setStorage = <T>(key: string, data: T) => {
  localStorage.setItem(key, JSON.stringify(data));
};


const normalizeApiUrl = (url: string | Request | URL): string | Request | URL => {
  if (typeof url !== "string") return url;

  let normalized = url;

  // If it's a full URL, leave it alone
  if (normalized.startsWith("http")) return normalized;

  // Prepend API_BASE if it's a relative path and doesn't already have it
  if (normalized.startsWith("/") && !normalized.startsWith(API_BASE)) {
    normalized = `${API_BASE}${normalized}`;
  } else if (!normalized.startsWith("/") && !normalized.startsWith(API_BASE)) {
    normalized = `${API_BASE}/${normalized}`;
  }
  
  // Clean up double slashes (except the one after http:)
  normalized = normalized.replace(/([^:]\/)\/+/g, "$1");
  
  return normalized;
};

const apiFetch = async (url: string | Request | URL, options?: RequestInit) => {
  const normalizedUrl = normalizeApiUrl(url);
  const urlStr = typeof normalizedUrl === 'string' ? normalizedUrl : (normalizedUrl as any).url || '';
  
  const headers: any = { ...options?.headers };
  if (urlStr.includes('ngrok')) {
    headers['ngrok-skip-browser-warning'] = 'true';
  }

  console.log(`[API] Fetching: ${normalizedUrl}`, { ...options, headers });
  
  return fetch(normalizedUrl, {
    mode: 'cors',
    ...options,
    headers
  });
};

const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const apiService = {
  // Engineers
  getEngineers: async (): Promise<Engineer[]> => {
    try {
      const res = await apiFetch(MANPOWER_ENDPOINTS.engineers);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      return data.map((item: any) => ({
        id: String(item.id),
        name: item.name,
        type: (item.role || item.type) === 'contractor' || (item.role || item.type) === 'Contractor' ? 'Contractor' : 'Engineer'
      }));
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  createEngineer: async (data: Partial<Engineer>): Promise<Engineer> => {
    const payload = {
      name: data.name,
      type: data.type === 'Contractor' ? 'Contractor' : 'Engineer',
      role: data.type === 'Contractor' ? 'contractor' : 'engineer'
    };
    try {
      const res = await apiFetch(MANPOWER_ENDPOINTS.engineers, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[API Error] Status ${res.status}:`, errorText);
        throw new Error(`Failed to create engineer: ${res.status}`);
      }
      const d = await res.json();
      return { 
        id: String(d.id), 
        name: d.name, 
        type: (d.type || d.role) === 'Contractor' || (d.type || d.role) === 'contractor' ? 'Contractor' : 'Engineer' 
      };
    } catch (err) {
      console.error("[CORS/Network Error] Failed to reach engineer endpoint:", err);
      throw err;
    }
  },
  updateEngineer: async (id: string, data: Partial<Engineer>): Promise<Engineer> => {
    const payload: any = {};
    if (data.name) payload.name = data.name;
    if (data.type) {
      payload.type = data.type === 'Contractor' ? 'Contractor' : 'Engineer';
      payload.role = data.type === 'Contractor' ? 'contractor' : 'engineer';
    }

    try {
      const res = await apiFetch(`${MANPOWER_ENDPOINTS.engineers}${id}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to update");
      const d = await res.json();
      return { id: String(d.id), name: d.name, type: (d.type || d.role) === 'Contractor' || (d.type || d.role) === 'contractor' ? 'Contractor' : 'Engineer' };
    } catch (err) {
      console.error("[CORS/Network Error] Update engineer failed:", err);
      throw err;
    }
  },
  deleteEngineer: async (id: string): Promise<void> => {
    try {
      const res = await apiFetch(`${MANPOWER_ENDPOINTS.engineers}${id}/`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete");
    } catch (err) {
      console.error("[CORS/Network Error] Delete engineer failed:", err);
      throw err;
    }
  },

  // Sites
  getSites: async (): Promise<Site[]> => {
    try {
      const res = await apiFetch(MANPOWER_ENDPOINTS.sites);
      if (!res.ok) throw new Error("Failed to fetch sites");
      const data = await res.json();
      return data.map((item: any) => ({
        id: String(item.id),
        engineerId: String(item.engineerId || item.person),
        name: item.name || item.site_name
      }));
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  createSite: async (data: Partial<Site>): Promise<Site> => {
    const personId = isNaN(Number(data.engineerId)) ? data.engineerId : Number(data.engineerId);
    
    const payload = {
      engineerId: personId, 
      name: data.name
    };
    const res = await apiFetch(MANPOWER_ENDPOINTS.sites, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[API Error] Create site failed (${res.status}):`, errorText);
      throw new Error(`Failed to create site: ${res.status}`);
    }
    const d = await res.json();
    return { 
      id: String(d.id), 
      engineerId: String(d.engineerId || d.person), 
      name: d.name || d.site_name 
    };
  },
  updateSite: async (id: string, data: Partial<Site>): Promise<Site> => {
    const payload: any = {};
    if (data.engineerId) payload.person = Number(data.engineerId);
    if (data.name) payload.site_name = data.name;

    const res = await apiFetch(`${MANPOWER_ENDPOINTS.sites}${id}/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Failed to update site");
    const d = await res.json();
    return { 
      id: String(d.id), 
      engineerId: String(d.engineerId || d.person), 
      name: d.name || d.site_name 
    };
  },
  deleteSite: async (id: string): Promise<void> => {
    const res = await apiFetch(`${MANPOWER_ENDPOINTS.sites}${id}/`, {
      method: "DELETE"
    });
    if (!res.ok) throw new Error("Failed to delete site");
  },

  // Workers
  getWorkers: async (): Promise<Worker[]> => {
    try {
      const res = await apiFetch(MANPOWER_ENDPOINTS.workers);
      if (!res.ok) throw new Error("Failed to fetch workers");
      const data = await res.json();
      return data.map((item: any) => ({
        id: String(item.id),
        siteId: String(item.siteId || item.site),
        name: item.name || item.workername,
        category: item.category,
        selectedWage: item.selectedWage || item.new_amount || item.wage || item.amount || 0,
        isActive: true
      }));
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  createWorker: async (data: Partial<Worker>): Promise<Worker> => {
    const payload = {
      siteId: isNaN(Number(data.siteId)) ? data.siteId : Number(data.siteId),
      name: data.name,
      workername: data.name,
      category: data.category || "",
      selectedWage: data.selectedWage || (data as any).wagePerDuty || (data as any).amount || 0,
      wage: data.selectedWage || (data as any).wagePerDuty || (data as any).amount || 0,
      new_amount: data.selectedWage || (data as any).wagePerDuty || (data as any).amount || 0
    };
    const res = await apiFetch(MANPOWER_ENDPOINTS.workers, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errorText = await res.text();
      console.error("[API Error] Create worker failed:", errorText);
      throw new Error("Failed to create worker");
    }
    const d = await res.json();
    return {
      id: String(d.id),
      siteId: String(d.siteId || d.site),
      name: d.name || d.workername,
      category: d.category,
      selectedWage: d.selectedWage || d.new_amount || d.wage || d.amount || 0,
      isActive: true
    };
  },
  updateWorker: async (id: string, data: Partial<Worker>): Promise<Worker> => {
    const payload: any = {};
    if (data.name) {
      payload.name = data.name;
      payload.workername = data.name;
    }
    if (data.category) payload.category = data.category;
    if (data.siteId) {
      const sId = isNaN(Number(data.siteId)) ? data.siteId : Number(data.siteId);
      payload.siteId = sId;
      payload.site = sId;
    }
    if (data.selectedWage !== undefined || (data as any).wagePerDuty !== undefined || (data as any).amount !== undefined) {
      const wageVal = data.selectedWage ?? (data as any).wagePerDuty ?? (data as any).amount;
      payload.selectedWage = wageVal;
      payload.wage = wageVal;
      payload.new_amount = wageVal;
      payload.amount = wageVal;
    }

    const res = await apiFetch(`${MANPOWER_ENDPOINTS.workers}${id}/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errorText = await res.text();
      console.error("[API Error] Update worker failed:", errorText);
      throw new Error("Failed to update worker");
    }
    const d = await res.json();
    return {
      id: String(d.id),
      siteId: String(d.siteId || d.site),
      name: d.name || d.workername,
      category: d.category,
      selectedWage: d.new_amount || d.wage || d.amount || 0,
      isActive: true
    };
  },
  deleteWorker: async (id: string): Promise<void> => {
    const res = await apiFetch(`${MANPOWER_ENDPOINTS.workers}/${id}/`, {
      method: "DELETE"
    });
    if (!res.ok) throw new Error("Failed to delete worker");
  },

  // Duties
  getDuties: async (): Promise<Duty[]> => {
    try {
      const res = await apiFetch(MANPOWER_ENDPOINTS.duties);
      if (!res.ok) throw new Error("Failed to fetch duties");
      const data = await res.json();
      return data.map((item: any) => ({
        id: String(item.id),
        workerId: String(item.workerId || item.worker),
        siteId: String(item.siteId || item.site),
        date: item.date,
        dutyValue: Number(item.dutyValue || 0)
      }));
    } catch {
      return [];
    }
  },
  saveWeeklyDuties: async (siteId: string, workerId: string, startDate: string, daysList: number[]) => {
    try {
      // 1. Get all current duties to find existing ones in this range
      const res1 = await apiFetch(MANPOWER_ENDPOINTS.duties);
      const allDuties = await res1.json();
      
      const sId = isNaN(Number(siteId)) ? siteId : Number(siteId);
      const wId = isNaN(Number(workerId)) ? workerId : Number(workerId);

      const promises = [];

      for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const dateStr = formatDateLocal(d);
        const value = daysList[i];

        const existing = allDuties.find((t: any) => 
          String(t.siteId || t.site) === String(siteId) && 
          String(t.workerId || t.worker) === String(workerId) && 
          t.date === dateStr
        );

        const payload = {
          siteId: sId,
          site: sId,
          workerId: wId,
          worker: wId,
          date: dateStr,
          dutyValue: value
        };

        if (value > 0) {
          if (existing) {
            // Update
            promises.push(apiFetch(`${MANPOWER_ENDPOINTS.duties}${existing.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            }));
          } else {
            // Create
            promises.push(apiFetch(`${MANPOWER_ENDPOINTS.duties}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            }));
          }
        } else if (existing) {
          // Cleanup zero values by deleting record
          promises.push(apiFetch(`${MANPOWER_ENDPOINTS.duties}${existing.id}/`, {
            method: "DELETE"
          }));
        }
      }

      const results = await Promise.all(promises);
      const failed = results.find(r => !r.ok);
      if (failed) {
        const errText = await failed.text();
        console.error("[API Error] Bulk save duty failure:", errText);
        throw new Error("Failed to save some duties");
      }
    } catch (e: any) {
      console.error("[API Error] saveWeeklyDuties exception:", e);
      throw e;
    }
  },

  // Worker Categories
  getWorkerCategories: async () => {
    try {
      const res = await apiFetch(MANPOWER_ENDPOINTS.worker_categories);
      if (!res.ok) throw new Error("Failed to fetch categories");
      const data = await res.json();
      return data.map((c: any) => ({
        id: String(c.id),
        name: c.name || c.categoryname || "Unnamed"
      }));
    } catch {
      return [
        { id: 'mason', name: 'Mason' },
        { id: 'helper', name: 'Helper' }
      ];
    }
  },

  // Advances
  getAdvances: async (): Promise<Advance[]> => {
    try {
      const res = await apiFetch(MANPOWER_ENDPOINTS.advances);
      if (!res.ok) throw new Error("Failed to fetch advances");
      const data = await res.json();
      console.log("[API DEBUG] Advances Raw Data Sample:", data[0]);
      
      const extractId = (val: any) => {
        if (!val) return "";
        if (typeof val === 'object' && val.id) return String(val.id);
        return String(val);
      };

      return data.map((item: any) => ({
        id: String(item.id),
        siteId: extractId(item.siteId || item.site),
        workerId: extractId(item.workerId || item.worker),
        amount: Number(item.amount || item.advance || item.total_advance || 0),
        remarks: item.remarks || "",
        date: item.date || new Date().toISOString().split("T")[0]
      }));
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  createAdvance: async (data: Partial<Advance>): Promise<Advance> => {
    const payload = {
      siteId: data.siteId,
      workerId: data.workerId,
      amount: data.amount || 0,
      remarks: data.remarks || "Advance given",
      date: data.date || new Date().toISOString().split("T")[0]
    };
    const res = await apiFetch(MANPOWER_ENDPOINTS.advances, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("[API Error] Create advance failure:", errText);
      throw new Error(`Failed to create advance: ${errText}`);
    }
    const d = await res.json();
    return {
      id: String(d.id),
      siteId: String(d.site),
      workerId: String(d.worker),
      amount: d.advance,
      remarks: d.remarks,
      date: d.date || payload.date
    };
  },
  updateAdvance: async (id: string, data: Partial<Advance>): Promise<Advance> => {
    const payload: any = {};
    if (data.siteId !== undefined) {
      payload.site = data.siteId;
      payload.siteId = data.siteId;
    }
    if (data.workerId !== undefined) {
      payload.worker = data.workerId;
      payload.workerId = data.workerId;
    }
    if (data.amount !== undefined) payload.advance = data.amount;
    if (data.remarks !== undefined) payload.remarks = data.remarks;
    if (data.date !== undefined) payload.date = data.date;

    const res = await apiFetch(`${MANPOWER_ENDPOINTS.advances}${id}/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Failed to update advance");
    const d = await res.json();
    return {
      id: String(d.id),
      siteId: String(d.site),
      workerId: String(d.worker),
      amount: d.advance,
      remarks: d.remarks,
      date: d.date || payload.date || new Date().toISOString().split("T")[0]
    };
  },
  deleteAdvance: async (id: string): Promise<void> => {
    const res = await apiFetch(`${MANPOWER_ENDPOINTS.advances}${id}/`, {
      method: "DELETE"
    });
    if (!res.ok) throw new Error("Failed to delete advance");
  },

  // Transactions
  getTransactions: async (): Promise<Transaction[]> => {
    try {
      const res = await apiFetch(MANPOWER_ENDPOINTS.transactions);
      if (!res.ok) throw new Error("Failed to fetch transactions");
      const data = await res.json();
      
      return data.map((item: any) => {
        const isReceived = item.curr_emp_paid !== undefined || item.type === "Received";
        if (isReceived) {
          return {
            id: `in_${item.id}`,
            remoteId: item.id,
            type: "Received",
            date: item.date || item.created_at || item.payout_date,
            paidAmount: Number(item.curr_emp_paid || item.paidAmount || item.amount || 0),
            fullAmount: Number(item.total_wages || 0),
            balanceAmount: Number(item.pending_site_amt || 0),
            remarks: item.remarks || "",
            siteId: String(item.site),
            personName: item.person_name,
          };
        } else {
          return {
            id: `out_${item.id}`,
            remoteId: item.id,
            type: "Paid",
            date: item.date || item.payout_date || item.created_at,
            paidAmount: Number(item.curr_paying_amt || item.paidAmount || item.amount || item.balance || 0),
            totalAmount: Number(item.new_total_wages || item.total_wages || (Number(item.total_duty || 0) * Number(item.rate || 0)) || 0),
            balanceAmount: Number(item.pending_amount || 0),
            remarks: item.remarks || (item.total_duty ? `Duty: ${item.total_duty}, Rate: ${item.rate}` : ""),
            workerId: String(item.worker),
            siteId: String(item.site),
          };
        }
      });
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  createTransaction: async (data: Partial<Transaction>): Promise<Transaction> => {
    let personName = "General";
    let role = "engineer";

    if (data.engineerId) {
      const engineers = await apiService.getEngineers();
      const eng = engineers.find(e => e.id === data.engineerId);
      if (eng) {
        personName = eng.name;
        role = eng.type?.toLowerCase() || "engineer";
      }
    }

    const isInflow = data.type === 'Received';

    if (isInflow) {
      const payload: any = {
        role: role,
        engType: role === 'engineer' ? 'Engineer' : 'Contractor',
        person_name: personName,
        site: data.siteId || null,
        siteId: data.siteId || null,
        curr_emp_paid: data.paidAmount || 0,
        paidAmount: data.paidAmount || 0,
        amount: data.paidAmount || 0,
        total_wages: data.fullAmount || 0,
        remarks: data.remarks || "",
        date: data.date || undefined,
        type: "Received"
      };

      const res = await apiFetch(MANPOWER_ENDPOINTS.transactions, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        console.error("[API Error Details] Inflow creation failed:", errData);
        const errMsg = Array.isArray(errData) ? errData[0] : (errData?.message || errData?.detail || JSON.stringify(errData) || "Failed to create inflow transaction");
        throw new Error(errMsg);
      }
      const d = await res.json();
      return {
        id: `in_${d.id}`,
        remoteId: d.id,
        type: "Received",
        date: d.date || d.created_at,
        paidAmount: d.curr_emp_paid || d.paidAmount,
        fullAmount: d.total_wages,
        balanceAmount: d.pending_site_amt,
        remarks: d.remarks,
        siteId: String(d.site),
        personName: d.person_name,
        engineerId: data.engineerId
      };
    } else {
      const payload: any = {
        role: role,
        engType: role === 'engineer' ? 'Engineer' : 'Contractor',
        person_name: personName,
        site: data.siteId || null,
        siteId: data.siteId || null,
        worker: data.workerId || null,
        workerId: data.workerId || null,
        curr_paying_amt: data.paidAmount || 0,
        paidAmount: data.paidAmount || 0,
        amount: data.paidAmount || 0,
        new_total_wages: data.totalAmount || 0,
        remarks: data.remarks || "",
        date: data.date || undefined,
        type: "Paid"
      };

      const res = await apiFetch(MANPOWER_ENDPOINTS.transactions, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        console.error("[API Error Details] Outflow creation failed:", errData);
        const errMsg = Array.isArray(errData) ? errData[0] : (errData?.message || errData?.detail || JSON.stringify(errData) || "Failed to create outflow transaction");
        throw new Error(errMsg);
      }
      const d = await res.json();
      return {
        id: `out_${d.id}`,
        remoteId: d.id,
        type: "Paid",
        date: d.date,
        paidAmount: d.curr_paying_amt || d.paidAmount,
        remarks: d.remarks,
        workerId: String(d.worker),
        siteId: String(d.site),
        totalAmount: d.new_total_wages,
        balanceAmount: d.pending_amount,
        engineerId: data.engineerId
      };
    }
  },
  updateTransaction: async (id: string, data: Partial<Transaction>): Promise<Transaction> => {
    const isInflow = id.startsWith('in_');
    const remoteId = id.replace('in_', '').replace('out_', '');

    const payload: any = {};
    if (isInflow) {
      if (data.paidAmount !== undefined) payload.curr_emp_paid = data.paidAmount;
    } else {
      if (data.paidAmount !== undefined) payload.curr_paying_amt = data.paidAmount;
    }
    if (data.remarks !== undefined) payload.remarks = data.remarks;
    if (data.date !== undefined) payload.date = data.date;

    if (data.engineerId) {
      const engineers = await apiService.getEngineers();
      const eng = engineers.find(e => e.id === data.engineerId);
      if (eng) {
        payload.person_name = eng.name;
        payload.role = eng.type?.toLowerCase() || "engineer";
      }
    }
    if (data.siteId) payload.site = data.siteId;
    if (!isInflow && data.workerId) payload.worker = data.workerId;

    const res = await apiFetch(`${MANPOWER_ENDPOINTS.transactions}${remoteId}/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Failed to update transaction`);
    const d = await res.json();

    if (isInflow) {
      return {
        id: `in_${d.id}`,
        remoteId: d.id,
        type: "Received",
        date: d.date || d.created_at,
        paidAmount: d.curr_emp_paid,
        fullAmount: d.total_wages,
        balanceAmount: d.pending_site_amt,
        remarks: d.remarks,
        personName: d.person_name,
        siteId: String(d.site),
        engineerId: data.engineerId
      };
    } else {
      return {
        id: `out_${d.id}`,
        remoteId: d.id,
        type: "Paid",
        date: d.date,
        paidAmount: d.curr_paying_amt,
        remarks: d.remarks,
        workerId: String(d.worker),
        siteId: String(d.site),
        totalAmount: d.new_total_wages,
        balanceAmount: d.pending_amount,
        engineerId: data.engineerId
      };
    }
  },
  deleteTransaction: async (id: string): Promise<void> => {
    const remoteId = id.replace('in_', '').replace('out_', '');

    const res = await apiFetch(`${MANPOWER_ENDPOINTS.transactions}${remoteId}/`, {
      method: "DELETE"
    });
    if (!res.ok) throw new Error("Failed to delete transaction");
  },

  getTransactionSummary: async () => {
    const txs = await apiService.getTransactions();
    const received = txs.filter(t => t.type === 'Received').reduce((s, t) => s + t.paidAmount, 0);
    const paid = txs.filter(t => t.type === 'Paid').reduce((s, t) => s + t.paidAmount, 0);
    return {
      totalReceived: received,
      totalPaid: paid,
      netBalance: received - paid
    };
  },

  // Global Status
  getGlobalStatus: async () => getStorage(STORAGE_KEYS.GLOBAL_STATUS, { cashInHand: 0, cashInBank: 0 }),
  updateGlobalStatus: async (data: { cashInHand: number; cashInBank: number }) => {
    setStorage(STORAGE_KEYS.GLOBAL_STATUS, data);
    return data;
  },

  // General Expenses
  getGeneralExpenses: async (): Promise<Expense[]> => {
    try {
      const res = await apiFetch(`${MANPOWER_ENDPOINTS.expenses}/`);
      if (!res.ok) throw new Error("Failed to fetch general expenses");
      const data = await res.json();
      console.log("[API DEBUG] Expenses Raw Data Sample:", data[0]);

      const extractId = (val: any) => {
        if (!val) return undefined;
        if (typeof val === 'object' && val.id) return String(val.id);
        return String(val);
      };

      return data.map((item: any) => {
        const parsedAmount = parseFloat(item.amount);
        
        // Exhaustive name search
        const resolveName = (i: any) => {
          if (i.personName) return String(i.personName);
          if (i.person_name) return String(i.person_name);
          if (i.staff_name) return String(i.staff_name);
          if (i.person) {
            if (typeof i.person === 'string') return i.person;
            if (i.person.name) return String(i.person.name);
            if (i.person.username) return String(i.person.username);
          }
          if (i.engineer) {
            if (typeof i.engineer === 'string') return i.engineer;
            if (i.engineer.name) return String(i.engineer.name);
          }
          if (i.worker) {
            if (typeof i.worker === 'string') return i.worker;
            if (i.worker.name) return String(i.worker.name);
          }
          if (i.name) return String(i.name);
          return "-";
        };

        return {
          id: String(item.id),
          expenseType: item.expenseType || (item.role === "contractor" ? "Contractor" : "Engineer"),
          siteId: extractId(item.siteId || item.site),
          category: item.category || (Array.isArray(item.expenses_type) ? item.expenses_type[0] : item.expenses_type) || "misc",
          remarks: String(item.remarks || ""),
          amount: isNaN(parsedAmount) ? 0 : parsedAmount,
          date: item.date || new Date().toISOString().split("T")[0],
          personName: resolveName(item),
          role: String(item.role || item.expenseType || "-")
        };
      });
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  createGeneralExpense: async (data: Partial<Expense>): Promise<Expense> => {
    let personName = "General";
    if (data.engineerId) {
      const engineers = await apiService.getEngineers();
      const eng = engineers.find(e => e.id === data.engineerId);
      if (eng) personName = eng.name;
    }

    const payload = {
      expenseType: data.expenseType || "Engineer",
      category: data.category || "misc",
      personName: String(personName),
      person_name: String(personName),
      siteId: data.siteId,
      site: data.siteId,
      worker: null,
      remarks: String(data.remarks || ""),
      amount: Number(data.amount || 0),
      date: data.date || new Date().toISOString().split("T")[0]
    };

    const res = await apiFetch(`${MANPOWER_ENDPOINTS.expenses}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("[API Error] Create expense failure:", errText);
      throw new Error(`Failed to create general expense: ${errText}`);
    }
    const d = await res.json();
    const finalAmount = parseFloat(d.amount);
    return {
      id: String(d.id),
      expenseType: d.role === "contractor" ? "Contractor" : "Engineer",
      siteId: d.site ? String(d.site) : undefined,
      category: (d.expenses_type && d.expenses_type.length) ? d.expenses_type[0] : "misc",
      remarks: String(d.remarks || ""),
      amount: isNaN(finalAmount) ? 0 : finalAmount,
      date: d.date || payload.date
    };
  },
  updateGeneralExpense: async (id: string, data: Partial<Expense>): Promise<Expense> => {
    const payload: any = {};
    if (data.expenseType) payload.role = data.expenseType.toLowerCase();
    if (data.category) payload.expenses_type = [data.category];
    if (data.remarks !== undefined) payload.remarks = data.remarks;
    if (data.siteId !== undefined) payload.site = data.siteId ? Number(data.siteId) : null;
    if (data.amount !== undefined) payload.amount = data.amount;
    if (data.date !== undefined) payload.date = data.date;

    if (data.engineerId) {
      const engineers = await apiService.getEngineers();
      const eng = engineers.find(e => e.id === data.engineerId);
      if (eng) payload.person_name = eng.name;
    }

    const res = await apiFetch(`${MANPOWER_ENDPOINTS.expenses}${id}/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Failed to update general expense");
    const d = await res.json();
    return {
      id: String(d.id),
      expenseType: d.role === "contractor" ? "Contractor" : "Engineer",
      siteId: d.site ? String(d.site) : undefined,
      category: (d.expenses_type && d.expenses_type.length) ? d.expenses_type[0] : "misc",
      remarks: d.remarks,
      amount: d.amount || payload.amount || 0,
      date: d.date || payload.date || new Date().toISOString().split("T")[0]
    };
  },
  deleteGeneralExpense: async (id: string): Promise<void> => {
    const res = await apiFetch(`${MANPOWER_ENDPOINTS.expenses}/${id}/`, {
      method: "DELETE"
    });
    if (!res.ok) throw new Error("Failed to delete general expense");
  },

  // Company Expenses
  getCompanyExpenses: async (): Promise<Expense[]> => {
    try {
      const res = await apiFetch(`${MANPOWER_ENDPOINTS.company_expenses}/`);
      if (!res.ok) throw new Error("Failed to fetch company expenses");
      const data = await res.json();
      return data.map((item: any) => ({
        id: String(item.id),
        date: item.date || new Date().toISOString().split("T")[0],
        description: item.workername || "Company Expense",
        amount: Number(item.amount || 0),
        remarks: item.remarks
      }));
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  createCompanyExpense: async (data: Partial<Expense>): Promise<Expense> => {
    const payload = {
      workername: data.description || "Company",
      date: data.date || new Date().toISOString().split("T")[0],
      amount: data.amount || 0,
      remarks: data.remarks || data.description || "Company expense"
    };
    const res = await apiFetch(`${MANPOWER_ENDPOINTS.company_expenses}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Failed to create company expense");
    const d = await res.json();
    return {
      id: String(d.id),
      date: d.date || payload.date,
      description: d.workername,
      amount: d.amount,
      remarks: d.remarks
    };
  },
  updateCompanyExpense: async (id: string, data: Partial<Expense>): Promise<Expense> => {
    const payload: any = {};
    if (data.description !== undefined) payload.workername = data.description;
    if (data.date !== undefined) payload.date = data.date;
    if (data.amount !== undefined) payload.amount = data.amount;
    if (data.remarks !== undefined) payload.remarks = data.remarks;

    const res = await apiFetch(`${MANPOWER_ENDPOINTS.company_expenses}/${id}/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Failed to update company expense");
    const d = await res.json();
    return {
      id: String(d.id),
      date: d.date || payload.date || new Date().toISOString().split("T")[0],
      description: d.workername,
      amount: d.amount,
      remarks: d.remarks
    };
  },
  deleteCompanyExpense: async (id: string): Promise<void> => {
    const res = await apiFetch(`${MANPOWER_ENDPOINTS.company_expenses}${id}/`, {
      method: "DELETE"
    });
    if (!res.ok) throw new Error("Failed to delete company expense");
  },

  // Fetch the ACTUAL pending amount the backend holds for a worker
  // This prevents 400 errors from client-side calculation mismatches
  getWorkerPendingAmount: async (workerId: string): Promise<number> => {
    try {
      const [outflowRes, payoutRes] = await Promise.all([
        apiFetch(`${MANPOWER_ENDPOINTS.transactions}outflow/`),
        apiFetch(MANPOWER_ENDPOINTS.payouts)
      ]);

      if (!outflowRes.ok || !payoutRes.ok) throw new Error("Failed to fetch balance records");

      const outflows = await outflowRes.json();
      const payouts = await payoutRes.json();

      const workerOutflows = outflows.filter((o: any) => String(o.worker) === workerId);
      const workerPayouts = payouts.filter((p: any) => String(p.worker) === workerId);

      // Find the absolute latest record across both tables
      let latestPending = 0;
      let lastId = -1;

      workerOutflows.forEach((o: any) => {
        if (o.id > lastId) {
          lastId = o.id;
          latestPending = o.pending_amount || 0;
        }
      });

      workerPayouts.forEach((p: any) => {
        // We use a combined heuristic or assume IDs are sequential across relevant activity
        // In practice, we should check which one was created last
        if (p.id > lastId) { // Assuming IDs are roughly comparable or checking timestamps if available
          lastId = p.id;
          latestPending = p.pending_amount || 0;
        }
      });

      if (lastId !== -1) return latestPending;

      // No records exist - calculate from backend tables & advances
      const [tablesRes, advancesRes] = await Promise.all([
        apiFetch(MANPOWER_ENDPOINTS.duties),
        apiFetch(MANPOWER_ENDPOINTS.advances)
      ]);

      if (!tablesRes.ok || !advancesRes.ok) throw new Error("Failed to fetch data");

      const tables = await tablesRes.json();
      const advancesList = await advancesRes.json();

      const totalWages = tables
        .filter((t: any) => String(t.worker) === workerId)
        .reduce((sum: number, t: any) => sum + (t.total_wages || 0), 0);

      const totalAdvance = advancesList
        .filter((a: any) => String(a.worker) === workerId)
        .reduce((sum: number, a: any) => sum + (a.advance || 0), 0);

      return totalWages - totalAdvance;
    } catch (e) {
      console.error("Error getting worker pending amount:", e);
      return 0;
    }
  },

  getSiteTotalValue: async (siteId: string): Promise<number> => {
    try {
      const tablesRes = await apiFetch(MANPOWER_ENDPOINTS.duties);
      if (!tablesRes.ok) throw new Error("Failed to fetch tables");
      const tables = await tablesRes.json();
      return tables
        .filter((t: any) => String(t.site) === siteId)
        .reduce((sum: number, t: any) => sum + (t.total_wages || 0), 0);
    } catch (e) {
      console.error("Error getting site total value:", e);
      return 0;
    }
  },

  // Fetch the ACTUAL pending site amount the backend holds for a site
  // This prevents 400 errors when recording inflow payments
  getSitePendingAmount: async (siteId: string, date?: string): Promise<{ siteTotal: number; pendingSiteAmt: number; inflowTotal: number }> => {
    try {
      const [inflowRes, payoutRes] = await Promise.all([
        apiFetch(`${MANPOWER_ENDPOINTS.transactions}inflow/`),
        apiFetch(MANPOWER_ENDPOINTS.payouts)
      ]);

      if (!inflowRes.ok || !payoutRes.ok) throw new Error("Failed to fetch site records");

      const inflows = await inflowRes.json();
      const payouts = await payoutRes.json();

      const siteInflows = inflows.filter((i: any) => String(i.site) === siteId);
      const sitePayouts = payouts.filter((p: any) => String(p.site) === siteId);

      let latestSiteTotal = 0;
      let latestPendingSiteAmt = 0;
      let latestInflowTotal = 0;
      let lastInflowId = -1;
      let lastPayoutId = -1;

      siteInflows.forEach((i: any) => {
        if (i.id > lastInflowId) {
          lastInflowId = i.id;
          latestInflowTotal = i.inflow_total || 0;
          latestPendingSiteAmt = i.pending_site_amt || 0;
          latestSiteTotal = i.site_total || 0;
        }
      });

      sitePayouts.forEach((p: any) => {
        if (p.id > lastPayoutId) {
          lastPayoutId = p.id;
          // Payout records track the total accrual ('new_site_total')
          // If this is newer than the last inflow, the pending amount increases
          if (p.id > lastInflowId) {
            latestSiteTotal = p.new_site_total || 0;
            latestPendingSiteAmt = latestSiteTotal - latestInflowTotal;
          }
        }
      });

      // Always reconcile with the current Table Distribution (Source of truth for earnings)
      const tablesRes = await apiFetch(MANPOWER_ENDPOINTS.duties);
      if (tablesRes.ok) {
        const tables = await tablesRes.json();
        const matchingTables = tables.filter((t: any) => String(t.site) === siteId && (!date || t.start_date === date));
        const tableTotal = matchingTables.length > 0 ? (matchingTables[0].total_wages || 0) : 0;

        // If the table total has increased but no payout record exists yet, 
        // increment the pending amount so the inflow can be accepted.
        if (tableTotal > latestSiteTotal) {
          const diff = tableTotal - latestSiteTotal;
          latestPendingSiteAmt += diff;
          latestSiteTotal = tableTotal;
        }
      }

      return {
        siteTotal: latestSiteTotal,
        pendingSiteAmt: latestPendingSiteAmt,
        inflowTotal: latestInflowTotal
      };
    } catch (e) {
      console.error("Error getting site pending amount:", e);
      return { siteTotal: 0, pendingSiteAmt: 0, inflowTotal: 0 };
    }
  },

  // Worker & Site Payouts/Balances (CLIENT-SIDE CALCULATION)
  getWorkerPayout: async (id: string) => {
    try {
      const res = await apiFetch(MANPOWER_ENDPOINTS.payouts);
      if (!res.ok) throw new Error("Failed to fetch payouts from server");
      const payouts = await res.json();

      // Filter the global payout list for this specific worker
      const workerPayouts = payouts.filter((p: any) => String(p.worker) === id);

      // Use the latest record's 'new_total_wages' or sum them if applicable.
      // Usually, 'new_total_wages' in the latest record represents the cumulative outstanding.
      // If there are multiple, the user wants the value directly from the payload key.
      const latestPayout = workerPayouts.length > 0 ? workerPayouts[workerPayouts.length - 1] : null;
      const totalWages = latestPayout ? (latestPayout.new_total_wages || latestPayout.amount || 0) : 0;

      // We still need to account for advances and transactions logged in the current system
      const [advances, transactions] = await Promise.all([
        apiService.getAdvances(),
        apiService.getTransactions()
      ]);

      const totalAdvance = advances.filter(a => a.workerId === id).reduce((s: number, a: any) => s + a.amount, 0);
      const totalDirectPaid = transactions.filter(t => t.type === 'Paid' && t.workerId === id).reduce((s: number, t: any) => s + t.paidAmount, 0);

      const totalPaid = totalAdvance + totalDirectPaid;
      return {
        totalDuties: workerPayouts.reduce((s: number, p: any) => s + (p.total_duty || 0), 0),
        totalWages: totalWages, // This is the 'new_total_wages' from backend
        totalAdvance,
        totalDirectPaid,
        totalPaid,
        balance: totalWages - totalPaid // The actual pending amount
      };
    } catch (e) {
      console.error("Error in getWorkerPayout:", e);
      return { totalDuties: 0, totalWages: 0, totalAdvance: 0, totalDirectPaid: 0, totalPaid: 0, balance: 0 };
    }
  },

  getSiteBalance: async (id: string) => {
    try {
      const [sites, workers, transactions, expenses] = await Promise.all([
        apiService.getSites(),
        apiService.getWorkers(),
        apiService.getTransactions(),
        apiService.getGeneralExpenses()
      ]);

      const site = sites.find(s => s.id === id);
      if (!site) return { totalReceived: 0, totalSpent: 0, balance: 0 };

      const siteWorkers = workers.filter(w => w.siteId === id);
      const workerIds = siteWorkers.map(w => w.id);

      const totalReceived = transactions
        .filter(t => t.type === 'Received' && t.siteId === id)
        .reduce((sum, t) => sum + t.paidAmount, 0);

      const workerPayments = transactions
        .filter(t => t.type === 'Paid' && workerIds.includes(t.workerId!))
        .reduce((sum, t) => sum + t.paidAmount, 0);

      const siteExpenses = expenses
        .filter(e => e.siteId === id)
        .reduce((sum, e) => sum + e.amount, 0);

      const totalSpent = workerPayments + siteExpenses;
      return {
        totalReceived,
        totalSpent,
        balance: totalReceived - totalSpent
      };
    } catch (e) {
      console.error("Error in getSiteBalance:", e);
      return { totalReceived: 0, totalSpent: 0, balance: 0 };
    }
  },

  // Balance Sheet
  getBalanceSheets: async () => {
    try {
      const res = await apiFetch(MANPOWER_ENDPOINTS.balancesheet);
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((d: any) => ({
        id: String(d.id),
        role: d.role,
        person_name: d.person_name,
        site: String(d.site),
        inflow_total: d.inflow_total || 0,
        outflow_total: d.outflow_total || 0,
        expense_total: d.expense_total || 0,
        advance_total: d.advance_total || 0,
        site_paid_total: d.site_paid_total || 0,
        siteprofit: d.siteprofit || 0,
        contractor_pending_amount: d.contractor_pending_amount || 0,
        company_expense_total: d.company_expense_total || 0,
        inflow_data: d.inflow_data || [],
        outflow_data: d.outflow_data || [],
        expense_data: d.expense_data || [],
        advance_data: d.advance_data || [],
        company_expense_data: d.company_expense_data || []
      }));
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  createBalanceSheet: async (data: any) => {
    const payload = {
      role: data.role,
      person_name: data.person_name,
      site: data.site
    };
    const res = await apiFetch(MANPOWER_ENDPOINTS.balancesheet, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Failed to create balance sheet");
    const d = await res.json();
    return {
      id: String(d.id),
      role: d.role,
      person_name: d.person_name,
      site: String(d.site),
      inflow_total: d.inflow_total || 0,
      outflow_total: d.outflow_total || 0,
      expense_total: d.expense_total || 0,
      advance_total: d.advance_total || 0,
      site_paid_total: d.site_paid_total || 0,
      siteprofit: d.siteprofit || 0,
      contractor_pending_amount: d.contractor_pending_amount || 0,
      company_expense_total: d.company_expense_total || 0,
      inflow_data: d.inflow_data || [],
      outflow_data: d.outflow_data || [],
      expense_data: d.expense_data || [],
      advance_data: d.advance_data || [],
      company_expense_data: d.company_expense_data || []
    };
  },
  updateBalanceSheet: async (id: string, data: any) => {
    const payload = {
      role: data.role,
      person_name: data.person_name,
      site: Number(data.site)
    };
    const res = await apiFetch(`${MANPOWER_ENDPOINTS.balancesheet}${id}/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Failed to update balance sheet");
    const d = await res.json();
    return {
      id: String(d.id),
      role: d.role,
      person_name: d.person_name,
      site: String(d.site),
      inflow_total: d.inflow_total || 0,
      outflow_total: d.outflow_total || 0,
      expense_total: d.expense_total || 0,
      advance_total: d.advance_total || 0,
      site_paid_total: d.site_paid_total || 0,
      siteprofit: d.siteprofit || 0,
      contractor_pending_amount: d.contractor_pending_amount || 0,
      company_expense_total: d.company_expense_total || 0,
      inflow_data: d.inflow_data || [],
      outflow_data: d.outflow_data || [],
      expense_data: d.expense_data || [],
      advance_data: d.advance_data || [],
      company_expense_data: d.company_expense_data || []
    };
  },
  deleteBalanceSheet: async (id: string): Promise<void> => {
    const res = await apiFetch(`${MANPOWER_ENDPOINTS.balancesheet}${id}/`, {
      method: "DELETE"
    });
    if (!res.ok) throw new Error("Failed to delete balance sheet");
  },

  // Payouts (Remote API)
  getPayouts: async () => {
    try {
      const res = await apiFetch(MANPOWER_ENDPOINTS.payouts);
      if (!res.ok) throw new Error("Failed to fetch payouts");
      const data = await res.json();
      return data.map((p: any) => ({
        ...p,
        id: p.id,
        person_name: p.person_name || "General",
        site: String(p.site),
        total_duty: Number(p.total_duty || 0),
        new_amount: Number(p.new_amount || p.rate || p.amount || 0),
        new_total_wages: Number(p.new_total_wages || p.total_wages || (Number(p.total_duty || 0) * Number(p.new_amount || p.rate || p.amount || 0)))
      }));
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  createPayout: async (data: any) => {
    // Defensive mapping to ensure required backend fields are present
    const rate = data.rate || data.amount || data.new_amount;
    const duty = data.total_duty || data.duty || 0;
    const total = data.new_total_wages || (duty * rate);
    const balance = data.balance || total; // Default balance to total if not provided

    const payload = {
      ...data,
      siteId: data.siteId || data.site,
      workerId: data.workerId || data.worker,
      site: data.siteId || data.site,
      worker: data.workerId || data.worker,
      amount: rate,
      new_amount: rate,
      rate: rate,
      balance: balance,
      new_total_wages: total
    };

    const res = await apiFetch(MANPOWER_ENDPOINTS.payouts, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("[API Error] Create payout failure:", errText);
      throw new Error(`Failed to create payout: ${errText}`);
    }
    return await res.json();
  },
  updatePayout: async (id: number, data: {
    role: string;
    person_name: string;
    site: number;
    worker: number;
    total_duty: number;
    new_amount: number;
  }) => {
    const res = await apiFetch(`${MANPOWER_ENDPOINTS.payouts}/${id}/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to update payout");
    return await res.json();
  },
  deletePayout: async (id: number) => {
    const res = await apiFetch(`${MANPOWER_ENDPOINTS.payouts}/${id}/`, {
      method: "DELETE"
    });
    if (!res.ok) throw new Error("Failed to delete payout");
  },

  // Worker Database (New)
  getWorkerDatabase: async (search?: string) => {
    try {
      let url = `${MANPOWER_ENDPOINTS.worker_database}?_t=${Date.now()}`;
      if (search) {
        // Apply search to both generic search and specific worker_id field for maximum accuracy
        url += `&search=${encodeURIComponent(search)}&worker_id=${encodeURIComponent(search)}`;
      }

      const res = await apiFetch(url);
      if (!res.ok) throw new Error("Failed to fetch worker database");
      const data = await res.json();
      return data.map((item: any) => ({
        id: String(item.id),
        workerid: item.worker_id || item.workerid || String(item.id),
        fullname: item.fullname,
        category: item.category,
        mobile: item.mobile,
        aadhar: item.aadhar,
        pan_num: item.pan_num,
        village: item.village,
        district: item.district,
        state: item.state,
        date_of_joining: item.date_of_joining,
        date_of_relieving: item.date_of_relieving,
        active: Boolean(item.active),
        status: item.active ? 'Active' : 'Inactive',
        bloodgroup: item.bloodgroup,
        marital_sts: item.marital_sts === 'married' ? 'Married' : 'Unmarried',
        parent_name: item.parent_name,
        parentmob_num: item.parentmob_num,
        nominee_name: item.nominee_name || item.parent_name,
        nominee_phone: item.nominee_phone || item.parentmob_num,
        children_details: item.children_details,
        referred_by: item.referred_by,
        referral_phno: item.referral_phno,
        insurance_status: item.insurance_status === 'yes' ? 'Yes' : 'No',
        policy_num: item.policy_num,
        insurance_date: item.insurance_date,
        policy_duration: item.policy_duration,
        insurancecompany: item.insurancecompany,
        insurance_source: item.insurance_source === 'provided by company' ? 'Agent' : 'Self',
        profileImage: (() => {
          const img = item.image;
          if (!img || typeof img !== 'string' || img.startsWith('data:')) return null;
          if (img.startsWith('http')) return img;
          const path = img.startsWith('/') ? img : `/${img}`;
          return `${API_BASE}${path}`;
        })(),
        employmentHistory: []
      }));
    } catch (e) {
      console.error("Error in getWorkerDatabase:", e);
      return [];
    }
  },

  createWorkerDatabase: async (data: any, imageFile?: File | null) => {
    const formData = new FormData();
    formData.append('fullname', data.fullname || '');
    formData.append('category', data.category || '');
    formData.append('mobile', data.mobile || '');
    formData.append('aadhar', data.aadhar || '');
    formData.append('pan_num', data.pan_num || '');
    formData.append('date_of_joining', data.date_of_joining || '');
    formData.append('date_of_relieving', data.date_of_relieving || '');
    formData.append('active', (data.active !== undefined ? data.active : (data.status === 'Active')).toString());
    formData.append('bloodgroup', data.bloodgroup || '');
    formData.append('marital_sts', data.marital_sts?.toLowerCase() || 'unmarried');
    formData.append('parent_name', data.parent_name || '');
    formData.append('parentmob_num', data.parentmob_num || '');
    formData.append('nominee_name', data.nominee_name || '');
    formData.append('nominee_phone', data.nominee_phone || '');
    formData.append('children_details', data.children_details || '');
    formData.append('village', data.village || '');
    formData.append('district', data.district || '');
    formData.append('state', data.state || '');
    formData.append('referred_by', data.referred_by || '');
    formData.append('referral_phno', data.referral_phno || '');
    formData.append('insurance_status', data.insurance_status === 'Yes' ? 'yes' : 'no');
    formData.append('policy_num', data.policy_num || '');
    formData.append('insurance_date', data.insurance_date || '');
    formData.append('policy_duration', data.policy_duration || '');
    formData.append('insurancecompany', data.insurancecompany || '');
    formData.append('insurance_source', data.insurance_source === 'Agent' ? 'provided by company' : 'Self');

    if (imageFile) {
      formData.append('image', imageFile);
    }

    const res = await apiFetch(`${MANPOWER_ENDPOINTS.worker_database}/`, {
      method: "POST",
      body: formData
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error("Creation failed:", errorData);
      throw new Error(`Failed to create worker database entry: ${JSON.stringify(errorData)}`);
    }
    return await res.json();
  },

  updateWorkerDatabase: async (id: string, data: any, imageFile?: File | null) => {
    const formData = new FormData();

    if (data.fullname !== undefined) formData.append('fullname', data.fullname);
    if (data.category !== undefined) formData.append('category', data.category);
    if (data.mobile !== undefined) formData.append('mobile', data.mobile);
    if (data.aadhar !== undefined) formData.append('aadhar', data.aadhar);
    if (data.pan_num !== undefined) formData.append('pan_num', data.pan_num);
    if (data.date_of_joining !== undefined) formData.append('date_of_joining', data.date_of_joining);
    if (data.date_of_relieving !== undefined) formData.append('date_of_relieving', data.date_of_relieving);
    if (data.active !== undefined) formData.append('active', data.active.toString());
    else if (data.status !== undefined) formData.append('active', (data.status === 'Active').toString());
    if (data.bloodgroup !== undefined) formData.append('bloodgroup', data.bloodgroup);
    if (data.marital_sts !== undefined) formData.append('marital_sts', data.marital_sts?.toLowerCase());
    if (data.parent_name !== undefined) formData.append('parent_name', data.parent_name);
    if (data.parentmob_num !== undefined) formData.append('parentmob_num', data.parentmob_num);
    if (data.nominee_name !== undefined) formData.append('nominee_name', data.nominee_name);
    if (data.nominee_phone !== undefined) formData.append('nominee_phone', data.nominee_phone);
    if (data.children_details !== undefined) formData.append('children_details', data.children_details);
    if (data.village !== undefined) formData.append('village', data.village);
    if (data.district !== undefined) formData.append('district', data.district);
    if (data.state !== undefined) formData.append('state', data.state);
    if (data.referred_by !== undefined) formData.append('referred_by', data.referred_by);
    if (data.referral_phno !== undefined) formData.append('referral_phno', data.referral_phno);
    if (data.insurance_status !== undefined) formData.append('insurance_status', data.insurance_status === 'Yes' ? 'yes' : 'no');
    if (data.policy_num !== undefined) formData.append('policy_num', data.policy_num);
    if (data.insurance_date !== undefined) formData.append('insurance_date', data.insurance_date);
    if (data.policy_duration !== undefined) formData.append('policy_duration', data.policy_duration);
    if (data.insurancecompany !== undefined) formData.append('insurancecompany', data.insurancecompany);
    if (data.insurance_source !== undefined) formData.append('insurance_source', data.insurance_source === 'Agent' ? 'provided by company' : 'Self');


    if (imageFile) {
      formData.append('image', imageFile);
    }

    const res = await apiFetch(`${MANPOWER_ENDPOINTS.worker_database}${id}/`, {
      method: "PATCH",
      body: formData
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error("Update failed:", errorData);
      throw new Error(`Failed to update worker database entry: ${JSON.stringify(errorData)}`);
    }
    return await res.json();
  },

  deleteWorkerDatabase: async (id: string) => {
    const res = await apiFetch(`${MANPOWER_ENDPOINTS.worker_database}/${id}/`, {
      method: "DELETE"
    });
    if (!res.ok) throw new Error("Failed to delete worker database entry");
  },

  toggleWorkerStatus: async (worker: any) => {
    try {
      // Use the existing robust update logic to ensure consistency and bypass CORS issues with PATCH
      const updatedData = { ...worker, active: !worker.active };
      return await apiService.updateWorkerDatabase(worker.id, updatedData);
    } catch (err: any) {
      console.error("Toggle worker status failed:", err);
      throw err;
    }
  },
};



