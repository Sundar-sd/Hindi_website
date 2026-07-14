import {
  Engineer, Site, Worker, Advance
} from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, "")
  : "/api-manpower";

export const MANPOWER_ENDPOINTS = {
  engineers: `${API_BASE}/owners/`,
  sites: `${API_BASE}/sites/`,
  worker_categories: `${API_BASE}/categories/`,
  workers: `${API_BASE}/workers/`,
  worker_profiles: `${API_BASE}/worker-profiles/`,
  advances: `${API_BASE}/advances/`,
  workforce_assignments: `${API_BASE}/workforce-assignments/`,
  logs: `${API_BASE}/logs/`,
  bill_records: `${API_BASE}/bill-records/`,
  payout: `${API_BASE}/payout/`,
  expenses: `${API_BASE}/expenses/`,
  balance_sheet: `${API_BASE}/balance-sheet/`
};

const normalizeApiUrl = (url: string | Request | URL): string | Request | URL => {
  if (typeof url !== "string") return url;
  let normalized = url;
  if (normalized.startsWith("http")) return normalized;
  if (normalized.startsWith("/") && !normalized.startsWith(API_BASE)) {
    normalized = `${API_BASE}${normalized}`;
  } else if (!normalized.startsWith("/") && !normalized.startsWith(API_BASE)) {
    normalized = `${API_BASE}/${normalized}`;
  }
  normalized = normalized.replace(/([^:]\/)\/+/g, "$1");
  return normalized;
};

// Helper to extract the main array from varied backend response structures
const extractArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  
  // Look for common array keys
  const arrayKeys = ['results', 'logs', 'payouts', 'bill_records', 'records', 'data'];
  for (const key of arrayKeys) {
    if (Array.isArray(data[key])) return data[key];
  }

  // Fallback: find the first property that is an array
  const firstArray = Object.values(data).find(val => Array.isArray(val));
  return Array.isArray(firstArray) ? firstArray : [];
};

const apiFetch = async (url: string | Request | URL, options?: RequestInit) => {
  const normalizedUrl = normalizeApiUrl(url);
  const urlStr = typeof normalizedUrl === 'string' ? normalizedUrl : (normalizedUrl as any).url || '';
  const headers: any = { ...options?.headers };
  if (urlStr.includes('ngrok')) {
    headers['ngrok-skip-browser-warning'] = 'true';
  }
  return fetch(normalizedUrl, {
    mode: 'cors',
    ...options,
    headers
  });
};

export const apiService = {
  // Owners / Engineers
  getEngineers: async (): Promise<Engineer[]> => {
    try {
      const res = await apiFetch(MANPOWER_ENDPOINTS.engineers);
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((item: any) => ({
        id: String(item.id),
        name: item.name,
        type: (item.role || item.type) === 'contractor' ? 'Contractor' : 'Engineer'
      }));
    } catch { return []; }
  },

  createEngineer: async (data: Partial<Engineer>): Promise<Engineer> => {
    const payload = { name: data.name, type: data.type === 'Contractor' ? 'Contractor' : 'Engineer', role: data.type === 'Contractor' ? 'contractor' : 'engineer' };
    const res = await apiFetch(MANPOWER_ENDPOINTS.engineers, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const d = await res.json();
    return { id: String(d.id), name: d.name, type: d.type === 'contractor' ? 'Contractor' : 'Engineer' };
  },

  deleteEngineer: async (id: string): Promise<void> => {
    await apiFetch(`${MANPOWER_ENDPOINTS.engineers}${id}/`, { method: "DELETE" });
  },

  // Sites
  getSites: async (): Promise<Site[]> => {
    try {
      const res = await apiFetch(MANPOWER_ENDPOINTS.sites);
      const data = await res.json();
      return data.map((item: any) => ({
        id: String(item.id),
        engineerId: String(item.person || item.engineerId),
        name: item.site_name || item.name
      }));
    } catch { return []; }
  },

  createSite: async (data: Partial<Site>): Promise<Site> => {
    const res = await apiFetch(MANPOWER_ENDPOINTS.sites, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ person: Number(data.engineerId), site_name: data.name })
    });
    const d = await res.json();
    return { id: String(d.id), engineerId: String(d.person), name: d.site_name };
  },

  deleteSite: async (id: string): Promise<void> => {
    await apiFetch(`${MANPOWER_ENDPOINTS.sites}${id}/`, { method: "DELETE" });
  },

  // Workers
  getWorkers: async (): Promise<Worker[]> => {
    try {
      const res = await apiFetch(MANPOWER_ENDPOINTS.workers);
      const data = await res.json();
      return data.map((item: any) => ({
        id: String(item.id),
        siteId: String(item.site),
        name: item.workername || item.name,
        category: item.category,
        selectedWage: Number(item.new_amount || item.wage || 0),
        isActive: true
      }));
    } catch { return []; }
  },

  createWorker: async (data: any): Promise<any> => {
    const payload = {
      site: Number(data.siteId || 1),
      name: data.name || data.fullname,
      workername: data.name || data.fullname,
      worker_id: data.workerid,
      category: data.category,
      new_amount: data.selectedWage,
      daily_wage: data.selectedWage,
      phone: data.mobile || data.phone || "0000000000",
      aadhaar_number: data.aadhar,
      pan_number: data.pan_num,
      photo: data.profileImage,
      village_locality: data.village,
      district: data.district,
      state: data.state,
      join_date: data.date_of_joining,
      relieving_date: data.date_of_relieving,
      is_active: data.active !== false,
      blood_group: data.bloodgroup,
      marital_status: data.marital_sts,
      parent_guardian_name: data.parent_name,
      parent_mobile: data.parentmob_num,
      nominee_name: data.nominee_name,
      nominee_mobile: data.nominee_phone,
      children_details: data.children_details,
      referred_by_name: data.referred_by,
      referrer_mobile: data.referral_phno,
      insurance_enrolled: data.insurance_status === 'Yes',
      premium_amount: Number(data.profile_premium || 0),
      life_insured_amount: Number(data.life_insured_amount || 0),
      medical_insured_amount: Number(data.medical_insured_amount || 0),
      policy_number: data.policy_num,
      policy_date: data.insurance_date,
      policy_duration: data.policy_duration,
      insurance_company: data.insurancecompany,
      insurance_source: data.insurance_source
    };

    const res = await apiFetch(MANPOWER_ENDPOINTS.workers, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const d = await res.json();
    return {
      ...d,
      id: String(d.id),
      siteId: String(d.site),
      name: d.workername || d.name,
      category: d.category,
      selectedWage: Number(d.new_amount || d.wage || d.selected_wage || 0),
      mobile: d.phone,
      phone: d.phone,
      isActive: d.is_active !== false
    };
  },

  updateWorker: async (id: string, data: any): Promise<any> => {
    const payload = {
      site: Number(data.siteId || 1),
      name: data.name || data.fullname,
      workername: data.name || data.fullname,
      worker_id: data.workerid,
      category: data.category,
      new_amount: data.selectedWage,
      daily_wage: data.selectedWage,
      phone: data.mobile || data.phone || "0000000000",
      aadhaar_number: data.aadhar,
      pan_number: data.pan_num,
      photo: data.profileImage,
      village_locality: data.village,
      district: data.district,
      state: data.state,
      join_date: data.date_of_joining,
      relieving_date: data.date_of_relieving,
      is_active: data.active !== false,
      blood_group: data.bloodgroup,
      marital_status: data.marital_sts,
      parent_guardian_name: data.parent_name,
      parent_mobile: data.parentmob_num,
      nominee_name: data.nominee_name,
      nominee_mobile: data.nominee_phone,
      children_details: data.children_details,
      referred_by_name: data.referred_by,
      referrer_mobile: data.referral_phno,
      insurance_enrolled: data.insurance_status === 'Yes',
      premium_amount: Number(data.profile_premium || 0),
      life_insured_amount: Number(data.life_insured_amount || 0),
      medical_insured_amount: Number(data.medical_insured_amount || 0),
      policy_number: data.policy_num,
      policy_date: data.insurance_date,
      policy_duration: data.policy_duration,
      insurance_company: data.insurancecompany,
      insurance_source: data.insurance_source
    };

    const res = await apiFetch(`${MANPOWER_ENDPOINTS.workers}${id}/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const d = await res.json();
    return {
      ...d,
      id: String(d.id),
      siteId: String(d.site),
      name: d.workername || d.name,
      category: d.category,
      selectedWage: Number(d.new_amount || d.wage || d.selected_wage || 0),
      mobile: d.phone,
      phone: d.phone,
      isActive: d.is_active !== false
    };
  },

  deleteWorker: async (id: string): Promise<void> => {
    await apiFetch(`${MANPOWER_ENDPOINTS.workers}${id}/`, { method: "DELETE" });
  },

  // Categories
  getWorkerCategories: async () => {
    try {
      const res = await apiFetch(MANPOWER_ENDPOINTS.worker_categories);
      const data = await res.json();
      return data.map((c: any) => ({ id: String(c.id), name: c.name }));
    } catch {
      return [{ id: '1', name: 'Mason' }, { id: '2', name: 'Helper' }];
    }
  },

  // Advances (Bill Records)
  getAdvances: async (): Promise<Advance[]> => {
    try {
      const res = await apiFetch(MANPOWER_ENDPOINTS.advances);
      const data = await res.json();
      return data.map((item: any) => ({
        id: String(item.id),
        siteId: String(item.site),
        workerId: String(item.worker),
        amount: Number(item.advance || 0),
        remarks: item.remarks || "",
        date: item.date
      }));
    } catch { return []; }
  },

  createAdvance: async (data: Partial<Advance>): Promise<Advance> => {
    const res = await apiFetch(MANPOWER_ENDPOINTS.advances, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site: Number(data.siteId), worker: data.workerId, advance: data.amount, remarks: data.remarks, date: data.date })
    });
    const d = await res.json();
    return { id: String(d.id), siteId: String(d.site), workerId: String(d.worker), amount: d.advance, remarks: d.remarks, date: d.date };
  },

  deleteAdvance: async (id: string): Promise<void> => {
    await apiFetch(`${MANPOWER_ENDPOINTS.advances}${id}/`, { method: "DELETE" });
  },

  // Workforce Assignments moved to unified section below

  createWorkforceAssignment: async (data: any) => {
    const res = await apiFetch(MANPOWER_ENDPOINTS.workforce_assignments, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  // Weekly Logs
  createWeeklyLog: async (data: any) => {
    try {
      const res = await apiFetch(MANPOWER_ENDPOINTS.logs, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true"
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const errorData = await res.text();
        console.error(`[API Error] POST to logs failed (${res.status}):`, errorData);
        throw new Error(`Server error: ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.error("[API Error] createWeeklyLog exception:", err);
      throw err;
    }
  },

  getWeeklyLogs: async () => {
    try {
      const res = await apiFetch(MANPOWER_ENDPOINTS.logs, {
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      const data = await res.json();
      return extractArray(data);
    } catch { return []; }
  },

  deleteWeeklyLog: async (id: string | number) => {
    await apiFetch(`${MANPOWER_ENDPOINTS.logs}${id}/`, {
      method: "DELETE",
      headers: { "ngrok-skip-browser-warning": "true" }
    });
  },

  // Bill Records (for AdvanceTab)
  getBillRecords: async () => {
    try {
      const res = await apiFetch(MANPOWER_ENDPOINTS.bill_records, {
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      const data = await res.json();
      return extractArray(data);
    } catch { return []; }
  },

  createBillRecord: async (data: any) => {
    const res = await apiFetch(MANPOWER_ENDPOINTS.bill_records, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true"
      },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  deleteBillRecord: async (id: string | number) => {
    await apiFetch(`${MANPOWER_ENDPOINTS.bill_records}${id}/`, {
      method: "DELETE",
      headers: { "ngrok-skip-browser-warning": "true" }
    });
  },

  getWorkforceAssignments: async () => {
    try {
      const res = await apiFetch(MANPOWER_ENDPOINTS.workforce_assignments, {
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      const data = await res.json();
      return extractArray(data);
    } catch { return []; }
  },

  deleteWorkforceAssignment: async (id: string | number) => {
    await apiFetch(`${MANPOWER_ENDPOINTS.workforce_assignments}${id}/`, {
      method: "DELETE",
      headers: { "ngrok-skip-browser-warning": "true" }
    });
  },



  // Payout Records (for PaymentDetailsTab)
  getPayouts: async () => {
    try {
      const res = await apiFetch(MANPOWER_ENDPOINTS.payout, {
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      const data = await res.json();
      return extractArray(data);
    } catch { return []; }
  },

  createPayout: async (data: any) => {
    const res = await apiFetch(MANPOWER_ENDPOINTS.payout, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true"
      },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  // Expenses (for ExpensesTab)
  getExpenses: async () => {
    try {
      const res = await apiFetch(MANPOWER_ENDPOINTS.expenses, {
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      const data = await res.json();
      return extractArray(data);
    } catch { return []; }
  },

  createExpense: async (data: any) => {
    const res = await apiFetch(MANPOWER_ENDPOINTS.expenses, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true"
      },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  deleteExpense: async (id: string | number) => {
    await apiFetch(`${MANPOWER_ENDPOINTS.expenses}${id}/`, {
      method: "DELETE",
      headers: { "ngrok-skip-browser-warning": "true" }
    });
  },

  // Balance Sheet
  getBalanceSheets: async () => {
    try {
      const res = await apiFetch(MANPOWER_ENDPOINTS.balance_sheet, {
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      const data = await res.json();
      return extractArray(data);
    } catch { return []; }
  },

  createBalanceSheet: async (data: any) => {
    const res = await apiFetch(MANPOWER_ENDPOINTS.balance_sheet, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true"
      },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  deleteBalanceSheet: async (id: string | number) => {
    await apiFetch(`${MANPOWER_ENDPOINTS.balance_sheet}${id}/`, {
      method: "DELETE",
      headers: { "ngrok-skip-browser-warning": "true" }
    });
  }
};
