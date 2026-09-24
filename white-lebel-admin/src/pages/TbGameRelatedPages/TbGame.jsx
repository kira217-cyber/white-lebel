import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Edit,
  Gamepad2,
  Loader2,
  PlusCircle,
  RefreshCw,
  Save,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../api/axios";
import {
  Empty,
  GameCardPreview,
  ImageDrop,
  Modal,
  PageHeader,
  Spinner,
  Toggle,
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

/* ------------------------------------------------------------------
   TBAJEE38 Game Management — BetChokkor এর গেম পেজের ধাঁচে এক পাতায় সব:
   ক্যাটাগরি ও প্রোভাইডার বাছুন → Oracle এর গেমগুলো কার্ডে আসে →
   প্রতিটা কার্ডেই যোগ / সরানো / এডিট। যোগ করা গেমে সবুজ "SELECTED"।
------------------------------------------------------------------ */

const BASE = "/api/master/tb-games";
const PER_PAGE = 48;

const hasProviders = (category) => category.type === "games" || category.type === "sports";

const FILTERS = [
  ["all", "All"],
  ["added", "Added"],
  ["new", "Not added"],
];

const TbGame = () => {
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [providers, setProviders] = useState([]);
  const [providerId, setProviderId] = useState("");

  const [oracle, setOracle] = useState([]);
  const [added, setAdded] = useState({});
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);

  // "যোগ করার সময় বসবে" সুইচগুলো — BetChokkor এর Bulk Actions এর মতো
  const [bulkHot, setBulkHot] = useState(false);
  const [bulkLatest, setBulkLatest] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("active");

  const [busyIds, setBusyIds] = useState({});
  const [pageBusy, setPageBusy] = useState("");
  const [editing, setEditing] = useState(null);

  const provider = providers.find((item) => item._id === providerId);
  const category = categories.find((item) => item._id === categoryId);

  /* ---------------------------- load ---------------------------- */

  useEffect(() => {
    api
      .get("/api/master/tb-game-categories")
      .then((res) => setCategories((res.data?.data || []).filter(hasProviders)))
      .catch((error) => toast.error(apiError(error, "Failed to load categories")));
  }, []);

  useEffect(() => {
    setProviders([]);
    setProviderId("");
    if (!categoryId) return;
    api
      .get("/api/master/tb-game-providers", { params: { categoryId } })
      .then((res) => setProviders(res.data?.data || []))
      .catch((error) => toast.error(apiError(error, "Failed to load providers")));
  }, [categoryId]);

  // Oracle এর তালিকা + যোগ করা গেমগুলোর পুরো তথ্য (বাংলা নাম, ছবি, ক্রম)
  const load = async () => {
    if (!providerId) return;
    try {
      setLoading(true);
      const [oracleRes, addedRes] = await Promise.all([
        api.get(`${BASE}/oracle/${providerId}`),
        api.get(BASE, { params: { providerDbId: providerId, limit: 500 } }),
      ]);
      setOracle(oracleRes.data?.data?.games || []);
      const map = {};
      (addedRes.data?.data?.games || []).forEach((game, index) => {
        map[game.gameUId] = { ...game, position: index + 1 };
      });
      setAdded(map);
    } catch (error) {
      toast.error(apiError(error, "Games not loaded"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setOracle([]);
    setAdded({});
    setPage(1);
    setSearch("");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  useEffect(() => setPage(1), [search, filter]);

  /* ---------------------------- list ---------------------------- */

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return oracle.filter((game) => {
      const mine = added[game.gameUId];
      if (filter === "added" && !mine) return false;
      if (filter === "new" && mine) return false;
      if (!q) return true;
      return (
        game.name.toLowerCase().includes(q) ||
        game.gameUId.toLowerCase().includes(q) ||
        (mine?.nameBn || "").includes(q)
      );
    });
  }, [oracle, added, search, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageGames = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const addedCount = Object.keys(added).length;
  const pageAddedCount = pageGames.filter((game) => added[game.gameUId]).length;

  /* ---------------------------- actions ---------------------------- */

  const flagBody = () => ({ isHot: bulkHot, isLatest: bulkLatest, status: bulkStatus });

  const addGames = async (uids) => {
    const res = await api.post(`${BASE}/bulk`, { providerDbId: providerId, gameUIds: uids, ...flagBody() });
    return res.data?.data?.created || 0;
  };

  const addOne = async (game) => {
    try {
      setBusyIds((prev) => ({ ...prev, [game.gameUId]: true }));
      await addGames([game.gameUId]);
      toast.success(`"${game.name}" যোগ হয়েছে`);
      await load();
    } catch (error) {
      toast.error(apiError(error));
    } finally {
      setBusyIds((prev) => ({ ...prev, [game.gameUId]: false }));
    }
  };

  const removeOne = async (game) => {
    const mine = added[game.gameUId];
    if (!mine || !window.confirm(`"${game.name}" সাইট থেকে সরাবেন?`)) return;
    try {
      setBusyIds((prev) => ({ ...prev, [game.gameUId]: true }));
      await api.post(`${BASE}/bulk-remove`, { ids: [mine._id] });
      toast.success("Game removed");
      await load();
    } catch (error) {
      toast.error(apiError(error));
    } finally {
      setBusyIds((prev) => ({ ...prev, [game.gameUId]: false }));
    }
  };

  const addPage = async () => {
    const uids = pageGames.filter((game) => !added[game.gameUId]).map((game) => game.gameUId);
    if (!uids.length) return toast.info("এই পাতার সব গেম আগেই যোগ করা");
    try {
      setPageBusy("add");
      const created = await addGames(uids);
      toast.success(`${created}টা গেম যোগ হয়েছে`);
      await load();
    } catch (error) {
      toast.error(apiError(error));
    } finally {
      setPageBusy("");
    }
  };

  const removePage = async () => {
    const ids = pageGames.map((game) => added[game.gameUId]?._id).filter(Boolean);
    if (!ids.length) return toast.info("এই পাতায় যোগ করা কোনো গেম নেই");
    if (!window.confirm(`এই পাতার ${ids.length}টা গেম সাইট থেকে সরাবেন?`)) return;
    try {
      setPageBusy("remove");
      await api.post(`${BASE}/bulk-remove`, { ids });
      toast.success(`${ids.length}টা গেম সরানো হয়েছে`);
      await load();
    } catch (error) {
      toast.error(apiError(error));
    } finally {
      setPageBusy("");
    }
  };

  const toggleHot = async (game) => {
    const mine = added[game.gameUId];
    if (!mine) return;
    try {
      await api.patch(`${BASE}/hot`, { ids: [mine._id], isHot: !mine.isHot });
      setAdded((prev) => ({ ...prev, [game.gameUId]: { ...mine, isHot: !mine.isHot } }));
      toast.success(mine.isHot ? "HOT থেকে সরানো হয়েছে" : "⭐ HOT এ যোগ হয়েছে");
    } catch (error) {
      toast.error(apiError(error));
    }
  };

  const copyUid = (uid) => {
    navigator.clipboard?.writeText(uid);
    toast.success("game_uid copied");
  };

  /* ---------------------------- render ---------------------------- */

  const pager =
    filtered.length > PER_PAGE ? (
      <div className={`${cardClass} flex items-center justify-center gap-3 py-4!`}>
        <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className={btnGhost}>
          Previous
        </button>
        <span className="text-sm font-black text-slate-200">
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page === totalPages}
          onClick={() => setPage((p) => p + 1)}
          className={btnGhost}
        >
          Next
        </button>
      </div>
    ) : null;

  return (
    <div className="space-y-6 text-white">
      <PageHeader
        icon={Gamepad2}
        title="Game"
        accent="Management"
        hint="ক্যাটাগরি ও প্রোভাইডার বাছুন, তারপর Oracle এর গেম যোগ করুন। প্রতিটা কার্ডেই যোগ, সরানো আর এডিট — বাংলা নাম, ছবি, ক্রম, HOT সব এক জায়গায়।"
        statLabel={provider ? `${provider.displayName} games` : "Oracle Games"}
        stat={provider ? `${addedCount} / ${oracle.length}` : `${PER_PAGE} per page`}
      />

      {/* ── ক্যাটাগরি ও প্রোভাইডার ── */}
      <section className={cardClass}>
        <h2 className="text-xl font-black">Select Category & Provider</h2>
        <p className="mb-5 text-sm text-slate-400">Provider games load from the Oracle API by provider code.</p>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className={labelClass}>Select Category</label>
            <select
              className={`${inputClass} cursor-pointer`}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option className="bg-[#030712]" value="">
                Choose category...
              </option>
              {categories.map((item) => (
                <option className="bg-[#030712]" key={item._id} value={item._id}>
                  {item.name?.en} • {item.name?.bn}
                </option>
              ))}
            </select>
            {category && (
              <p className="mt-2 text-xs text-fuchsia-300">
                Selected: <b>{category.name?.en}</b> · {category.providerCount} providers · {category.gameCount} games
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>Select Provider</label>
            <select
              className={`${inputClass} cursor-pointer disabled:opacity-50`}
              value={providerId}
              disabled={!categoryId}
              onChange={(e) => setProviderId(e.target.value)}
            >
              <option className="bg-[#030712]" value="">
                {categoryId
                  ? providers.length
                    ? "Choose provider..."
                    : "No provider — add one first"
                  : "Select category first"}
              </option>
              {providers.map((item) => (
                <option className="bg-[#030712]" key={item._id} value={item._id}>
                  {item.providerName} ({item.providerCode}) — {item.gameCount} added
                </option>
              ))}
            </select>
            {provider && (
              <div className="mt-2 flex items-center gap-2 text-xs text-fuchsia-300">
                <span className="flex h-6 w-14 items-center justify-center rounded" style={{ background: SITE.page }}>
                  <img src={provider.iconUrl} alt="" className="h-5 w-12 object-contain" />
                </span>
                Provider Code: <b>{provider.providerCode}</b> · Badge: <b>{provider.displayName}</b>
              </div>
            )}
          </div>
        </div>
      </section>

      {!provider ? (
        <section className={cardClass}>
          <Empty>
            <Gamepad2 className="mx-auto mb-3 h-10 w-10 text-slate-500" />
            <span className="text-base font-black text-slate-200">Select category and provider</span>
          </Empty>
        </section>
      ) : (
        <>
          {/* ── Bulk Actions ── */}
          <section className={`${cardClass} space-y-5`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center">
              <div className="lg:mr-auto">
                <h2 className="text-xl font-black">Bulk Actions</h2>
                <p className="text-sm text-slate-400">
                  This page added{" "}
                  <b className="text-fuchsia-300">
                    {pageAddedCount}/{pageGames.length}
                  </b>{" "}
                  games
                </p>
              </div>

              <div className="flex gap-1 rounded-2xl border border-white/10 bg-black/30 p-1">
                {FILTERS.map(([value, text]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={`cursor-pointer rounded-xl px-3 py-2 text-xs font-black ${
                      filter === value ? "bg-fuchsia-500/30 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {text}{" "}
                    {value === "all" ? oracle.length : value === "added" ? addedCount : oracle.length - addedCount}
                  </button>
                ))}
              </div>

              <button type="button" onClick={load} className={btnGhost}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Reload
              </button>
              <button type="button" onClick={addPage} disabled={Boolean(pageBusy)} className={btnPrimary}>
                {pageBusy === "add" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Add All Page
              </button>
              <button type="button" onClick={removePage} disabled={Boolean(pageBusy)} className={btnDanger}>
                {pageBusy === "remove" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Remove All Page
              </button>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
              <Search className="h-5 w-5 text-fuchsia-300" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search game name, uid, বাংলা নাম…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} className="cursor-pointer text-slate-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Toggle label="⭐ Bulk HOT" hint="যোগ করার সময় HOT হবে" checked={bulkHot} onChange={setBulkHot} />
              <Toggle label="NEW" hint="যোগ করার সময় NEW ব্যাজ" checked={bulkLatest} onChange={setBulkLatest} />
              <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-2">
                <label className="mb-1 block text-sm font-bold text-slate-100">Bulk Status</label>
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                  className="w-full cursor-pointer bg-transparent text-sm outline-none"
                >
                  <option className="bg-[#030712]" value="active">
                    Active — সাইটে দেখাবে
                  </option>
                  <option className="bg-[#030712]" value="inactive">
                    Inactive — লুকানো
                  </option>
                </select>
              </div>
            </div>
          </section>

          {pager}

          {/* ── গেমের কার্ড ── */}
          {loading && !oracle.length ? (
            <Spinner />
          ) : !pageGames.length ? (
            <section className={cardClass}>
              <Empty>এই ফিল্টারে কোনো গেম নেই।</Empty>
            </section>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {pageGames.map((game) => (
                <GameTile
                  key={game.gameUId}
                  game={game}
                  mine={added[game.gameUId]}
                  busy={Boolean(busyIds[game.gameUId])}
                  onAdd={() => addOne(game)}
                  onRemove={() => removeOne(game)}
                  onEdit={() => setEditing(added[game.gameUId])}
                  onHot={() => toggleHot(game)}
                  onCopy={() => copyUid(game.gameUId)}
                />
              ))}
            </div>
          )}

          {pager}
        </>
      )}

      {editing && (
        <GameEditor
          game={editing}
          provider={provider}
          total={addedCount}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
};

/* One Oracle game — added ones get the green frame and the edit tools. */
const GameTile = ({ game, mine, busy, onAdd, onRemove, onEdit, onHot, onCopy }) => {
  const image = mine?.imageUrl || game.images?.thumbnail;

  return (
    <div
      className={`overflow-hidden rounded-3xl border bg-black/30 shadow-xl transition ${
        mine ? "border-emerald-400/50" : "border-white/10 hover:border-white/25"
      } ${mine?.status === "inactive" ? "opacity-60" : ""}`}
    >
      <div className="relative flex h-48 items-center justify-center" style={{ background: SITE.page }}>
        {image && <img src={image} alt={game.name} loading="lazy" className="h-full w-full object-contain" />}

        <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
          {mine && <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[11px] font-black">SELECTED</span>}
          {mine?.isLatest && <span className="rounded-full bg-sky-500 px-2.5 py-0.5 text-[11px] font-black">NEW</span>}
          {mine?.status === "inactive" && (
            <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-[11px] font-black">OFF</span>
          )}
        </div>

        {mine && (
          <button
            type="button"
            onClick={onHot}
            title={mine.isHot ? "Remove from HOT" : "Mark as HOT"}
            className={`absolute left-3 top-3 cursor-pointer rounded-full p-2 transition ${
              mine.isHot ? "bg-amber-400 text-[#7c2d12]" : "bg-black/60 text-slate-300 hover:text-amber-300"
            }`}
          >
            <Star className={`h-4 w-4 ${mine.isHot ? "fill-current" : ""}`} />
          </button>
        )}
      </div>

      <div className="space-y-1 p-5">
        <h3 className="truncate text-lg font-black text-fuchsia-100" title={game.name}>
          {game.name}
        </h3>
        <p className={`truncate text-sm ${mine?.nameBn ? "text-amber-200" : "text-slate-600"}`}>
          {mine ? mine.nameBn || "বাংলা নাম নেই" : " "}
        </p>

        <div className="flex items-center gap-2 pt-1 text-xs text-slate-400">
          <span className="truncate">game_uid: {game.gameUId}</span>
          <button
            type="button"
            onClick={onCopy}
            className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-white/10 px-2 py-0.5 text-[11px] font-bold text-slate-200 hover:bg-white/10"
          >
            <Copy className="h-3 w-3" /> Copy
          </button>
        </div>
        <p className="text-xs text-slate-400">Category: {game.category || "—"}</p>
        <p className="text-xs text-slate-400">
          Position: <b className="text-fuchsia-200">{mine ? `#${mine.position}` : "—"}</b>
          {mine?.isHot && <> · HOT ⭐</>}
          {mine?.customImageUrl && <> · custom image</>}
        </p>

        <div className="space-y-2 pt-3">
          {mine ? (
            <>
              <button type="button" onClick={onRemove} disabled={busy} className={`${btnDanger} w-full`}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Remove
              </button>
              <button type="button" onClick={onEdit} className={`${btnGhost} w-full`}>
                <Edit className="h-4 w-4" /> Edit — নাম / ছবি / ক্রম / HOT
              </button>
            </>
          ) : (
            <button type="button" onClick={onAdd} disabled={busy} className={`${btnPrimary} w-full`}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />} Add Game
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* Everything about one added game, with how it looks on the site. */
const GameEditor = ({ game, provider, total, onClose, onSaved }) => {
  const [nameBn, setNameBn] = useState(game.nameBn || "");
  const [position, setPosition] = useState(String(game.position || ""));
  const [isHot, setIsHot] = useState(Boolean(game.isHot));
  const [hotOrder, setHotOrder] = useState(game.isHot && game.hotOrder ? String(game.hotOrder) : "");
  const [isLatest, setIsLatest] = useState(Boolean(game.isLatest));
  const [isFavorite, setIsFavorite] = useState(Boolean(game.isFavorite));
  const [active, setActive] = useState(game.status === "active");
  const [image, setImage] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [saving, setSaving] = useState(false);

  const customPreview = useMemo(() => {
    if (image) return URL.createObjectURL(image);
    if (removeImage) return "";
    return game.customImageUrl || "";
  }, [image, removeImage, game.customImageUrl]);

  useEffect(() => () => customPreview.startsWith("blob:") && URL.revokeObjectURL(customPreview), [customPreview]);

  const shown = customPreview || game.oracleImages?.height || game.oracleImages?.thumbnail || "";

  const save = async () => {
    const fd = new FormData();
    fd.append("nameBn", nameBn.trim());
    fd.append("isHot", String(isHot));
    fd.append("isLatest", String(isLatest));
    fd.append("isFavorite", String(isFavorite));
    fd.append("status", active ? "active" : "inactive");
    if (String(position) !== String(game.position || "")) fd.append("order", position);
    if (isHot && hotOrder) fd.append("hotOrder", hotOrder);
    if (image) fd.append("image", image);
    else if (removeImage) fd.append("removeImage", "true");

    try {
      setSaving(true);
      await api.put(`${BASE}/${game._id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Game saved");
      onSaved();
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
          <h2 className="text-xl font-black">Edit TBAJEE38 Game</h2>
          <p className="text-xs text-slate-500">
            {game.name} · {provider?.displayName} · uid {game.gameUId}
          </p>
        </div>
        <button type="button" onClick={onClose} className={btnGhost}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className={labelClass}>English name (Oracle)</label>
            <input className={`${inputClass} opacity-60`} value={game.name} readOnly />
          </div>
          <div>
            <label className={labelClass}>বাংলা নাম</label>
            <input
              className={inputClass}
              value={nameBn}
              onChange={(e) => setNameBn(e.target.value)}
              placeholder="খালি থাকলে ইংরেজি নাম দেখাবে"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Position ({provider?.displayName})</label>
              <input
                type="number"
                min={1}
                max={total}
                className={inputClass}
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder={`1 – ${total}`}
              />
              <p className="mt-1 text-[11px] text-slate-500">১ = প্রথমে; বাকিগুলো নিজে সরে যায়</p>
            </div>
            <div>
              <label className={labelClass}>HOT position</label>
              <input
                type="number"
                min={1}
                disabled={!isHot}
                className={`${inputClass} disabled:opacity-40`}
                value={hotOrder}
                onChange={(e) => setHotOrder(e.target.value)}
                placeholder={isHot ? "খালি = শেষে" : "HOT চালু করুন"}
              />
              <p className="mt-1 text-[11px] text-slate-500">হোমের "গরম খেলা" তে কত নম্বরে</p>
            </div>
          </div>

          <ImageDrop
            label="Custom image (optional)"
            size="420 × 500 — না দিলে Oracle এর ছবি থাকবে"
            preview={customPreview}
            tall="h-36"
            onPick={(file) => {
              setImage(file);
              setRemoveImage(false);
            }}
            onRemove={() => {
              setImage(null);
              setRemoveImage(true);
            }}
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <Toggle label="⭐ HOT" checked={isHot} onChange={setIsHot} />
            <Toggle label="NEW" checked={isLatest} onChange={setIsLatest} />
            <Toggle label="♥ প্রিয়" checked={isFavorite} onChange={setIsFavorite} />
            <Toggle label="Active" checked={active} onChange={setActive} />
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 p-4" style={{ background: SITE.page }}>
          <p className="mb-3 text-xs font-black text-slate-300">Site preview</p>
          <div className="flex flex-wrap gap-5">
            <div>
              <p className="mb-1.5 text-[11px] text-slate-500">Desktop</p>
              <GameCardPreview image={shown} name={nameBn || game.name} badge={provider?.displayName} hot={isHot} />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] text-slate-500">Mobile</p>
              <GameCardPreview image={shown} name={nameBn || game.name} badge={provider?.displayName} hot={isHot} mobile />
            </div>
          </div>
        </div>
      </div>

      <button type="button" onClick={save} disabled={saving} className={`${btnPrimary} mt-6 w-full`}>
        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
        Save changes
      </button>
    </Modal>
  );
};

export default TbGame;
