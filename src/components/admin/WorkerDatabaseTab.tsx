import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Users, Search, Edit, FileDown, Share2, X, Loader2, Trash2 } from 'lucide-react';
import { generateWorkerProfilePDF } from '../../lib/pdfReportGenerator';
import { WorkerProfile, WorkerCategory, Site } from '../../types';
import { apiService } from '../../lib/api';

const getApiOrigin = (): string => { return "https://concise-egomaniac-starved.ngrok-free.dev"; };
const IMAGE_API_BASE = getApiOrigin();

/**
 * Loads images from backend URLs by sending the required
 * bypass header via fetch(), then renders the blob as a local URL.
 */
const NgrokImage: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const loadImage = useCallback(async (url: string) => {
    try {
      if (url.startsWith('blob:') || url.startsWith('data:')) {
        setBlobUrl(url);
        return;
      }
      const fullUrl = url.startsWith('http') ? url : `${IMAGE_API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
      const res = await fetch(fullUrl, { headers: { 'ngrok-skip-browser-warning': 'true' } });
      if (!res.ok) throw new Error('Image fetch failed');
      const blob = await res.blob();
      setBlobUrl(URL.createObjectURL(blob));
    } catch {
      setBlobUrl(null);
    }
  }, []);

  useEffect(() => {
    if (!src) return;
    setBlobUrl(null);
    loadImage(src);
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  if (!blobUrl) return null;
  return <img src={blobUrl} alt={alt} className={className} />;
};

const WorkerDatabaseTab: React.FC = () => {
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);

  const [workerCategories] = useState<WorkerCategory[]>([
    { id: '1', name: 'Mason' },
    { id: '2', name: 'Helper' },
    { id: '3', name: 'Carpenter' },
    { id: '4', name: 'Plumber' },
    { id: '5', name: 'Electrician' }
  ]);

  const loadSitesAndWorkers = useCallback(async () => {
    try {
      setLoading(true);
      const sitesList = await apiService.getSites().catch(() => []);
      setSites(sitesList);

      const backendList = await apiService.getWorkers().catch(() => []);
      
      const savedProfilesRaw = localStorage.getItem('worker_db');
      const savedProfiles: WorkerProfile[] = savedProfilesRaw ? JSON.parse(savedProfilesRaw) : [];
      
      const mergedWorkers = backendList.map(bw => {
        const foundProfile = savedProfiles.find(p => String(p.id) === String(bw.id) || String(p.workerid) === String(bw.id));
        
        return {
          aadhar: "",
          pan_num: "",
          village: "",
          district: "",
          state: "",
          mobile: "",
          date_of_joining: new Date().toISOString().split('T')[0],
          active: bw.isActive !== false,
          status: (bw.isActive !== false) ? 'Active' : 'Inactive',
          bloodgroup: "",
          marital_sts: 'Unmarried',
          referred_by: "",
          insurance_status: 'No',
          employmentHistory: [],
          profileImage: null,
          
          ...foundProfile,
          
          id: bw.id,
          workerid: foundProfile?.workerid || `ID-${bw.id}`,
          fullname: bw.name,
          category: bw.category || foundProfile?.category || "Helper",
          siteId: bw.siteId,
          selectedWage: bw.selectedWage || 500,
        } as WorkerProfile;
      });
      
      setWorkers(mergedWorkers);
    } catch (e) {
      console.error("Error loading Worker database details:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSitesAndWorkers();
  }, [loadSitesAndWorkers]);

  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showProfile, setShowProfile] = useState<WorkerProfile | null>(null);
  const [formData, setFormData] = useState<Partial<WorkerProfile>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullname || !formData.date_of_joining || !formData.mobile) {
      alert("Please fill in all required fields (Full Name, Category, Mobile, and Date of Joining)");
      return;
    }

    try {
      setLoading(true);
      
      let base64Image = formData.profileImage || null;
      if (imageFile) {
        base64Image = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(imageFile);
        });
      }

      const defaultSiteId = formData.siteId || (sites[0]?.id || "1");
      const defaultSelectedWage = formData.selectedWage || 500;

      const backendPayload = {
        ...formData,
        siteId: defaultSiteId,
        name: formData.fullname,
        category: formData.category?.toLowerCase() || "helper",
        selectedWage: defaultSelectedWage,
      };

      let savedBackendWorker;
      if (formData.id) {
        savedBackendWorker = await apiService.updateWorker(formData.id, backendPayload);
      } else {
        savedBackendWorker = await apiService.createWorker(backendPayload);
      }

      const workerProfile: WorkerProfile = {
        ...formData,
        id: savedBackendWorker.id,
        workerid: formData.workerid || `ID-${savedBackendWorker.id}`,
        status: (formData.active !== false) ? 'Active' : 'Inactive',
        active: formData.active !== false,
        profileImage: base64Image as string
      } as WorkerProfile;

      setWorkers(prev => {
        let updatedList;
        const exists = prev.some(w => w.id === savedBackendWorker.id);
        if (exists) {
          updatedList = prev.map(w => w.id === savedBackendWorker.id ? workerProfile : w);
        } else {
          updatedList = [...prev, workerProfile];
        }
        localStorage.setItem('worker_db', JSON.stringify(updatedList));
        return updatedList;
      });

      setShowProfile(workerProfile);
      setShowForm(false);
      setImageFile(null);
      alert("Worker profile saved successfully to backend database!");
    } catch (e) {
      console.error(e);
      alert("Failed to save worker profile to backend database");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this worker profile?")) {
      try {
        setLoading(true);
        await apiService.deleteWorker(id);
        
        setWorkers(prev => {
          const updatedList = prev.filter(w => w.id !== id);
          localStorage.setItem('worker_db', JSON.stringify(updatedList));
          return updatedList;
        });

        if (showProfile?.id === id) setShowProfile(null);
        alert("Worker profile deleted from database.");
      } catch (e) {
        console.error(e);
        alert("Failed to delete worker profile");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleToggleStatus = async (worker: WorkerProfile) => {
    const newStatus = !worker.active;
    const updated: WorkerProfile = {
      ...worker,
      active: newStatus,
      status: newStatus ? 'Active' : 'Inactive',
      date_of_relieving: newStatus ? undefined : new Date().toISOString().split('T')[0]
    };
    
    try {
      setLoading(true);
      await apiService.updateWorker(worker.id, {
        siteId: worker.siteId,
        name: worker.fullname,
        category: worker.category,
        selectedWage: worker.selectedWage,
        isActive: newStatus
      });

      setWorkers(prev => {
        const updatedList = prev.map(w => w.id === worker.id ? updated : w);
        localStorage.setItem('worker_db', JSON.stringify(updatedList));
        return updatedList;
      });

      if (showProfile?.id === worker.id) setShowProfile(updated);
    } catch (e) {
      console.error(e);
      alert("Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const searchWorkerDatabase = (_term: string) => {
    // Local search is handled via UI filtering
  };

  // Helper to get human-readable category name
  const getCategoryName = (idOrName: string) => {
    if (!idOrName) return "General";
    const cat = workerCategories?.find(c => String(c.id) === String(idOrName));
    return cat ? cat.name : idOrName;
  };

  // Keep filtered workers list
  const filteredWorkers = workers.filter(w => 
    w.fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.workerid.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.mobile.includes(searchTerm)
  );

  // Sync profile view
  useEffect(() => {
    if (showProfile) {
      const updated = workers.find(w => w.id === showProfile.id);
      if (updated) setShowProfile(updated);
    }
  }, [workers]);

  const openForm = (worker?: WorkerProfile) => {
    setImageFile(null);
    if (worker) {
      setFormData(worker);
    } else {
      setFormData({
        active: true,
        date_of_joining: new Date().toISOString().split('T')[0],
        employmentHistory: [],
        insurance_status: 'No',
        marital_sts: 'Unmarried',
        selectedWage: 500
      });
    }
    setShowForm(true);
  };

  const handleShare = async (worker: WorkerProfile) => {
    const categoryName = getCategoryName(worker.category);
    const summary = `*Worker Profile — ${worker.fullname}*\n\n` +
      `*ID:* ${worker.workerid}\n` +
      `*Category:* ${categoryName}\n` +
      `*Mobile:* ${worker.mobile}\n` +
      `*Joining Date:* ${worker.date_of_joining}\n` +
      `*Status:* ${worker.active ? 'Active' : 'Inactive'}\n` +
      (worker.insurance_status === 'Yes' ? `*Insurance:* Premium ₹${worker.profile_premium || 0}, Life ₹${worker.life_insured_amount || 0}, Medical ₹${worker.medical_insured_amount || 0}\n` : '') +
      `\n_Generated via Workforce Management System_`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(summary)}`;
    window.open(whatsappUrl, '_blank');
  };

  const getImageBase64 = async (url: string): Promise<string | undefined> => {
    try {
      if (url.startsWith('data:')) return url;
      const fullUrl = url.startsWith('http') ? url : `/api-proxy${url.startsWith('/') ? '' : '/'}${url}`;
      const res = await fetch(fullUrl, { headers: { 'ngrok-skip-browser-warning': 'true' } });
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error("Image conversion failed:", e);
      return undefined;
    }
  };

  const handleDownloadPDF = async (worker: WorkerProfile) => {
    try {
      let photoBase64;
      if (worker.profileImage) {
        photoBase64 = await getImageBase64(worker.profileImage);
      }
      
      // Resolve category name before passing to PDF generator
      const workerWithResolvedCategory = {
        ...worker,
        category: getCategoryName(worker.category)
      };
      
      const doc = generateWorkerProfilePDF(workerWithResolvedCategory, photoBase64);
      doc.save(`Worker_Profile_${worker.fullname.replace(/\s+/g, '_')}_${worker.workerid}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Failed to generate PDF");
    }
  };

  React.useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchWorkerDatabase(searchTerm);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image size should be less than 2MB");
        return;
      }
      setImageFile(file);
      setFormData({ ...formData, profileImage: URL.createObjectURL(file) });
    }
  };

  return (
    <div className="space-y-6 relative h-[calc(100vh-140px)] flex flex-col">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 shrink-0">
        <div className="relative w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ID, Name or Mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all dark:text-white"
          />
        </div>
        <button
          onClick={() => openForm()}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-indigo-600/30 transition-all"
        >
          <Plus className="w-5 h-5" /> Add Worker
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 flex-1 overflow-hidden min-h-0">
        <div className="lg:col-span-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 relative">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
              <p className="text-slate-500 font-medium">Loading database...</p>
            </div>
          ) : filteredWorkers.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-2xl border border-slate-100 dark:border-slate-800">
              <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4 shadow-sm opacity-50" />
              <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400">
                {searchTerm ? `No worker found for "${searchTerm}"` : "No workers registered yet"}
              </h3>
              {searchTerm && <button onClick={() => setSearchTerm('')} className="mt-4 text-xs font-bold text-indigo-500 uppercase tracking-widest hover:underline">Clear Search</button>}
            </div>
          ) : (
            filteredWorkers.map(w => (
              <div
                key={w.id}
                onClick={() => setShowProfile(w)}
                className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border cursor-pointer transition-all hover:shadow-md flex gap-4 items-center ${showProfile?.id === w.id ? 'border-indigo-500 ring-1 ring-indigo-500/50 shadow-md transform scale-[1.02]' : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'}`}
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-700 shrink-0">
                  {w.profileImage ? (
                    <NgrokImage src={w.profileImage} alt={w.fullname} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-indigo-400 font-bold text-xl uppercase">{w.fullname?.charAt(0) || 'W'}</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded">{w.workerid}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStatus(w);
                        }}
                        className={`flex gap-1 items-center px-2 py-1 rounded-lg text-[8px] font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 ${w.active ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'}`}
                      >
                        {w.active ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(w.id);
                        }}
                        className="flex items-center justify-center p-1 rounded-md text-rose-400 hover:text-white hover:bg-rose-500 transition-all border border-rose-100 dark:border-rose-500/20 shadow-sm"
                        title="Delete Worker"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white capitalize truncate">{w.fullname}</h3>
                  <div className="flex justify-between items-center text-[11px] mt-1 font-semibold">
                    <span className="text-slate-500 dark:text-slate-400">{getCategoryName(w.category)}</span>
                    <span className="text-slate-400">{w.mobile}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="lg:col-span-2 overflow-y-auto custom-scrollbar h-full relative">
          {showProfile ? (
            <div className="bg-[#F3F4FF] dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl shadow-indigo-100/30 border border-slate-100 dark:border-slate-800 relative overflow-hidden print:shadow-none print:border-none print:p-0 print:bg-white">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-200/20 rounded-full blur-[100px] -mr-40 -mt-40 print:hidden"></div>
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-200/20 rounded-full blur-[100px] -ml-40 -mb-40 print:hidden"></div>

              <div className="relative z-10 flex justify-between items-start mb-10 print:hidden">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="px-5 py-2 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-600/30">
                      ID: {showProfile.workerid}
                    </span>
                    <button
                      onClick={() => handleToggleStatus(showProfile)}
                      className={`px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-xl ${showProfile.active ? 'bg-emerald-500 text-white shadow-emerald-500/40' : 'bg-rose-500 text-white shadow-rose-500/40'}`}
                    >
                      <div className={`w-2 h-2 rounded-full bg-white ${showProfile.active ? 'animate-pulse' : ''}`}></div>
                      {showProfile.active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                  <h2 className="text-5xl font-black text-slate-900 dark:text-white capitalize tracking-tighter mb-2">
                    {showProfile.fullname}
                  </h2>
                  <p className="text-xl font-bold text-indigo-600/60 dark:text-indigo-400/60 italic lowercase tracking-tight">
                    professional {getCategoryName(showProfile.category) || 'member'}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-6">
                  <div className="flex gap-3">
                    <button onClick={() => handleShare(showProfile)} className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-400 hover:text-indigo-600 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:scale-110 active:scale-95"><Share2 className="w-5 h-5" /></button>
                    <button onClick={() => handleDownloadPDF(showProfile)} title="Download Profile PDF" className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-400 hover:text-indigo-600 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:scale-110 active:scale-95"><FileDown className="w-5 h-5" /></button>
                    <button onClick={() => openForm(showProfile)} className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-400 hover:text-indigo-600 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:scale-110 active:scale-95"><Edit className="w-5 h-5" /></button>
                  </div>
                  <div className="w-[150px] h-[150px] bg-white dark:bg-slate-800 rounded-3xl border-8 border-white dark:border-slate-800 shadow-2xl shadow-indigo-200/50 overflow-hidden">
                    {showProfile.profileImage ? (
                      <NgrokImage src={showProfile.profileImage} alt={showProfile.fullname} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl font-black text-indigo-100 bg-slate-50 dark:bg-slate-900 uppercase">
                        {showProfile.fullname?.charAt(0) || 'W'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div id="print-area">
                <style dangerouslySetInnerHTML={{
                  __html: `
                  @media print {
                    @page { margin: 15mm; size: A4; }
                    body { background: white !important; font-family: 'Inter', sans-serif !important; color: black !important; -webkit-print-color-adjust: exact; }
                    body * { visibility: hidden; }
                    #print-area, #print-area * { visibility: visible; }
                    #print-area { position: absolute; left: 0; top: 0; width: 100%; display: block !important; padding: 20px !important; }
                    
                    .print-header-section {
                      display: flex;
                      justify-content: space-between;
                      align-items: flex-start;
                      padding-bottom: 25px;
                      margin-bottom: 35px;
                      min-height: 160px; /* Ensure space for image */
                    }
                    
                    .print-image { 
                      width: 120px; 
                      height: 140px; 
                      object-fit: cover; 
                      border-radius: 6px;
                      flex-shrink: 0;
                    }

                    .print-section { 
                      border: 1.5px solid #000; 
                      margin-bottom: 20px; 
                      break-inside: avoid;
                      position: relative;
                      overflow: visible;
                    }
                    
                    .print-header { 
                      background: #000; 
                      color: #fff; 
                      padding: 6px 12px; 
                      font-weight: 800; 
                      font-size: 11px; 
                      text-transform: uppercase; 
                      letter-spacing: 1px; 
                      width: fit-content; 
                      margin-bottom: -1px; 
                      margin-left: -1px; 
                    }
                    
                    .print-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border-top: 1.5px solid #000; }
                    .print-cell { padding: 10px 15px; border: 0.5px solid #000; }
                    .print-label { font-size: 9px; font-weight: 800; color: #444; text-transform: uppercase; margin-bottom: 2px; }
                    .print-value { font-size: 13px; font-weight: 700; color: #000; }
                    .print-title { font-size: 26px; font-weight: 900; text-transform: uppercase; margin-bottom: 5px; }
                    
                    img {
                      max-width: 100%;
                      height: auto;
                    }
                  }
                `}} />

                {/* UI Form Content */}
                <div className="space-y-8 print:hidden">

                  {/* SECTIONS GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* SECTION: IDENTIFICATION */}
                    <div className="bg-white/80 dark:bg-slate-900/50 p-8 rounded-[2rem] border border-white dark:border-indigo-500/10 shadow-xl shadow-indigo-100/20 backdrop-blur-md">
                      <h3 className="text-base font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-widest mb-8 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                        Worker Identification & Core Profile
                      </h3>
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 border-b border-indigo-50 dark:border-slate-800 pb-4">
                          <span className="text-xs font-bold text-slate-400 uppercase">Worker ID</span>
                          <span className="text-sm font-black text-indigo-900 dark:text-indigo-200">{showProfile.workerid}</span>
                        </div>
                        <div className="grid grid-cols-2 border-b border-indigo-50 dark:border-slate-800 pb-4">
                          <span className="text-xs font-bold text-slate-400 uppercase">Full Name</span>
                          <span className="text-sm font-black text-indigo-900 dark:text-indigo-200 capitalize">{showProfile.fullname}</span>
                        </div>
                        <div className="grid grid-cols-2 border-b border-indigo-50 dark:border-slate-800 pb-4">
                          <span className="text-xs font-bold text-slate-400 uppercase">Operational Category</span>
                          <span className="text-sm font-black text-indigo-900 dark:text-indigo-200">{getCategoryName(showProfile.category)}</span>
                        </div>
                        <div className="grid grid-cols-2">
                          <span className="text-xs font-bold text-slate-400 uppercase">Current Status</span>
                          <span className={`text-sm font-black uppercase ${showProfile.active ? 'text-emerald-500' : 'text-rose-500'}`}>{showProfile.active ? 'Active' : 'Inactive'}</span>
                        </div>
                      </div>
                    </div>

                    {/* SECTION: COMMUNICATION */}
                    <div className="bg-white/80 dark:bg-slate-900/50 p-8 rounded-[2rem] border border-white dark:border-indigo-500/10 shadow-xl shadow-indigo-100/20 backdrop-blur-md">
                      <h3 className="text-base font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-widest mb-8 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                        Formal Identification & Communication
                      </h3>
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 border-b border-indigo-50 dark:border-slate-800 pb-4">
                          <span className="text-xs font-bold text-slate-400 uppercase">Mobile Number</span>
                          <span className="text-sm font-black text-indigo-900 dark:text-indigo-200">{showProfile.mobile || '—'}</span>
                        </div>
                        <div className="grid grid-cols-2 border-b border-indigo-50 dark:border-slate-800 pb-4">
                          <span className="text-xs font-bold text-slate-400 uppercase">Blood Group</span>
                          <span className="text-sm font-black text-indigo-900 dark:text-indigo-200">{showProfile.bloodgroup || '—'}</span>
                        </div>
                        <div className="grid grid-cols-2 border-b border-indigo-50 dark:border-slate-800 pb-4">
                          <span className="text-xs font-bold text-slate-400 uppercase">Aadhaar Number</span>
                          <span className="text-sm font-black text-indigo-900 dark:text-indigo-200 tracking-wider">{showProfile.aadhar || '—'}</span>
                        </div>
                        <div className="grid grid-cols-2">
                          <span className="text-xs font-bold text-slate-400 uppercase">PAN Number</span>
                          <span className="text-sm font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-widest">{showProfile.pan_num || '—'}</span>
                        </div>
                      </div>
                    </div>

                    {/* SECTION: ADDRESS */}
                    <div className="bg-white/80 dark:bg-slate-900/50 p-8 rounded-[2rem] border border-white dark:border-indigo-500/10 shadow-xl shadow-indigo-100/20 backdrop-blur-md">
                      <h3 className="text-base font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-widest mb-8 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                        Native Address & Regional Details
                      </h3>
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 border-b border-indigo-50 dark:border-slate-800 pb-4">
                          <span className="text-xs font-bold text-slate-400 uppercase">Village / Area / Street</span>
                          <span className="text-sm font-black text-indigo-900 dark:text-indigo-200 capitalize">{showProfile.village || '—'}</span>
                        </div>
                        <div className="grid grid-cols-2 border-b border-indigo-50 dark:border-slate-800 pb-4">
                          <span className="text-xs font-bold text-slate-400 uppercase">District</span>
                          <span className="text-sm font-black text-indigo-900 dark:text-indigo-200 capitalize">{showProfile.district || '—'}</span>
                        </div>
                        <div className="grid grid-cols-2">
                          <span className="text-xs font-bold text-slate-400 uppercase">State of Origin</span>
                          <span className="text-sm font-black text-indigo-900 dark:text-indigo-200 capitalize">{showProfile.state || '—'}</span>
                        </div>
                      </div>
                    </div>

                    {/* SECTION: EMPLOYMENT */}
                    <div className="bg-white/80 dark:bg-slate-900/50 p-8 rounded-[2rem] border border-white dark:border-indigo-500/10 shadow-xl shadow-indigo-100/20 backdrop-blur-md">
                      <h3 className="text-base font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-widest mb-8 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                        Employment History & Tenures
                      </h3>
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 border-b border-indigo-50 dark:border-slate-800 pb-4">
                          <span className="text-xs font-bold text-slate-400 uppercase">Date of Joining</span>
                          <span className="text-sm font-black text-indigo-900 dark:text-indigo-200">{showProfile.date_of_joining || '—'}</span>
                        </div>
                        <div className="grid grid-cols-2 border-b border-indigo-50 dark:border-slate-800 pb-4">
                          <span className="text-xs font-bold text-slate-400 uppercase">Relieving Date</span>
                          <span className={`text-sm font-black ${!showProfile.active && !showProfile.date_of_relieving ? 'text-rose-400 italic' : 'text-indigo-900 dark:text-indigo-200'}`}>
                            {showProfile.date_of_relieving || (showProfile.active ? 'Not Applicable' : 'Backend Processing...')}
                          </span>
                        </div>
                        <div className="grid grid-cols-2">
                          <span className="text-xs font-bold text-slate-400 uppercase">Tenures Tracked</span>
                          <span className="text-sm font-black text-indigo-500">{showProfile.employmentHistory?.length || 0} Records</span>
                        </div>
                      </div>
                    </div>

                    {/* SECTION: FAMILY */}
                    <div className="bg-white/80 dark:bg-slate-900/50 p-8 rounded-[2rem] border border-white dark:border-indigo-500/10 shadow-xl shadow-indigo-100/20 backdrop-blur-md">
                      <h3 className="text-base font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-widest mb-8 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                        Family & Legal Nominee Details
                      </h3>
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 border-b border-indigo-50 dark:border-slate-800 pb-4">
                          <span className="text-xs font-bold text-slate-400 uppercase">Marital Status</span>
                          <span className="text-sm font-black text-indigo-900 dark:text-indigo-200">{showProfile.marital_sts || 'Unmarried'}</span>
                        </div>
                        <div className="grid grid-cols-2 border-b border-indigo-50 dark:border-slate-800 pb-4">
                          <span className="text-xs font-bold text-slate-400 uppercase">Nominee / Parent Name</span>
                          <span className="text-sm font-black text-indigo-900 dark:text-indigo-200 capitalize">{showProfile.nominee_name || showProfile.parent_name || '—'}</span>
                        </div>
                        <div className="grid grid-cols-2">
                          <span className="text-xs font-bold text-slate-400 uppercase">Nominee Contact</span>
                          <span className="text-sm font-black text-indigo-900 dark:text-indigo-200">{showProfile.nominee_phone || showProfile.parentmob_num || '—'}</span>
                        </div>
                      </div>
                    </div>

                    {/* SECTION: REFERENCE & INSURANCE */}
                    <div className="bg-white/80 dark:bg-slate-900/50 p-8 rounded-[2rem] border border-white dark:border-indigo-500/10 shadow-xl shadow-indigo-100/20 backdrop-blur-md">
                      <h3 className="text-base font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-widest mb-8 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                        Reference & Insurance Details
                      </h3>
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 border-b border-indigo-50 dark:border-slate-800 pb-4">
                          <span className="text-xs font-bold text-slate-400 uppercase">Referred By</span>
                          <span className="text-sm font-black text-indigo-900 dark:text-indigo-200 capitalize">{showProfile.referred_by || 'Direct Walk-in'}</span>
                        </div>
                        <div className="grid grid-cols-2 border-b border-indigo-50 dark:border-slate-800 pb-4">
                          <span className="text-xs font-bold text-slate-400 uppercase">Insurance Enrollment</span>
                          <span className={`text-sm font-black uppercase tracking-widest ${showProfile.insurance_status === 'Yes' ? 'text-emerald-500' : 'text-slate-400'}`}>
                            {showProfile.insurance_status === 'Yes' ? 'Enrolled' : 'Not Enrolled'}
                          </span>
                        </div>
                        {showProfile.insurance_status === 'Yes' && (
                          <>
                            <div className="grid grid-cols-2 border-b border-indigo-50 dark:border-slate-800 pb-4">
                              <span className="text-xs font-bold text-slate-400 uppercase">Premium Amount</span>
                              <span className="text-sm font-black text-emerald-600">₹{showProfile.profile_premium || '0'}</span>
                            </div>
                            <div className="grid grid-cols-2 border-b border-indigo-50 dark:border-slate-800 pb-4">
                              <span className="text-xs font-bold text-slate-400 uppercase">Life Insured</span>
                              <span className="text-sm font-black text-indigo-600">₹{showProfile.life_insured_amount || '0'}</span>
                            </div>
                            <div className="grid grid-cols-2 border-b border-indigo-50 dark:border-slate-800 pb-4">
                              <span className="text-xs font-bold text-slate-400 uppercase">Medical Insured</span>
                              <span className="text-sm font-black text-rose-600">₹{showProfile.medical_insured_amount || '0'}</span>
                            </div>
                            <div className="grid grid-cols-2 border-b border-indigo-50 dark:border-slate-800 pb-4">
                              <span className="text-xs font-bold text-slate-400 uppercase">Policy Number</span>
                              <span className="text-sm font-black text-indigo-900 dark:text-indigo-200 uppercase">{showProfile.policy_num || '—'}</span>
                            </div>
                            <div className="grid grid-cols-2">
                              <span className="text-xs font-bold text-slate-400 uppercase">Policy Duration</span>
                              <span className="text-sm font-black text-indigo-900 dark:text-indigo-200 uppercase">{showProfile.policy_duration || '—'}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                  </div>
                </div>

                {/* GOVERNMENT STYLE PRINT UI */}
                <div className="hidden print:block font-sans text-black p-0">
                  <div className="print-header-section">
                    <div>
                      <h1 className="text-4xl font-black uppercase tracking-tighter leading-none mb-2">Workforce Management System</h1>
                      <h2 className="text-xl font-bold tracking-[0.3em] uppercase opacity-70">Official Personnel Deployment Record</h2>
                      <div className="mt-8 flex gap-10">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">Worker Registry ID</p>
                          <p className="text-2xl font-black tracking-widest text-black border-2 border-black px-4 py-1 rounded">{showProfile.workerid}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">Authenticated Full Name</p>
                          <p className="text-2xl font-black uppercase">{showProfile.fullname}</p>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {showProfile.profileImage ? (
                        <NgrokImage src={showProfile.profileImage} alt={showProfile.fullname} className="print-image" />
                      ) : (
                        <div className="print-image flex flex-col items-center justify-center bg-slate-50">
                          <Users className="w-12 h-12 opacity-20" />
                          <span className="text-[8px] font-black uppercase opacity-30 mt-2">NO PHOTO</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {/* SECTION 1 */}
                    <div className="print-section">
                      <div className="print-header">Worker Identification & Core Profile</div>
                      <div className="print-grid">
                        <div className="print-cell"><p className="print-label">Worker ID (UID)</p><p className="print-value">{showProfile.workerid}</p></div>
                        <div className="print-cell"><p className="print-label">Full Name</p><p className="print-value uppercase">{showProfile.fullname}</p></div>
                        <div className="print-cell"><p className="print-label">Operational Category</p><p className="print-value uppercase">{getCategoryName(showProfile.category)}</p></div>
                        <div className="print-cell"><p className="print-label">Current Status</p><p className="print-value uppercase">{showProfile.active ? 'ACTIVE' : 'INACTIVE'}</p></div>
                      </div>
                    </div>

                    {/* SECTION 2 */}
                    <div className="print-section">
                      <div className="print-header">Formal Identification & Communication</div>
                      <div className="print-grid">
                        <div className="print-cell"><p className="print-label">Mobile Number</p><p className="print-value">{showProfile.mobile || '—'}</p></div>
                        <div className="print-cell"><p className="print-label">Blood Group</p><p className="print-value uppercase">{showProfile.bloodgroup || '—'}</p></div>
                        <div className="print-cell"><p className="print-label">Aadhaar (UIDAI)</p><p className="print-value tracking-wider">{showProfile.aadhar || '—'}</p></div>
                        <div className="print-cell"><p className="print-label">PAN (Income Tax)</p><p className="print-value uppercase tracking-widest">{showProfile.pan_num || '—'}</p></div>
                      </div>
                    </div>

                    {/* SECTION 3 */}
                    <div className="print-section">
                      <div className="print-header">Native Address & Regional Details</div>
                      <div className="print-grid">
                        <div className="print-cell"><p className="print-label">Village / Area / Street</p><p className="print-value uppercase">{showProfile.village || '—'}</p></div>
                        <div className="print-cell"><p className="print-label">District / Hub Store</p><p className="print-value uppercase">{showProfile.district || '—'}</p></div>
                        <div className="print-cell col-span-2"><p className="print-label">State of Origin</p><p className="print-value uppercase">{showProfile.state || '—'}</p></div>
                      </div>
                    </div>

                    {/* SECTION 4 */}
                    <div className="print-section">
                      <div className="print-header">Employment History & Tenures</div>
                      <div className="print-grid">
                        <div className="print-cell"><p className="print-label">Date of Joining</p><p className="print-value font-mono">{showProfile.date_of_joining || '—'}</p></div>
                        <div className="print-cell"><p className="print-label">Date of Relieving</p><p className="print-value font-mono">{showProfile.date_of_relieving || 'NOT APPLICABLE'}</p></div>
                      </div>
                    </div>

                    {/* SECTION 5 */}
                    <div className="print-section">
                      <div className="print-header">Family & Legal Nominee Details</div>
                      <div className="print-grid">
                        <div className="print-cell"><p className="print-label">Marital Status</p><p className="print-value uppercase">{showProfile.marital_sts || 'UNMARRIED'}</p></div>
                        <div className="print-cell"><p className="print-label">Nominee / Parent Name</p><p className="print-value uppercase">{showProfile.nominee_name || showProfile.parent_name || '—'}</p></div>
                        <div className="print-cell col-span-2"><p className="print-label">Nominee Contact Details</p><p className="print-value">{showProfile.nominee_phone || showProfile.parentmob_num || '—'}</p></div>
                      </div>
                    </div>

                    {/* SECTION 6 */}
                    <div className="print-section">
                      <div className="print-header">Reference & Insurance Documentation</div>
                      <div className="print-grid">
                        <div className="print-cell"><p className="print-label">Referred By</p><p className="print-value uppercase">{showProfile.referred_by || 'DIRECT WALK-IN'}</p></div>
                        <div className="print-cell"><p className="print-label">Insurance Status</p><p className="print-value uppercase tracking-widest">{showProfile.insurance_status === 'Yes' ? 'ENROLLED' : 'NOT ENROLLED'}</p></div>
                        {showProfile.insurance_status === 'Yes' && (
                          <>
                            <div className="print-cell"><p className="print-label">Premium Amount</p><p className="print-value">₹{showProfile.profile_premium || '0'}</p></div>
                            <div className="print-cell"><p className="print-label">Life Insured</p><p className="print-value">₹{showProfile.life_insured_amount || '0'}</p></div>
                            <div className="print-cell"><p className="print-label">Medical Insured</p><p className="print-value">₹{showProfile.medical_insured_amount || '0'}</p></div>
                            <div className="print-cell"><p className="print-label">Policy Number</p><p className="print-value uppercase">{showProfile.policy_num || '—'}</p></div>
                            <div className="print-cell"><p className="print-label">Policy Duration</p><p className="print-value uppercase">{showProfile.policy_duration || '—'}</p></div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-16 flex justify-between items-end">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Certified Profile Registry Document<br />Generated via Internal Workforce DB</div>
                    <div className="text-center">
                      <div className="w-48 h-12 border-b-2 border-black mb-1"></div>
                      <p className="text-[10px] font-black uppercase tracking-widest">Authorized Signature / Seal</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-16 pt-10 border-t border-indigo-100 dark:border-indigo-900/50 print:hidden text-center">
                <button
                  onClick={() => handleDelete(showProfile.id)}
                  className="px-10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all border border-rose-100 dark:border-rose-500/20 shadow-sm"
                >
                  Permanently Purge Record
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50/50 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center h-full">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-xl font-black text-slate-700 dark:text-slate-300 mb-2">Worker Registry</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm">Select a worker from the list to view their complete profile, history, and records.</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Registration / Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[999] bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 lg:p-10">
          <div className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[90vh] rounded-[2rem] shadow-2xl flex flex-col border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-8 lg:px-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 relative z-10 shrink-0">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                   <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight uppercase">
                    {formData.id ? 'Edit Worker Profile' : 'New Worker Registration'}
                  </h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Hindi Academy Personnel Registry</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="w-12 h-12 flex items-center justify-center bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-2xl transition-all text-slate-400 hover:text-rose-500 border border-slate-100 dark:border-slate-700 shadow-sm"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleSaveWorker} className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 bg-slate-50/50 dark:bg-slate-950/50">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

                {/* Basic Section */}
                <div className="space-y-8 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600/20" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 border-b border-slate-100 dark:border-slate-800 pb-5 mb-8 flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.5)]"></span>
                    Worker Identification & Core Profile
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2 flex justify-center mb-10">
                      <div className="relative group/photo">
                        <div className="w-32 h-32 rounded-[2.5rem] bg-slate-50 dark:bg-slate-950 border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center transition-all group-hover/photo:border-indigo-500 group-hover/photo:bg-indigo-50/30 overflow-hidden shadow-inner ring-8 ring-slate-50/50 dark:ring-slate-900/50">
                          {formData.profileImage ? (
                            <NgrokImage src={formData.profileImage} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <>
                              <Plus className="w-6 h-6 text-slate-400 mb-1" />
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Upload</span>
                            </>
                          )}
                        </div>
                        <input type="file" accept=".jpg, .jpeg, .png" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" title="Upload Profile Picture" />
                        {formData.profileImage && (
                          <button type="button" onClick={() => setFormData({ ...formData, profileImage: undefined })} className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-600 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="col-span-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Worker ID</label>
                      <input type="text" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 dark:text-white transition-all outline-none shadow-sm" value={formData.workerid || ''} onChange={e => setFormData({ ...formData, workerid: e.target.value })} placeholder="Auto-generated if empty" />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Full Name *</label>
                      <input required type="text" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 dark:text-white transition-all outline-none shadow-sm" value={formData.fullname || ''} onChange={e => setFormData({ ...formData, fullname: e.target.value })} placeholder="e.g. Ramesh Kumar" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Category *</label>
                      <input required type="text" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 dark:text-white transition-all outline-none shadow-sm" value={formData.category || ''} onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="Mason, Helper, etc." />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Mobile Number *</label>
                      <input required type="text" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 dark:text-white transition-all outline-none shadow-sm" value={formData.mobile || ''} onChange={e => setFormData({ ...formData, mobile: e.target.value })} placeholder="10 Digits" />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Aadhaar Number</label>
                      <input type="text" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 dark:text-white transition-all outline-none shadow-sm" value={formData.aadhar || ''} onChange={e => setFormData({ ...formData, aadhar: e.target.value })} placeholder="12 Digits" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">PAN Number</label>
                      <input type="text" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 dark:text-white transition-all outline-none uppercase shadow-sm" value={formData.pan_num || ''} onChange={e => setFormData({ ...formData, pan_num: e.target.value })} placeholder="ABCDE1234F" />
                    </div>
                    <div className="col-span-2 mt-2">
                      <h3 className="text-sm font-black uppercase tracking-widest text-indigo-500 border-b border-slate-100 dark:border-slate-800 pb-3 mb-5 flex items-center gap-2 pt-4"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> Address Details</h3>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Village / Locality</label>
                      <input type="text" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 dark:text-white transition-all outline-none shadow-sm" value={formData.village || ''} onChange={e => setFormData({ ...formData, village: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">District</label>
                      <input type="text" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 dark:text-white transition-all outline-none shadow-sm" value={formData.district || ''} onChange={e => setFormData({ ...formData, district: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">State</label>
                      <input type="text" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 dark:text-white transition-all outline-none shadow-sm" value={formData.state || ''} onChange={e => setFormData({ ...formData, state: e.target.value })} />
                    </div>
                  </div>
                </div>

                {/* Right Column grouping */}
                <div className="space-y-6">
                  {/* Employment Details */}
                  <div className="bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800/30 shadow-inner">
                    <h3 className="text-sm font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 border-b border-indigo-200 dark:border-indigo-800/50 pb-3 mb-5 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span> Employment Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-1.5">Date of Joining *</label>
                        <input required type="date" className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all outline-none font-bold text-indigo-900 dark:text-indigo-100" value={formData.date_of_joining || ''} onChange={e => setFormData({ ...formData, date_of_joining: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-1.5">Date of Relieving</label>
                        <input type="date" className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all outline-none" value={formData.date_of_relieving || ''} onChange={e => setFormData({ ...formData, date_of_relieving: e.target.value })} />
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-indigo-500 dark:text-indigo-400 font-medium">Rejoining history and persistent worker ID tracking is automatically managed by the system upon status toggling.</p>
                      </div>
                    </div>
                  </div>

                  {/* Personal Details */}
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <h3 className="text-sm font-black uppercase tracking-widest text-indigo-500 border-b border-slate-100 dark:border-slate-800 pb-4 mb-6 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/50"></span> Personal & Family</h3>
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Blood Group</label>
                        <select className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 dark:text-white transition-all outline-none shadow-sm" value={formData.bloodgroup || ''} onChange={e => setFormData({ ...formData, bloodgroup: e.target.value })}>
                          <option value="">Select</option>
                          {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Marital Status</label>
                        <select className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 dark:text-white transition-all outline-none shadow-sm" value={formData.marital_sts || 'Unmarried'} onChange={e => setFormData({ ...formData, marital_sts: e.target.value as any })}>
                          <option value="Unmarried">Unmarried</option>
                          <option value="Married">Married</option>
                        </select>
                      </div>

                      {/* Conditional Renders based on Marital Status */}
                      {formData.marital_sts === 'Married' && (
                        <>
                          <div className="col-span-2 pt-2"><label className="block text-[10px] font-black uppercase tracking-widest mb-1 text-indigo-500">Spouse & Nominee</label></div>
                          <div>
                            <input type="text" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 dark:text-white transition-all outline-none shadow-sm" value={formData.nominee_name || ''} onChange={e => setFormData({ ...formData, nominee_name: e.target.value })} placeholder="Nominee Name" />
                          </div>
                          <div>
                            <input type="text" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 dark:text-white transition-all outline-none shadow-sm" value={formData.nominee_phone || ''} onChange={e => setFormData({ ...formData, nominee_phone: e.target.value })} placeholder="Nominee Mobile" />
                          </div>
                          <div className="col-span-2">
                            <input type="text" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 dark:text-white transition-all outline-none shadow-sm" value={formData.children_details || ''} onChange={e => setFormData({ ...formData, children_details: e.target.value })} placeholder="Children Details (Names/Ages)" />
                          </div>
                        </>
                      )}

                      {formData.marital_sts === 'Unmarried' && (
                        <>
                          <div className="col-span-2 pt-2"><label className="block text-[10px] font-black uppercase tracking-widest mb-1 text-indigo-500">Parent / Guardian</label></div>
                          <div>
                            <input type="text" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 dark:text-white transition-all outline-none shadow-sm" value={formData.parent_name || ''} onChange={e => setFormData({ ...formData, parent_name: e.target.value })} placeholder="Parent Name" />
                          </div>
                          <div>
                            <input type="text" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 dark:text-white transition-all outline-none shadow-sm" value={formData.parentmob_num || ''} onChange={e => setFormData({ ...formData, parentmob_num: e.target.value })} placeholder="Parent Mobile" />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Ref & Insurance */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <h3 className="text-sm font-black uppercase tracking-widest text-indigo-500 border-b border-slate-100 dark:border-slate-800 pb-3 mb-5 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> Reference & Insurance</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Referred By (Name)</label>
                        <input type="text" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all outline-none" value={formData.referred_by || ''} onChange={e => setFormData({ ...formData, referred_by: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Referrer Mobile</label>
                        <input type="text" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all outline-none" value={formData.referral_phno || ''} onChange={e => setFormData({ ...formData, referral_phno: e.target.value })} />
                      </div>

                      <div className="col-span-2 pt-2">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 text-indigo-500">Insurance Available</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-950 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 flex-1 hover:border-indigo-500">
                            <input type="radio" name="insurance" checked={formData.insurance_status === 'Yes'} onChange={() => setFormData({ ...formData, insurance_status: 'Yes' })} className="accent-indigo-600" />
                            <span className="text-sm font-bold dark:text-white">Yes, Enrolled</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-950 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 flex-1 hover:border-indigo-500">
                            <input type="radio" name="insurance" checked={formData.insurance_status !== 'Yes'} onChange={() => setFormData({ ...formData, insurance_status: 'No' })} className="accent-indigo-600" />
                            <span className="text-sm font-bold dark:text-white">Not Enrolled</span>
                          </label>
                        </div>
                      </div>

                      {formData.insurance_status === 'Yes' && (
                        <>
                          <div className="col-span-2 mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="col-span-1">
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Premium Amount</label>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                <input type="text" className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none" value={formData.profile_premium || ''} onChange={e => setFormData({ ...formData, profile_premium: e.target.value })} placeholder="0.00" />
                              </div>
                            </div>
                            <div className="col-span-1">
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Life Insured Amount</label>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                <input type="text" className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none" value={formData.life_insured_amount || ''} onChange={e => setFormData({ ...formData, life_insured_amount: e.target.value })} placeholder="0.00" />
                              </div>
                            </div>
                            <div className="col-span-1">
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Medical Insured Amount</label>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                <input type="text" className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none" value={formData.medical_insured_amount || ''} onChange={e => setFormData({ ...formData, medical_insured_amount: e.target.value })} placeholder="0.00" />
                              </div>
                            </div>
                          </div>
                          
                          <div className="col-span-2 mt-2 gap-4 grid grid-cols-2">
                            <div>
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Policy Number</label>
                              <input type="text" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none" value={formData.policy_num || ''} onChange={e => setFormData({ ...formData, policy_num: e.target.value })} placeholder="Policy Number" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Policy Date</label>
                              <input type="date" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none" value={formData.insurance_date || ''} onChange={e => setFormData({ ...formData, insurance_date: e.target.value })} />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Policy Duration</label>
                              <input type="text" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none" value={formData.policy_duration || ''} onChange={e => setFormData({ ...formData, policy_duration: e.target.value })} placeholder="e.g. 1 Year, 6 Months" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Insurance Company</label>
                              <input type="text" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none" value={formData.insurancecompany || ''} onChange={e => setFormData({ ...formData, insurancecompany: e.target.value })} placeholder="Insurance Company" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Source</label>
                              <select className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none" value={formData.insurance_source || 'Self'} onChange={e => setFormData({ ...formData, insurance_source: e.target.value as any })}>
                                <option value="Self">Taken by Self</option>
                                <option value="Agent">Taken via Agent</option>
                                <option value="Company">Provided by Company</option>
                              </select>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </form>

            <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-4 justify-end shrink-0 relative z-20">
              <button 
                type="button" 
                onClick={() => setShowForm(false)} 
                className="px-8 py-3 rounded-xl font-bold bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-100 dark:border-slate-700"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleSaveWorker}
                className="px-10 py-3 rounded-xl font-black uppercase tracking-widest text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
              >
                {formData.id ? 'Save Changes' : 'Register Worker'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default WorkerDatabaseTab;