import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  // --- Live Class Check ---
  const isAdmin = localStorage.getItem('admin') === 'true';
  const isLoggedIn = isAdmin || localStorage.getItem('userLoggedIn') === 'true';
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
                  to="/live-class"
                  className={`${isActive("/live-class") ? "text-purple-300" : "hover:text-purple-300"} transition-colors font-medium flex items-center gap-2`}
                >
                  Live Class
                </Link>
              )}
              {isLoggedIn && (
                <Link
                  to={isLiveActive ? "#" : "/courses"}
                  onClick={(e) => {
                    if (isLiveActive) {
                      e.preventDefault();
                      window.open('https://api.codingboss.in/live', '_blank');
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
                  {isAdmin && (
                    <Link to="/admin-dashboard">
                      <button className="text-white bg-indigo-600 hover:bg-indigo-500 transition-colors font-medium border border-indigo-500 px-4 py-1.5 rounded-full hover:shadow-lg">
                        Admin Panel
                      </button>
                    </Link>
                  )}

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
                    to="/live-class"
                    onClick={() => setIsMenuOpen(false)}
                    className={`${isActive("/live-class") ? "text-purple-300" : "hover:text-purple-300"} py-2 flex items-center gap-2`}
                  >
                    Live Class
                  </Link>
                )}
                {isLoggedIn && (
                  <Link
                    to={isLiveActive ? "#" : "/courses"}
                    onClick={(e) => {
                      setIsMenuOpen(false);
                      if (isLiveActive) {
                        e.preventDefault();
                        window.open('https://api.codingboss.in/live', '_blank');
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
                  {!isLoggedIn ? (
                    <>
                      <Link to='/auth' onClick={() => setIsMenuOpen(false)}>
                        <button className="text-white hover:text-purple-300 py-2 text-left w-full">
                          Login
                        </button>
                      </Link>
                      <Link to="/courses" onClick={() => setIsMenuOpen(false)}>
                        <button className="bg-gradient-to-r from-purple-500 to-purple-700 text-white px-6 py-3 rounded-full font-semibold w-full">
                          Get Started
                        </button>
                      </Link>
                    </>
                  ) : (
                    <>
                      {isAdmin && (
                        <Link to="/admin-dashboard" onClick={() => setIsMenuOpen(false)}>
                          <button className="text-white bg-indigo-600 hover:bg-indigo-500 transition-colors font-medium border border-indigo-500 px-6 py-3 rounded-full hover:shadow-lg w-full text-left">
                            Admin Panel
                          </button>
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          localStorage.removeItem('userLoggedIn');
                          localStorage.removeItem('userEmail');
                          localStorage.removeItem('admin');
                          window.location.href = '/';
                        }}
                        className="text-white hover:text-red-300 transition-colors font-medium border border-white/20 px-6 py-3 rounded-full hover:bg-white/10 w-full text-left"
                      >
                        Logout
                      </button>
                    </>
                  )}
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>
    </div>
  );
}
