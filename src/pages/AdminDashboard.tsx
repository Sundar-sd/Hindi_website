import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ManpowerSection from "../components/admin/ManpowerSection";
import PremiumBackground from "../components/admin/PremiumBackground";
import WorkerDatabaseTab from "../components/admin/WorkerDatabaseTab";
import LiveClassTab from "../components/admin/LiveClassTab";
import RecordedClassTab from "../components/admin/RecordedClassTab";
import UserManagementTab from "../components/admin/UserManagementTab";
import { LogOut, Layout, Play, Briefcase, Settings, Bell, Plus, Users, Video, Globe, UserPlus } from "lucide-react";

// ─── Interfaces ───
interface Course {
  id: number;
  name: string;
  category: string;
  instructor: string;
  price: number;
  status: "Active" | "Draft";
}

const initialCourses: Course[] = [
  { id: 1, name: "Hindi Speaking (Beginner)", category: "Language", instructor: "Priya Sharma", price: 2999, status: "Active" },
  { id: 2, name: "Hindi Grammar Mastery", category: "Grammar", instructor: "Ravi Kumar", price: 1999, status: "Active" },
];

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Force Light Mode for performance and clarity
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }, []);

  // Sync tab with URL
  const queryParams = new URLSearchParams(location.search);
  const currentTab = queryParams.get("tab") as "courses" | "manpower" | "live" | "workerDatabase" | "recordedClasses" | "userManagement" || "courses";
  const [activeTab, setActiveTab] = useState<"courses" | "manpower" | "live" | "workerDatabase" | "recordedClasses" | "userManagement">(currentTab);

  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseForm, setCourseForm] = useState<Partial<Course>>({ status: "Active" });

  useEffect(() => {
    if (!localStorage.getItem("admin")) navigate("/admin");
  }, [navigate]);

  useEffect(() => {
    const tab = queryParams.get("tab") as "courses" | "manpower" | "live" | "workerDatabase" | "recordedClasses" | "userManagement";
    if (tab) setActiveTab(tab);
  }, [location.search]);

  const handleLogout = () => {
    localStorage.removeItem("admin");
    navigate("/admin");
  };

  const deleteCourse = (id: number) => setCourses(courses.filter((c) => c.id !== id));

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden relative">
      <PremiumBackground />

      {/* ── Sidebar (Simplified for Performance) ── */}
      <div className="w-72 bg-white border-r border-slate-200 flex flex-col relative z-20 shadow-xl">
        <div className="p-8 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Layout className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-indigo-950 tracking-tight">Admin<span className="text-indigo-600">Panel</span></h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mt-0.5">Control Center</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-5 space-y-1 mt-4 overflow-y-auto no-scrollbar">
          {[
            { id: "courses", label: "Course Details", icon: Settings },
            { id: "manpower", label: "Manpower Services", icon: Briefcase },
            { id: "workerDatabase", label: "Worker Database", icon: Users },
            { id: "live", label: "Live Broadcast", icon: Play },
            { id: "recordedClasses", label: "Recorded Classes", icon: Video },
            { id: "userManagement", label: "User Management", icon: UserPlus },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id as any); navigate(`/admin-dashboard?tab=${item.id}`); }}
              className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-colors duration-200 group ${activeTab === item.id 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 font-bold" 
                : "text-slate-500 hover:bg-slate-50 hover:text-indigo-600 font-semibold"}`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-2">
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-4 px-5 py-3 rounded-2xl text-indigo-600 hover:bg-indigo-50 transition-colors duration-200 font-bold text-xs uppercase tracking-wider group"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 transition-colors duration-200">
              <Globe className="w-4 h-4" />
            </div>
            View Frontend
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-5 py-3 rounded-2xl text-rose-500 hover:bg-rose-50 transition-colors duration-200 font-bold text-xs uppercase tracking-wider group"
          >
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-colors duration-200">
              <LogOut className="w-4 h-4" />
            </div>
            Sign Out
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-auto p-12 relative no-scrollbar">
        

        <div className="animate-fade-in">
          {activeTab === "courses" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-sm font-medium uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Course Name</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Instructor</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {courses.map(course => (
                    <tr key={course.id} className="hover:bg-slate-50 transition-colors duration-150">
                      <td className="px-6 py-4 font-bold text-slate-900">{course.name}</td>
                      <td className="px-6 py-4"><span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">{course.category}</span></td>
                      <td className="px-6 py-4 text-slate-600">{course.instructor}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">₹{course.price}</td>
                      <td className="px-6 py-4">
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                          course.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          {course.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => deleteCourse(course.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                           <Layout className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "manpower" && <ManpowerSection />}
          {activeTab === "workerDatabase" && <WorkerDatabaseTab />}
          {activeTab === "live" && <LiveClassTab />}
          {activeTab === "recordedClasses" && <RecordedClassTab />}
          {activeTab === "userManagement" && <UserManagementTab />}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
