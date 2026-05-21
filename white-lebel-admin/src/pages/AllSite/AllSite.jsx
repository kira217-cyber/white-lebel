import React, { useEffect, useMemo, useState } from "react";
import {
  Copy,
  ExternalLink,
  Globe2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../api/axios";

const buildAutoLoginUrl = ({ adminLoginUrl, adminEmail, adminPassword }) => {
  const url = new URL(adminLoginUrl);

  url.searchParams.set("autoLogin", "1");
  url.searchParams.set("email", adminEmail || "");
  url.searchParams.set("password", adminPassword || "");

  return url.toString();
};

const AllSite = () => {
  const [sites, setSites] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginInfo, setLoginInfo] = useState(null);
  const [loginLoadingId, setLoginLoadingId] = useState("");

  const params = useMemo(
    () => ({
      page: meta.page,
      limit: 12,
      search,
      status,
    }),
    [meta.page, search, status],
  );

  const fetchSites = async () => {
    try {
      setLoading(true);

      const res = await api.get("/api/master/sites", { params });

      setSites(res.data?.data?.sites || []);
      setMeta(res.data?.data?.meta || { page: 1, totalPages: 1, total: 0 });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch sites");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.page, params.search, params.status]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setMeta((prev) => ({ ...prev, page: 1 }));
  };

  const handleOpenAdmin = async (siteId) => {
    try {
      setLoginLoadingId(siteId);

      const res = await api.post(`/api/master/sites/${siteId}/open-admin`);
      const data = res.data?.data;

      if (!data?.adminLoginUrl) {
        toast.error("Admin login URL missing");
        return;
      }

      const autoLoginUrl = buildAutoLoginUrl({
        adminLoginUrl: data.adminLoginUrl,
        adminEmail: data.adminEmail,
        adminPassword: data.adminPassword,
      });

      setLoginInfo({
        ...data,
        autoLoginUrl,
      });

      window.open(autoLoginUrl, "_blank");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to open admin");
    } finally {
      setLoginLoadingId("");
    }
  };

  const copyText = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text || "");
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="space-y-6 text-white">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.20),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.16),transparent_35%)]" />

        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-200">
              <Globe2 className="h-9 w-9" />
            </div>

            <h1 className="text-3xl font-black md:text-4xl">
              All{" "}
              <span className="bg-gradient-to-r from-cyan-200 to-emerald-200 bg-clip-text text-transparent">
                White Label Sites
              </span>
            </h1>

            <p className="mt-2 text-sm text-slate-300">
              Search site name, client URL, admin URL or email and auto-login to
              admin panel.
            </p>
          </div>

          <div className="rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-5">
            <p className="text-sm font-black text-cyan-100">Total Sites</p>
            <p className="mt-1 text-3xl font-black">{meta.total || 0}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.06] p-4 shadow-xl">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_130px]">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
            <Search className="h-5 w-5 text-cyan-300" />
            <input
              value={search}
              onChange={handleSearch}
              placeholder="Search by site name, URL, admin email..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
            />
          </div>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setMeta((prev) => ({ ...prev, page: 1 }));
            }}
            className="cursor-pointer rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none"
          >
            <option className="bg-[#030712]" value="">
              All Status
            </option>
            <option className="bg-[#030712]" value="active">
              Active
            </option>
            <option className="bg-[#030712]" value="inactive">
              Inactive
            </option>
          </select>

          <button
            onClick={fetchSites}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 hover:bg-cyan-300/15"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.06] shadow-xl">
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
          </div>
        ) : sites.length === 0 ? (
          <div className="p-10 text-center">
            <Globe2 className="mx-auto mb-3 h-12 w-12 text-slate-500" />
            <h3 className="text-xl font-black">No site found</h3>
            <p className="mt-1 text-sm text-slate-400">
              Try another search keyword.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-left">
              <thead className="border-b border-white/10 bg-black/30">
                <tr>
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-400">
                    Site
                  </th>
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-400">
                    Client URL
                  </th>
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-400">
                    Admin URL
                  </th>
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-400">
                    Email
                  </th>
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-400">
                    Status
                  </th>
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-400">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/10">
                {sites.map((site) => (
                  <tr
                    key={site._id}
                    className="transition hover:bg-cyan-300/[0.04]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                          {site.logo ? (
                            <img
                              src={site.logo}
                              alt={site.siteName}
                              className="h-full w-full object-contain p-1"
                            />
                          ) : (
                            <Globe2 className="h-6 w-6 text-cyan-300" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="max-w-[180px] truncate text-sm font-black text-white">
                            {site.siteName}
                          </p>
                          <p className="text-xs text-slate-500">
                            ID: {site._id?.slice(-6)}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex max-w-[230px] items-center gap-2">
                        <span className="truncate text-sm text-slate-300">
                          {site.clientUrl}
                        </span>

                        <a
                          href={site.clientUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 rounded-lg bg-white/10 p-1.5 text-cyan-200 hover:bg-white/15"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex max-w-[230px] items-center gap-2">
                        <span className="truncate text-sm text-slate-300">
                          {site.adminLoginUrl}
                        </span>

                        <button
                          onClick={() =>
                            copyText(site.adminLoginUrl, "Admin URL")
                          }
                          className="shrink-0 cursor-pointer rounded-lg bg-white/10 p-1.5 text-cyan-200 hover:bg-white/15"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex max-w-[210px] items-center gap-2">
                        <Mail className="h-4 w-4 shrink-0 text-cyan-300" />
                        <span className="truncate text-sm text-slate-300">
                          {site.adminEmail}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-xl px-3 py-1 text-xs font-black ${
                          site.status === "active"
                            ? "bg-emerald-300/10 text-emerald-200"
                            : "bg-red-300/10 text-red-200"
                        }`}
                      >
                        {site.status}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleOpenAdmin(site._id)}
                        disabled={loginLoadingId === site._id}
                        className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
                      >
                        {loginLoadingId === site._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <KeyRound className="h-4 w-4" />
                        )}
                        Admin Login
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="flex flex-col items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-white/[0.06] p-4 sm:flex-row">
        <p className="text-sm text-slate-400">
          Page {meta.page || 1} / {meta.totalPages || 1}
        </p>

        <div className="flex gap-2">
          <button
            disabled={(meta.page || 1) <= 1}
            onClick={() =>
              setMeta((prev) => ({
                ...prev,
                page: Math.max((prev.page || 1) - 1, 1),
              }))
            }
            className="cursor-pointer rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>

          <button
            disabled={(meta.page || 1) >= (meta.totalPages || 1)}
            onClick={() =>
              setMeta((prev) => ({
                ...prev,
                page: (prev.page || 1) + 1,
              }))
            }
            className="cursor-pointer rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {loginInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[30px] border border-white/10 bg-[#030712] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black">Admin Auto Login Info</h2>
                <p className="text-sm text-slate-400">
                  Admin panel opened in new tab
                </p>
              </div>

              <button
                onClick={() => setLoginInfo(null)}
                className="cursor-pointer rounded-xl bg-white/10 p-2 hover:bg-white/15"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <InfoRow
                icon={ExternalLink}
                label="Auto Login URL"
                value={loginInfo.autoLoginUrl}
                onCopy={() =>
                  copyText(loginInfo.autoLoginUrl, "Auto Login URL")
                }
              />

              <InfoRow
                icon={Mail}
                label="Email"
                value={loginInfo.adminEmail}
                onCopy={() => copyText(loginInfo.adminEmail, "Email")}
              />

              <InfoRow
                icon={Lock}
                label="Password"
                value={loginInfo.adminPassword}
                onCopy={() => copyText(loginInfo.adminPassword, "Password")}
              />
            </div>

            <a
              href={loginInfo.autoLoginUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500 px-5 py-3 text-sm font-black text-white"
            >
              <ShieldCheck className="h-5 w-5" />
              Open Auto Login Again
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

const InfoRow = ({ icon: Icon, label, value, onCopy }) => {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
      <p className="mb-2 text-xs font-bold text-slate-500">{label}</p>

      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 shrink-0 text-cyan-300" />

        <p className="min-w-0 flex-1 break-all text-sm text-slate-100">
          {value || "N/A"}
        </p>

        <button
          onClick={onCopy}
          className="cursor-pointer rounded-xl bg-cyan-300/10 p-2 text-cyan-200 hover:bg-cyan-300/20"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default AllSite;
