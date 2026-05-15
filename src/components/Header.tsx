import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { User } from "@supabase/supabase-js";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // Check initial session
    try {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSupabaseUser(session?.user ?? null);
      }).catch(err => console.warn('Supabase session check failed:', err));
    } catch (err) {
      console.warn('Supabase initialization failed:', err);
    }

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- Live Class Check ---
  const isAdmin = localStorage.getItem('admin') === 'true';
  const isLoggedIn = isAdmin || localStorage.getItem('userLoggedIn') === 'true' || !!supabaseUser;
  const isLiveActive = localStorage.getItem('isLiveActive') === 'true';

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="relative">
      {/* SCROLL BACKGROUND IMAGE */}
      <div
        id="scrollBg"
        className="
          fixed inset-0 
          opacity-0 
          transition-opacity duration-1000
          bg-cover bg-center bg-no-repeat
          pointer-events-none
        "
        style={{
          backgroundImage: "url('/bg.png')",
        }}
      />

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-purple-900/80 backdrop-blur-md shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex items-center">
                <img
                  src="/indian-flag.jpg"
                  alt="Raanuva Veeran Logo"
                  className="
    w-12 h-12              /* Mobile */
    sm:w-16 sm:h-16        /* Small screens */
    md:w-20 md:h-20        /* Tablet */
    lg:w-28 lg:h-28        /* Desktop */
    object-contain
    transition-transform duration-300
    hover:scale-105
  "
                />

              </div>

              <span className="text-xl font-bold text-white">Raanuva Veeran</span>
            </Link>

            {/* Desktop Menu */}
            <nav className="hidden md:flex items-center gap-8 text-white">
              <Link
                to="/"
                className={`${isActive("/") ? "text-purple-300" : "hover:text-purple-300"} transition-colors font-medium`}
              >
                Home
              </Link>
              <Link
                to="/about"
                className={`${isActive("/about") ? "text-purple-300" : "hover:text-purple-300"} transition-colors font-medium`}
              >
                About
              </Link>
              <Link
                to="/courses"
                className={`${isActive("/courses") ? "text-purple-300" : "hover:text-purple-300"} transition-colors font-medium`}
              >
                Courses
              </Link>
              <Link
                to="/teachers"
                className={`${isActive("/teachers") ? "text-purple-300" : "hover:text-purple-300"} transition-colors font-medium`}
              >
                Teachers
              </Link>
              <Link
                to="/blog"
                className={`${isActive("/blog") ? "text-purple-300" : "hover:text-purple-300"} transition-colors font-medium`}
              >
                Blog
              </Link>
              <Link
                to="/contact"
                className={`${isActive("/contact") ? "text-purple-300" : "hover:text-purple-300"} transition-colors font-medium`}
              >
                Contact
              </Link>
              {isLoggedIn && (
                <Link
                  to={isLiveActive ? "#" : "/courses"}
                  onClick={(e) => {
                    if (isLiveActive) {
                      e.preventDefault();
                      window.open('https://api.codingboss.in/live/', '_blank');
                    }
                  }}
                  className={`${isActive("/live") ? "text-purple-300" : "hover:text-purple-300"} transition-colors font-medium flex items-center gap-2`}
                >
                  Meeting Engine
                  {isLiveActive && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  )}
                </Link>
              )}
            </nav>

            {/* Buttons */}
            <div className="hidden md:flex items-center gap-6">
              {!isLoggedIn ? (
                <>
                  <Link to="/auth">
                    <button className="text-white hover:text-purple-300 transition-colors font-medium">
                      Login
                    </button>
                  </Link>
                  <Link to="/courses">
                    <button className="bg-gradient-to-r from-purple-500 to-purple-700 text-white px-6 py-2 rounded-full font-semibold hover:shadow-lg transition-all transform hover:scale-105">
                      Get Started
                    </button>
                  </Link>
                </>
              ) : (
                <div className="flex items-center gap-4">
                  <span className="text-white font-medium bg-purple-800/50 px-3 py-1 rounded-full border border-purple-500/30">
                    Hi, {isAdmin ? "Admin" : localStorage.getItem('userEmail')?.split('@')[0]}
                  </span>
                  <button
                    onClick={() => {
                      localStorage.removeItem('userLoggedIn');
                      localStorage.removeItem('userEmail');
                      localStorage.removeItem('admin');
                      window.location.href = '/';
                    }}
                    className="text-white hover:text-red-300 transition-colors font-medium border border-white/20 px-4 py-1.5 rounded-full hover:bg-white/10"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-white hover:text-purple-300 transition-colors"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-purple-700/40 animate-fade-in">
              <nav className="flex flex-col gap-4 text-white">
                <Link
                  to="/"
                  onClick={() => setIsMenuOpen(false)}
                  className={`${isActive("/") ? "text-purple-300" : "hover:text-purple-300"} py-2`}
                >
                  Home
                </Link>
                <Link
                  to="/about"
                  onClick={() => setIsMenuOpen(false)}
                  className={`${isActive("/about") ? "text-purple-300" : "hover:text-purple-300"} py-2`}
                >
                  About
                </Link>
                <Link
                  to="/courses"
                  onClick={() => setIsMenuOpen(false)}
                  className={`${isActive("/courses") ? "text-purple-300" : "hover:text-purple-300"} py-2`}
                >
                  Courses
                </Link>
                <Link
                  to="/teachers"
                  onClick={() => setIsMenuOpen(false)}
                  className={`${isActive("/teachers") ? "text-purple-300" : "hover:text-purple-300"} py-2`}
                >
                  Teachers
                </Link>
                <Link
                  to="/blog"
                  onClick={() => setIsMenuOpen(false)}
                  className={`${isActive("/blog") ? "text-purple-300" : "hover:text-purple-300"} py-2`}
                >
                  Blog
                </Link>
                <Link
                  to="/contact"
                  onClick={() => setIsMenuOpen(false)}
                  className={`${isActive("/contact") ? "text-purple-300" : "hover:text-purple-300"} py-2`}
                >
                  Contact
                </Link>
                {isLoggedIn && (
                  <Link
                    to={isLiveActive ? "#" : "/courses"}
                    onClick={(e) => {
                      setIsMenuOpen(false);
                      if (isLiveActive) {
                        e.preventDefault();
                        window.open('https://api.codingboss.in/live/', '_blank');
                      }
                    }}
                    className={`${isActive("/live") ? "text-purple-300" : "hover:text-purple-300"} py-2 flex items-center gap-2`}
                  >
                    Meeting Engine
                    {isLiveActive && (
                      <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold animate-pulse">
                        LIVE NOW
                      </span>
                    )}
                  </Link>
                )}



                <div className="flex flex-col gap-3 pt-4 border-t border-purple-700/30">
                  <Link to='/auth'>
                    <button className="text-white hover:text-purple-300 py-2 text-left">
                      Login
                    </button>
                  </Link>
                  <button className="bg-gradient-to-r from-purple-500 to-purple-700 text-white px-6 py-3 rounded-full font-semibold">
                    Get Started
                  </button>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>
    </div>
  );
}
