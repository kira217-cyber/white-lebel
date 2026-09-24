import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Edit,
  Flame,
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
import { Empty, GameCardPreview, Modal, PageHeader, Spinner, Toggle } from "../../components/TbGames/tbUi";
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
   TBAJEE38 Hot Games — BetChokkor এর Featured Game পেজের ধাঁচে:
   উপরে খুঁজে যোগ করা, নিচে কার্ডের তালিকা (Edit / Remove)। Game ID
   টাইপ করতে হয় না — যোগ করা যেকোনো গেম নাম দিয়ে খুঁজলেই আসে।
   এই ক্রমেই হোমের "গরম খেলা" আর খেলার কেন্দ্রের "গরম খেলা" দেখায়।
------------------------------------------------------------------ */

const BASE = "/api/master/tb-games";

// হোমের "গরম খেলা": ডেস্কটপে প্রথম ১২টা, মোবাইলে প্রথম ৯টা চোখে পড়ে
const DESK_FIRST = 12;
const MOB_FIRST = 9;

/* এক পাতায় দুই তালিকা — HOT আর Favorite (আমার প্রিয়) একই নিয়মে চলে */
const LIST_UI = {
  hot: {
    title: "Hot",
    label: "HOT",
    flag: "isHot",
    hint: "যোগ করা যেকোনো গেম নাম দিয়ে খুঁজে HOT করুন। হোমের “গরম খেলা” সেকশন আর খেলার কেন্দ্রের “গরম খেলা” ট্যাব এই ক্রমেই দেখায়।",
    empty: "এখনো কোনো HOT গেম নেই",
  },
  favorite: {
    title: "Favorite",
    label: "প্রিয়",
    flag: "isFavorite",
    hint: "“আমার প্রিয়” ট্যাবে সবাই এই গেমগুলো দেখবে (খেলোয়াড়ের নিজের ♥ দেওয়া গেম তার আগে)। ডেস্কটপ হোমের ট্যাব, খেলার কেন্দ্র আর মোবাইল — সব জায়গায় এই ক্রমে।",
    empty: "এখনো কোনো প্রিয় গেম নেই",
  },
};

const title = (game) => game.nameBn || game.name;
const badge = (game) => game.provider?.displayName || game.providerCode;
const categoryName = (game) => game.category?.name?.bn || game.category?.name?.en || "";

const TbHotGame = ({ list = "hot" }) => {
  const ui = LIST_UI[list];
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listSearch, setListSearch] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState(null);
  const [moving, setMoving] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get(`${BASE}/list/${list}`);
      setGames(res.data?.data || []);
    } catch (error) {
      toast.error(apiError(error, "Failed to load hot games"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list]);

  const shown = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    return games
      .map((game, index) => ({ ...game, position: index + 1 }))
      .filter((game) => {
        if (status && game.status !== status) return false;
        return !q || game.name.toLowerCase().includes(q) || (game.nameBn || "").includes(q);
      });
  }, [games, listSearch, status]);

  const unHot = async (game) => {
    if (!window.confirm(`"${title(game)}" ${ui.label} থেকে সরাবেন? (গেমটা সাইটে থেকেই যাবে)`)) return;
    try {
      await api.patch(`${BASE}/list/${list}`, { ids: [game._id], on: false });
      toast.success(`${ui.label} থেকে সরানো হয়েছে`);
      load();
    } catch (error) {
      toast.error(apiError(error));
    }
  };

  // ▲▼ — এক ঘর সরানো; পাশের গেমটা নিজে জায়গা বদলায়
  const move = async (game, delta) => {
    const target = game.position + delta;
    if (target < 1 || target > games.length) return;
    try {
      setMoving(game._id);
      await api.patch(`${BASE}/list/${list}/position`, { id: game._id, position: target });
      await load();
    } catch (error) {
      toast.error(apiError(error));
    } finally {
      setMoving("");
    }
  };

  return (
    <div className="space-y-6 text-white">
      <PageHeader
        icon={Flame}
        title={ui.title}
        accent="Games"
        hint={ui.hint}
        statLabel={`Total ${ui.title} Games`}
        stat={games.length}
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <AddHot list={list} hotIds={new Set(games.map((g) => g._id))} onAdded={load} />

        <section className={`${cardClass} min-w-0`}>
          <h2 className="text-xl font-black">Home Preview</h2>
          <p className="mb-4 text-sm text-slate-400">
            ডেস্কটপে প্রথম {DESK_FIRST}টা, মোবাইলে প্রথম {MOB_FIRST}টা — বাকিগুলো “More” তে।
          </p>
          <div className="space-y-4 rounded-3xl p-4" style={{ background: SITE.page }}>
            {games.length ? (
              <>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {games.slice(0, DESK_FIRST).map((game) => (
                    <GameCardPreview key={game._id} image={game.imageUrl} name={title(game)} badge={badge(game)} />
                  ))}
                </div>
                <div className="grid w-fit grid-cols-3 gap-2">
                  {games.slice(0, MOB_FIRST).map((game) => (
                    <GameCardPreview key={game._id} image={game.imageUrl} name={title(game)} badge={badge(game)} hot mobile />
                  ))}
                </div>
              </>
            ) : (
              <p className="py-10 text-center text-sm text-slate-500">{ui.empty}</p>
            )}
          </div>
        </section>
      </div>

      <section className={cardClass}>
        <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-xl font-black">{ui.title} Game List</h2>
            <p className="text-sm text-slate-400">Total {games.length} hot games · #নম্বর = সাইটে কত নম্বরে দেখাবে</p>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_150px_120px]">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
              <Search className="h-5 w-5 text-fuchsia-300" />
              <input
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder="Search in hot list..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
              />
            </div>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputClass} cursor-pointer`}>
              <option className="bg-[#030712]" value="">All Status</option>
              <option className="bg-[#030712]" value="active">Active</option>
              <option className="bg-[#030712]" value="inactive">Inactive</option>
            </select>
            <button type="button" onClick={load} className={btnGhost}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        {loading && !games.length ? (
          <Spinner />
        ) : !shown.length ? (
          <Empty>{games.length ? "এই ফিল্টারে কিছু নেই।" : `উপরের খোঁজ থেকে প্রথম ${ui.label} গেম যোগ করুন।`}</Empty>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {shown.map((game) => (
              <div
                key={game._id}
                className={`overflow-hidden rounded-3xl border border-white/10 bg-black/30 shadow-xl transition hover:border-fuchsia-300/40 ${
                  game.status !== "active" ? "opacity-60" : ""
                }`}
              >
                <div className="relative flex h-44 items-center justify-center" style={{ background: SITE.page }}>
                  <img src={game.imageUrl} alt="" loading="lazy" className="h-full w-full object-contain" />
                  <span className="absolute left-3 top-3 rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-black text-[#7c2d12]">
                    #{game.position}
                  </span>
                  <div className="absolute right-3 top-3 flex flex-col gap-1">
                    <button
                      type="button"
                      disabled={game.position === 1 || moving === game._id}
                      onClick={() => move(game, -1)}
                      title="উপরে"
                      className="cursor-pointer rounded-lg bg-black/60 p-1.5 hover:bg-black/80 disabled:opacity-30"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={game.position === games.length || moving === game._id}
                      onClick={() => move(game, 1)}
                      title="নিচে"
                      className="cursor-pointer rounded-lg bg-black/60 p-1.5 hover:bg-black/80 disabled:opacity-30"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="p-5 text-center">
                  <h3 className="truncate text-lg font-black text-fuchsia-100" title={game.name}>
                    {game.name}
                  </h3>
                  <p className={`truncate text-sm ${game.nameBn ? "text-amber-200" : "text-slate-600"}`}>
                    {game.nameBn || "বাংলা নাম নেই"}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {badge(game)} · {categoryName(game)}
                  </p>

                  <div className="mt-3 flex justify-center gap-2">
                    <span className="rounded-xl bg-fuchsia-500 px-3 py-1 text-xs font-black">#{game.position}</span>
                    <span
                      className={`rounded-xl px-3 py-1 text-xs font-black ${
                        game.status === "active" ? "bg-emerald-500" : "bg-red-500"
                      }`}
                    >
                      {game.status === "active" ? "ACTIVE" : "OFF"}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setEditing(game)} className={btnGhost}>
                      <Edit className="h-4 w-4" /> Edit
                    </button>
                    <button type="button" onClick={() => unHot(game)} className={btnDanger}>
                      <Trash2 className="h-4 w-4" /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {editing && (
        <HotEditor
          list={list}
          game={editing}
          total={games.length}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
};

/* Find a game by name or game_uid and add it to HOT — no Game ID typing.
   Games not in the catalog yet (but of an added provider) come from Oracle
   and are added + made HOT in one click. */
const OracleRow = ({ list, game, busy, onAdd }) => {
  // Oracle এর নিজের ক্যাটাগরি (Slot / Fish / Live…) যে ক্যাটাগরির সাথে মেলে সেটাই আগে বাছা
  const guess =
    game.rows.find((row) => {
      const key = row.category?.key || "";
      const hint = (game.category || "").toLowerCase();
      return hint && key && (key.startsWith(hint.slice(0, 4)) || hint.startsWith(key.slice(0, 4)));
    }) || game.rows[0];
  const [rowId, setRowId] = useState(guess?.providerDbId || "");

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-sky-300/20 bg-sky-400/5 px-3 py-2">
      <img src={game.images?.thumbnail} alt="" className="h-12 w-10 shrink-0 rounded-lg object-cover" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{game.name}</p>
        <p className="truncate text-xs text-slate-500">
          {game.providerCode} · Oracle: {game.category || "—"} ·{" "}
          <span className="text-sky-300">এখনো সাইটে যোগ হয়নি</span>
        </p>
        <p className="truncate text-[11px] text-slate-600">uid {game.gameUId}</p>
      </div>
      {game.rows.length > 1 && (
        <select
          value={rowId}
          onChange={(e) => setRowId(e.target.value)}
          className="shrink-0 cursor-pointer rounded-xl border border-white/10 bg-black/40 px-2 py-2 text-xs outline-none"
          title="কোন ক্যাটাগরিতে যোগ হবে"
        >
          {game.rows.map((row) => (
            <option className="bg-[#030712]" key={row.providerDbId} value={row.providerDbId}>
              {row.category?.name?.bn || row.category?.key}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        onClick={() => onAdd(game, rowId)}
        disabled={busy}
        className={`${btnPrimary} shrink-0 px-3! py-2!`}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
        Add + {LIST_UI[list].label}
      </button>
    </div>
  );
};

const AddHot = ({ list, hotIds, onAdded }) => {
  const ui = LIST_UI[list];
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ catalog: [], oracle: [] });
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState("");

  const search = async (q) => {
    try {
      setSearching(true);
      const res = await api.get(`${BASE}/lookup`, { params: { q } });
      setResults(res.data?.data || { catalog: [], oracle: [] });
    } catch (error) {
      toast.error(apiError(error));
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults({ catalog: [], oracle: [] });
      return undefined;
    }
    const id = setTimeout(() => search(q), 350);
    return () => clearTimeout(id);
  }, [query]);

  const add = async (game) => {
    try {
      setAdding(game._id);
      await api.patch(`${BASE}/list/${list}`, { ids: [game._id], on: true });
      toast.success(`"${title(game)}" ${ui.label} এ যোগ হয়েছে`);
      onAdded();
    } catch (error) {
      toast.error(apiError(error));
    } finally {
      setAdding("");
    }
  };

  // ক্যাটালগে না থাকা গেম — একবারে সাইটে যোগ + HOT
  const addFromOracle = async (game, providerDbId) => {
    try {
      setAdding(game.gameUId);
      await api.post(`${BASE}/bulk`, { providerDbId, gameUIds: [game.gameUId], [ui.flag]: true });
      toast.success(`"${game.name}" সাইটে যোগ হয়ে ${ui.label} হয়েছে`);
      onAdded();
      await search(query.trim());
    } catch (error) {
      toast.error(apiError(error));
    } finally {
      setAdding("");
    }
  };

  const nothing = !results.catalog.length && !results.oracle.length;

  return (
    <section className={`${cardClass} min-w-0`}>
      <h2 className="text-xl font-black">Add {ui.title} Game</h2>
      <p className="mb-4 text-sm text-slate-400">
        গেমের ইংরেজি/বাংলা নাম বা <b>game_uid</b> লিখুন। সাইটে না থাকা গেমও (যোগ করা প্রোভাইডারের) Oracle
        থেকে আসবে — “Add + {ui.label}” এ একবারে যোগ হয়। নতুন গেম তালিকার শেষে বসে।
      </p>

      <div className="flex items-center gap-3 rounded-2xl border border-fuchsia-300/30 bg-black/30 px-4 py-3">
        {searching ? <Loader2 className="h-5 w-5 animate-spin text-fuchsia-300" /> : <Search className="h-5 w-5 text-fuchsia-300" />}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="যেমন: Super Ace, মাহজং, 7d0d8e8ad9a5…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} className="cursor-pointer text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-4 max-h-105 space-y-2 overflow-y-auto pr-1">
        {query.trim().length < 2 ? (
          <p className="py-8 text-center text-sm text-slate-500">কমপক্ষে ২ অক্ষর লিখুন</p>
        ) : nothing && !searching ? (
          <p className="py-8 text-center text-sm text-slate-500">
            কিছু পাওয়া যায়নি — প্রোভাইডারটা আগে Add Provider থেকে যোগ করুন
          </p>
        ) : (
          <>
            {results.catalog.map((game) => {
              const isHot = hotIds.has(game._id);
              return (
                <div key={game._id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-3 py-2">
                  <img src={game.imageUrl} alt="" className="h-12 w-10 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{game.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {game.nameBn && <span className="text-amber-200">{game.nameBn} · </span>}
                      {badge(game)} · {categoryName(game)}
                    </p>
                  </div>
                  {isHot ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-xl bg-amber-400/20 px-3 py-1.5 text-xs font-black text-amber-300">
                      <Star className="h-3.5 w-3.5 fill-current" /> {ui.label}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => add(game)}
                      disabled={adding === game._id}
                      className={`${btnPrimary} shrink-0 px-3! py-2!`}
                    >
                      {adding === game._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                      Add
                    </button>
                  )}
                </div>
              );
            })}

            {results.oracle.length > 0 && (
              <p className="pt-2 text-xs font-black uppercase tracking-wide text-sky-300">
                From Oracle — not on the site yet
              </p>
            )}
            {results.oracle.map((game) => (
              <OracleRow
                key={`${game.providerCode}-${game.gameUId}`}
                list={list}
                game={game}
                busy={adding === game.gameUId}
                onAdd={addFromOracle}
              />
            ))}
          </>
        )}
      </div>
    </section>
  );
};

/* HOT position + Bangla name + status of one hot game. */
const HotEditor = ({ list, game, total, onClose, onSaved }) => {
  const [position, setPosition] = useState(String(game.position));
  const [nameBn, setNameBn] = useState(game.nameBn || "");
  const [active, setActive] = useState(game.status === "active");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const fd = new FormData();
    fd.append("nameBn", nameBn.trim());
    fd.append("status", active ? "active" : "inactive");
    try {
      setSaving(true);
      await api.put(`${BASE}/${game._id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      if (String(position) !== String(game.position)) {
        await api.patch(`${BASE}/list/${list}/position`, { id: game._id, position: Number(position) });
      }
      toast.success("Saved");
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
          <h2 className="text-xl font-black">Edit {LIST_UI[list].title} Game</h2>
          <p className="text-xs text-slate-500">
            {game.name} · {badge(game)} · {categoryName(game)}
          </p>
        </div>
        <button type="button" onClick={onClose} className={btnGhost}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className={labelClass}>{LIST_UI[list].label} position</label>
            <input
              type="number"
              min={1}
              max={total}
              className={inputClass}
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-slate-500">১ – {total}; ১ = সবার আগে, বাকিগুলো নিজে সরে যায়</p>
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
          <Toggle label="Active" hint="বন্ধ করলে সাইটে দেখাবে না" checked={active} onChange={setActive} />
          <p className="text-xs text-slate-500">ছবি বা অন্য কিছু বদলাতে Add Game পেজে গেমের Edit এ যান।</p>
        </div>

        <div className="rounded-3xl border border-white/10 p-4" style={{ background: SITE.page }}>
          <p className="mb-3 text-xs font-black text-slate-300">Site preview</p>
          <div className="flex flex-wrap gap-5">
            <GameCardPreview image={game.imageUrl} name={nameBn || game.name} badge={badge(game)} />
            <GameCardPreview image={game.imageUrl} name={nameBn || game.name} badge={badge(game)} hot mobile />
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

export default TbHotGame;
