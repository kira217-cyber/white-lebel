import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Edit,
  Globe2,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../api/axios";
import {
  DeskChipPreview,
  Empty,
  GameCardPreview,
  ImageDrop,
  MobRailPreview,
  PageHeader,
  SortableList,
  Spinner,
  Toggle,
  CategoryPills,
  Modal,
} from "../../components/TbGames/tbUi";
import {
  apiError,
  btnDanger,
  btnGhost,
  btnPrimary,
  cardClass,
  inputClass,
  labelClass,
  SITE,
} from "../../components/TbGames/tbTheme";

const BASE = "/api/master/tb-game-providers";

// Only these category types own providers.
const hasProviders = (category) => category.type === "games" || category.type === "sports";

const TbGameProvider = () => {
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");

  const [providers, setProviders] = useState([]);
  const [listLoading, setListLoading] = useState(false);

  const [oracle, setOracle] = useState([]);
  const [oracleLoading, setOracleLoading] = useState(false);
  const [oracleSearch, setOracleSearch] = useState("");
  const [picked, setPicked] = useState({});
  const [adding, setAdding] = useState(false);

  const [editing, setEditing] = useState(null);
  const [syncingId, setSyncingId] = useState("");

  const loadCategories = async () => {
    try {
      const res = await api.get("/api/master/tb-game-categories");
      const list = (res.data?.data || []).filter(hasProviders);
      setCategories(list);
      setCategoryId((prev) => prev || list[0]?._id || "");
    } catch (error) {
      toast.error(apiError(error, "Failed to load categories"));
    }
  };

  const loadProviders = async (id = categoryId) => {
    if (!id) return;
    try {
      setListLoading(true);
      const res = await api.get(BASE, { params: { categoryId: id } });
      setProviders(res.data?.data || []);
    } catch (error) {
      toast.error(apiError(error, "Failed to load providers"));
    } finally {
      setListLoading(false);
    }
  };

  const loadOracle = async (id = categoryId) => {
    if (!id) return;
    try {
      setOracleLoading(true);
      const res = await api.get(`${BASE}/oracle/list`, { params: { categoryId: id } });
      setOracle(res.data?.data || []);
    } catch (error) {
      toast.error(apiError(error, "Oracle provider list not loaded"));
    } finally {
      setOracleLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    setPicked({});
    setEditing(null);
    loadProviders(categoryId);
    loadOracle(categoryId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  const filteredOracle = useMemo(() => {
    const q = oracleSearch.trim().toLowerCase();
    if (!q) return oracle;
    return oracle.filter(
      (item) =>
        item.providerName.toLowerCase().includes(q) || item.providerCode.toLowerCase().includes(q),
    );
  }, [oracle, oracleSearch]);

  const pickedList = oracle.filter((item) => picked[item.providerCode]);

  const addPicked = async () => {
    if (!pickedList.length) return;
    try {
      setAdding(true);
      const res = await api.post(`${BASE}/bulk`, { categoryId, providers: pickedList });
      toast.success(res.data?.message || "Providers added");
      setPicked({});
      loadProviders();
      loadOracle();
      loadCategories();
    } catch (error) {
      toast.error(apiError(error));
    } finally {
      setAdding(false);
    }
  };

  const handleReorder = async (next) => {
    const previous = providers;
    setProviders(next);
    try {
      await api.patch(`${BASE}/reorder`, { categoryId, ids: next.map((item) => item._id) });
      toast.success("Order saved");
    } catch (error) {
      setProviders(previous);
      toast.error(apiError(error, "Order not saved"));
    }
  };

  const handleSync = async (provider) => {
    try {
      setSyncingId(provider._id);
      const res = await api.post(`${BASE}/${provider._id}/sync`);
      const { updated = 0, missing = [] } = res.data?.data || {};
      toast.success(`${updated}টা গেমের নাম/ছবি Oracle থেকে হালনাগাদ হয়েছে`);
      if (missing.length) {
        toast.warn(`Oracle এ আর নেই (${missing.length}): ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "…" : ""}`, {
          autoClose: 9000,
        });
      }
    } catch (error) {
      toast.error(apiError(error, "Sync failed"));
    } finally {
      setSyncingId("");
    }
  };

  const handleDelete = async (provider) => {
    const extra = provider.gameCount ? `\n\nএর ${provider.gameCount}টা গেমও মুছে যাবে।` : "";
    if (!window.confirm(`"${provider.providerName}" এই ক্যাটাগরি থেকে সরাবেন?${extra}`)) return;

    try {
      await api.delete(`${BASE}/${provider._id}`);
      toast.success("Provider removed");
      if (editing?._id === provider._id) setEditing(null);
      loadProviders();
      loadOracle();
      loadCategories();
    } catch (error) {
      toast.error(apiError(error, "Delete failed"));
    }
  };

  const toggleStatus = async (provider) => {
    const fd = new FormData();
    fd.append("status", provider.status === "active" ? "inactive" : "active");
    try {
      const res = await api.put(`${BASE}/${provider._id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setProviders((prev) =>
        prev.map((item) => (item._id === provider._id ? { ...item, ...res.data.data } : item)),
      );
    } catch (error) {
      toast.error(apiError(error));
    }
  };

  const category = categories.find((item) => item._id === categoryId);

  return (
    <div className="space-y-6 text-white">
      <PageHeader
        icon={Globe2}
        title="Game"
        accent="Provider"
        hint="ক্যাটাগরি বাছুন → ডানের Oracle তালিকা থেকে টিক দিয়ে একসাথে যোগ করুন → প্রতিটার লোগো আর ব্যাজের নাম ঠিক করুন।"
        statLabel="In this category"
        stat={providers.length}
      />

      <section className={cardClass}>
        <p className="mb-3 text-sm font-bold text-slate-300">Category</p>
        {categories.length ? (
          <CategoryPills categories={categories} value={categoryId} onChange={setCategoryId} />
        ) : (
          <Empty>আগে Add Category থেকে “Games” ধরনের একটা ক্যাটাগরি বানান।</Empty>
        )}
      </section>

      {categoryId && (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className={`${cardClass} min-w-0`}>
            <div className="mb-4">
              <h2 className="text-xl font-black">
                {category?.name?.bn} — providers
              </h2>
              <p className="text-sm text-slate-400">
                ⠿ ধরে টেনে ক্রম বদলান (ছাড়লেই সেভ)। লোগো না দিলে Oracle এর ছোট আইকন দেখাবে — সাইটের ডিজাইনে লম্বা লোগো ভালো দেখায়।
              </p>
            </div>

            {listLoading ? (
              <Spinner />
            ) : !providers.length ? (
              <Empty>এই ক্যাটাগরিতে এখনো প্রোভাইডার নেই — ডানের Oracle তালিকা থেকে যোগ করুন।</Empty>
            ) : (
              <SortableList
                items={providers}
                getId={(item) => item._id}
                onReorder={handleReorder}
                renderItem={(provider, index, handle) => (
                  <div
                    className={`flex flex-wrap items-center gap-3 rounded-2xl border px-3 py-3 md:flex-nowrap ${
                      editing?._id === provider._id
                        ? "border-fuchsia-300/50 bg-fuchsia-400/10"
                        : "border-white/10 bg-black/30"
                    } ${provider.status !== "active" ? "opacity-60" : ""}`}
                  >
                    {handle}
                    <span className="w-6 shrink-0 text-center text-sm font-black text-slate-500">{index + 1}</span>

                    <div className="shrink-0 rounded-xl p-1.5" style={{ background: SITE.page }}>
                      <DeskChipPreview icon={provider.iconUrl} name={provider.displayName} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-black">
                        {provider.displayName}
                        <span className="ml-2 text-xs font-bold text-slate-500">
                          {provider.providerName} · {provider.providerCode}
                        </span>
                      </p>
                      <p className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                        <Badge>{provider.gameCount} games</Badge>
                        {provider.hotCount > 0 && <Badge tone="amber">⭐ {provider.hotCount} hot</Badge>}
                        {provider.missingBnCount > 0 && (
                          <Badge tone="sky">{provider.missingBnCount} বাংলা নাম বাকি</Badge>
                        )}
                        {!provider.logoUrl && <Badge tone="rose">লোগো নেই</Badge>}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => toggleStatus(provider)}
                        className={`cursor-pointer rounded-xl px-2.5 py-1 text-[11px] font-black ${
                          provider.status === "active" ? "bg-emerald-500/90" : "bg-red-500/90"
                        }`}
                        title="Click to switch on/off"
                      >
                        {provider.status === "active" ? "ACTIVE" : "OFF"}
                      </button>
                      <button type="button" onClick={() => setEditing(provider)} className={btnGhost} title="Logo & name">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSync(provider)}
                        disabled={syncingId === provider._id}
                        className={btnGhost}
                        title="Refresh game names & images from Oracle"
                      >
                        <RefreshCw className={`h-4 w-4 ${syncingId === provider._id ? "animate-spin" : ""}`} />
                      </button>
                      <button type="button" onClick={() => handleDelete(provider)} className={btnDanger} title="Remove">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              />
            )}
          </section>

          <section className={`${cardClass} flex max-h-[80vh] min-w-0 flex-col`}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Add from Oracle</h2>
                <p className="text-sm text-slate-400">টিক দিন, তারপর “Add” — যেগুলো আগেই আছে সেগুলো সবুজ।</p>
              </div>
              <button type="button" onClick={() => loadOracle()} className={btnGhost} title="Reload">
                <RefreshCw className={`h-4 w-4 ${oracleLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            <div className="mb-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
              <Search className="h-5 w-5 text-fuchsia-300" />
              <input
                value={oracleSearch}
                onChange={(e) => setOracleSearch(e.target.value)}
                placeholder="Search provider (PG, JILI, Evolution…)"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
              />
            </div>

            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
              {oracleLoading ? (
                <Spinner />
              ) : (
                filteredOracle.map((item) => {
                  const isPicked = Boolean(picked[item.providerCode]);
                  return (
                    <button
                      key={item.providerCode}
                      type="button"
                      disabled={item.added}
                      onClick={() =>
                        setPicked((prev) => ({ ...prev, [item.providerCode]: !prev[item.providerCode] }))
                      }
                      className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition ${
                        item.added
                          ? "cursor-default border-emerald-400/30 bg-emerald-400/10"
                          : isPicked
                            ? "cursor-pointer border-fuchsia-300/60 bg-fuchsia-400/15"
                            : "cursor-pointer border-white/10 bg-black/30 hover:border-white/25"
                      }`}
                    >
                      {item.added || isPicked ? (
                        <CheckCircle2 className={`h-5 w-5 shrink-0 ${item.added ? "text-emerald-300" : "text-fuchsia-300"}`} />
                      ) : (
                        <Circle className="h-5 w-5 shrink-0 text-slate-600" />
                      )}
                      <img src={item.icon} alt="" className="h-8 w-8 shrink-0 rounded-lg object-contain" loading="lazy" />
                      <span className="min-w-0 flex-1 truncate text-sm font-bold">{item.providerName}</span>
                      <span className="shrink-0 text-[11px] font-bold text-slate-500">
                        {item.added ? "added" : item.providerCode}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <button
              type="button"
              onClick={addPicked}
              disabled={!pickedList.length || adding}
              className={`${btnPrimary} mt-4 w-full`}
            >
              {adding ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
              {pickedList.length ? `Add ${pickedList.length} provider(s)` : "Select providers to add"}
            </button>
          </section>
        </div>
      )}

      {editing && (
        <ProviderEditor
          provider={editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setProviders((prev) => prev.map((item) => (item._id === saved._id ? { ...item, ...saved } : item)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
};

const Badge = ({ children, tone = "slate" }) => {
  const tones = {
    slate: "bg-white/10 text-slate-200",
    amber: "bg-amber-400/15 text-amber-200",
    sky: "bg-sky-400/15 text-sky-200",
    rose: "bg-rose-400/15 text-rose-200",
  };
  return <span className={`rounded-lg px-2 py-0.5 font-bold ${tones[tone]}`}>{children}</span>;
};

/* Logo + badge name editor, with the logo shown in all three places it appears. */
const ProviderEditor = ({ provider, onClose, onSaved }) => {
  const [displayName, setDisplayName] = useState(provider.displayName || provider.providerCode);
  const [active, setActive] = useState(provider.status === "active");
  const [logo, setLogo] = useState(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [saving, setSaving] = useState(false);

  const logoPreview = useMemo(() => {
    if (logo) return URL.createObjectURL(logo);
    if (removeLogo) return "";
    return provider.logoUrl || "";
  }, [logo, removeLogo, provider.logoUrl]);

  useEffect(() => () => logoPreview.startsWith("blob:") && URL.revokeObjectURL(logoPreview), [logoPreview]);

  const shownIcon = logoPreview || provider.oracleIcon;

  const save = async () => {
    const fd = new FormData();
    fd.append("displayName", displayName.trim());
    fd.append("status", active ? "active" : "inactive");
    if (logo) fd.append("logo", logo);
    else if (removeLogo) fd.append("removeLogo", "true");

    try {
      setSaving(true);
      const res = await api.put(`${BASE}/${provider._id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Provider saved");
      onSaved(res.data.data);
    } catch (error) {
      toast.error(apiError(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose}>
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">{provider.providerName}</h2>
            <p className="text-sm text-slate-400">Oracle code: {provider.providerCode}</p>
          </div>
          <button type="button" onClick={onClose} className={btnGhost}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-5">
            <ImageDrop
              label="Logo (wide wordmark)"
              size="300 × 100 PNG, transparent — লম্বা লোগো, গাঢ় বেগুনি ব্যাকগ্রাউন্ডে বসবে"
              preview={logoPreview}
              tall="h-32"
              onPick={(file) => {
                setLogo(file);
                setRemoveLogo(false);
              }}
              onRemove={() => {
                setLogo(null);
                setRemoveLogo(true);
              }}
            />

            <div>
              <label className={labelClass}>Badge name</label>
              <input
                className={inputClass}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={provider.providerCode}
              />
              <p className="mt-1.5 text-[11px] text-slate-500">
                গেম কার্ডের কোণে আর মোবাইলে লোগোর নিচে এই নাম দেখায় (যেমন JL → JILI)।
              </p>
            </div>

            <Toggle label="Active" hint="বন্ধ করলে এর সব গেম সাইট থেকে লুকাবে" checked={active} onChange={setActive} />
          </div>

          <div className="space-y-4 rounded-3xl border border-white/10 p-4" style={{ background: SITE.page }}>
            <p className="text-xs font-black text-slate-300">Preview</p>

            <div>
              <p className="mb-1.5 text-[11px] text-slate-500">Desktop — home section chip</p>
              <div className="flex gap-2">
                <DeskChipPreview icon={shownIcon} name={displayName} />
                <DeskChipPreview icon={shownIcon} name={displayName} active />
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] text-slate-500">Mobile — game center provider column</p>
              <div className="flex gap-2">
                <MobRailPreview icon={shownIcon} name={displayName} />
                <MobRailPreview icon={shownIcon} name={displayName} active />
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] text-slate-500">Game card badge</p>
              <div className="flex gap-3">
                <GameCardPreview badge={displayName} name="Game name" />
                <GameCardPreview badge={displayName} name="Game name" mobile />
              </div>
            </div>
          </div>
        </div>

        <button type="button" onClick={save} disabled={saving} className={`${btnPrimary} mt-6 w-full`}>
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          Save
        </button>
    </Modal>
  );
};

export default TbGameProvider;
