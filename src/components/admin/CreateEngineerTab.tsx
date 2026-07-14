import React, { useState, useEffect } from "react";
import {
  UserCircle,
  MapPin,
  FileText,
  Users,
  Calendar,
  MessageSquare,
  Send,
  Briefcase,
  Loader2,
  Trash2,
  ExternalLink,
  Printer,
  Share2,
  ChevronDown
} from "lucide-react";
import axios from "axios";
import { generateProfessionalPDF, shareToWhatsApp } from "../../lib/pdfReportGenerator";
import { apiService } from "../../lib/api";
import ActiveWorkforceSummary from "./ActiveWorkforceSummary";

// Proxied Base URL
const API_BASE = import.meta.env.VITE_API_BASE_URL 
  ? import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, "")
  : '/api-manpower';

const CreateEngineerTab: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workforceAssignments, setWorkforceAssignments] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSite, setSelectedSite] = useState<string>("All");

  // Extract unique site locations from the assignments
  const uniqueSites = Array.from(
    new Set(
      workforceAssignments
        .map((a: any) => a.site_location || a.site_details?.site_location)
        .filter(Boolean)
    )
  );

  // Filter assignments based on selected site
  const filteredAssignments = selectedSite === "All"
    ? workforceAssignments
    : workforceAssignments.filter(
        (a: any) =>
          (a.site_location || a.site_details?.site_location) === selectedSite
      );

  const [formData, setFormData] = useState({
    entityType: "Engineer",
    name: "",
    siteLocation: "",
    description: "",
    labourType: "Mason",
    labourName: "",
    labourId: "",
    workCommencedOn: new Date().toISOString().split("T")[0],
    workTill: "",
    remarks: ""
  });

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/workforce-assignments/`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      setWorkforceAssignments(res.data);
    } catch (err) {
      console.error("Error fetching assignments:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkers = async () => {
    let backendWorkers: any[] = [];
    try {
      const res = await axios.get(`${API_BASE}/worker-profiles/`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      if (res.data && Array.isArray(res.data)) {
        backendWorkers = res.data;
      } else if (res.data?.results) {
        backendWorkers = res.data.results;
      }
    } catch (err) {
      console.error("Error fetching worker profiles, trying fallback:", err);
      try {
        const res = await axios.get(`${API_BASE}/workers/`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        backendWorkers = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      } catch (e) {
        console.error("Error fetching workers:", e);
      }
    }

    try {
      const savedProfilesRaw = localStorage.getItem('worker_db');
      if (savedProfilesRaw) {
        const savedProfiles = JSON.parse(savedProfilesRaw);
        if (Array.isArray(savedProfiles)) {
          // Add local profiles first so they take precedence for matching
          backendWorkers = [...savedProfiles, ...backendWorkers];
        }
      }
    } catch (e) {
      console.error("Error parsing local worker_db", e);
    }

    setWorkers(backendWorkers);
  };

  const fetchCategories = async () => {
    try {
      const cats = await apiService.getWorkerCategories();
      setCategories(cats);
    } catch (e) {
      console.error("Error fetching categories", e);
    }
  };

  useEffect(() => {
    fetchAssignments();
    fetchWorkers();
    fetchCategories();
  }, []);

  const handleDelete = async (id: any) => {
    if (!window.confirm("Permanently delete this assignment from the cloud?")) return;
    try {
      await apiService.deleteWorkforceAssignment(id);
      alert("Assignment successfully deleted!");
      await fetchAssignments();
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Error: Could not delete assignment.");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Auto-fetch labour details when labourId is entered
      if (name === 'labourId' && value.trim() !== '') {
        const match = workers.find(w => 
          String(w.id) === value.trim() || 
          String(w.workerid) === value.trim() || 
          String(w.worker_id) === value.trim()
        );
        
        if (match) {
          const nameToSet = match.fullname || match.workername || match.name;
          if (nameToSet) newData.labourName = nameToSet;
          
          let resolvedCat = "";
          
          if (match.category_name) {
            resolvedCat = String(match.category_name);
          } else if (match.category) {
            const catStr = String(match.category);
            const foundCat = categories.find(c => String(c.id) === catStr);
            if (foundCat) {
              resolvedCat = foundCat.name;
            } else if (!catStr.includes('-') && isNaN(Number(catStr))) {
              resolvedCat = catStr;
            }
          }
          
          if (match.category_name || match.category) {
            if (resolvedCat) {
              const allowedTypes = ["Mason", "Helper", "Electrician", "Plumber", "Other"];
              const exactMatch = allowedTypes.find(t => t.toLowerCase() === resolvedCat.trim().toLowerCase());
              newData.labourType = exactMatch || "Other";
            } else {
              newData.labourType = "Other";
            }
          }
        }
      }
      
      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.siteLocation) {
      return alert("Please fill in at least Name and Site Location");
    }

    try {
      setIsSubmitting(true);

      // Post to workforce-assignments as requested
      await axios.post(`${API_BASE}/workforce-assignments/`, {
        entity_type: formData.entityType,
        name: formData.name,
        site_location: formData.siteLocation,
        description: formData.description,
        labour_type: formData.labourType,
        labour_name: formData.labourName,
        labour_id: formData.labourId,
        work_commenced_on: formData.workCommencedOn,
        work_till: formData.workTill,
        remarks: formData.remarks
      }, {
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true' 
        }
      });

      alert("Workforce Assignment registered successfully!");

      // Reset form
      setFormData({
        entityType: "Engineer",
        name: "",
        siteLocation: "",
        description: "",
        labourType: "Mason",
        labourName: "",
        labourId: "",
        workCommencedOn: new Date().toISOString().split("T")[0],
        workTill: "",
        remarks: ""
      });

      await fetchAssignments();

    } catch (err) {
      console.error(err);
      alert("Failed to complete workforce assignment. Check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = (assignment: any) => {
    const doc = generateProfessionalPDF({
      title: "Workforce Assignment Details",
      engineer: assignment.name,
      site: assignment.site_location,
      tableHead: [["Field", "Value"]],
      tableBody: [
        ["ID", assignment.id],
        ["Entity Type", assignment.entity_type],
        ["Description", assignment.description || "-"],
        ["Labour Name", assignment.labour_name],
        ["Labour ID", assignment.labour_id || "-"],
        ["Labour Type", assignment.labour_type],
        ["Commenced On", assignment.work_commenced_on],
        ["Work Till", assignment.work_till || "-"],
        ["Remarks", assignment.remarks || "-"]
      ],
      filename: `Assignment_${assignment.name}_${assignment.site_location}`
    });
    doc.save(`Assignment_${assignment.id}.pdf`);
  };

  const handleWhatsApp = async (assignment: any) => {
    const summaryText = `*Workforce Assignment Details*\n\n` +
      `*Engineer:* ${assignment.name}\n` +
      `*Site:* ${assignment.site_location}\n` +
      `*Labour:* ${assignment.labour_name} (${assignment.labour_type})\n` +
      `*Commenced:* ${assignment.work_commenced_on}\n` +
      `*Remarks:* ${assignment.remarks || "None"}`;

    const doc = generateProfessionalPDF({
      title: "Workforce Assignment Details",
      engineer: assignment.name,
      site: assignment.site_location,
      tableHead: [["Field", "Value"]],
      tableBody: [
        ["Name", assignment.name],
        ["Site", assignment.site_location],
        ["Labour", assignment.labour_name],
        ["Remarks", assignment.remarks || "-"]
      ]
    });

    await shareToWhatsApp(doc, `Assignment_${assignment.id}`, summaryText);
  };

  const handlePrintOverall = () => {
    if (filteredAssignments.length === 0) return alert("No assignments to print.");

    const tableBody = filteredAssignments.slice().reverse().map((a: any, idx: number) => [
      idx + 1,
      a.name,
      a.site_location || a.site_details?.site_location || "-",
      a.labour_name,
      a.labour_type,
      a.work_commenced_on,
      a.remarks || "-"
    ]);

    const doc = generateProfessionalPDF({
      title: selectedSite === "All" ? "Overall Workforce Assignments" : `Workforce Assignments - ${selectedSite}`,
      site: selectedSite === "All" ? "All Sites" : selectedSite,
      period: `Generated on: ${new Date().toLocaleDateString("en-GB")}`,
      tableHead: [["No", "Name", "Site Location", "Labour Name", "Labour Type", "Commenced On", "Remarks"]],
      tableBody,
      filename: selectedSite === "All" ? "Overall_Assignments" : `Assignments_${selectedSite}`
    });
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  };

  const handleWhatsAppOverall = async () => {
    if (filteredAssignments.length === 0) return alert("No assignments to share.");

    const tableBody = filteredAssignments.slice().reverse().map((a: any, idx: number) => [
      idx + 1,
      a.name,
      a.site_location || a.site_details?.site_location || "-",
      a.labour_name,
      a.labour_type,
      a.work_commenced_on,
      a.remarks || "-"
    ]);

    const doc = generateProfessionalPDF({
      title: selectedSite === "All" ? "Overall Workforce Assignments" : `Workforce Assignments - ${selectedSite}`,
      site: selectedSite === "All" ? "All Sites" : selectedSite,
      period: `Generated on: ${new Date().toLocaleDateString("en-GB")}`,
      tableHead: [["No", "Name", "Site Location", "Labour Name", "Labour Type", "Commenced On", "Remarks"]],
      tableBody,
      filename: selectedSite === "All" ? "Overall_Assignments" : `Assignments_${selectedSite}`
    });

    const summaryText = `*Workforce Assignments Report*\n` +
      `*Site:* ${selectedSite === "All" ? "All Sites" : selectedSite}\n` +
      `*Total Assignments:* ${filteredAssignments.length}\n` +
      `*Date:* ${new Date().toLocaleDateString("en-GB")}`;

    await shareToWhatsApp(doc, selectedSite === "All" ? "Overall_Assignments" : `Assignments_${selectedSite}`, summaryText);
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <ActiveWorkforceSummary />
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 dark:border-slate-800 pb-6 mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/20">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            Project Registration
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Initialize new site projects and assign workforce details with precision.
          </p>
        </div>

        {/* Top Control Bar with Site Filter and Print Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Site Location Selector */}
          <div className="relative group">
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-200 hover:text-indigo-600 transition-all cursor-pointer shadow-sm pr-10 appearance-none min-w-[160px]"
            >
              <option value="All">All Site Locations</option>
              {uniqueSites.map((site) => (
                <option key={site} value={site}>
                  {site}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-focus-within:rotate-180 transition-transform" />
          </div>

          {/* Print Overall Button */}
          <button
            onClick={handlePrintOverall}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all font-bold text-xs uppercase tracking-widest shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print Overall
          </button>

          {/* Share Overall to WhatsApp */}
          <button
            onClick={handleWhatsAppOverall}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white transition-all font-bold text-xs uppercase tracking-widest shadow-sm"
          >
            <Share2 className="w-4 h-4" /> Share Overall
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ── Section 1: Entity & Site Details ── */}
        <div className="bg-white dark:bg-slate-900/60 rounded-[2.5rem] p-8 md:p-10 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-black/20">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Core Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Entity Type Select */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 ml-1">
                <UserCircle className="w-3.5 h-3.5" />
                Entity Type
              </label>
              <select
                name="entityType"
                value={formData.entityType}
                onChange={handleChange}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer shadow-inner"
              >
                <option value="Engineer">Engineer</option>
                <option value="Contractor">Contractor</option>
              </select>
            </div>

            {/* Name Input */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 ml-1">
                <FileText className="w-3.5 h-3.5" />
                Name
              </label>
              <input
                type="text"
                name="name"
                placeholder="Enter Full Name"
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
              />
            </div>

            {/* Site Location */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 ml-1">
                <MapPin className="w-3.5 h-3.5" />
                Site Location
              </label>
              <input
                type="text"
                name="siteLocation"
                placeholder="City, Area or Project Site"
                value={formData.siteLocation}
                onChange={handleChange}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 ml-1">
                <FileText className="w-3.5 h-3.5" />
                Description
              </label>
              <input
                type="text"
                name="description"
                placeholder="Brief Project Description"
                value={formData.description}
                onChange={handleChange}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
              />
            </div>
          </div>
        </div>

        {/* ── Section 2: Labour Details ── */}
        <div className="bg-white dark:bg-slate-900/60 rounded-[2.5rem] p-8 md:p-10 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-black/20">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-1.5 h-6 bg-violet-600 rounded-full" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Workforce Assignment</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Labour Details (Type) */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 ml-1">
                <Users className="w-3.5 h-3.5" />
                Labour Type
              </label>
              <select
                name="labourType"
                value={formData.labourType}
                onChange={handleChange}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-violet-500/20 transition-all cursor-pointer shadow-inner"
              >
                <option value="Mason">Mason</option>
                <option value="Helper">Helper</option>
                <option value="Electrician">Electrician</option>
                <option value="Plumber">Plumber</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Labour Name */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 ml-1">
                <FileText className="w-3.5 h-3.5" />
                Labour Name
              </label>
              <input
                type="text"
                name="labourName"
                placeholder="Full Name of Primary Labour"
                value={formData.labourName}
                onChange={handleChange}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-violet-500/20 transition-all shadow-inner"
              />
            </div>

            {/* Labour ID */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 ml-1">
                <FileText className="w-3.5 h-3.5" />
                Labour ID
              </label>
              <input
                type="text"
                name="labourId"
                placeholder="Enter Labour ID (e.g. W-101)"
                value={formData.labourId}
                onChange={handleChange}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
              />
            </div>

            {/* Work Commenced On */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 ml-1">
                <Calendar className="w-3.5 h-3.5" />
                Work Commenced On
              </label>
              <input
                type="date"
                name="workCommencedOn"
                value={formData.workCommencedOn}
                onChange={handleChange}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-violet-500/20 transition-all shadow-inner"
              />
            </div>

            {/* Till */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 ml-1">
                <Calendar className="w-3.5 h-3.5" />
                Work Till (Projected)
              </label>
              <input
                type="date"
                name="workTill"
                value={formData.workTill}
                onChange={handleChange}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-violet-500/20 transition-all shadow-inner"
              />
            </div>
          </div>

          {/* Remarks */}
          <div className="mt-8 space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 ml-1">
              <MessageSquare className="w-3.5 h-3.5" />
              Remarks
            </label>
            <textarea
              name="remarks"
              rows={3}
              placeholder="Any specific instructions or notes..."
              value={formData.remarks}
              onChange={handleChange}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-3xl p-6 text-sm font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-violet-500/20 transition-all shadow-inner resize-none"
            />
          </div>
        </div>

        {/* ── Submit Button ── */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="group relative bg-indigo-600 disabled:bg-indigo-400 hover:bg-indigo-500 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs transition-all shadow-2xl shadow-indigo-600/30 hover:-translate-y-1 active:scale-95 flex items-center gap-4 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            )}
            {isSubmitting ? "Processing..." : "Submit Registration"}
          </button>
        </div>
      </form>

      {/* ── Recent Workforce Assignments ── */}
      <div className="mt-20 space-y-8 pb-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
              <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
              Recent Workforce Assignments {selectedSite !== "All" ? `- ${selectedSite}` : ""}
            </h3>
          </div>
          {loading && <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />}
        </div>

        <div className="bg-white dark:bg-slate-900/60 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name & Site</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Labour</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Commenced On</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Remarks</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-400 font-medium italic">No assignments found</td>
                  </tr>
                ) : (
                  filteredAssignments.slice().reverse().map((assignment: any) => (
                    <tr key={assignment.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 font-black text-xs">
                            {assignment.name?.charAt(0) || "W"}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-white text-sm">{assignment.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {assignment.site_location}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <div>
                          <p className="font-bold text-slate-700 dark:text-slate-200 text-xs">{assignment.labour_name}</p>
                          <p className="text-[10px] font-medium text-slate-400">{assignment.labour_type}</p>
                        </div>
                      </td>
                      <td className="p-6">
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{assignment.work_commenced_on}</p>
                      </td>
                      <td className="p-6">
                        <p className="text-xs text-slate-500 truncate max-w-[150px]" title={assignment.remarks}>
                          {assignment.remarks || "-"}
                        </p>
                      </td>
                      <td className="p-6">
                        <span className="text-[10px] font-black uppercase px-2 py-1 rounded-md bg-indigo-50 text-indigo-600">
                          {assignment.entity_type}
                        </span>
                      </td>
                      <td className="p-6 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            onClick={() => handlePrint(assignment)}
                            className="p-2 text-slate-300 hover:text-indigo-500 transition-colors"
                            title="Print PDF"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleWhatsApp(assignment)}
                            className="p-2 text-slate-300 hover:text-emerald-500 transition-colors"
                            title="Share to WhatsApp"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(assignment.id)}
                            className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateEngineerTab;
