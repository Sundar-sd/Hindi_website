import { useState, useEffect, useCallback, useRef } from "react";
import { Calendar, Clock, Video, Lock, Loader2, Play, CheckCircle } from "lucide-react";
import { LiveClass } from "../types";
import { localLiveClassService } from "../lib/localLiveClassService";
import LockableVideoPlayer from "../components/LockableVideoPlayer";

function getCountdown(target: string): { hours: number; minutes: number; seconds: number; totalMs: number } {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, totalMs: 0 };
  return {
    hours: Math.floor(diff / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    totalMs: diff,
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getGoogleDriveIframeUrl(url: string): string | null {
  if (!url) return null;
  // Match standard viewing link
  let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/file/d/${match[1]}/preview`;
  
  // Match our optimized download link
  match = url.match(/id=([a-zA-Z0-9_-]+)/);
  if (match && url.includes("drive.google.com")) {
     return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  
  return null;
}

export default function LiveClassPage() {
  const [allClasses, setAllClasses] = useState<LiveClass[]>([]);
  const [upcomingClasses, setUpcomingClasses] = useState<LiveClass[]>([]);
  const [nowPlaying, setNowPlaying] = useState<LiveClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFetchError, setVideoFetchError] = useState<string | null>(null);
  const [activeStartTime, setActiveStartTime] = useState<number>(0);
  const [activeEndTimestamp, setActiveEndTimestamp] = useState<number>(0);
  const videoUrlRef = useRef<string | null>(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setIsLoading(true);
    try {
      const [liveNowData, upcomingData] = await Promise.all([
        localLiveClassService.getLiveNow(),
        localLiveClassService.getUpcoming()
      ]);
      setAllClasses([...liveNowData, ...upcomingData]);
    } catch (err) {
      console.error("Failed to load production schedules", err);
    }
    setIsLoading(false);
  };

  // Re-evaluate what is playing vs upcoming every second based on the clock
  useEffect(() => {
    const evaluateClasses = () => {
      const now = Date.now();
      
      const playing = allClasses.filter((c) => {
        const start = new Date(c.scheduled_time || 0).getTime();
        const duration = Math.max((c.duration_minutes || 30) * 60000, 3600000); // Minimum 1 hour window
        return start <= now && now <= start + duration;
      });
      
      const upcoming = allClasses.filter((c) => {
        const start = new Date(c.scheduled_time || 0).getTime();
        return start > now;
      });
      
      setNowPlaying(playing);
      setUpcomingClasses(upcoming);
    };

    evaluateClasses();
    const interval = setInterval(evaluateClasses, 1000);
    return () => clearInterval(interval);
  }, [allClasses]);

  // Load video URL when active class changes
  useEffect(() => {
    if (!activeClassId) {
      setVideoUrl(null);
      setVideoFetchError(null);
      return;
    }
    let cancelled = false;
    setVideoFetchError(null);
    localLiveClassService.getVideoUrl(activeClassId).then((url) => {
      if (!cancelled) {
        if (!url) {
          setVideoFetchError("The backend did not provide a video stream URL (returned null). Please verify the video was processed successfully.");
        } else {
          // Revoke previous URL if any (not heavily used anymore but kept for safety)
          if (videoUrlRef.current) {
            localLiveClassService.revokeVideoUrl(videoUrlRef.current);
          }
          videoUrlRef.current = url;
          setVideoUrl(url);
          
          // Log attendance
          const userEmail = localStorage.getItem('userEmail') || 'anonymous@student.com';
          localLiveClassService.viewerJoin(activeClassId, userEmail);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeClassId]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (videoUrlRef.current) {
        localLiveClassService.revokeVideoUrl(videoUrlRef.current);
      }
    };
  }, []);

  const handleVideoEnded = useCallback(async (cls: LiveClass) => {
    // We no longer expire the class when the video ends early.
    // The video will just pause at the end, and the student can re-watch it until the 1hr window expires.
  }, []);

  const handleClassTimeExpired = useCallback(async (cls: LiveClass) => {
    await localLiveClassService.changeStatus(cls.id, "EXPIRED");
    fetchClasses();
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-32 px-4">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-black text-slate-900 mb-3 flex items-center justify-center gap-3">
            <Video className="w-10 h-10 text-purple-600" />
            Live Classes
          </h1>
          <p className="text-slate-500 text-lg font-medium">
            Watch scheduled Hindi classes — videos play only at their scheduled time.
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Loading classes...</p>
          </div>
        ) : nowPlaying.length === 0 && upcomingClasses.length === 0 ? (
          <div className="text-center py-20">
            <Video className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium text-lg">No classes scheduled yet</p>
            <p className="text-slate-400 text-sm mt-1">Check back soon for upcoming Hindi classes.</p>
          </div>
        ) : (
          <>
            {/* Now Playing */}
            <section>
              <h2 className="text-xl font-black text-slate-900 mb-5 flex items-center gap-2">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                Now Playing
              </h2>
              {nowPlaying.length > 0 ? (
                nowPlaying.map((cls) => (
                  <div key={cls.id} className="bg-white rounded-3xl border border-slate-100 shadow-lg overflow-hidden mb-6 isolation-isolate z-0 transform-gpu">
                    {activeClassId === cls.id ? (
                      <div className="flex flex-col">
                        {videoFetchError ? (
                          <div className="aspect-video flex flex-col items-center justify-center bg-rose-50 border-2 border-rose-200 rounded-2xl text-center p-6">
                            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-3">
                              <Video className="w-6 h-6 text-rose-500" />
                            </div>
                            <p className="text-rose-600 font-bold text-lg mb-1">Stream Not Available</p>
                            <p className="text-rose-500 text-sm max-w-md">{videoFetchError}</p>
                            <button onClick={() => setActiveClassId(null)} className="mt-4 px-6 py-2 bg-rose-600 text-white font-bold rounded-xl text-sm hover:bg-rose-700 transition-all active:scale-95 shadow-md shadow-rose-600/20">Go Back</button>
                          </div>
                        ) : videoUrl ? (
                          <>
                            {(() => {
                              const driveIframeUrl = getGoogleDriveIframeUrl(videoUrl);
                              if (driveIframeUrl) {
                                return (
                                  <div className="aspect-video w-full overflow-hidden bg-black relative group isolation-isolate z-0 transform-gpu rounded-t-2xl">
                                    <iframe 
                                      src={driveIframeUrl} 
                                      className="absolute left-0 w-full border-0 z-0" 
                                      style={{ top: '-56px', height: 'calc(100% + 56px)' }}
                                      allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                                    ></iframe>
                                    {/* Floating LIVE badge */}
                                    <div className="absolute top-4 right-4 z-10 pointer-events-none">
                                      <div className="flex items-center gap-2 px-3 py-1.5 bg-black/60 rounded-lg backdrop-blur-md border border-white/10 pointer-events-auto shadow-xl">
                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                                        <span className="text-white text-xs font-black tracking-widest">LIVE</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              return (
                                <LockableVideoPlayer
                                  src={videoUrl}
                                  poster={cls.thumbnail_url}
                                  autoPlay={true}
                                  startTime={activeStartTime}
                                  endTimestamp={activeEndTimestamp}
                                  onEnded={() => handleVideoEnded(cls)}
                                  onClassEnded={() => handleClassTimeExpired(cls)}
                                />
                              );
                            })()}
                            <div className="px-6 pb-6 pt-4">
                              <h3 className="text-2xl font-bold text-slate-900 mb-3">{cls.title}</h3>
                              <div className="bg-slate-100/80 hover:bg-slate-200/60 transition-colors rounded-2xl p-4">
                                <div className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-4">
                                  <span>{Math.floor(cls.duration_minutes || 30)} minutes</span>
                                  <span>Scheduled for {new Date(cls.scheduled_time).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                                </div>
                                {cls.description ? (
                                  <p className="text-slate-800 text-sm whitespace-pre-wrap leading-relaxed">{cls.description}</p>
                                ) : (
                                  <p className="text-slate-500 text-sm italic">No description provided.</p>
                                )}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="aspect-video flex flex-col items-center justify-center bg-slate-900 rounded-2xl">
                            <Loader2 className="w-10 h-10 animate-spin text-purple-500 mb-4" />
                            <span className="text-white font-bold">Connecting to live stream...</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold text-slate-900">{cls.title}</h3>
                          {cls.description && <p className="text-slate-500 mt-1">{cls.description}</p>}
                          <div className="flex items-center gap-4 mt-3 text-sm text-slate-400 font-medium">
                            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {formatTime(cls.scheduled_time)}</span>
                            <span>{Math.floor(cls.duration_minutes || 30)}m {Math.round(((cls.duration_minutes || 30) - Math.floor(cls.duration_minutes || 30)) * 60)}s</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const start = new Date(cls.scheduled_time).getTime();
                            const durationMs = (cls.duration_minutes || 30) * 60000;
                            const totalWindowMs = Math.max(durationMs, 3600000); 
                            const endTs = start + totalWindowMs;
                            if (Date.now() > endTs) return;
                            setActiveStartTime(0);
                            setActiveEndTimestamp(endTs);
                            setActiveClassId(cls.id);
                          }}
                          className="w-full md:w-auto justify-center bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-4 rounded-2xl font-black text-lg shadow-xl shadow-red-500/20 transition-all active:scale-95 flex items-center gap-3"
                        >
                          <Play className="w-6 h-6 fill-white" />
                          Join Now
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : upcomingClasses.length > 0 ? (
                <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden mb-6 aspect-video flex flex-col items-center justify-center text-center p-6 relative">
                  <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/10 to-indigo-900/10" />
                  {(() => {
                    const cls = upcomingClasses[0];
                    const countdown = getCountdown(cls.scheduled_time);
                    return (
                      <div className="relative z-10 animate-fade-in flex flex-col items-center">
                        <div className="px-4 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full mb-6">
                          <span className="text-purple-400 text-xs font-black uppercase tracking-widest">Next Class In</span>
                        </div>
                        <h3 className="text-white text-3xl sm:text-4xl font-black mb-12 max-w-2xl px-4">{cls.title}</h3>
                        <div className="flex items-center gap-3 sm:gap-6 opacity-80">
                          <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700 w-20 h-24 sm:w-28 sm:h-32 rounded-3xl flex flex-col items-center justify-center shadow-xl">
                            <span className="text-4xl sm:text-6xl font-black text-white">{String(countdown.hours).padStart(2, "0")}</span>
                            <span className="text-[10px] sm:text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Hours</span>
                          </div>
                          <span className="text-4xl sm:text-5xl font-black text-slate-700/50 mb-6">:</span>
                          <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700 w-20 h-24 sm:w-28 sm:h-32 rounded-3xl flex flex-col items-center justify-center shadow-xl">
                            <span className="text-4xl sm:text-6xl font-black text-white">{String(countdown.minutes).padStart(2, "0")}</span>
                            <span className="text-[10px] sm:text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Mins</span>
                          </div>
                          <span className="text-4xl sm:text-5xl font-black text-slate-700/50 mb-6">:</span>
                          <div className="bg-purple-500/5 backdrop-blur-md border border-purple-500/20 w-20 h-24 sm:w-28 sm:h-32 rounded-3xl flex flex-col items-center justify-center shadow-xl">
                            <span className="text-4xl sm:text-6xl font-black text-purple-400">{String(countdown.seconds).padStart(2, "0")}</span>
                            <span className="text-[10px] sm:text-xs font-bold text-purple-500/80 mt-2 uppercase tracking-widest">Secs</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-lg overflow-hidden mb-6 aspect-video flex flex-col items-center justify-center text-center p-6">
                  <Video className="w-16 h-16 text-slate-700 mb-4" />
                  <p className="text-white text-xl font-bold">No classes at this time</p>
                  <p className="text-slate-400 mt-2">Check the schedule below for upcoming classes.</p>
                </div>
              )}
            </section>


            {/* Upcoming */}
            {upcomingClasses.length > 0 && (
              <section>
                <h2 className="text-xl font-black text-slate-900 mb-5 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-500" />
                  Upcoming Classes
                </h2>
                <div className="space-y-4">
                  {upcomingClasses.map((cls) => {
                    const countdown = getCountdown(cls.scheduled_time);
                    return (
                      <div key={cls.id} className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-4 sm:gap-5">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-purple-50 flex items-center justify-center flex-shrink-0 mt-1 sm:mt-0">
                            <Lock className="w-6 h-6 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-lg">{cls.title}</h3>
                            {cls.description && <p className="text-slate-500 text-sm mt-0.5">{cls.description}</p>}
                            <div className="flex items-center gap-4 mt-2 text-xs font-medium text-slate-400">
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(cls.scheduled_time)}</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatTime(cls.scheduled_time)}</span>
                              <span>{Math.floor(cls.duration_minutes || 30)}m {Math.round(((cls.duration_minutes || 30) - Math.floor(cls.duration_minutes || 30)) * 60)}s</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-left sm:text-right pt-4 sm:pt-0 border-t border-slate-100 sm:border-t-0 w-full sm:w-auto">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Starts in</p>
                          <p className="text-lg font-black text-slate-900">
                            {countdown.hours > 0 && `${countdown.hours}h `}
                            {countdown.minutes}m {countdown.seconds}s
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* No Upcoming Classes Fallback */}
            {upcomingClasses.length === 0 && (
              <section>
                <h2 className="text-xl font-black text-slate-900 mb-5 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-500" />
                  Upcoming Classes
                </h2>
                <div className="bg-white rounded-3xl border border-slate-100 p-8 text-center shadow-sm">
                  <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500 font-bold text-lg">No upcoming classes</p>
                  <p className="text-slate-400 text-sm">There are currently no scheduled classes. Please check back later!</p>
                </div>
              </section>
            )}


          </>
        )}
      </div>
    </div>
  );
}
