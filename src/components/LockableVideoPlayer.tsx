import { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Lock, Rewind } from 'lucide-react';

interface LockableVideoPlayerProps {
  src: string;
  poster?: string;
  onEnded?: () => void;
  onClassEnded?: () => void;
  autoPlay?: boolean;
  startTime?: number;
  endTimestamp?: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function LockableVideoPlayer({
  src,
  poster,
  onEnded,
  onClassEnded,
  autoPlay = true,
  startTime = 0,
  endTimestamp,
}: LockableVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const allowedTimeRef = useRef(startTime); // Track maximum allowed time
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [classEnded, setClassEnded] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const pauseTimeRef = useRef<number | null>(null);

  // Handle keyboard shortcuts (skipping, preventing defaults)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const video = videoRef.current;
    
    if (e.key === 'ArrowLeft' && video) {
      const newTime = Math.max(0, video.currentTime - 10);
      video.currentTime = newTime;
      setCurrentTime(newTime);
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const block = [
      'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End', 'PageUp', 'PageDown',
      ' ',
    ];
    if (block.includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  // Prevent right-click
  const handleContextMenu = useCallback((e: Event) => {
    e.preventDefault();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('keydown', handleKeyDown as EventListener);
    el.addEventListener('contextmenu', handleContextMenu);
    return () => {
      el.removeEventListener('keydown', handleKeyDown as EventListener);
      el.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [handleKeyDown, handleContextMenu]);

  // Allow unrestricted seeking
  const handleSeeking = useCallback(() => {
    // Skipping is now enabled
  }, []);

  // Track time
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    
    // Enforce end timestamp - pause if time window + buffer expired
    if (endTimestamp && Date.now() >= endTimestamp) {
      video.pause();
      setIsPlaying(false);
      setClassEnded(true);
      setShowControls(true);
      onClassEnded?.();
      return;
    }
    
    setCurrentTime(video.currentTime);
  }, [endTimestamp, onClassEnded]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const container = e.currentTarget;
    if (!video || !duration) return;

    const rect = container.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = pos * duration;
    
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || classEnded) return;
    if (video.paused) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsPlaying(true);
        }).catch((err) => {
          console.error("Play prevented or failed:", err);
          setIsPlaying(false);
        });
      } else {
        setIsPlaying(true);
      }
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleVideoEnded = () => {
    const video = videoRef.current;
    if (!video) return;
    
    // Just pause when the video finishes, do not expire the class here.
    
    video.pause();
    setIsPlaying(false);
    setShowControls(true);
    onEnded?.();
  };

  const skipBackward = () => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = Math.max(0, video.currentTime - 10);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const val = parseFloat(e.target.value);
    video.volume = val;
    setVolume(val);
    if (val === 0) {
      video.muted = true;
      setIsMuted(true);
    } else if (video.muted) {
      video.muted = false;
      setIsMuted(false);
    }
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Auto-hide controls after 3s of inactivity
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    if (isPlaying) {
      hideTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isPlaying]);

  useEffect(() => {
    resetHideTimer();
    return () => clearTimeout(hideTimer.current);
  }, [isPlaying, resetHideTimer]);

  // Check endTimestamp even when paused (in case user paused and time window expired)
  useEffect(() => {
    if (!endTimestamp || classEnded) return;
    const timer = setInterval(() => {
      if (Date.now() >= endTimestamp) {
        const video = videoRef.current;
        if (video && !video.paused) {
          video.pause();
          setIsPlaying(false);
        }
        setClassEnded(true);
        setShowControls(true);
        onClassEnded?.();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [endTimestamp, classEnded, onClassEnded]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden group select-none isolation-isolate z-0"
      onMouseMove={resetHideTimer}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      tabIndex={0}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        playsInline
        controls={false}
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onSeeking={handleSeeking}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration);
            // Seek to start time if provided, otherwise start from beginning
            let initialTime = 0;
            if (startTime > 0) {
              initialTime = Math.min(startTime, videoRef.current.duration);
              videoRef.current.currentTime = initialTime;
            }
            setCurrentTime(initialTime);
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
              playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
            } else {
              setIsPlaying(true);
            }
          }
        }}
        onEnded={handleVideoEnded}
        onError={(e) => {
          const target = e.target as HTMLVideoElement;
          const errorMsg = target.error ? `Error Code: ${target.error.code} - ${target.error.message}` : "Unknown video error";
          console.error("Video Error:", errorMsg, "SRC:", target.src);
          setVideoError(errorMsg);
        }}
        className="absolute inset-0 w-full h-full object-contain cursor-pointer z-0"
      />

      {/* Error Overlay */}
      {videoError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
          <div className="text-center px-6">
            <p className="text-red-500 font-bold mb-2">Failed to load video stream</p>
            <p className="text-white/60 text-xs font-mono mb-4">{videoError}</p>
            <p className="text-white/40 text-[10px]">Check backend terminal or network tab for 404/500 errors.</p>
          </div>
        </div>
      )}

      {/* Overlay center play button when paused */}
      {!isPlaying && !classEnded && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 z-10"
        >
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 hover:bg-white/30 transition-colors">
            <Play className="w-10 h-10 text-white fill-white ml-1" />
          </div>
        </button>
      )}

      {/* Class Ended overlay */}
      {classEnded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
          <div className="text-center px-6">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4 border border-red-500/30">
              <Lock className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-white text-xl font-black mb-2">Class Has Ended</p>
            <p className="text-white/60 text-sm font-medium">The scheduled time window for this class is over.</p>
          </div>
        </div>
      )}

      {/* Bottom controls bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
      >
        {/* Progress bar */}
        <div 
          className="w-full bg-white/20 h-1.5 rounded-full mt-2 mb-4 overflow-hidden relative cursor-pointer"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Rewind */}
            <button onClick={skipBackward} title="-10s" className="text-white hover:text-orange-400 transition-colors">
              <Rewind className="w-5 h-5" />
            </button>
            
            {/* Play/Pause */}
            <button onClick={togglePlay} className="text-white hover:text-orange-400 transition-colors">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
            </button>

            {/* Time */}
            <span className="text-white/80 text-xs font-mono flex items-center gap-1">
              {formatTime(currentTime)}
              <span className="text-red-500 font-bold ml-1 uppercase text-[10px] tracking-wider animate-pulse flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> Live
              </span>
            </span>

            {/* Volume */}
            <div className="flex items-center gap-2 group/vol">
              <button onClick={toggleMute} className="text-white hover:text-orange-400 transition-colors">
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 accent-orange-500 cursor-pointer opacity-0 group-hover/vol:opacity-100 transition-opacity"
              />
            </div>
            {/* (Lock icon removed) */}
          </div>

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} className="text-white hover:text-orange-400 transition-colors">
            <Maximize className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
