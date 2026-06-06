import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import {
  ChevronDown,
  Gamepad2,
  Globe2,
  LayoutDashboard,
  ListPlus,
  LogOut,
  Menu,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserCircle,
  X,
} from "lucide-react";

import { logoutMasterAdmin } from "../../features/auth/authSlice";
import { selectMasterAdmin } from "../../features/auth/authSelectors";

const navItems = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "All Sites",
    path: "/all-site",
    icon: Globe2,
  },
  {
    label: "Add Site",
    path: "/add-site",
    icon: PlusCircle,
  },
];

const gameItemsRB = [
  {
    label: "Add Category",
    path: "/rb-add-category",
    icon: ListPlus,
  },
  {
    label: "Add Provider",
    path: "/rb-add-provider",
    icon: Globe2,
  },
  {
    label: "Add Game",
    path: "/rb-add-game",
    icon: Gamepad2,
  },
  {
    label: "Add Live Game",
    path: "/rb-add-live-game",
    icon: Trophy,
  },
];

const gameItemsMYGP = [
  {
    label: "Add Category",
    path: "/my-gp-add-category",
    icon: ListPlus,
  },
  {
    label: "Add Provider",
    path: "/my-gp-add-provider",
    icon: Globe2,
  },
  {
    label: "Add Game",
    path: "/my-gp-add-game",
    icon: Gamepad2,
  },
  {
    label: "Add Sports Game",
    path: "/my-gp-add-sports",
    icon: Trophy,
  },
];

const SidebarContent = ({ onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const admin = useSelector(selectMasterAdmin);

  const [gamesOpenRB, setGamesOpenRB] = useState(true);
  const [gamesOpenMYGP, setGamesOpenMYGP] = useState(true);

  const handleLogout = () => {
    dispatch(logoutMasterAdmin());
    navigate("/login", { replace: true });
  };

  const linkClass = ({ isActive }) =>
    `group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
      isActive
        ? "border border-cyan-300/30 bg-cyan-300/15 text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.12)]"
        : "text-slate-300 hover:bg-white/10 hover:text-white"
    }`;

  const subLinkClass = ({ isActive }) =>
    `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all ${
      isActive
        ? "border border-emerald-300/25 bg-emerald-300/15 text-emerald-100"
        : "text-slate-400 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <aside className="flex h-full flex-col overflow-hidden border-r border-white/10 bg-[#030712]/95 text-white shadow-2xl backdrop-blur-xl">
      <div className="relative border-b border-white/10 p-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.22),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.16),transparent_35%)]" />

        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/30 bg-white/10 shadow-[0_0_35px_rgba(34,211,238,0.18)]">
              <ShieldCheck className="h-7 w-7 text-cyan-300" />
            </div>

            <div>
              <h2 className="bg-gradient-to-r from-cyan-200 via-emerald-200 to-blue-300 bg-clip-text text-lg font-black text-transparent">
                White Label
              </h2>
              <p className="text-xs text-slate-400">Master Admin</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="cursor-pointer rounded-xl bg-white/10 p-2 text-slate-200 hover:bg-white/15 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <NavLink
        to="/profile"
        onClick={onClose}
        className="mx-4 mt-5 flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.07] p-4 transition hover:border-cyan-300/30 hover:bg-cyan-300/10"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/30 to-emerald-500/20 text-cyan-200">
          <UserCircle className="h-8 w-8" />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-black">
            {admin?.name || "Master Admin"}
          </p>
          <p className="truncate text-xs text-slate-400">
            {admin?.email || "admin@oracle.com"}
          </p>
        </div>
      </NavLink>

      <div className="mx-4 mt-4 flex items-center gap-2 rounded-2xl border border-emerald-300/15 bg-emerald-300/10 px-4 py-3 text-xs text-emerald-100">
        <Sparkles className="h-4 w-4 text-emerald-300" />
        Manage all clone sites from one panel
      </div>

      <nav className="mt-5 flex-1 space-y-2 overflow-y-auto px-4 pb-4">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={linkClass}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2">
          <button
            type="button"
            onClick={() => setGamesOpenRB((prev) => !prev)}
            className={`flex w-full cursor-pointer items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
              gamesOpenRB
                ? "bg-cyan-300/10 text-cyan-100"
                : "text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-3">
              <Gamepad2 className="h-5 w-5" />
              RB Games
            </span>
            <ChevronDown
              className={`h-5 w-5 transition-transform ${
                gamesOpenRB ? "rotate-180" : ""
              }`}
            />
          </button>

          {gamesOpenRB && (
            <div className="mt-2 space-y-1 border-l border-cyan-300/20 pl-3">
              {gameItemsRB.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={subLinkClass}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2">
          <button
            type="button"
            onClick={() => setGamesOpenMYGP((prev) => !prev)}
            className={`flex w-full cursor-pointer items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
              gamesOpenMYGP
                ? "bg-cyan-300/10 text-cyan-100"
                : "text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-3">
              <Gamepad2 className="h-5 w-5" />
              MYGP Games
            </span>
            <ChevronDown
              className={`h-5 w-5 transition-transform ${
                gamesOpenMYGP ? "rotate-180" : ""
              }`}
            />
          </button>

          {gamesOpenMYGP && (
            <div className="mt-2 space-y-1 border-l border-cyan-300/20 pl-3">
              {gameItemsMYGP.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={subLinkClass}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      <div className="border-t border-white/10 p-4">
        <button
          onClick={handleLogout}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200 transition hover:bg-red-500/20"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </aside>
  );
};

const Sidebar = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <div className="fixed inset-y-0 left-0 z-40 hidden w-[20%] min-w-[260px] max-w-[320px] lg:block">
        <SidebarContent />
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <div className="absolute inset-y-0 left-0 w-[85%] max-w-[320px]">
            <SidebarContent onClose={() => setOpen(false)} />
          </div>
        </div>
      )}

      <main className="min-h-screen lg:ml-[20%]">
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-[#030712]/90 px-4 py-3 backdrop-blur-xl lg:hidden">
          <button
            onClick={() => setOpen(true)}
            className="cursor-pointer rounded-2xl border border-white/10 bg-white/10 p-2 text-white"
          >
            <Menu className="h-6 w-6" />
          </button>

          <h1 className="bg-gradient-to-r from-cyan-200 to-emerald-200 bg-clip-text text-base font-black text-transparent">
            White Label Master
          </h1>

          <NavLink
            to="/profile"
            className="rounded-2xl border border-white/10 bg-white/10 p-2 text-cyan-200"
          >
            <UserCircle className="h-6 w-6" />
          </NavLink>
        </div>

        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(47,121,201,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.14),transparent_35%)] p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Sidebar;
