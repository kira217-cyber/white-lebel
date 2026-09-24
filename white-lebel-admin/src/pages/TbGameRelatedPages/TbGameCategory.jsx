import React, { useEffect, useMemo, useState } from "react";
import {
  Edit,
  EyeOff,
  Layers,
  Loader2,
  Monitor,
  PlusCircle,
  Save,
  Smartphone,
  Home,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../api/axios";
import {
  DeskTabPreview,
  Empty,
  ImageDrop,
  MobTabPreview,
  PageHeader,
  SectionTitlePreview,
  SortableList,
  Spinner,
  Toggle,
} from "../../components/TbGames/tbUi";
import {
  apiError,
  btnDanger,
  btnGhost,
  btnPrimary,
  cardClass,
  fileUrl,
  inputClass,
  labelClass,
  SITE,
} from "../../components/TbGames/tbTheme";

const BASE = "/api/master/tb-game-categories";

const TYPES = [
  {
    value: "games",
    label: "Games",
    hint: "সাধারণ ক্যাটাগরি — Add Provider থেকে প্রোভাইডার, Add Game থেকে গেম যোগ হবে।",
  },
  {
    value: "hot",
    label: "Hot (গরম খেলা)",
    hint: "আলাদা কিছু যোগ করতে হবে না — যে গেমে ⭐ HOT দেওয়া, সেগুলো Hot Games এর ক্রমে নিজে থেকে আসবে।",
  },
  {
    value: "favorite",
    label: "Favorite (আমার প্রিয়)",
    hint: "প্রতিটা প্লেয়ারের নিজের পছন্দের তালিকা — সাইট নিজেই রাখে, এখানে কিছু যোগ করতে হয় না।",
  },
  {
    value: "provider",
    label: "Provider shortcut",
    hint: "একটা প্রোভাইডারের সব গেম এক ট্যাবে (যেমন মোবাইলের JILI ট্যাব)। নিচে প্রোভাইডার বাছুন।",
  },
  {
    value: "sports",
    label: "Sports",
    hint: "ট্যাবে চাপলে সরাসরি স্পোর্টস গেম খুলবে। Add Provider থেকে BTI আর Add Game থেকে তার গেমটা যোগ করুন।",
  },
];

const typeLabel = (value) => TYPES.find((item) => item.value === value)?.label || value;

const emptyForm = {
  nameBn: "",
  nameEn: "",
  key: "",
  type: "games",
  providerCode: "",
  showOnDesktop: true,
  showOnMobile: true,
  showOnHome: true,
  showOnHomeMobile: true,
  showProviders: true,
  deskIconW: "",
  deskIconH: "",
  status: "active",
  deskIcon: null,
  mobIcon: null,
  titleIcon: null,
  remove: {},
};

const ICONS = [
  { field: "deskIcon", label: "Desktop tab icon", size: "60 × 60 PNG, transparent background" },
  { field: "mobIcon", label: "Mobile tab icon", size: "64 × 64 PNG, transparent background" },
  { field: "titleIcon", label: "Section title icon", size: "34 × 34 PNG — desktop home section" },
];

const slugify = (value = "") =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const TbGameCategory = () => {
  const [categories, setCategories] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [keyTouched, setKeyTouched] = useState(false);

  const [oracleProviders, setOracleProviders] = useState([]);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const load = async () => {
    try {
      setListLoading(true);
      const res = await api.get(BASE);
      setCategories(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (error) {
      toast.error(apiError(error, "Failed to load categories"));
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Provider list is only needed for the shortcut type.
  useEffect(() => {
    if (form.type !== "provider" || oracleProviders.length) return;

    api
      .get("/api/master/tb-game-providers/oracle/list")
      .then((res) => setOracleProviders(res.data?.data || []))
      .catch((error) => toast.error(apiError(error, "Failed to load Oracle providers")));
  }, [form.type, oracleProviders.length]);

  // Blob previews for new files, stored URLs otherwise.
  const previews = useMemo(() => {
    const out = {};
    ICONS.forEach(({ field }) => {
      if (form[field] instanceof File) out[field] = URL.createObjectURL(form[field]);
      else if (form.remove[field]) out[field] = "";
      else out[field] = editing?.[`${field}Url`] || fileUrl(editing?.[field]) || "";
    });
    return out;
  }, [form, editing]);

  useEffect(
    () => () =>
      Object.values(previews).forEach((url) => url?.startsWith("blob:") && URL.revokeObjectURL(url)),
    [previews],
  );

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
    setKeyTouched(false);
  };

  const startEdit = (category) => {
    setEditing(category);
    setKeyTouched(true);
    setForm({
      ...emptyForm,
      nameBn: category.name?.bn || "",
      nameEn: category.name?.en || "",
      key: category.key || "",
      type: category.type || "games",
      providerCode: category.providerCode || "",
      showOnDesktop: category.showOnDesktop !== false,
      showOnMobile: category.showOnMobile !== false,
      showOnHome: category.showOnHome !== false,
      showOnHomeMobile: category.showOnHomeMobile !== false,
      showProviders: category.showProviders !== false,
      deskIconW: category.deskIconW ? String(category.deskIconW) : "",
      deskIconH: category.deskIconH ? String(category.deskIconH) : "",
      status: category.status || "active",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.nameBn.trim() || !form.nameEn.trim()) return toast.error("বাংলা ও ইংরেজি নাম দুটোই লাগবে");
    if (!form.key.trim()) return toast.error("URL key লাগবে (যেমন slot)");
    if (form.type === "provider" && !form.providerCode) return toast.error("কোন প্রোভাইডারের শর্টকাট, সেটা বাছুন");

    const fd = new FormData();
    ["nameBn", "nameEn", "key", "type", "providerCode", "status"].forEach((field) =>
      fd.append(field, String(form[field] || "").trim()),
    );
    ["showOnDesktop", "showOnMobile", "showOnHome", "showOnHomeMobile", "showProviders"].forEach((field) =>
      fd.append(field, String(form[field])),
    );
    fd.append("deskIconW", String(form.deskIconW || 0));
    fd.append("deskIconH", String(form.deskIconH || 0));
    ICONS.forEach(({ field }) => {
      if (form[field] instanceof File) fd.append(field, form[field]);
      else if (form.remove[field]) fd.append(`remove_${field}`, "true");
    });

    try {
      setSaving(true);
      const config = { headers: { "Content-Type": "multipart/form-data" } };

      if (editing?._id) {
        await api.put(`${BASE}/${editing._id}`, fd, config);
        toast.success("Category updated");
      } else {
        await api.post(BASE, fd, config);
        toast.success("Category created");
      }

      resetForm();
      load();
    } catch (error) {
      toast.error(apiError(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category) => {
    const extra =
      category.providerCount || category.gameCount
        ? `\n\nএর ${category.providerCount}টা প্রোভাইডার ও ${category.gameCount}টা গেমও মুছে যাবে।`
        : "";
    if (!window.confirm(`"${category.name?.en}" delete করবেন?${extra}`)) return;

    try {
      await api.delete(`${BASE}/${category._id}`);
      toast.success("Category deleted");
      if (editing?._id === category._id) resetForm();
      load();
    } catch (error) {
      toast.error(apiError(error, "Delete failed"));
    }
  };

  // দুই রকম ক্রম: মোবাইলের ট্যাব + হোমের সেকশন (`order`), আর ডেস্কটপের
  // ট্যাব বার (`deskOrder`) — মূল সাইটে দুটো আলাদা
  const [orderMode, setOrderMode] = useState("main");

  const listed = useMemo(() => {
    if (orderMode === "main") return categories;
    return categories
      .slice()
      .sort((a, b) => (a.deskOrder || 999) - (b.deskOrder || 999));
  }, [categories, orderMode]);

  const handleReorder = async (next) => {
    const previous = categories;
    const field = orderMode === "desk" ? "deskOrder" : "order";

    if (field === "order") setCategories(next);
    else {
      const rank = new Map(next.map((item, index) => [item._id, index + 1]));
      setCategories((prev) => prev.map((item) => ({ ...item, deskOrder: rank.get(item._id) ?? 999 })));
    }

    try {
      await api.patch(`${BASE}/reorder`, { ids: next.map((item) => item._id), field });
      toast.success("Order saved");
    } catch (error) {
      setCategories(previous);
      toast.error(apiError(error, "Order not saved"));
    }
  };

  const quickToggle = async (category, field) => {
    const fd = new FormData();
    fd.append(field, String(!category[field]));

    try {
      await api.put(`${BASE}/${category._id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCategories((prev) =>
        prev.map((item) => (item._id === category._id ? { ...item, [field]: !item[field] } : item)),
      );
    } catch (error) {
      toast.error(apiError(error));
    }
  };

  const typeInfo = TYPES.find((item) => item.value === form.type);

  return (
    <div className="space-y-6 text-white">
      <PageHeader
        icon={Layers}
        title="Game"
        accent="Category"
        hint="একটা ক্যাটাগরি একবার যোগ করলেই সাইটের ডেস্কটপ আর মোবাইল — দুই ডিজাইনেই দেখাবে। কোনটা কোথায় দেখাবে তা নিচের সুইচ দিয়ে ঠিক করুন।"
        statLabel="Total Categories"
        stat={categories.length}
      />

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className={cardClass}>
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">{editing ? "Update Category" : "Create Category"}</h2>
              <p className="text-sm text-slate-400">নাম, ধরন, আইকন আর কোথায় দেখাবে।</p>
            </div>

            {editing && (
              <button type="button" onClick={resetForm} className={btnDanger}>
                <X className="h-4 w-4" /> Cancel
              </button>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className={labelClass}>Name BN *</label>
              <input
                className={inputClass}
                value={form.nameBn}
                onChange={(e) => set({ nameBn: e.target.value })}
                placeholder="যেমন: স্লট"
              />
            </div>

            <div>
              <label className={labelClass}>Name EN *</label>
              <input
                className={inputClass}
                value={form.nameEn}
                onChange={(e) =>
                  set({
                    nameEn: e.target.value,
                    ...(keyTouched ? {} : { key: slugify(e.target.value) }),
                  })
                }
                placeholder="e.g. Slot"
              />
            </div>

            <div>
              <label className={labelClass}>URL key *</label>
              <input
                className={inputClass}
                value={form.key}
                onChange={(e) => {
                  setKeyTouched(true);
                  set({ key: slugify(e.target.value) });
                }}
                placeholder="slot"
              />
              <p className="mt-1.5 text-[11px] text-slate-500">
                সাইটের লিংক: /games/<span className="text-fuchsia-300">{form.key || "slot"}</span>
              </p>
            </div>

            <div>
              <label className={labelClass}>Status</label>
              <select
                className={`${inputClass} cursor-pointer`}
                value={form.status}
                onChange={(e) => set({ status: e.target.value })}
              >
                <option className="bg-[#030712]" value="active">Active</option>
                <option className="bg-[#030712]" value="inactive">Inactive</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Type</label>
              <div className="grid gap-2 sm:grid-cols-5">
                {TYPES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => set({ type: item.value })}
                    className={`cursor-pointer rounded-2xl border px-3 py-2.5 text-xs font-black transition ${
                      form.type === item.value
                        ? "border-fuchsia-300/60 bg-fuchsia-400/15 text-fuchsia-100"
                        : "border-white/10 bg-black/30 text-slate-300 hover:border-white/25"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {typeInfo && <p className="mt-2 text-xs text-amber-200/80">{typeInfo.hint}</p>}
            </div>

            {form.type === "provider" && (
              <div className="md:col-span-2">
                <label className={labelClass}>Provider *</label>
                <select
                  className={`${inputClass} cursor-pointer`}
                  value={form.providerCode}
                  onChange={(e) => set({ providerCode: e.target.value })}
                >
                  <option className="bg-[#030712]" value="">
                    {oracleProviders.length ? "— Select provider —" : "Loading Oracle providers…"}
                  </option>
                  {oracleProviders.map((item) => (
                    <option className="bg-[#030712]" key={item.providerCode} value={item.providerCode}>
                      {item.providerName} ({item.providerCode})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid gap-4 md:col-span-2 md:grid-cols-3">
              {ICONS.map(({ field, label, size }) => (
                <ImageDrop
                  key={field}
                  label={label}
                  size={size}
                  preview={previews[field]}
                  onPick={(file) => set({ [field]: file, remove: { ...form.remove, [field]: false } })}
                  onRemove={() => set({ [field]: null, remove: { ...form.remove, [field]: true } })}
                />
              ))}
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Desktop icon size (optional)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={120}
                  className={`${inputClass} w-28`}
                  value={form.deskIconW}
                  onChange={(e) => set({ deskIconW: e.target.value })}
                  placeholder="W"
                />
                <span className="text-slate-500">×</span>
                <input
                  type="number"
                  min={0}
                  max={120}
                  className={`${inputClass} w-28`}
                  value={form.deskIconH}
                  onChange={(e) => set({ deskIconH: e.target.value })}
                  placeholder="H"
                />
                <p className="text-[11px] text-slate-500">
                  ডেস্কটপ ট্যাবে আইকনটা কত বড় আঁকা হবে (৬০ এর ঘরে)। খালি = ঘরে ধরানো। মূল সাইট: হট ৫৭×৬৫, প্রিয় ৫২×৪৪, স্লট ৬১×৪১
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:col-span-2 md:grid-cols-2">
              <Toggle
                label="Desktop"
                hint="ডেস্কটপের ক্যাটাগরি বারে"
                checked={form.showOnDesktop}
                onChange={(v) => set({ showOnDesktop: v })}
              />
              <Toggle
                label="Mobile"
                hint="মোবাইলের আইকন সারিতে"
                checked={form.showOnMobile}
                onChange={(v) => set({ showOnMobile: v })}
              />
              <Toggle
                label="Home — desktop"
                hint="ডেস্কটপ হোমে গেমের সেকশন"
                checked={form.showOnHome}
                onChange={(v) => set({ showOnHome: v })}
              />
              <Toggle
                label="Home — mobile"
                hint="মোবাইল হোমে সেকশন (JILI, স্পোর্টস এর মতো শুধু মোবাইলে)"
                checked={form.showOnHomeMobile}
                onChange={(v) => set({ showOnHomeMobile: v })}
              />
              <Toggle
                label="Provider chips"
                hint="বন্ধ = সব প্রোভাইডারের গেম একসাথে (ক্র্যাশ গেমসের মতো)"
                checked={form.showProviders}
                onChange={(v) => set({ showProviders: v })}
              />
            </div>
          </div>

          <button type="submit" disabled={saving} className={`${btnPrimary} mt-6 w-full`}>
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : editing ? (
              <Save className="h-5 w-5" />
            ) : (
              <PlusCircle className="h-5 w-5" />
            )}
            {saving ? "Saving..." : editing ? "Update Category" : "Create Category"}
          </button>
        </div>

        <div className={cardClass}>
          <h2 className="text-xl font-black">Live Preview</h2>
          <p className="mt-1 text-sm text-slate-400">সাইটে ঠিক এভাবে দেখাবে।</p>

          <div className="mt-5 space-y-4">
            <PreviewBox title="Desktop — category bar" icon={Monitor} off={!form.showOnDesktop}>
              <div className="flex gap-3">
                <DeskTabPreview
                  icon={previews.deskIcon}
                  label={form.nameBn}
                  size={[Number(form.deskIconW), Number(form.deskIconH)]}
                  active
                />
                <DeskTabPreview
                  icon={previews.deskIcon}
                  label={form.nameBn}
                  size={[Number(form.deskIconW), Number(form.deskIconH)]}
                />
              </div>
              <p className="mt-2 text-[11px] text-slate-500">বাঁয়ে সক্রিয়, ডানে সাধারণ অবস্থা</p>
            </PreviewBox>

            <PreviewBox title="Mobile — icon row" icon={Smartphone} off={!form.showOnMobile}>
              <div className="flex gap-2">
                <MobTabPreview icon={previews.mobIcon} label={form.nameBn} active />
                <MobTabPreview icon={previews.mobIcon} label={form.nameBn} />
              </div>
            </PreviewBox>

            <PreviewBox title="Desktop — home section title" icon={Home} off={!form.showOnHome}>
              <SectionTitlePreview icon={previews.titleIcon} label={form.nameBn} />
            </PreviewBox>
          </div>
        </div>
      </form>

      <section className={cardClass}>
        <div className="mb-5 flex flex-col justify-between gap-2 md:flex-row md:items-end">
          <div>
            <h2 className="text-xl font-black">Categories</h2>
            <p className="text-sm text-slate-400">
              ⠿ ধরে টেনে উপরে-নিচে সরান — ছাড়লেই সেভ।{" "}
              {orderMode === "main"
                ? "এই ক্রমে মোবাইলের ট্যাব আর মোবাইল হোমের সেকশন দেখায়।"
                : "এই ক্রমে ডেস্কটপের ট্যাব বার আর ডেস্কটপ হোমের সেকশন দেখায়।"}
            </p>
          </div>

          <div className="flex gap-1 rounded-2xl border border-white/10 bg-black/30 p-1">
            {[
              ["main", "Mobile & sections order"],
              ["desk", "Desktop tab order"],
            ].map(([value, text]) => (
              <button
                key={value}
                type="button"
                onClick={() => setOrderMode(value)}
                className={`cursor-pointer rounded-xl px-3 py-2 text-xs font-black ${
                  orderMode === value ? "bg-fuchsia-500/30 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {text}
              </button>
            ))}
          </div>
        </div>

        {listLoading ? (
          <Spinner />
        ) : !categories.length ? (
          <Empty>এখনো কোনো ক্যাটাগরি নেই — উপরের ফর্ম থেকে প্রথমটা যোগ করুন।</Empty>
        ) : (
          <SortableList
            items={listed}
            getId={(item) => item._id}
            onReorder={handleReorder}
            renderItem={(cat, index, handle) => (
              <div
                className={`flex flex-wrap items-center gap-3 rounded-2xl border px-3 py-3 md:flex-nowrap ${
                  editing?._id === cat._id
                    ? "border-fuchsia-300/50 bg-fuchsia-400/10"
                    : "border-white/10 bg-black/30"
                }`}
              >
                {handle}
                <span className="w-6 shrink-0 text-center text-sm font-black text-slate-500">{index + 1}</span>

                <div className="flex shrink-0 gap-1.5">
                  {["deskIconUrl", "mobIconUrl"].map((field) => (
                    <div
                      key={field}
                      className="flex h-11 w-11 items-center justify-center rounded-xl"
                      style={{ background: SITE.page }}
                      title={field === "deskIconUrl" ? "Desktop icon" : "Mobile icon"}
                    >
                      {cat[field] ? (
                        <img src={cat[field]} alt="" className="h-9 w-9 object-contain" />
                      ) : (
                        <span className="text-[9px] text-slate-600">none</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-black">
                    {cat.name?.bn} <span className="font-normal text-slate-400">/ {cat.name?.en}</span>
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="rounded-lg bg-white/10 px-2 py-0.5 font-bold text-slate-200">
                      {typeLabel(cat.type)}
                      {cat.type === "provider" && ` · ${cat.providerCode}`}
                    </span>
                    <span>/games/{cat.key}</span>
                    {(cat.type === "games" || cat.type === "sports") && (
                      <span>
                        {cat.providerCount} providers · {cat.gameCount} games
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 gap-1.5">
                  <PlaceChip on={cat.showOnDesktop} icon={Monitor} label="Desktop" onClick={() => quickToggle(cat, "showOnDesktop")} />
                  <PlaceChip on={cat.showOnMobile} icon={Smartphone} label="Mobile" onClick={() => quickToggle(cat, "showOnMobile")} />
                  <PlaceChip on={cat.showOnHome} icon={Home} label="Home D" onClick={() => quickToggle(cat, "showOnHome")} />
                  <PlaceChip
                    on={cat.showOnHomeMobile !== false}
                    icon={Home}
                    label="Home M"
                    onClick={() => quickToggle({ ...cat, showOnHomeMobile: cat.showOnHomeMobile !== false }, "showOnHomeMobile")}
                  />
                </div>

                <span
                  className={`shrink-0 rounded-xl px-2.5 py-1 text-[11px] font-black ${
                    cat.status === "active" ? "bg-emerald-500/90" : "bg-red-500/90"
                  }`}
                >
                  {cat.status === "active" ? "ACTIVE" : "OFF"}
                </span>

                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => startEdit(cat)} className={btnGhost} title="Edit">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => handleDelete(cat)} className={btnDanger} title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          />
        )}
      </section>
    </div>
  );
};

const PreviewBox = ({ title, icon, off, children }) => {
  const Icon = icon;
  return (
  <div className="rounded-3xl border border-white/10 p-4" style={{ background: SITE.page }}>
    <p className="mb-3 flex items-center gap-2 text-xs font-black text-slate-300">
      <Icon className="h-4 w-4 text-fuchsia-300" /> {title}
      {off && <span className="rounded-md bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-200">hidden</span>}
    </p>
    <div className={off ? "opacity-30" : ""}>{children}</div>
  </div>
  );
};

const PlaceChip = ({ on, icon, label, onClick }) => {
  const Icon = icon;
  return (
  <button
    type="button"
    onClick={onClick}
    title={`${label}: ${on ? "shown — click to hide" : "hidden — click to show"}`}
    className={`flex cursor-pointer items-center gap-1 rounded-xl border px-2 py-1 text-[11px] font-bold transition ${
      on
        ? "border-fuchsia-300/40 bg-fuchsia-400/15 text-fuchsia-100"
        : "border-white/10 bg-white/5 text-slate-500 line-through"
    }`}
  >
    {on ? <Icon className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
    {label}
  </button>
  );
};

export default TbGameCategory;
