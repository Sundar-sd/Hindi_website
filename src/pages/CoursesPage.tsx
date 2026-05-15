import { PlayCircle, Clock, CheckCircle, Target, BookOpen, Video, Trophy, Lock, Play, Check, Users, Zap, Star, ExternalLink, ArrowLeft } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface ModulesPageProps {
  onOpenModal: (modal: string) => void;
}

// Custom hook for scroll animations
function useInView(options = {}): [React.RefObject<any>, boolean] {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
      }
    }, { threshold: 0.1, ...options });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  return [ref, isInView];
}

// Video URLs - Update these with your actual video links
const generateVideos = (moduleNum: number, count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    title: `Lesson ${i + 1}: Video Title ${i + 1}`,
    duration: '30 min',
    url: `/videos/module${moduleNum}/video${i + 1}.mp4`,
  }));
};

const videoData = {
  module1: generateVideos(1, 32),
  module2: generateVideos(2, 32),
  module3: generateVideos(3, 32)
};

const modules = [
  {
    id: 1,
    title: 'Module 1: Foundation & Basics',
    subtitle: 'बुनियादी हिंदी',
    duration: '16 Hours',
    videoHours: '16 Hours',
    totalVideos: 32,
    videos: videoData.module1,
    description: 'Master the Hindi alphabet, basic pronunciation, essential vocabulary, and fundamental grammar structures.',
    color: 'from-green-400 to-blue-500',
    topics: [
      'Devanagari Script (वर्णमाला)',
      'Vowels & Consonants (स्वर और व्यंजन)',
      'Basic Pronunciation Rules',
      'Numbers & Counting (गिनती)',
      'Days, Months & Time',
      'Essential Vocabulary (500+ words)',
      'Simple Sentence Formation',
      'Basic Grammar Structures'
    ],
    testInfo: {
      questions: 50,
      duration: '60 minutes',
      passingScore: 70
    }
  },
  {
    id: 2,
    title: 'Module 2: Conversational Skills',
    subtitle: 'बातचीत और व्याकरण',
    duration: '16 Hours',
    videoHours: '16 Hours',
    totalVideos: 32,
    videos: videoData.module2,
    description: 'Build practical conversation skills, expand vocabulary, and learn intermediate grammar for daily communication.',
    color: 'from-orange-400 to-red-500',
    topics: [
      'Daily Conversations',
      'Verb Conjugations (क्रिया)',
      'Tenses (Past, Present, Future)',
      'Question Formation',
      'Common Phrases & Idioms',
      'Family & Relationships',
      'Shopping & Dining',
      'Travel & Directions'
    ],
    testInfo: {
      questions: 50,
      duration: '60 minutes',
      passingScore: 70
    }
  },
  {
    id: 3,
    title: 'Module 3: Advanced & Professional',
    subtitle: 'उन्नत हिंदी',
    duration: '16 Hours',
    videoHours: '16 Hours',
    totalVideos: 32,
    videos: videoData.module3,
    description: 'Achieve fluency with advanced grammar, professional communication, and cultural understanding.',
    color: 'from-purple-400 to-pink-500',
    topics: [
      'Complex Grammar Structures',
      'Formal & Informal Speech',
      'Business Communication',
      'Writing Skills (लेखन)',
      'Reading Comprehension',
      'Cultural Context & Etiquette',
      'News & Media Language',
      'Literature Basics'
    ],
    testInfo: {
      questions: 50,
      duration: '60 minutes',
      passingScore: 70
    }
  }
];

export default function ModulesPage({ onOpenModal }: ModulesPageProps) {
  const [selectedModule, setSelectedModule] = useState<number | null>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState<number>(0);

  const [completedVideos, setCompletedVideos] = useState<{ [key: number]: Set<number> }>({
    1: new Set(),
    2: new Set(),
    3: new Set()
  });

  const [moduleProgress] = useState<Record<number, { testCompleted: boolean; testScore: number }>>({
    1: { testCompleted: false, testScore: 0 },
    2: { testCompleted: false, testScore: 0 },
    3: { testCompleted: false, testScore: 0 }
  });

  // --- Native Live Class State (Jitsi) ---
  const isAdmin = localStorage.getItem('admin') === 'true';
  const isLoggedIn = isAdmin || localStorage.getItem('userLoggedIn') === 'true';
  const [isEnrolled, setIsEnrolled] = useState<boolean>(localStorage.getItem('isEnrolled') === 'true' || isAdmin);
  const [isLiveActive, setIsLiveActive] = useState<boolean>(localStorage.getItem('isLiveActive') === 'true');
  const [liveMeetingLink, setLiveMeetingLink] = useState<string>(localStorage.getItem('liveMeetingLink') || '');
  const [manualJoinLink, setManualJoinLink] = useState<string>('');

  const startLiveClass = (link: string) => {
    localStorage.setItem('isLiveActive', 'true');
    localStorage.setItem('liveMeetingLink', link);
    setIsLiveActive(true);
    setLiveMeetingLink(link);
  };

  const endLiveClass = () => {
    localStorage.removeItem('isLiveActive');
    localStorage.removeItem('liveMeetingLink');
    setIsLiveActive(false);
    setLiveMeetingLink('');
  };




  // Refs for animations
  const [heroRef, heroInView] = useInView();
  const [benefitsRef, benefitsInView] = useInView();
  const [module1Ref, module1InView] = useInView();
  const [module2Ref, module2InView] = useInView();
  const [module3Ref, module3InView] = useInView();
  const [summaryRef, summaryInView] = useInView();

  const getCompletedCount = (moduleId: number) => {
    return completedVideos[moduleId]?.size || 0;
  };

  const getProgressPercentage = (moduleId: number) => {
    const completed = getCompletedCount(moduleId);
    const total = modules.find(m => m.id === moduleId)?.totalVideos || 32;
    return Math.round((completed / total) * 100);
  };

  const isVideoCompleted = (moduleId: number, videoId: number) => {
    return completedVideos[moduleId]?.has(videoId) || false;
  };

  const isVideoUnlocked = (moduleId: number, videoId: number) => {
    if (videoId === 1) return true;
    return isVideoCompleted(moduleId, videoId - 1);
  };

  const isTestUnlocked = (moduleId: number) => {
    const completed = getCompletedCount(moduleId);
    const total = modules.find(m => m.id === moduleId)?.totalVideos || 32;
    return completed === total;
  };

  const isModuleLocked = (moduleId: number) => {
    if (moduleId === 1) return !isLoggedIn || !isEnrolled;
    const prevProgress = moduleProgress[moduleId - 1];
    return !prevProgress.testCompleted || prevProgress.testScore < 70;
  };

  const markVideoComplete = () => {
    if (selectedModule) {
      const currentModule = modules.find(m => m.id === selectedModule);
      if (currentModule) {
        const currentVideo = currentModule.videos[currentVideoIndex];
        setCompletedVideos(prev => ({
          ...prev,
          [selectedModule]: new Set([...prev[selectedModule], currentVideo.id])
        }));
      }
    }
  };

  const openVideoPlayer = (moduleId: number) => {
    setSelectedModule(moduleId);
    setCurrentVideoIndex(0);
  };

  const closeVideoPlayer = () => {
    setSelectedModule(null);
    setCurrentVideoIndex(0);
  };

  const selectVideo = (index: number, moduleId: number, videoId: number) => {
    if (isVideoUnlocked(moduleId, videoId)) {
      setCurrentVideoIndex(index);
    }
  };

  const currentModule = selectedModule ? modules.find(m => m.id === selectedModule) : null;
  const currentVideo = currentModule ? currentModule.videos[currentVideoIndex] : null;

  const moduleRefs = [module1Ref, module2Ref, module3Ref];
  const moduleInViews = [module1InView, module2InView, module3InView];

  return (
    <div className="pt-16 min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      <style>{`
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-left { animation: fadeInLeft 0.8s ease-out forwards; }
        .animate-fade-right { animation: fadeInRight 0.8s ease-out forwards; }
        .animate-fade-up { animation: fadeInUp 0.8s ease-out forwards; }
        .animate-fade-down { animation: fadeInDown 0.8s ease-out forwards; }
        .animate-scale-in { animation: scaleIn 0.8s ease-out forwards; }
      `}</style>

      {/* Video Player Modal */}
      {selectedModule && currentVideo && currentModule && (
        <div className="fixed inset-0 bg-black/95 z-50 overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 sm:px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg sm:text-xl font-bold text-white">
                Module {selectedModule}: {currentModule.title}
              </h3>
              <button
                onClick={closeVideoPlayer}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-all"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              <div className="flex-1 flex flex-col bg-black p-2 sm:p-4 overflow-y-auto">
                <div className="max-w-5xl mx-auto w-full">
                  <div className="bg-black rounded-lg overflow-hidden mb-4">
                    <video
                      key={currentVideo.id}
                      className="w-full aspect-video"
                      controls
                      autoPlay
                      src={currentVideo.url}
                      controlsList="nodownload"
                      onError={() => {
                        console.log('Video load error - please update video URLs');
                      }}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>

                  <div className="bg-gray-900 rounded-lg p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start justify-between mb-4 gap-4">
                      <div className="flex-1">
                        <h4 className="text-xl sm:text-2xl font-bold text-white mb-2">{currentVideo.title}</h4>
                        <div className="flex items-center gap-4 text-gray-400 text-sm">
                          <span>Video {currentVideo.id} of {currentModule.totalVideos}</span>
                          <span>•</span>
                          <span>{currentVideo.duration}</span>
                        </div>
                      </div>
                      <div>
                        {isVideoCompleted(selectedModule, currentVideo.id) ? (
                          <div className="bg-green-500/20 text-green-400 px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-bold flex items-center gap-2 text-sm sm:text-base">
                            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                            Completed
                          </div>
                        ) : (
                          <button
                            onClick={markVideoComplete}
                            className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-bold hover:from-green-600 hover:to-blue-600 transition-all flex items-center gap-2 text-sm sm:text-base"
                          >
                            <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                            Mark Complete
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-300 font-semibold text-sm sm:text-base">Module Progress</span>
                        <span className="text-white font-bold text-sm sm:text-base">
                          {getCompletedCount(selectedModule)} / {currentModule.totalVideos}
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500"
                          style={{ width: `${getProgressPercentage(selectedModule)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-96 bg-gray-900 overflow-y-auto border-t md:border-t-0 md:border-l border-gray-800 max-h-64 md:max-h-full">
                <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 z-10">
                  <h5 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                    <PlayCircle className="w-5 h-5 text-orange-500" />
                    Course Videos
                  </h5>
                  <p className="text-xs sm:text-sm text-gray-400 mt-1">
                    {getCompletedCount(selectedModule)} / {currentModule.totalVideos} completed
                  </p>
                </div>

                <div className="p-2">
                  {currentModule.videos.map((video, index) => {
                    const isCompleted = isVideoCompleted(selectedModule, video.id);
                    const isUnlocked = isVideoUnlocked(selectedModule, video.id);
                    const isCurrent = currentVideoIndex === index;

                    return (
                      <button
                        key={video.id}
                        onClick={() => selectVideo(index, selectedModule, video.id)}
                        disabled={!isUnlocked}
                        className={`w-full text-left p-2 sm:p-3 mb-2 rounded-lg transition-all ${isCurrent
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                          : isCompleted
                            ? 'bg-green-900/30 hover:bg-green-900/50 text-white'
                            : isUnlocked
                              ? 'bg-gray-800 hover:bg-gray-750 text-white'
                              : 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isCurrent ? 'bg-white/20' : isCompleted ? 'bg-green-500' : isUnlocked ? 'bg-gray-700' : 'bg-gray-700/50'
                            }`}>
                            {isCompleted ? (
                              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            ) : !isUnlocked ? (
                              <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                            ) : isCurrent ? (
                              <Play className="w-4 h-4 sm:w-5 sm:h-5" />
                            ) : (
                              <span className="font-bold text-sm">{video.id}</span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold truncate text-sm ${!isUnlocked ? 'text-gray-500' : ''}`}>
                              {video.title}
                            </p>
                            <p className={`text-xs flex items-center gap-2 ${isCurrent ? 'text-white/80' : isUnlocked ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                              <Clock className="w-3 h-3" />
                              {video.duration}
                            </p>
                          </div>

                          {isCurrent && (
                            <div className="flex-shrink-0">
                              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            </div>
                          )}
                        </div>

                        {!isUnlocked && (
                          <p className="text-xs text-gray-500 mt-2 ml-11">
                            Complete previous video to unlock
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-pink-400/20 backdrop-blur-xl border border-white/30 py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div ref={heroRef} className="text-center">
            <h1 className={`text-4xl sm:text-5xl md:text-6xl font-bold text-purple-500 mb-4 sm:mb-6 ${heroInView ? 'animate-fade-down' : 'opacity-0'}`}>
              48-Hour Hindi Mastery Program
            </h1>
            <p className={`text-lg sm:text-xl text-purple-500 max-w-3xl mx-auto mb-6 sm:mb-8 ${heroInView ? 'animate-fade-up' : 'opacity-0'}`}
              style={{ animationDelay: heroInView ? '0.2s' : '0s' }}>
              Complete video learning program divided into 3 comprehensive modules with tests
            </p>
            <div className={`flex flex-wrap justify-center gap-3 sm:gap-6 text-white ${heroInView ? 'animate-fade-up' : 'opacity-0'}`}
              style={{ animationDelay: heroInView ? '0.4s' : '0s' }}>
              <div className="flex items-center gap-2 bg-purple-500 backdrop-blur-sm px-4 sm:px-6 py-2 sm:py-3 rounded-full text-sm sm:text-base">
                <Video className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-semibold">48 Hours Video</span>
              </div>
              <div className="flex items-center gap-2 bg-purple-500 backdrop-blur-sm px-4 sm:px-6 py-2 sm:py-3 rounded-full text-sm sm:text-base">
                <Target className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-semibold">3 Tests</span>
              </div>
              <div className="flex items-center gap-2 bg-purple-500 backdrop-blur-sm px-4 sm:px-6 py-2 sm:py-3 rounded-full text-sm sm:text-base">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-semibold">Knowledge</span>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="rgb(255 247 237)" />
          </svg>
        </div>
      </div>

      {/* ======= UNIFIED LIVE CLASS SECTION ======= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className={`rounded-3xl p-8 shadow-2xl transition-all duration-700 relative overflow-hidden ${isLiveActive
          ? 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white'
          : 'bg-white border border-gray-200 text-gray-800'}`}>

          {/* Decorative Background Elements for Live State */}
          {isLiveActive && (
            <>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 animate-pulse" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl -ml-16 -mb-16" />
            </>
          )}

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className={`p-4 rounded-3xl backdrop-blur-md border ${isLiveActive
                ? 'bg-white/20 border-white/30 rotate-3 group-hover:rotate-6'
                : 'bg-gray-100 border-gray-200'} transition-transform duration-300`}>
                <Video className={`w-10 h-10 ${isLiveActive ? 'text-white' : 'text-gray-400'}`} />
              </div>

              <div>
                <div className="flex items-center gap-3 mb-2">
                  {isLiveActive ? (
                    <span className="flex items-center gap-1.5 bg-red-500 text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-lg border-2 border-white animate-bounce">
                      LIVE NOW
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 bg-gray-100 text-gray-500 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-gray-200">
                      OFFLINE
                    </span>
                  )}
                  <span className={`text-xs font-bold uppercase tracking-wider ${isLiveActive ? 'text-white/80' : 'text-gray-400'}`}>
                    {isAdmin ? "Admin: Control Desk" : "Engine Status"}
                  </span>
                </div>

                <h3 className={`text-2xl md:text-3xl font-black leading-tight ${isLiveActive ? 'text-white' : 'text-gray-900'}`}>
                  {isLiveActive
                    ? "Academy Meeting Engine is Active!"
                    : "Meeting Engine is Offline"}
                </h3>

                <p className={`text-base mt-2 font-medium opacity-90 ${isLiveActive ? 'text-indigo-100' : 'text-gray-500'}`}>
                  {isLiveActive
                    ? "Your instructor has started a live session. Please paste the meeting link provided by them below to join."
                    : "Stay tuned! The next live interactive session will appear here when it starts."}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 flex-shrink-0 w-full lg:w-auto">
              {/* --- JOIN BUTTON (LoggedIn Users) --- */}
              {isLoggedIn && isLiveActive && (
                <div className="flex flex-col gap-4 w-full animate-in fade-in slide-in-from-bottom-2 duration-500">

                  {/* Provide the Link to Copy */}
                  {!isAdmin && liveMeetingLink && (
                    <div className="bg-indigo-900/40 border border-indigo-400/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="min-w-0 pr-4">
                        <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">Step 1: Copy this Link</p>
                        <p className="text-white font-medium text-sm truncate">{liveMeetingLink}</p>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(liveMeetingLink);
                          alert("Link copied! Now paste it in the box below to join.");
                        }}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow transition-colors whitespace-nowrap self-stretch sm:self-auto shrink-0"
                      >
                        Copy Link
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                    <div className="relative w-full sm:w-96 flex">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Step 2: Paste link here..."
                        className="pl-12 pr-4 py-4 rounded-xl text-gray-900 border-2 border-transparent bg-white/10 text-white placeholder:text-indigo-200 focus:bg-white focus:text-gray-900 focus:placeholder:text-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-400/30 w-full shadow-inner font-medium transition-all duration-300"
                        value={manualJoinLink}
                        onChange={(e) => setManualJoinLink(e.target.value)}
                      />
                    </div>

                    <button
                      onClick={() => {
                        if (!manualJoinLink.trim()) {
                          alert("Please paste the meeting link first.");
                          return;
                        }
                        window.open(manualJoinLink, '_blank');
                      }}
                      className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-black text-lg transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.3)] bg-white text-indigo-700 hover:bg-indigo-50 hover:scale-105 active:scale-95 w-full sm:w-auto flex-shrink-0 border-2 border-white"
                    >
                      Join Class
                      <ExternalLink className="w-5 h-5" />
                    </button>
                  </div></div>
              )}

              {/* --- LOGIN PROMPT (Guest Users) --- */}
              {!isLoggedIn && isLiveActive && (
                <button
                  onClick={() => onOpenModal('enroll')}
                  className="flex items-center gap-3 px-8 py-4 rounded-xl font-bold bg-white text-blue-600 hover:bg-blue-50 transition-all shadow-lg"
                >
                  Login to Open Engine <ArrowLeft className="w-5 h-5 rotate-180" />
                </button>
              )}

              {/* --- ADMIN ONLY CONTROLS --- */}
              {isAdmin && (
                <div className="flex flex-col gap-3">
                  {isLiveActive ? (
                    <button
                      onClick={endLiveClass}
                      className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      Stop Class
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startLiveClass('https://api.codingboss.in/live/')}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-xl font-bold transition-all shadow-lg whitespace-nowrap"
                        >
                          Start Class (Live Engine)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Learning Benefits Section */}
      <div ref={benefitsRef} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className={`bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4 sm:p-6 text-center ${benefitsInView ? 'animate-fade-left' : 'opacity-0'}`}>
          <Users className="w-10 h-10 sm:w-12 sm:h-12 text-blue-500 mx-auto mb-3" />
          <h3 className="font-bold text-gray-900 mb-2 text-sm sm:text-base">Expert Teachers</h3>
          <p className="text-xs sm:text-sm text-gray-600">Learn from certified instructors</p>
        </div>
        <div className={`bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 sm:p-6 text-center ${benefitsInView ? 'animate-fade-up' : 'opacity-0'}`}
          style={{ animationDelay: benefitsInView ? '0.1s' : '0s' }}>
          <Zap className="w-10 h-10 sm:w-12 sm:h-12 text-green-500 mx-auto mb-3" />
          <h3 className="font-bold text-gray-900 mb-2 text-sm sm:text-base">Sequential Learning</h3>
          <p className="text-xs sm:text-sm text-gray-600">Unlock videos progressively</p>
        </div>
        <div className={`bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-4 sm:p-6 text-center ${benefitsInView ? 'animate-fade-up' : 'opacity-0'}`}
          style={{ animationDelay: benefitsInView ? '0.2s' : '0s' }}>
          <Star className="w-10 h-10 sm:w-12 sm:h-12 text-orange-500 mx-auto mb-3" />
          <h3 className="font-bold text-gray-900 mb-2 text-sm sm:text-base">Quality Content</h3>
          <p className="text-xs sm:text-sm text-gray-600">HD video lessons with subtitles</p>
        </div>
        <div className={`bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 sm:p-6 text-center ${benefitsInView ? 'animate-fade-right' : 'opacity-0'}`}
          style={{ animationDelay: benefitsInView ? '0.3s' : '0s' }}>
          <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-purple-500 mx-auto mb-3" />
          <h3 className="font-bold text-gray-900 mb-2 text-sm sm:text-base">Certification</h3>
          <p className="text-xs sm:text-sm text-gray-600">Verified completion certificate</p>
        </div>
      </div>

      {/* Learning Path Timeline */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">Your Learning Journey</h2>
          <p className="text-base sm:text-lg text-gray-600">Complete videos sequentially - each video unlocks the next</p>
        </div>

        <div className="space-y-6 sm:space-y-8">
          {modules.map((module, index) => {
            const completedCount = getCompletedCount(module.id);
            const progressPercent = getProgressPercentage(module.id);
            const testUnlocked = isTestUnlocked(module.id);
            const moduleLocked = isModuleLocked(module.id);
            const isInView = moduleInViews[index];

            return (
              <div key={module.id} ref={moduleRefs[index]} className="relative">
                {index < modules.length - 1 && (
                  <div className="hidden sm:block absolute left-1/2 top-full w-1 h-8 bg-gradient-to-b from-gray-300 to-transparent transform -translate-x-1/2 z-0" />
                )}

                <div
                  className={`bg-white rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden transform transition-all duration-500 hover:shadow-2xl ${moduleLocked ? 'opacity-60' : ''
                    } ${isInView ? 'animate-scale-in' : 'opacity-0'}`}
                  style={{ animationDelay: isInView ? `${index * 0.1}s` : '0s' }}
                >
                  {moduleLocked && (
                    <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-10 bg-red-500 text-white px-3 sm:px-4 py-1 sm:py-2 rounded-full flex items-center gap-2 text-xs sm:text-sm">
                      <Lock className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="font-semibold hidden sm:inline">
                        {module.id === 1 ? 'Locked - Enrollment Required' : 'Locked - Complete Previous Module Test'}
                      </span>
                      <span className="font-semibold sm:hidden">Locked</span>
                    </div>
                  )}

                  <div className={`relative bg-gradient-to-br ${module.color} p-6 sm:p-8 text-white`}>
                    <div className="absolute top-2 sm:top-4 right-2 sm:right-4 bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-1 sm:py-2 rounded-full">
                      <span className="font-bold text-xs sm:text-sm">Module {module.id}</span>
                    </div>

                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-16">
                        <h3 className="text-2xl sm:text-3xl font-bold mb-2">{module.title}</h3>
                        <p className="text-lg sm:text-xl text-white/90 mb-3 sm:mb-4">{module.subtitle}</p>
                        <p className="text-sm sm:text-base text-white/80 mb-4 sm:mb-6">{module.description}</p>

                        <div className="flex flex-wrap gap-2 sm:gap-4">
                          <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm">
                            <Video className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span className="font-semibold">{module.totalVideos} Videos • {module.videoHours}</span>
                          </div>
                          <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm">
                            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span className="font-semibold">{module.duration}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-8">
                    {/* Video Progress Bar */}
                    <div className="mb-8">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          <Play className="w-5 h-5 text-orange-500" />
                          Video Progress
                        </h4>
                        <span className="text-sm font-semibold text-gray-600">
                          {completedCount} / {module.totalVideos} videos completed
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${module.color} transition-all duration-500 flex items-center justify-end px-2`}
                          style={{ width: `${progressPercent}%` }}
                        >
                          {progressPercent > 10 && (
                            <span className="text-xs font-bold text-white">{progressPercent}%</span>
                          )}
                        </div>
                      </div>
                      {!testUnlocked && (
                        <p className="text-sm text-orange-600 mt-2 font-medium">
                          ⚠️ Complete all {module.totalVideos} videos sequentially to unlock the test
                        </p>
                      )}
                      {testUnlocked && (
                        <p className="text-sm text-green-600 mt-2 font-medium flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          All videos completed! Test is now unlocked
                        </p>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                      {/* Topics Covered */}
                      <div>
                        <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-orange-500" />
                          Topics Covered
                        </h4>
                        <div className="space-y-2">
                          {module.topics.map((topic, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                              <span className="text-gray-700">{topic}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Test Information */}
                      <div>
                        <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                          <Target className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                          Test Details
                        </h4>
                        <div className={`bg-gradient-to-br ${testUnlocked ? 'from-green-50 to-blue-50' : 'from-gray-100 to-gray-200'} rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4 relative`}>
                          {!testUnlocked && (
                            <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                              <div className="text-center">
                                <Lock className="w-10 h-10 sm:w-12 sm:h-12 text-gray-600 mx-auto mb-2" />
                                <p className="font-bold text-sm sm:text-base text-gray-700">Test Locked</p>
                                <p className="text-xs sm:text-sm text-gray-600">Complete all videos</p>
                              </div>
                            </div>
                          )}

                          <div className="flex justify-between items-center text-sm sm:text-base">
                            <span className="text-gray-600">Questions:</span>
                            <span className="font-bold text-gray-900">{module.testInfo.questions}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm sm:text-base">
                            <span className="text-gray-600">Duration:</span>
                            <span className="font-bold text-gray-900">{module.testInfo.duration}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm sm:text-base">
                            <span className="text-gray-600">Pass Score:</span>
                            <span className="font-bold text-green-600">{module.testInfo.passingScore}%</span>
                          </div>

                          {moduleProgress[module.id].testCompleted && (
                            <div className="pt-3 sm:pt-4 border-t border-gray-300">
                              <div className="flex justify-between items-center">
                                <span className="text-sm sm:text-base text-gray-600">Your Score:</span>
                                <span className={`font-bold text-lg sm:text-xl ${moduleProgress[module.id].testScore >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                                  {moduleProgress[module.id].testScore}%
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 grid sm:grid-cols-2 gap-3 sm:gap-4">
                      <button
                        onClick={() => openVideoPlayer(module.id)}
                        disabled={moduleLocked}
                        className={`bg-gradient-to-r ${module.color} text-white py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-lg transition-all ${moduleLocked ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:scale-[1.02]'
                          }`}
                      >
                        {moduleLocked ? (
                          <span className="flex items-center justify-center gap-2">
                            <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                            Locked
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <PlayCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                            Start - {completedCount}/{module.totalVideos}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => onOpenModal('enroll')}
                        disabled={!testUnlocked || moduleLocked}
                        className={`bg-gradient-to-r from-green-500 to-blue-500 text-white py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-lg transition-all ${!testUnlocked || moduleLocked ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:scale-[1.02]'
                          }`}
                      >
                        {testUnlocked ? (
                          moduleProgress[module.id].testCompleted ? (
                            <span className="flex items-center justify-center gap-2">
                              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                              Completed
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-2">
                              <Target className="w-4 h-4 sm:w-5 sm:h-5" />
                              Take Test
                            </span>
                          )
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                            Test Locked
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div ref={summaryRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">

        <div
          className={`
      relative rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-white overflow-hidden
      ${summaryInView ? "animate-scale-in" : "opacity-0"}
    `}
        >

          {/* Background: Image + Gradient Overlay */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `
          linear-gradient(to bottom right, rgba(255,140,0,0.75), rgba(255,0,80,0.75), rgba(255,0,150,0.75)),
          url('https://images.pexels.com/photos/7648051/pexels-photo-7648051.jpeg')
        `,
            }}
          />

          {/* Foreground Content */}
          <div className="relative z-10">

            <div className="text-center mb-6 sm:mb-8">
              <Trophy className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4" />
              <h3 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">Get Knowledge!</h3>

              <p className="text-base sm:text-xl text-white/90 max-w-3xl mx-auto mb-3 sm:mb-4">
                Complete all 48 hours and pass all 3 tests for your Knowledge
              </p>

              <p className="text-sm sm:text-lg text-white/80 italic">
                ✨ Tests unlock after completing all module videos
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {[
                { num: "96", label: "Videos" },
                { num: "48", label: "Hours" },
                { num: "3", label: "Tests" },
                { num: "150", label: "Questions" }
              ].map((stat, idx) => (
                <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6 text-center">
                  <div className="text-3xl sm:text-5xl font-bold mb-1 sm:mb-2">{stat.num}</div>
                  <div className="text-sm sm:text-base text-white/90">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Button */}
            <div className="text-center">
              {isEnrolled && isLoggedIn ? (
                <div className="bg-white/20 backdrop-blur-md rounded-2xl p-6 border border-white/30 max-w-lg mx-auto">
                  <div className="flex items-center justify-center gap-3 text-white mb-2">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                    <span className="text-2xl font-bold">Already Enrolled</span>
                  </div>
                  <p className="text-white/80">You have lifetime access to all modules and live classes.</p>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (!isLoggedIn) {
                      onOpenModal("enroll");
                    } else {
                      // Handle successful simulated enrollment
                      localStorage.setItem('isEnrolled', 'true');
                      setIsEnrolled(true);
                      alert("Successfully Enrolled! Module 1 is now unlocked.");
                    }
                  }}
                  className="bg-white text-orange-600 px-8 sm:px-12 py-3 sm:py-5 rounded-full font-bold text-lg sm:text-xl hover:bg-orange-50 transition-all transform hover:scale-105 shadow-xl"
                >
                  Enroll Now - ₹9,999
                </button>
              )}

              <p className="mt-3 sm:mt-4 text-sm sm:text-base text-white/80">
                One-time payment • Lifetime access • Knowledge
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}