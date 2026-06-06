import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Globe2,
  MonitorCog,
  Server,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
  XCircle,
} from "lucide-react";

import { selectMasterAdmin } from "../../features/auth/authSelectors";
import { api } from "../../api/axios";

const fetchDashboardSummary = async () => {
  const { data } = await api.get("/api/master-dashboard/summary");
  return data?.data || {};
};

const formatDate = (date) => {
  if (!date) return "Never";
  return new Date(date).toLocaleString();
};

const Dashboard = () => {
  const admin = useSelector(selectMasterAdmin);

  const { data = {}, isLoading } = useQuery({
    queryKey: ["master-dashboard-summary"],
    queryFn: fetchDashboardSummary,
    staleTime: 1000 * 60,
    retry: 1,
  });

  const statsData = data?.stats || {};
  const recentSites = data?.recentSites || [];
  const system = data?.system || {};

  const stats = useMemo(
    () => [
      {
        title: "Total Sites",
        value: statsData.totalSites || 0,
        sub: "All white label projects",
        icon: Globe2,
      },
      {
        title: "Active Sites",
        value: statsData.activeSites || 0,
        sub: "Running properly",
        icon: CheckCircle2,
      },
      {
        title: "Inactive Sites",
        value: statsData.inactiveSites || 0,
        sub: "Currently disabled",
        icon: XCircle,
      },
      {
        title: "Verified Tokens",
        value: statsData.verifiedSites || 0,
        sub: "Token checked sites",
        icon: ShieldCheck,
      },
    ],
    [statsData],
  );

  return (
    <div className="space-y-6 text-white">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.20),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.16),transparent_35%)]" />

        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-200 shadow-[0_0_40px_rgba(34,211,238,0.18)]">
              <ShieldCheck className="h-9 w-9" />
            </div>

            <h1 className="text-3xl font-black md:text-4xl">
              Welcome, Demo Site{" "}
              <span className="bg-gradient-to-r from-cyan-200 to-emerald-200 bg-clip-text text-transparent">
                {admin?.name || "Master Admin"}
              </span>
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Manage all white label sites, admin panels, API tokens and access
              status from one secure master dashboard.
            </p>
          </div>

          <div className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5">
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-emerald-300" />
              <div>
                <p className="text-sm font-black text-emerald-100">
                  System Status
                </p>
                <p className="text-xs text-emerald-200/80">
                  {isLoading ? "Checking..." : "Database connected"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-xl transition hover:-translate-y-1 hover:border-cyan-300/30"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200">
                  <Icon className="h-6 w-6" />
                </div>

                <ArrowUpRight className="h-5 w-5 text-slate-500" />
              </div>

              <h3 className="text-sm font-bold text-slate-300">{item.title}</h3>

              <p className="mt-2 text-3xl font-black">
                {isLoading ? "..." : item.value}
              </p>

              <p className="mt-1 text-xs text-slate-500">{item.sub}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-5 shadow-xl xl:col-span-2">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Recent Sites</h2>
              <p className="text-sm text-slate-400">
                Real white label site overview from database
              </p>
            </div>

            <Globe2 className="h-6 w-6 text-cyan-300" />
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-center text-sm font-bold text-slate-400">
              Loading dashboard data...
            </div>
          ) : recentSites.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-center text-sm font-bold text-slate-400">
              No white label sites found.
            </div>
          ) : (
            <div className="space-y-3">
              {recentSites.map((site) => (
                <div
                  key={site._id}
                  className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <h3 className="truncate font-black">{site.siteName}</h3>

                    <p className="truncate text-xs text-slate-400">
                      {site.clientUrl}
                    </p>

                    <p className="mt-1 truncate text-[11px] text-slate-500">
                      Admin: {site.adminEmail}
                    </p>

                    <p className="mt-1 text-[11px] text-slate-500">
                      Last token verified:{" "}
                      {formatDate(site.lastTokenVerifiedAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-xl px-3 py-1 text-xs font-bold ${
                        site.tokenActive
                          ? "bg-cyan-300/10 text-cyan-200"
                          : "bg-red-300/10 text-red-200"
                      }`}
                    >
                      Token {site.tokenActive ? "Active" : "Inactive"}
                    </span>

                    <span
                      className={`rounded-xl px-3 py-1 text-xs font-bold ${
                        site.status === "active"
                          ? "bg-emerald-300/10 text-emerald-200"
                          : "bg-yellow-300/10 text-yellow-200"
                      }`}
                    >
                      {site.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-5 shadow-xl">
          <h2 className="mb-5 text-xl font-black">Quick Overview</h2>

          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl bg-black/20 p-4">
              <Server className="h-6 w-6 text-cyan-300" />
              <div>
                <p className="text-sm font-bold">Master API</p>
                <p className="text-xs text-slate-400">
                  {system.masterApi ? "Connected" : "Not connected"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-black/20 p-4">
              <MonitorCog className="h-6 w-6 text-emerald-300" />
              <div>
                <p className="text-sm font-bold">Admin Panels</p>
                <p className="text-xs text-slate-400">
                  {system.adminPanels || 0} panels registered
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-black/20 p-4">
              <Users className="h-6 w-6 text-blue-300" />
              <div>
                <p className="text-sm font-bold">Active API Tokens</p>
                <p className="text-xs text-slate-400">
                  {system.activeTokens || 0} tokens enabled
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-black/20 p-4">
              <WalletCards className="h-6 w-6 text-purple-300" />
              <div>
                <p className="text-sm font-bold">Inactive Tokens</p>
                <p className="text-xs text-slate-400">
                  {system.inactiveTokens || 0} tokens disabled
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-black/20 p-4">
              <Activity className="h-6 w-6 text-pink-300" />
              <div>
                <p className="text-sm font-bold">Recent Activity</p>
                <p className="text-xs text-slate-400">
                  Sorted by latest update
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
