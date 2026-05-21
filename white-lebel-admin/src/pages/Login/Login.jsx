import React, { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Loader2,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { toast } from "react-toastify";
import {
  clearAuthError,
  loginMasterAdmin,
} from "../../features/auth/authSlice";
import {
  selectAuthError,
  selectAuthLoading,
  selectIsAuthenticated,
} from "../../features/auth/authSelectors";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearAuthError());
    }
  }, [error, dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email.trim()) {
      return toast.error("Email is required");
    }

    if (!formData.password.trim()) {
      return toast.error("Password is required");
    }

    const result = await dispatch(loginMasterAdmin(formData));

    if (loginMasterAdmin.fulfilled.match(result)) {
      toast.success("Login successful");
      navigate("/dashboard", { replace: true });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030712] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(47,121,201,0.35),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.25),transparent_35%)]" />

      <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="absolute -right-24 bottom-20 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-[460px]"
        >
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl border border-cyan-300/30 bg-white/10 shadow-[0_0_45px_rgba(34,211,238,0.25)] backdrop-blur">
              <ShieldCheck className="h-10 w-10 text-cyan-300" />
            </div>

            <h1 className="bg-gradient-to-r from-cyan-200 via-emerald-200 to-blue-300 bg-clip-text text-3xl font-black text-transparent md:text-4xl">
              White Label Master
            </h1>

            <p className="mt-2 text-sm text-slate-300">
              Control all clone sites from one secure master panel
            </p>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/[0.07] p-6 shadow-2xl backdrop-blur-xl md:p-8">
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/10 px-4 py-3">
              <Sparkles className="h-5 w-5 text-cyan-300" />
              <div>
                <h2 className="text-sm font-bold text-white">
                  Secure Master Login
                </h2>
                <p className="text-xs text-slate-300">
                  Login once, manage every white label site.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">
                  Email Address
                </label>

                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 transition focus-within:border-cyan-300/60 focus-within:shadow-[0_0_25px_rgba(34,211,238,0.15)]">
                  <Mail className="h-5 w-5 text-cyan-300" />

                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="admin@oracle.com"
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">
                  Password
                </label>

                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 transition focus-within:border-emerald-300/60 focus-within:shadow-[0_0_25px_rgba(16,185,129,0.15)]">
                  <Lock className="h-5 w-5 text-emerald-300" />

                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter password"
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="cursor-pointer text-slate-300 transition hover:text-white"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500 px-5 py-3.5 text-sm font-black text-white shadow-[0_18px_50px_rgba(34,211,238,0.20)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition duration-700 group-hover:translate-x-full" />

                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-5 w-5" />
                    Login to Master Panel
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-xs text-slate-500">
            Oracle White Label Control System
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
