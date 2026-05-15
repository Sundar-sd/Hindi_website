import React, { useState, useEffect } from "react";
import { Play, Square, Video, Link, Radio, Users, Settings, Bell, ExternalLink } from "lucide-react";

const LiveClassTab: React.FC = () => {
  const [isLiveActive, setIsLiveActive] = useState<boolean>(localStorage.getItem('isLiveActive') === 'true');
  const [meetingLink, setMeetingLink] = useState<string>(localStorage.getItem('liveMeetingLink') || 'https://api.codingboss.in/live/');
  const [statusMessage, setStatusMessage] = useState<string>("");

  useEffect(() => {
    // Listen for changes in localStorage from other tabs
    const handleStorageChange = () => {
      setIsLiveActive(localStorage.getItem('isLiveActive') === 'true');
      setMeetingLink(localStorage.getItem('liveMeetingLink') || 'https://api.codingboss.in/live/');
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const startLiveClass = () => {
    if (!meetingLink.trim()) {
      setStatusMessage("Please provide a valid meeting link.");
      return;
    }
    localStorage.setItem('isLiveActive', 'true');
    localStorage.setItem('liveMeetingLink', meetingLink);
    setIsLiveActive(true);
    setStatusMessage("Class started successfully!");

    // Open the meeting link directly for the admin
    window.open(meetingLink, '_blank');

    // Trigger a storage event manually for the same tab
    window.dispatchEvent(new Event('storage'));
  };

  const endLiveClass = () => {
    localStorage.removeItem('isLiveActive');
    localStorage.removeItem('liveMeetingLink');
    setIsLiveActive(false);
    setStatusMessage("Class ended.");

    // Trigger a storage event manually for the same tab
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* ── Header Section ── */}
      <div className="flex items-center justify-between bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-slate-900 mb-2 flex items-center gap-3">
            <Radio className={`w-8 h-8 ${isLiveActive ? "text-rose-500 animate-pulse" : "text-slate-400"}`} />
            Live Class Control Center
          </h2>
          <p className="text-slate-500 font-medium">
            Broadcast your knowledge to thousands of students worldwide.
          </p>
        </div>
        <div className={`px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest border-2 transition-all duration-500 ${isLiveActive
            ? "bg-rose-50 text-rose-600 border-rose-100 animate-bounce"
            : "bg-slate-50 text-slate-400 border-slate-100"
          }`}>
          {isLiveActive ? "● System Live" : "○ System Offline"}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Main Controls ── */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
            {/* Background Decorative Element */}
            <div className={`absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl transition-all duration-700 ${isLiveActive ? "bg-rose-500/10" : "bg-indigo-500/5"
              }`} />

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-500 ${isLiveActive ? "bg-rose-50" : "bg-indigo-50"
                  }`}>
                  <Video className={`w-7 h-7 ${isLiveActive ? "text-rose-600" : "text-indigo-600"}`} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Broadcast Configuration</h3>
                  <p className="text-sm text-slate-500 font-medium text-indigo-600">Secure P2P Streaming Engine</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Meeting Destination URL</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                      <Link className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={meetingLink}
                      onChange={(e) => setMeetingLink(e.target.value)}
                      disabled={isLiveActive}
                      placeholder="Enter meeting or RTMP link..."
                      className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:border-indigo-600/30 focus:ring-4 focus:ring-indigo-600/5 transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  {!isLiveActive ? (
                    <button
                      onClick={startLiveClass}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-5 rounded-2xl font-black text-lg shadow-xl shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-3 group"
                    >
                      <Play className="w-6 h-6 fill-white group-hover:scale-110 transition-transform" />
                      Start Stream Engine
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => window.open(meetingLink, '_blank')}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-5 rounded-2xl font-black text-lg shadow-xl shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-3 group"
                      >
                        <ExternalLink className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        Enter Meeting Room
                      </button>
                      <button
                        onClick={endLiveClass}
                        className="flex-1 bg-rose-500 hover:bg-rose-600 text-white px-8 py-5 rounded-2xl font-black text-lg shadow-xl shadow-rose-500/20 transition-all active:scale-95 flex items-center justify-center gap-3 group"
                      >
                        <Square className="w-6 h-6 fill-white group-hover:scale-110 transition-transform" />
                        Terminate Session
                      </button>
                    </>
                  )}

                  <button className="w-full sm:w-20 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center transition-all border border-slate-100 shadow-sm py-4 sm:py-0">
                    <Settings className="w-6 h-6" />
                  </button>
                </div>

                {statusMessage && (
                  <p className={`text-sm font-bold text-center animate-in fade-in slide-in-from-top-2 ${statusMessage.includes("success") ? "text-emerald-500" : "text-rose-500"
                    }`}>
                    {statusMessage}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Analytics Preview ── */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Students</p>
                <p className="text-2xl font-black text-slate-900">{isLiveActive ? "1,248" : "0"}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
                <Bell className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sent Notifications</p>
                <p className="text-2xl font-black text-slate-900">{isLiveActive ? "4,500+" : "0"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Sidebar Info ── */}
        <div className="space-y-8">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-20">
              <Radio className="w-24 h-24" />
            </div>

            <h4 className="text-lg font-black mb-4 relative z-10">Broadcast Rules</h4>
            <ul className="space-y-4 relative z-10">
              {[
                "Stable high-speed internet required",
                "Minimum 1080p camera quality",
                "Quiet environment for audio clarity",
                "Ensure Hindi script visibility",
                "Engage with chat every 10 mins"
              ].map((rule, i) => (
                <li key={i} className="flex items-start gap-3 text-sm font-medium text-slate-400">
                  <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black text-indigo-400 flex-shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  {rule}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white">
            <h4 className="text-lg font-black mb-2">Live Support</h4>
            <p className="text-indigo-100 text-sm font-medium mb-6">Need help with the broadcast engine?</p>
            <button className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-white font-bold text-sm transition-all border border-white/20 backdrop-blur-sm">
              Contact Tech Desk
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveClassTab;
