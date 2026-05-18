import React, { useState, useEffect } from "react";
import { 
  Wallet, 
  Banknote, 
  ArrowUpCircle, 
  PlusCircle, 
  Calculator,
  UserCheck,
  Users,
  Receipt,
  HandCoins,
  Clock,
  TrendingUp,
  TrendingDown,
  PieChart,
  FileText,
  Save,
  Printer,
  Share2,
  History,
  Building,
  Heart,
  Shield,
  Gem,
  Home,
  Trash2
} from "lucide-react";
import { generateProfessionalPDF, shareToWhatsApp } from "../../lib/pdfReportGenerator";

import { apiService } from "../../lib/api";

interface BalanceState {
  // Assets
  bbfCashInHand: number;
  bbfCashInBank: number;
  presentCashInHand: number;
  presentCashInBank: number;
  amountYetToBeReceived: number;
  propertyAsset: number;
  
  // Liabilities
  paymentToStaff: number;
  paymentToLabour: number;
  otherExpenses: number;
  advanceToLabour: number;
  charityFund: number;
  pilgrimageFund: number;
  emergencyFund: number;
  futureFund: number;
  propertyLiability: number;
}

const BalanceSheetTab: React.FC = () => {
  const [data, setData] = useState<BalanceState>({
    bbfCashInHand: 0,
    bbfCashInBank: 0,
    presentCashInHand: 0,
    presentCashInBank: 0,
    amountYetToBeReceived: 0,
    propertyAsset: 0,
    paymentToStaff: 0,
    paymentToLabour: 0,
    otherExpenses: 0,
    advanceToLabour: 0,
    charityFund: 0,
    pilgrimageFund: 0,
    emergencyFund: 0,
    futureFund: 0,
    propertyLiability: 0
  });

  const [totals, setTotals] = useState({
    inflow: 0,
    outflow: 0,
    netBalance: 0
  });

  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleDeleteBalance = async (id: any) => {
    if (!window.confirm("Permanently delete this audit log from the cloud?")) return;
    try {
      await apiService.deleteBalanceSheet(id);
      alert("Record successfully deleted!");
      await fetchHistory();
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Error: Could not delete balance record.");
    }
  };

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.getBalanceSheets();
      setHistory(data);
    } catch (err) {
      console.error("Error fetching balance sheets:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    const inflow = 
      Number(data.bbfCashInHand) + 
      Number(data.bbfCashInBank) + 
      Number(data.presentCashInHand) + 
      Number(data.presentCashInBank) + 
      Number(data.amountYetToBeReceived) + 
      Number(data.propertyAsset);

    const outflow = 
      Number(data.paymentToStaff) + 
      Number(data.paymentToLabour) + 
      Number(data.otherExpenses) + 
      Number(data.advanceToLabour) + 
      Number(data.charityFund) + 
      Number(data.pilgrimageFund) + 
      Number(data.emergencyFund) + 
      Number(data.futureFund) + 
      Number(data.propertyLiability);

    setTotals({
      inflow,
      outflow,
      netBalance: inflow - outflow
    });
  }, [data]);

  const handleInputChange = (field: keyof BalanceState, value: string) => {
    const num = parseFloat(value) || 0;
    setData(prev => ({ ...prev, [field]: num }));
  };

  const handleCommit = async () => {
    try {
      const payload = {
        ...data,
        inflow: totals.inflow,
        outflow: totals.outflow,
        net_balance: totals.netBalance,
        date: new Date().toISOString().split("T")[0] // Use YYYY-MM-DD
      };
      
      await apiService.createBalanceSheet(payload);
      alert("Financial Record Successfully Stored in Cloud!");
      await fetchHistory();
      
      // Reset inputs for next entry
      setData({
        bbfCashInHand: 0,
        bbfCashInBank: 0,
        presentCashInHand: 0,
        presentCashInBank: 0,
        amountYetToBeReceived: 0,
        propertyAsset: 0,
        paymentToStaff: 0,
        paymentToLabour: 0,
        otherExpenses: 0,
        advanceToLabour: 0,
        charityFund: 0,
        pilgrimageFund: 0,
        emergencyFund: 0,
        futureFund: 0,
        propertyLiability: 0
      });
    } catch (err) {
      console.error(err);
      alert("Error storing balance record to cloud.");
    }
  };

  const renderInput = (label: string, field: keyof BalanceState, icon: React.ReactNode, color: string) => (
    <div className="space-y-3 group">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 ml-1 transition-colors group-focus-within:text-indigo-600">
        {icon} {label}
      </label>
      <div className="relative">
        <span className={`absolute left-5 top-1/2 -translate-y-1/2 font-bold ${color}`}>₹</span>
        <input
          type="number"
          value={data[field] || ""}
          onChange={(e) => handleInputChange(field, e.target.value)}
          placeholder="0.00"
          className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent rounded-2xl py-4 pl-10 pr-5 text-sm font-bold text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-100 dark:focus:border-indigo-900/30 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all shadow-inner"
        />
      </div>
    </div>
  );

  const handlePrint = (record: any) => {
    // Robust mapping for both frontend state and backend cloud data
    const getValue = (fields: string[]) => {
      for (const f of fields) {
        if (record[f] !== undefined && record[f] !== null) return Number(record[f]);
      }
      return 0;
    };

    const inflow = record.total_assets || record.inflow || record.totals?.inflow || 0;
    const outflow = record.total_liabilities || record.outflow || record.totals?.outflow || 0;
    const net = record.net_balance !== undefined ? record.net_balance : (inflow - outflow);
    const date = record.date || record.created_at || "N/A";

    const reportData = {
      title: "Balance Sheet Statement",
      date: date,
      tableHead: [["Category", "Details", "Amount (₹)"]],
      tableBody: [
        ["ASSETS (BBF)", "Cash in Hand", `₹${getValue(['bbf_cash_in_hand', 'bbfCashInHand']).toLocaleString()}`],
        ["ASSETS (BBF)", "Cash in Bank", `₹${getValue(['bbf_cash_in_bank', 'bbfCashInBank']).toLocaleString()}`],
        ["ASSETS (PRESENT)", "Cash in Hand", `₹${getValue(['current_cash_in_hand', 'presentCashInHand']).toLocaleString()}`],
        ["ASSETS (PRESENT)", "Cash in Bank", `₹${getValue(['current_cash_in_bank', 'presentCashInBank']).toLocaleString()}`],
        ["ASSETS (PRESENT)", "Yet to Receive", `₹${getValue(['yet_to_be_received', 'amountYetToBeReceived']).toLocaleString()}`],
        ["ASSETS (PRESENT)", "Property", `₹${getValue(['asset_property', 'propertyAsset']).toLocaleString()}`],
        ["-", "-", "-"],
        ["LIABILITIES", "Staff Payment", `₹${getValue(['payment_to_staff', 'paymentToStaff']).toLocaleString()}`],
        ["LIABILITIES", "Labour Payment", `₹${getValue(['payment_to_labour', 'paymentToLabour']).toLocaleString()}`],
        ["LIABILITIES", "Other Expenses", `₹${getValue(['other_expenses', 'otherExpenses']).toLocaleString()}`],
        ["LIABILITIES", "Advance to Labour", `₹${getValue(['advance_to_labour', 'advanceToLabour']).toLocaleString()}`],
        ["LIABILITIES", "Charity Fund", `₹${getValue(['charity_fund', 'charityFund']).toLocaleString()}`],
        ["LIABILITIES", "Pilgrimage Fund", `₹${getValue(['pilgrimage_fund', 'pilgrimageFund']).toLocaleString()}`],
        ["LIABILITIES", "Emergency Fund", `₹${getValue(['emergency_fund', 'emergencyFund']).toLocaleString()}`],
        ["LIABILITIES", "Future Fund", `₹${getValue(['future_fund', 'futureFund']).toLocaleString()}`],
        ["LIABILITIES", "Property", `₹${getValue(['liability_property', 'propertyLiability']).toLocaleString()}`],
      ],
      tableFooter: ["NET POSITION", "", `₹${Number(net).toLocaleString()}`]
    };
    const doc = generateProfessionalPDF(reportData);
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  };

  const handleShare = async (record: any) => {
    const getValue = (fields: string[]) => {
      for (const f of fields) {
        if (record[f] !== undefined && record[f] !== null) return Number(record[f]);
      }
      return 0;
    };

    const inflow = record.total_assets || record.inflow || record.totals?.inflow || 0;
    const outflow = record.total_liabilities || record.outflow || record.totals?.outflow || 0;
    const net = record.net_balance !== undefined ? record.net_balance : (inflow - outflow);
    const date = record.date || record.created_at || "N/A";

    const reportData = {
      title: "Balance Sheet Statement",
      date: date,
      tableHead: [["Category", "Details", "Amount (₹)"]],
      tableBody: [
        ["ASSETS (BBF)", "Cash in Hand", `₹${getValue(['bbf_cash_in_hand', 'bbfCashInHand']).toLocaleString()}`],
        ["ASSETS (BBF)", "Cash in Bank", `₹${getValue(['bbf_cash_in_bank', 'bbfCashInBank']).toLocaleString()}`],
        ["ASSETS (PRESENT)", "Cash in Hand", `₹${getValue(['current_cash_in_hand', 'presentCashInHand']).toLocaleString()}`],
        ["ASSETS (PRESENT)", "Cash in Bank", `₹${getValue(['current_cash_in_bank', 'presentCashInBank']).toLocaleString()}`],
        ["ASSETS (PRESENT)", "Yet to Receive", `₹${getValue(['yet_to_be_received', 'amountYetToBeReceived']).toLocaleString()}`],
        ["ASSETS (PRESENT)", "Property", `₹${getValue(['asset_property', 'propertyAsset']).toLocaleString()}`],
        ["-", "-", "-"],
        ["LIABILITIES", "Staff Payment", `₹${getValue(['payment_to_staff', 'paymentToStaff']).toLocaleString()}`],
        ["LIABILITIES", "Labour Payment", `₹${getValue(['payment_to_labour', 'paymentToLabour']).toLocaleString()}`],
        ["LIABILITIES", "Other Expenses", `₹${getValue(['other_expenses', 'otherExpenses']).toLocaleString()}`],
        ["LIABILITIES", "Advance to Labour", `₹${getValue(['advance_to_labour', 'advanceToLabour']).toLocaleString()}`],
        ["LIABILITIES", "Charity Fund", `₹${getValue(['charity_fund', 'charityFund']).toLocaleString()}`],
        ["LIABILITIES", "Pilgrimage Fund", `₹${getValue(['pilgrimage_fund', 'pilgrimageFund']).toLocaleString()}`],
        ["LIABILITIES", "Emergency Fund", `₹${getValue(['emergency_fund', 'emergencyFund']).toLocaleString()}`],
        ["LIABILITIES", "Future Fund", `₹${getValue(['future_fund', 'futureFund']).toLocaleString()}`],
        ["LIABILITIES", "Property", `₹${getValue(['liability_property', 'propertyLiability']).toLocaleString()}`],
      ],
      tableFooter: ["NET POSITION", "", `₹${Number(net).toLocaleString()}`]
    };
    const doc = generateProfessionalPDF(reportData);
    const summary = `*Balance Sheet Statement*\nDate: ${date}\nAssets: ₹${Number(inflow).toLocaleString()}\nLiabilities: ₹${Number(outflow).toLocaleString()}\n*Net Balance: ₹${Number(net).toLocaleString()}*`;
    await shareToWhatsApp(doc, `Balance_Sheet_${date}`, summary);
  };

  const handlePrintCurrent = () => {
    const currentRecord = {
      ...data,
      totals: { ...totals },
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    };
    handlePrint(currentRecord);
  };

  const handleShareCurrent = () => {
    const currentRecord = {
      ...data,
      totals: { ...totals },
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    };
    handleShare(currentRecord);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ── Page Header ── */}
      <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-slate-100 dark:border-slate-800 pb-10">
        <div className="flex items-center gap-6">
          <div className="p-5 bg-indigo-600 rounded-[2rem] shadow-2xl shadow-indigo-600/30 ring-8 ring-indigo-50 dark:ring-indigo-900/10">
            <PieChart className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter">
              Balance <span className="text-indigo-600">Sheet</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Strategic Financial Oversight & Capital Tracking
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          {/* Print Overall Button */}
          <button
            onClick={handlePrintCurrent}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all font-bold text-xs uppercase tracking-widest shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print Overall
          </button>

          {/* WhatsApp Share Button */}
          <button
            onClick={handleShareCurrent}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white transition-all font-bold text-xs uppercase tracking-widest shadow-sm"
          >
            <Share2 className="w-4 h-4" /> Share Overall
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
        {/* ── Left Side: Assets ── */}
        <div className="bg-white dark:bg-slate-900/60 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-200/40 relative overflow-hidden group flex flex-col h-full">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500" />
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight uppercase">Assets</h2>
              </div>
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-full">Amount</span>
            </div>

            <div className="space-y-10">
              {/* BBF Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <History className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">BBF</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderInput("Cash In Hand", "bbfCashInHand", <HandCoins className="w-3.5 h-3.5" />, "text-emerald-500")}
                  {renderInput("Cash In Bank", "bbfCashInBank", <Banknote className="w-3.5 h-3.5" />, "text-indigo-500")}
                </div>
              </div>

              {/* Present Week Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Present Week</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderInput("Cash In Hand", "presentCashInHand", <HandCoins className="w-3.5 h-3.5" />, "text-emerald-500")}
                  {renderInput("Cash In Bank", "presentCashInBank", <Banknote className="w-3.5 h-3.5" />, "text-indigo-500")}
                  {renderInput("Yet to be Received", "amountYetToBeReceived", <ArrowUpCircle className="w-3.5 h-3.5" />, "text-teal-500")}
                  {renderInput("Property", "propertyAsset", <Building className="w-3.5 h-3.5" />, "text-amber-500")}
                </div>
              </div>
              
              <div className="pt-10 border-t border-slate-100 dark:border-slate-800 mt-auto">
                <div className="bg-emerald-600/5 border border-emerald-100 dark:border-emerald-900/30 p-8 rounded-[2rem] flex items-center justify-between group-hover:bg-emerald-600/10 transition-colors">
                  <div>
                    <span className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Assets Value</span>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">₹ {totals.inflow.toLocaleString()}</h3>
                  </div>
                  <Calculator className="w-10 h-10 text-emerald-200 group-hover:scale-110 transition-transform" />
                </div>
              </div>
            </div>
          </div>

        {/* ── Right Side: Liabilities ── */}
        <div className="bg-white dark:bg-slate-900/60 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-200/40 relative overflow-hidden group flex flex-col h-full">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-rose-500" />
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                  <TrendingDown className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight uppercase">Liabilities</h2>
              </div>
              <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest bg-rose-50 dark:bg-rose-900/20 px-4 py-2 rounded-full">Amount</span>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderInput("Payment to Staff", "paymentToStaff", <UserCheck className="w-3.5 h-3.5" />, "text-rose-500")}
                {renderInput("Payment to Labour", "paymentToLabour", <Users className="w-3.5 h-3.5" />, "text-orange-500")}
                {renderInput("Other Expenses", "otherExpenses", <Receipt className="w-3.5 h-3.5" />, "text-slate-500")}
                {renderInput("Advance to Labour", "advanceToLabour", <HandCoins className="w-3.5 h-3.5" />, "text-amber-600")}
                {renderInput("Charity Fund", "charityFund", <Heart className="w-3.5 h-3.5" />, "text-pink-500")}
                {renderInput("Pilgrimage Fund", "pilgrimageFund", <Gem className="w-3.5 h-3.5" />, "text-purple-500")}
                {renderInput("Emergency Fund", "emergencyFund", <Shield className="w-3.5 h-3.5" />, "text-red-500")}
                {renderInput("Future Fund", "futureFund", <TrendingUp className="w-3.5 h-3.5" />, "text-blue-500")}
                {renderInput("Property", "propertyLiability", <Home className="w-3.5 h-3.5" />, "text-slate-600")}
              </div>

              <div className="pt-10 border-t border-slate-100 dark:border-slate-800 mt-auto">
                <div className="bg-rose-600/5 border border-rose-100 dark:border-rose-900/30 p-8 rounded-[2rem] flex items-center justify-between group-hover:bg-rose-600/10 transition-colors">
                  <div>
                    <span className="block text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Total Liabilities Value</span>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">₹ {totals.outflow.toLocaleString()}</h3>
                  </div>
                  <Calculator className="w-10 h-10 text-rose-200 group-hover:scale-110 transition-transform" />
                </div>
              </div>
            </div>
          </div>
      </div>

      {/* ── Net Balance Bottom Card ── */}
      <div className="mb-12 max-w-2xl mx-auto">
        <div className={`p-8 rounded-[2.5rem] border-2 flex items-center justify-between transition-all shadow-xl hover:scale-[1.01] duration-300 ${
          totals.netBalance >= 0 
            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300' 
            : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50 text-rose-800 dark:text-rose-300'
        }`}>
          <div>
            <span className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${
              totals.netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              Net Sheet Position
            </span>
            <h3 className="text-3xl font-black tracking-tight flex items-center gap-3">
              ₹ {totals.netBalance.toLocaleString()}
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                totals.netBalance >= 0 
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300' 
                  : 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300'
              }`}>
                {totals.netBalance >= 0 ? 'Surplus' : 'Deficit'}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-2 font-medium">Assets value minus current liabilities obligations</p>
          </div>
          <div className={`w-16 h-16 rounded-[1.25rem] flex items-center justify-center shadow-inner ${
            totals.netBalance >= 0 ? 'bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-600' : 'bg-rose-100/50 dark:bg-rose-900/30 text-rose-600'
          }`}>
            <Calculator className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* ── Submit Section ── */}
      <div className="flex items-center justify-center mb-16">
        <button
          onClick={handleCommit}
          className="group relative bg-indigo-600 hover:bg-indigo-500 text-white px-20 py-7 rounded-[2.5rem] font-black uppercase tracking-[0.4em] text-xs transition-all shadow-2xl hover:-translate-y-1 active:scale-95 flex items-center gap-6 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <Save className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          Store Record
        </button>
      </div>

      {/* ── History Table Section ── */}
      <div className="bg-white dark:bg-slate-900/60 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-800 shadow-2xl mb-20 overflow-hidden">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight uppercase">Audit Logs</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Previous Financial Commitments</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Commit Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Inflow</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Outflow</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Net Position</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No records stored yet. Click 'Store Balance Record' to save.</td>
                </tr>
              ) : (
                history.map((record) => {
                  const inflow = record.total_assets || record.inflow || record.totals?.inflow || 0;
                  const outflow = record.total_liabilities || record.outflow || record.totals?.outflow || 0;
                  const net = record.net_balance !== undefined ? record.net_balance : (inflow - outflow);
                  const dateStr = record.date || record.created_at;
                  const date = dateStr ? new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "N/A";

                  return (
                    <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-6 font-bold text-slate-700 dark:text-slate-300 text-sm">{date}</td>
                      <td className="px-6 py-6 font-black text-emerald-600 text-right text-sm">₹{inflow.toLocaleString()}</td>
                      <td className="px-6 py-6 font-black text-rose-600 text-right text-sm">₹{outflow.toLocaleString()}</td>
                      <td className={`px-6 py-6 font-black text-right text-sm ${net >= 0 ? 'text-indigo-600' : 'text-rose-800'}`}>
                        ₹{net.toLocaleString()}
                      </td>
                    <td className="px-6 py-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handlePrint(record)}
                          className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                          title="Print PDF"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleShare(record)}
                          className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                          title="Share to WhatsApp"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteBalance(record.id)}
                          className="p-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BalanceSheetTab;
