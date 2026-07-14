import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import CoursesPage from './pages/CoursesPage';
import TeachersPage from './pages/TeachersPage';
import BlogPage from './pages/BlogPage';
import ContactPage from './pages/ContactPage';
import LiveClassPage from './pages/LiveClassPage';
import Footer from './components/Footer';
import HindiLearningChat from './components/HindiLearningChat';
import WhatsAppButton from "./components/WhatsAppButton";
import ScrollToTop from "./components/ScrollToTop";
import Auth from './components/Auth';
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";



// Modal component that can use useNavigate
function EnrollmentModal({
  activeModal,
  setActiveModal
}: {
  activeModal: string | null;
  setActiveModal: (modal: string | null) => void;
}) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    await new Promise(resolve => setTimeout(resolve, 1000));

    setIsSubmitting(false);
    setShowSuccess(true);

    setTimeout(() => {
      setActiveModal(null);
      setShowSuccess(false);
      setFormData({ name: '', email: '', phone: '' });
      navigate('/courses');
    }, 2000);
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    setShowSuccess(false);
    setFormData({ name: '', email: '', phone: '' });
  };

  if (!activeModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full relative">
        {!showSuccess ? (
          <>
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>

            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {activeModal === 'enroll' ? 'Enroll in Course' :
                activeModal === 'certificate' ? 'Get Certificate' :
                  'View Demo'}
            </h3>

            <p className="text-gray-600 mb-6">
              {activeModal === 'enroll'
                ? 'Start your Hindi learning journey today.'
                : activeModal === 'certificate'
                  ? 'You will receive a certified certificate.'
                  : 'Watch a free demo of our course.'}
            </p>

            <div className="space-y-4">
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Your Name"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              />

              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Email Address"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              />

              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Phone Number"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              />

              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.name || !formData.email || !formData.phone}
                className="w-full bg-orange-500 text-white py-3 rounded-lg"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <h3 className="text-2xl font-bold text-green-600 mb-2">
              Registration Successful!
            </h3>
            <p>Welcome aboard, {formData.name}!</p>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  return (
    <Router>
      <ScrollToTop />
      <Routes>
        {/* Admin Routes without Header/Footer */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />

        {/* Public Routes with Header/Footer */}
        <Route
          path="*"
          element={
            <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
              <Header />
              <Routes>
                <Route path="/" element={<HomePage onOpenModal={setActiveModal} />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/courses" element={<CoursesPage onOpenModal={setActiveModal} />} />
                <Route path="/teachers" element={<TeachersPage />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/live-class" element={<LiveClassPage />} />
                <Route path="/auth" element={<Auth />} />

              </Routes>
              <WhatsAppButton />
              <HindiLearningChat />
              <Footer />
              <EnrollmentModal
                activeModal={activeModal}
                setActiveModal={setActiveModal}
              />
            </div>
          }
        />
      </Routes>
    </Router>
  );
}

export default App; 