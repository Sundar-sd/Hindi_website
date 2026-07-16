import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, X } from "lucide-react";
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "https://concise-egomaniac-starved.ngrok-free.dev/military").replace(/\/+$/, "");

// --------------------------------------------------
// Permanent Device ID Function (Keep This)
// --------------------------------------------------
const getDeviceId = (): string => {
  let id = localStorage.getItem("device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("device_id", id);
  }
  return id;
};


const Auth: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    mobile: "",
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };


  // --------------------------------------------------
  // LOGIN API CALL
  // --------------------------------------------------
  const handleLogin = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    if (!form.email || !form.password) {
      setErrorMessage("Please enter email & password");
      return;
    }

    // --- Automatic Admin Check (Robust version) ---
    const emailLower = form.email.trim().toLowerCase();
    const passwordTrim = form.password.trim();

    if (emailLower === "admin@gmail.com" && passwordTrim === "admin") {
      localStorage.setItem("admin", "true");
      localStorage.setItem("userLoggedIn", "true");
      localStorage.setItem("userEmail", "admin@gmail.com");
      navigate("/admin-dashboard");
      return;
    }

    const payload = {
      email: form.email,
      password: form.password,
      device_id: getDeviceId(),
    };

    try {
      const response = await fetch(`${API_BASE}/login/`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true"
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        
        // The backend returns 200 OK even for errors, so we must check the payload
        if (data.error) {
          setErrorMessage(`Login failed: ${data.error}`);
          return;
        }

        localStorage.setItem("userLoggedIn", "true");
        localStorage.setItem("userEmail", form.email);
        setSuccessMessage("✅ User Login Successful!");
        setTimeout(() => {
          setSuccessMessage("");
          navigate("/");
        }, 1500); // Wait slightly so user sees the message before redirect
      } else {
        const errorData = await response.json().catch(() => ({}));
        setErrorMessage(`Login failed: ${errorData.message || errorData.detail || "Invalid credentials"}`);
      }
    } catch (error) {
      console.error("Login error:", error);
      setErrorMessage("Login failed due to network error.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* LEFT SIDE IMAGE */}
      <div className="hidden lg:flex lg:w-3/5 relative">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `
              linear-gradient(to bottom, rgba(168,85,247,0.7), rgba(219,39,119,0.7)),
              url('https://i.pinimg.com/736x/a1/ca/ea/a1caead725be9f9e5b53852ae1c3ebc9.jpg')
            `,
          }}
        />
      </div>

      {/* RIGHT SIDE FORM */}
      <div className="w-full lg:w-2/5 bg-white flex flex-col items-center justify-center p-6 sm:p-8 lg:p-12 relative">
        <div className="w-full max-w-md">

          {/* Notifications */}
          {successMessage && (
            <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-3 shadow-lg shadow-emerald-500/10 animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="font-bold text-sm">{successMessage}</span>
              <button onClick={() => setSuccessMessage("")} className="ml-auto text-emerald-400 hover:text-emerald-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-center gap-3 shadow-lg shadow-rose-500/10 animate-fade-in">
              <X className="w-5 h-5 text-rose-500 bg-rose-100 rounded-full p-0.5" />
              <span className="font-bold text-sm">{errorMessage}</span>
              <button onClick={() => setErrorMessage("")} className="ml-auto text-rose-400 hover:text-rose-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <h2 className="text-3xl font-bold mb-8 text-gray-900">
            Welcome Back
          </h2>

          <div className="space-y-5">

            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              type="email"
              placeholder="Email Address"
              className="w-full border-b-2 border-gray-300 focus:border-purple-500 outline-none py-2"
            />

            <div className="relative">
              <input
                name="password"
                value={form.password}
                onChange={handleChange}
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className="w-full border-b-2 border-gray-300 focus:border-purple-500 outline-none py-2 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500"
              >
                👁
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4 mt-8">
            <button
              onClick={handleLogin}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-full font-semibold shadow-md shadow-purple-500/30"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;