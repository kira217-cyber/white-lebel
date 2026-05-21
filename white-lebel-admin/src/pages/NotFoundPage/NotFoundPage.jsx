import React from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, Home, ShieldAlert } from "lucide-react";

const NotFoundPage = () => {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#030712] px-4 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.16),transparent_35%)]" />

      <motion.div
        initial={{ opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative w-full max-w-2xl overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur-xl md:p-12"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_30%)]" />

        <div className="relative flex flex-col items-center text-center">
          <motion.div
            animate={{
              y: [0, -10, 0],
            }}
            transition={{
              repeat: Infinity,
              duration: 3,
              ease: "easeInOut",
            }}
            className="mb-6 flex h-28 w-28 items-center justify-center rounded-full border border-cyan-300/20 bg-gradient-to-br from-cyan-400/20 to-emerald-400/10 shadow-[0_0_80px_rgba(34,211,238,0.18)]"
          >
            <ShieldAlert className="h-14 w-14 text-cyan-300" />
          </motion.div>

          <motion.h1
            initial={{ scale: 0.92 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.35 }}
            className="bg-gradient-to-r from-cyan-200 via-blue-200 to-emerald-200 bg-clip-text text-7xl font-black text-transparent md:text-8xl"
          >
            404
          </motion.h1>

          <div className="mt-5 flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-200">
            <AlertTriangle className="h-4 w-4" />
            Page Not Found
          </div>

          <h2 className="mt-6 text-2xl font-black md:text-3xl">
            Oops! This page doesn’t exist.
          </h2>

          <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300 md:text-base">
            The page you are trying to access may have been removed, renamed, or
            is temporarily unavailable inside your White Label Master Admin
            Panel.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/dashboard"
              className="group flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500 px-6 py-3 text-sm font-black text-white shadow-[0_20px_50px_rgba(34,211,238,0.18)] transition hover:scale-[1.03]"
            >
              <Home className="h-5 w-5 transition group-hover:rotate-6" />
              Back To Dashboard
            </Link>

            <button
              onClick={() => window.history.back()}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-6 py-3 text-sm font-black text-slate-200 transition hover:bg-white/15"
            >
              <ArrowLeft className="h-5 w-5" />
              Go Back
            </button>
          </div>

          <div className="mt-10 grid w-full gap-4 rounded-3xl border border-white/10 bg-black/20 p-5 md:grid-cols-3">
            <div className="rounded-2xl bg-white/[0.04] p-4">
              <p className="text-sm font-black text-cyan-200">Secure Access</p>
              <p className="mt-1 text-xs text-slate-400">
                Master admin protected routes
              </p>
            </div>

            <div className="rounded-2xl bg-white/[0.04] p-4">
              <p className="text-sm font-black text-emerald-200">White Label</p>
              <p className="mt-1 text-xs text-slate-400">
                Manage all clone projects
              </p>
            </div>

            <div className="rounded-2xl bg-white/[0.04] p-4">
              <p className="text-sm font-black text-blue-200">Auto Login</p>
              <p className="mt-1 text-xs text-slate-400">
                Fast access admin system
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFoundPage;
