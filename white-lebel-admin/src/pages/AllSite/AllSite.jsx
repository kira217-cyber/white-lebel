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
  Trash2,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../api/axios";

const API_URL = import.meta.env.VITE_API_URL;

const fileUrl = (path = "") => {
  if (!path) return "";
  if (String(path).startsWith("http")) return path;
  return `${API_URL}${String(path).startsWith("/") ? path : `/${path}`}`;
};

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

  const [tokenInfo, setTokenInfo] = useState(null);
  const [tokenLoadingId, setTokenLoadingId] = useState("");
  const [regenerateLoading, setRegenerateLoading] = useState(false);
  const [tokenStatusLoading, setTokenStatusLoading] = useState(false);

  const [deleteLoadingId, setDeleteLoadingId] = useState("");

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

  const copyText = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text || "");
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
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

  const handleOpenToken = async (siteId) => {
    try {
      setTokenLoadingId(siteId);

      const res = await api.get(`/api/master/sites/${siteId}/token`);
      setTokenInfo(res.data?.data || null);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch token");
    } finally {
      setTokenLoadingId("");
    }
  };

  const handleRegenerateToken = async () => {
    if (!tokenInfo?.siteId) return;

    const ok = window.confirm(
      "Generate new token? Old token will stop working.",
    );

    if (!ok) return;

    try {
      setRegenerateLoading(true);

      const res = await api.post(
        `/api/master/sites/${tokenInfo.siteId}/regenerate-token`,
      );

      setTokenInfo((prev) => ({
        ...prev,
        ...(res.data?.data || {}),
      }));

      toast.success("New API token generated");
      await fetchSites();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to regenerate");
    } finally {
      setRegenerateLoading(false);
    }
  };

  const handleTokenStatusChange = async () => {
    if (!tokenInfo?.siteId) return;

    try {
      setTokenStatusLoading(true);

      const nextStatus = !tokenInfo.tokenActive;

      await api.patch(`/api/master/sites/${tokenInfo.siteId}/token-status`, {
        tokenActive: nextStatus,
      });

      setTokenInfo((prev) => ({
        ...prev,
        tokenActive: nextStatus,
      }));

      toast.success(nextStatus ? "Token activated" : "Token deactivated");
      await fetchSites();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update token");
    } finally {
      setTokenStatusLoading(false);
    }
  };

  const handleDeleteSite = async (site) => {
    const ok = window.confirm(
      `Are you sure you want to delete "${site.siteName}"?`,
    );

    if (!ok) return;

    try {
      setDeleteLoadingId(site._id);

      await api.delete(`/api/master/sites/${site._id}`);

      toast.success("Site deleted successfully");

      setSites((prev) => prev.filter((item) => item._id !== site._id));

      setMeta((prev) => ({
        ...prev,
        total: Math.max((prev.total || 1) - 1, 0),
      }));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete site");
    } finally {
      setDeleteLoadingId("");
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
              Manage sites, admin auto-login, API token and delete sites.
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
            <table className="w-full min-w-[1250px] text-left">
              <thead className="border-b border-white/10 bg-black/30">
                <tr>
                  <Th>Site</Th>
                  <Th>Client URL</Th>
                  <Th>Admin URL</Th>
                  <Th>Email</Th>
                  <Th>Status</Th>
                  <Th>Token</Th>
                  <Th>Action</Th>
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
                              src={fileUrl(site.logo)}
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
                      <UrlBox url={site.clientUrl} external />
                    </td>

                    <td className="px-5 py-4">
                      <UrlBox
                        url={site.adminLoginUrl}
                        onCopy={() => copyText(site.adminLoginUrl, "Admin URL")}
                      />
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
                      <div className="space-y-2">
                        <button
                          onClick={() => handleOpenToken(site._id)}
                          disabled={tokenLoadingId === site._id}
                          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2.5 text-sm font-black text-cyan-100 hover:bg-cyan-300/15 disabled:opacity-60"
                        >
                          {tokenLoadingId === site._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <KeyRound className="h-4 w-4" />
                          )}
                          API Token
                        </button>

                        {site.apiTokenPreview && (
                          <p className="text-center font-mono text-[11px] text-slate-500">
                            {site.apiTokenPreview}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-2">
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

                        <button
                          onClick={() => handleDeleteSite(site)}
                          disabled={deleteLoadingId === site._id}
                          className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-2.5 text-sm font-black text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                        >
                          {deleteLoadingId === site._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Delete
                        </button>
                      </div>
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
        <Modal onClose={() => setLoginInfo(null)}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black">Admin Auto Login Info</h2>
              <p className="text-sm text-slate-400">
                Admin panel opened in new tab
              </p>
            </div>

            <CloseButton onClick={() => setLoginInfo(null)} />
          </div>

          <div className="space-y-3">
            <InfoRow
              icon={ExternalLink}
              label="Auto Login URL"
              value={loginInfo.autoLoginUrl}
              onCopy={() => copyText(loginInfo.autoLoginUrl, "Auto Login URL")}
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
        </Modal>
      )}

      {tokenInfo && (
        <Modal onClose={() => setTokenInfo(null)} maxWidth="max-w-2xl">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
                <KeyRound className="h-6 w-6" />
              </div>

              <div>
                <h2 className="text-xl font-black">White Label API Token</h2>
                <p className="text-sm text-slate-400">
                  {tokenInfo.siteName || "Site token info"}
                </p>
              </div>
            </div>

            <CloseButton onClick={() => setTokenInfo(null)} />
          </div>

          <div className="rounded-3xl border border-cyan-300/20 bg-black/35 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-cyan-200/80">
              Current API Token
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/50 px-4 py-3">
                <p className="break-all font-mono text-sm font-black text-cyan-100">
                  {tokenInfo.apiToken || "Token not found"}
                </p>
              </div>

              <button
                onClick={() => copyText(tokenInfo.apiToken, "API Token")}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500 px-5 py-3 text-sm font-black text-white"
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <p className="text-xs font-bold text-slate-500">Token Status</p>
              <p
                className={`mt-2 text-sm font-black ${
                  tokenInfo.tokenActive ? "text-emerald-300" : "text-red-300"
                }`}
              >
                {tokenInfo.tokenActive ? "Active" : "Inactive"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <p className="text-xs font-bold text-slate-500">Generated At</p>
              <p className="mt-2 text-sm text-slate-200">
                {tokenInfo.apiTokenLastGeneratedAt
                  ? new Date(tokenInfo.apiTokenLastGeneratedAt).toLocaleString()
                  : "N/A"}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              onClick={handleTokenStatusChange}
              disabled={tokenStatusLoading}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black disabled:opacity-60 ${
                tokenInfo.tokenActive
                  ? "border border-red-400/20 bg-red-500/10 text-red-200 hover:bg-red-500/20"
                  : "border border-emerald-400/20 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
              }`}
            >
              {tokenStatusLoading && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {tokenInfo.tokenActive ? "Deactivate Token" : "Activate Token"}
            </button>

            <button
              onClick={handleRegenerateToken}
              disabled={regenerateLoading}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-5 py-3 text-sm font-black text-cyan-100 hover:bg-cyan-300/15 disabled:opacity-60"
            >
              {regenerateLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Generate New Token
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-4">
            <p className="text-sm font-black text-yellow-100">Important</p>
            <p className="mt-1 text-xs leading-5 text-yellow-100/80">
              Generate new token korle old token kaj korbe na. Child admin panel
              e new token add korte hobe.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};

const Th = ({ children }) => {
  return (
    <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-400">
      {children}
    </th>
  );
};

const UrlBox = ({ url, external = false, onCopy }) => {
  return (
    <div className="flex max-w-[230px] items-center gap-2">
      <span className="truncate text-sm text-slate-300">{url}</span>

      {external ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-lg bg-white/10 p-1.5 text-cyan-200 hover:bg-white/15"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      ) : (
        <button
          onClick={onCopy}
          className="shrink-0 cursor-pointer rounded-lg bg-white/10 p-1.5 text-cyan-200 hover:bg-white/15"
        >
          <Copy className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

const Modal = ({ children, onClose, maxWidth = "max-w-lg" }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className={`w-full ${maxWidth} rounded-[30px] border border-white/10 bg-[#030712] p-6 shadow-2xl`}
      >
        {children}
      </div>
    </div>
  );
};

const CloseButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="cursor-pointer rounded-xl bg-white/10 p-2 hover:bg-white/15"
    >
      <X className="h-5 w-5" />
    </button>
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
