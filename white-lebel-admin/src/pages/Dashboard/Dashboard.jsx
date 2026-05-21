import React from "react";
import { useSelector } from "react-redux";
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
} from "lucide-react";

import { selectMasterAdmin } from "../../features/auth/authSelectors";

const stats = [
  {
    title: "Total Sites",
    value: "06",
    sub: "All white label projects",
    icon: Globe2,
  },
  {
    title: "Active Sites",
    value: "05",
    sub: "Running properly",
    icon: CheckCircle2,
  },
  {
    title: "Pending Setup",
    value: "01",
    sub: "Need configuration",
    icon: Clock3,
  },
  {
    title: "Auto Logins",
    value: "128",
    sub: "This month",
    icon: ShieldCheck,
  },
];

const demoSites = [
  {
    name: "MYGP Main",
    url: "https://mygp.live",
    status: "Active",
    users: "12.5K",
  },
  {
    name: "MYGP Clone 1",
    url: "https://clone1.mygp.live",
    status: "Active",
    users: "3.2K",
  },
  {
    name: "Affiliate Portal",
    url: "https://affiliate.mygp.live",
    status: "Pending",
    users: "840",
  },
];

const Dashboard = () => {
  const admin = useSelector(selectMasterAdmin);

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
              Welcome,{" "}
              <span className="bg-gradient-to-r from-cyan-200 to-emerald-200 bg-clip-text text-transparent">
                {admin?.name || "Master Admin"}
              </span>
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Manage all MYGP clone sites, affiliate panels, admin panels and
              auto-login access from one secure white label dashboard.
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
                  All services are running
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
              <p className="mt-2 text-3xl font-black">{item.value}</p>
              <p className="mt-1 text-xs text-slate-500">{item.sub}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-[28px] border border-white/10 bg-white/[0.06] p-5 shadow-xl">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Recent Sites</h2>
              <p className="text-sm text-slate-400">
                Demo white label site overview
              </p>
            </div>

            <Globe2 className="h-6 w-6 text-cyan-300" />
          </div>

          <div className="space-y-3">
            {demoSites.map((site) => (
              <div
                key={site.name}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <h3 className="font-black">{site.name}</h3>
                  <p className="text-xs text-slate-400">{site.url}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-200">
                    {site.users} users
                  </span>

                  <span
                    className={`rounded-xl px-3 py-1 text-xs font-bold ${
                      site.status === "Active"
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
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-5 shadow-xl">
          <h2 className="mb-5 text-xl font-black">Quick Overview</h2>

          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl bg-black/20 p-4">
              <Server className="h-6 w-6 text-cyan-300" />
              <div>
                <p className="text-sm font-bold">Master API</p>
                <p className="text-xs text-slate-400">Connected</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-black/20 p-4">
              <MonitorCog className="h-6 w-6 text-emerald-300" />
              <div>
                <p className="text-sm font-bold">Admin Panels</p>
                <p className="text-xs text-slate-400">Auto login ready</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-black/20 p-4">
              <Users className="h-6 w-6 text-blue-300" />
              <div>
                <p className="text-sm font-bold">Affiliate Sites</p>
                <p className="text-xs text-slate-400">Manageable</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-black/20 p-4">
              <WalletCards className="h-6 w-6 text-purple-300" />
              <div>
                <p className="text-sm font-bold">Payments</p>
                <p className="text-xs text-slate-400">Demo data only</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-black/20 p-4">
              <Activity className="h-6 w-6 text-pink-300" />
              <div>
                <p className="text-sm font-bold">Activity</p>
                <p className="text-xs text-slate-400">128 SSO logins</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
