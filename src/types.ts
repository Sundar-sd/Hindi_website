export interface Engineer {
  id: string;
  name: string;
  type?: "Engineer" | "Contractor";
}

export interface Site {
  id: string;
  engineerId: string;
  name: string;
  fullAmount?: number;
}

export interface Worker {
  id: string;
  siteId: string;
  name: string;
  category: string;
  selectedWage: number;
  wagePerDuty?: number;
  payoutRate?: number;
  isActive?: boolean;
}

export interface Duty {
  id: string;
  workerId: string;
  siteId: string;
  date: string;
  dutyValue: number;
}

export interface Advance {
  id: string;
  date: string;
  workerId: string;
  siteId: string;
  amount: number;
  remarks?: string;
}

export interface Transaction {
  id: string;
  remoteId?: number;
  type: "Received" | "Paid";
  date: string;
  paidAmount: number;
  fullAmount?: number;
  totalAmount?: number;
  balanceAmount?: number;
  remarks: string;
  siteId?: string;
  engineerId?: string;
  workerId?: string;
  personName?: string;
}

export interface Expense {
  id: string;
  date: string;
  expenseType?: "Engineer" | "Contractor";
  category?: string;
  description?: string;
  amount: number;
  remarks?: string;
  engineerId?: string;
  siteId?: string;
  personName?: string;
  role?: string;
}

export interface BalanceSheet {
  id: string;
  role: string;
  person_name: string;
  site: string;
  inflow_total: number;
  outflow_total: number;
  expense_total: number;
  advance_total: number;
  site_paid_total: number;
  siteprofit: number;
  contractor_pending_amount: number;
  company_expense_total: number;
  inflow_data: any[];
  outflow_data: any[];
  expense_data: any[];
  advance_data: any[];
  company_expense_data: any[];
}

export interface WorkerProfile {
  id: string;
  workerid: string;
  fullname: string;
  category: string;
  mobile: string;
  aadhar: string;
  pan_num: string;
  village: string;
  district: string;
  state: string;
  date_of_joining: string;
  date_of_relieving?: string;
  active: boolean;
  status: 'Active' | 'Inactive';
  bloodgroup: string;
  marital_sts: 'Married' | 'Unmarried' | '';
  parent_name?: string;
  parentmob_num?: string;
  referred_by?: string;
  referral_phno?: string;
  insurance_status: 'Yes' | 'No' | '';
  policy_num?: string;
  insurance_date?: string;
  policy_duration?: string;
  insurancecompany?: string;
  insurance_source?: 'Agent' | 'Self' | 'Company' | '';
  employmentHistory: { joinDate: string; relieveDate: string; remarks?: string }[];
  nominee_name?: string;
  nominee_phone?: string;
  children_details?: string;
  profile_premium?: string;
  life_insured_amount?: string;
  medical_insured_amount?: string;
  profileImage?: string | null;
}

export interface WorkerCategory {
  id: string;
  name: string;
}
