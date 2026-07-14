import React, { useState, useEffect, useRef } from "react";
import { Video, Upload, Trash2, Calendar, Clock, CheckCircle, Loader2, Plus, X, Edit2, Lock, PlayCircle, StopCircle, BarChart3, Users, Link } from "lucide-react";
import { LiveClass } from "../../types";
import { localLiveClassService } from "../../lib/localLiveClassService";

const RecordedClassTab: React.FC = () => {
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formDurationMins, setFormDurationMins] = useState("30");
  const [formDurationSecs, setFormDurationSecs] = useState("0");
  const [formVideoUrl, setFormVideoUrl] = useState("");

  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [analyticsClassId, setAnalyticsClassId] = useState<string | null>(null);
  const [viewerList, setViewerList] = useState<any[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);

  // Custom Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionLabel: string;
    actionStyle: string;
    onConfirm: () => void;
  } | null>(null);

  const fetchClasses = async () => {
    setLoading(true);
    const data = await localLiveClassService.getAll();
    setClasses(data);
    setLoading(false);
  };

  const fetchDashboardStats = async () => {
    const stats = await localLiveClassService.getDashboardStats();
    if (stats) setDashboardStats(stats);
  };

  useEffect(() => {
    fetchClasses();
    fetchDashboardStats();
  }, []);

  const resetForm = () => {
    setFormTitle("");
    setFormDesc("");
    setFormDate("");
    setFormTime("");
    setFormDurationMins("30");
    setFormDurationSecs("0");
    setFormVideoUrl("");
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDate || !formTime || (!formVideoUrl && !editingId)) {
      setStatusMsg("Please fill all required fields and provide a video URL.");
      return;
    }

    const scheduledDateTime = new Date(`${formDate}T${formTime}`).toISOString();
    const mins = parseInt(formDurationMins) || 0;
    const secs = parseInt(formDurationSecs) || 0;
    const duration = mins + (secs / 60);
    const newStart = new Date(scheduledDateTime).getTime();
    
    // 1. Prevent scheduling in the past (only for new classes)
    if (!editingId && newStart < Date.now()) {
      setStatusMsg("Error: Cannot schedule a new class in the past.");
      return;
    }
    
    // 2. Prevent overlapping sessions
    const newEnd = newStart + duration * 60000;
    const hasOverlap = classes.some((cls) => {
      if (editingId === cls.id) return false; // Ignore the one being edited
      const existingStart = new Date(cls.scheduled_time).getTime();
      const existingEnd = existingStart + (cls.duration_minutes || 30) * 60000;
      // Check for interval overlap: (Start A < End B) and (Start B < End A)
      return newStart < existingEnd && existingStart < newEnd;
    });
    
    if (hasOverlap) {
      setStatusMsg("Error: This time slot overlaps with an existing scheduled class.");
      return;
    }

    if (editingId) {
      setStatusMsg("Updating class...");
      setUploading(true);
      try {
        const updatedClass = await localLiveClassService.update(editingId, {
          title: formTitle,
          description: formDesc,
          scheduled_time: scheduledDateTime,
          duration_minutes: duration,
        });

        setUploading(false);
        if (updatedClass) {
          setStatusMsg("Class updated successfully!");
          resetForm();
          setShowForm(false);
          fetchClasses();
        }
      } catch (err: any) {
        setUploading(false);
        const errMsg = err.message || "Update failed.";
        setStatusMsg(`Update failed: ${errMsg}`);
      }
      setTimeout(() => setStatusMsg(""), 5000);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setStatusMsg("Uploading video to server...");

    // Simulate progress for local storage
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 10, 90));
    }, 100);

    let finalVideoUrl = formVideoUrl;
    if (finalVideoUrl.includes("drive.google.com")) {
      const match = finalVideoUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        finalVideoUrl = `https://drive.google.com/uc?export=download&id=${match[1]}`;
      }
    }

    const newClass = await localLiveClassService.create(
      {
        title: formTitle,
        description: formDesc,
        scheduled_time: scheduledDateTime,
        duration_minutes: duration,
        status: "scheduled",
      },
      null,
      finalVideoUrl
    );

    clearInterval(progressInterval);
    setUploadProgress(100);

    setTimeout(() => {
      setUploading(false);
      setUploadProgress(0);

      if (newClass) {
        setStatusMsg("Class created successfully!");
        resetForm();
        setShowForm(false);
        fetchClasses();
      } else {
        setStatusMsg("Upload failed. Check console or server logs for details.");
      }

      setTimeout(() => setStatusMsg(""), 3000);
    }, 300);
  };

  const handleEdit = (cls: LiveClass) => {
    setFormTitle(cls.title);
    setFormDesc(cls.description || "");
    if (cls.scheduled_time) {
      const d = new Date(cls.scheduled_time);
      setFormDate(d.toISOString().split('T')[0]);
      setFormTime(d.toTimeString().split(' ')[0].slice(0, 5));
    }
    
    if (cls.duration_minutes) {
      const mins = Math.floor(cls.duration_minutes);
      const secs = Math.round((cls.duration_minutes - mins) * 60);
      setFormDurationMins(mins.toString());
      setFormDurationSecs(secs.toString());
    } else {
      setFormDurationMins("30");
      setFormDurationSecs("0");
    }
    
    setEditingId(cls.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (cls: LiveClass) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Class",
      message: `Are you sure you want to delete "${cls.title}"? This action cannot be undone.`,
      actionLabel: "Delete",
      actionStyle: "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20",
      onConfirm: async () => {
        setConfirmModal(null);
        setDeletingId(cls.id);
        await localLiveClassService.delete(cls.id);
        setDeletingId(null);
        fetchClasses();
      }
    });
  };

  const handleForceStart = async (cls: LiveClass) => {
    setConfirmModal({
      isOpen: true,
      title: "Force Start",
      message: `Are you sure you want to force start "${cls.title}"? This overrides the countdown and pushes the class live immediately.`,
      actionLabel: "Force Start",
      actionStyle: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20",
      onConfirm: async () => {
        setConfirmModal(null);
        setStatusMsg("Starting class...");
        await localLiveClassService.forceStart(cls.id);
        fetchClasses();
        setTimeout(() => setStatusMsg(""), 3000);
      }
    });
  };

  const handleForceEnd = async (cls: LiveClass) => {
    setConfirmModal({
      isOpen: true,
      title: "Force End",
      message: `Are you sure you want to force end "${cls.title}"? This will stop the stream for all viewers immediately.`,
      actionLabel: "Force End",
      actionStyle: "bg-orange-600 hover:bg-orange-700 shadow-orange-600/20",
      onConfirm: async () => {
        setConfirmModal(null);
        setStatusMsg("Ending class...");
        await localLiveClassService.forceEnd(cls.id);
        fetchClasses();
        setTimeout(() => setStatusMsg(""), 3000);
      }
    });
  };

  const openAnalytics = async (cls: LiveClass) => {
    setAnalyticsClassId(cls.id);
    setLoadingViewers(true);
    const viewers = await localLiveClassService.getViewerList(cls.id);
    setViewerList(viewers);
    setLoadingViewers(false);
  };

  const handleKickViewer = async (viewerId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Kick Viewer",
      message: "Are you sure you want to kick this viewer from the session?",
      actionLabel: "Kick Viewer",
      actionStyle: "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20",
      onConfirm: async () => {
        setConfirmModal(null);
        await localLiveClassService.kickViewer(viewerId);
        if (analyticsClassId) {
          // Refresh list
          const viewers = await localLiveClassService.getViewerList(analyticsClassId);
          setViewerList(viewers);
        }
      }
    });
  };

  const formatScheduled = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    }) + " at " + d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getDisplayStatus = (cls: LiveClass) => {
    if (cls.status === "EXPIRED" || cls.status === "completed") return cls.status;
    const start = new Date(cls.scheduled_time).getTime();
    const durationMs = (cls.duration_minutes || 30) * 60000;
    const end = start + Math.max(durationMs, 3600000); // Window covers 1 hr
    if (Date.now() > end) return "EXPIRED";
    return cls.status;
  };

  const localTotalClasses = classes.length;
  const localLiveNow = classes.filter(cls => {
    const start = new Date(cls.scheduled_time).getTime();
    const durationMs = (cls.duration_minutes || 30) * 60000;
    const end = start + Math.max(durationMs, 3600000);
    return Date.now() >= start && Date.now() < end && cls.status !== "EXPIRED" && cls.status !== "completed";
  }).length;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Dashboard Stats */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <Video className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total Classes</p>
              <p className="text-2xl font-black text-slate-900">{dashboardStats.total_classes || dashboardStats.totalClasses || localTotalClasses}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <Users className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total Viewers</p>
              <p className="text-2xl font-black text-slate-900">{dashboardStats.total_viewers || dashboardStats.totalViewers || 0}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center">
              <PlayCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Live Now</p>
              <p className="text-2xl font-black text-slate-900">{dashboardStats.live_now || dashboardStats.liveNow || localLiveNow}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-slate-900 mb-2 flex items-center gap-3">
            <Video className="w-8 h-8 text-indigo-600" />
            Recorded Classes
          </h2>
          <p className="text-slate-500 font-medium">
            Upload and schedule recorded video classes for students.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); resetForm(); }}
          className="flex w-full md:w-auto items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-600/20"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Cancel" : "New Class"}
        </button>
      </div>

      {/* Status message */}
      {statusMsg && (
        <div className={`text-sm font-bold text-center py-3 px-6 rounded-2xl ${
          statusMsg.includes("success") || statusMsg.includes("Success")
            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
            : statusMsg.includes("Uploading") || statusMsg.includes("Saving")
            ? "bg-indigo-50 text-indigo-600 border border-indigo-100"
            : "bg-rose-50 text-rose-600 border border-rose-100"
        }`}>
          {statusMsg}
        </div>
      )}

      {/* Upload form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                Class Title *
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Hindi Grammar Lesson 5"
                required
                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:border-indigo-600/30 focus:ring-4 focus:ring-indigo-600/5 transition-all"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                Description
              </label>
              <textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Brief description of the class..."
                rows={2}
                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:border-indigo-600/30 focus:ring-4 focus:ring-indigo-600/5 transition-all resize-none"
              />
            </div>

            {/* Video Link */}
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                Video URL {editingId ? "(Leave empty to keep existing)" : "*"}
              </label>
              
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Link className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                </div>
                <input
                  type="url"
                  value={formVideoUrl}
                  onChange={(e) => setFormVideoUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/... or direct stream link"
                  className="w-full pl-12 pr-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:border-indigo-600/30 focus:ring-4 focus:ring-indigo-600/5 transition-all"
                />
                {formVideoUrl && formVideoUrl.includes("drive.google.com") && !formVideoUrl.includes("uc?export") && (
                  <p className="text-[10px] text-emerald-600 font-bold mt-2 ml-1">
                    ✓ Google Drive link detected. It will be optimized for streaming automatically.
                  </p>
                )}
              </div>
            </div>

            {/* Scheduled Date */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                <Calendar className="w-3 h-3 inline mr-1" />
                Scheduled Date *
              </label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                required
                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-900 font-bold focus:outline-none focus:border-indigo-600/30 focus:ring-4 focus:ring-indigo-600/5 transition-all"
              />
            </div>

            {/* Scheduled Time */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                <Clock className="w-3 h-3 inline mr-1" />
                Scheduled Time *
              </label>
              <input
                type="time"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
                required
                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-900 font-bold focus:outline-none focus:border-indigo-600/30 focus:ring-4 focus:ring-indigo-600/5 transition-all"
              />
            </div>

            {/* Duration */}
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                Duration (Precise)
              </label>
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <input
                    type="number"
                    value={formDurationMins}
                    onChange={(e) => setFormDurationMins(e.target.value)}
                    min="0"
                    placeholder="0"
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-900 font-bold focus:outline-none focus:border-indigo-600/30 focus:ring-4 focus:ring-indigo-600/5 transition-all"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 uppercase tracking-widest pointer-events-none">Mins</span>
                </div>
                <div className="flex-1 relative">
                  <input
                    type="number"
                    value={formDurationSecs}
                    onChange={(e) => setFormDurationSecs(e.target.value)}
                    min="0"
                    max="59"
                    placeholder="0"
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-900 font-bold focus:outline-none focus:border-indigo-600/30 focus:ring-4 focus:ring-indigo-600/5 transition-all"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 uppercase tracking-widest pointer-events-none">Secs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Upload progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-bold text-slate-600">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  Uploading video...
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || !formTitle || !formDate || !formTime || (!formVideoUrl && !editingId)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-8 py-4 rounded-2xl font-black text-lg shadow-xl shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            {editingId ? <Edit2 className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
            {uploading ? "Saving..." : (editingId ? "Update Class" : "Upload & Schedule Class")}
          </button>
        </form>
      )}

      {/* Classes List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Loading classes...</p>
          </div>
        ) : classes.length === 0 ? (
          <div className="p-12 text-center">
            <Video className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium text-lg mb-2">No classes scheduled yet</p>
            <p className="text-slate-400 text-sm">Click "New Class" to upload and schedule your first recorded class.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {classes.map((cls) => (
              <div key={cls.id} className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start md:items-center gap-4 md:gap-5">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <Video className="w-6 h-6 md:w-7 md:h-7 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 text-base md:text-lg truncate">{cls.title}</h3>
                    {cls.description && (
                      <p className="text-slate-500 text-sm mt-0.5">{cls.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs font-medium text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatScheduled(cls.scheduled_time)}
                      </span>
                      {cls.duration_minutes && cls.duration_minutes > 0 && (
                        <span>
                          {Math.floor(cls.duration_minutes)}m {Math.round((cls.duration_minutes - Math.floor(cls.duration_minutes)) * 60)}s
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-2 md:pt-0">
                  <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                    getDisplayStatus(cls) === "scheduled" || getDisplayStatus(cls) === "UPCOMING"
                      ? "bg-amber-50 text-amber-600 border-amber-100"
                      : getDisplayStatus(cls) === "EXPIRED"
                      ? "bg-slate-100 text-slate-500 border-slate-200"
                      : "bg-emerald-50 text-emerald-600 border-emerald-100"
                  }`}>
                    {getDisplayStatus(cls) === "scheduled" || getDisplayStatus(cls) === "UPCOMING" ? (
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3 inline" /> Scheduled</span>
                    ) : getDisplayStatus(cls) === "EXPIRED" ? (
                      <span className="flex items-center gap-1"><Lock className="w-3 h-3 inline" /> Expired</span>
                    ) : (
                      <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 inline" /> Completed</span>
                    )}
                  </span>
                  <div className="flex items-center gap-1">
                    {getDisplayStatus(cls) !== "EXPIRED" && (
                      <>
                        <button
                          onClick={() => handleForceStart(cls)}
                          title="Force Start"
                          className="p-2 text-slate-300 hover:text-emerald-500 transition-colors"
                        >
                          <PlayCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleForceEnd(cls)}
                          title="Force End"
                          className="p-2 text-slate-300 hover:text-orange-500 transition-colors"
                        >
                          <StopCircle className="w-5 h-5" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => openAnalytics(cls)}
                      title="View Analytics"
                      className="p-2 text-slate-300 hover:text-indigo-500 transition-colors"
                    >
                      <BarChart3 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleEdit(cls)}
                      disabled={deletingId === cls.id}
                      className="p-2 text-slate-300 hover:text-indigo-500 transition-colors disabled:opacity-50"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cls)}
                      disabled={deletingId === cls.id}
                      className="p-2 text-slate-300 hover:text-rose-500 transition-colors disabled:opacity-50"
                    >
                      {deletingId === cls.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Analytics Modal */}
      {analyticsClassId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Live Viewers
              </h2>
              <button 
                onClick={() => setAnalyticsClassId(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              {loadingViewers ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
                  <p className="text-slate-500 font-medium">Loading viewer data...</p>
                </div>
              ) : viewerList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Users className="w-12 h-12 text-slate-200 mb-4" />
                  <p className="text-slate-500 font-medium text-lg">No viewers recorded</p>
                  <p className="text-slate-400 text-sm text-center max-w-md mt-1">
                    Once students join the stream, their attendance will be logged here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                  {viewerList.map((viewer) => (
                    <div key={viewer.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="font-bold text-indigo-700">
                            {viewer.user_email ? viewer.user_email[0].toUpperCase() : '?'}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{viewer.user_email}</p>
                          <p className="text-xs text-slate-400 font-medium mt-0.5">Joined at {new Date(viewer.joined_at || Date.now()).toLocaleTimeString()}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleKickViewer(viewer.id)}
                        className="text-xs font-bold text-rose-500 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors border border-rose-100"
                      >
                        Kick
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-100 transform transition-all">
            <h3 className="text-xl font-black text-slate-900 mb-2">{confirmModal.title}</h3>
            <p className="text-slate-500 mb-8 font-medium">{confirmModal.message}</p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg transition-all active:scale-95 ${confirmModal.actionStyle}`}
              >
                {confirmModal.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordedClassTab;
