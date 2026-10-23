import React, { useEffect, useRef, useState } from "react";
import { GripVertical, Loader2, UploadCloud, X } from "lucide-react";
import { labelClass, SITE } from "./cv6Theme";

/* ------------------------------------------------------------------
   CV666 (CV666) — pieces shared by the CV666 admin pages.
------------------------------------------------------------------ */

/* Centered dialog; closes on the backdrop, the X button (in children) or Esc. */
export const Modal = ({ onClose, children }) => {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[32px] border border-white/10 bg-[#0b1020] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

/* Category picker used by the provider and game pages. */
export const CategoryPills = ({ categories, value, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {categories.map((cat) => (
      <button
        key={cat._id}
        type="button"
        onClick={() => onChange(cat._id)}
        className={`flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-black transition ${
          value === cat._id
            ? "border-fuchsia-300/60 bg-fuchsia-400/15 text-fuchsia-100"
            : "border-white/10 bg-black/30 text-slate-300 hover:border-white/25"
        }`}
      >
        {cat.mobIconUrl && <img src={cat.mobIconUrl} alt="" className="h-6 w-6 object-contain" />}
        {cat.name?.bn}
        <span className="text-xs font-bold text-slate-500">{cat.providerCount}</span>
      </button>
    ))}
  </div>
);

/* Page header, same look as the other game pages but CV666 purple. */
export const PageHeader = ({ icon, title, accent, hint, stat, statLabel }) => {
  const Icon = icon;
  return (
  <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(188,67,244,0.22),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(251,208,41,0.12),transparent_35%)]" />

    <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
      <div>
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-200">
          <Icon className="h-9 w-9" />
        </div>

        <h1 className="text-3xl font-black md:text-4xl">
          CV666{" "}
          <span className="bg-gradient-to-r from-fuchsia-200 to-amber-200 bg-clip-text text-transparent">
            {title}
          </span>{" "}
          {accent}
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-slate-300">{hint}</p>
      </div>

      {statLabel && (
        <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5">
          <p className="text-sm font-black text-amber-100">{statLabel}</p>
          <p className="mt-1 text-3xl font-black text-amber-200">{stat}</p>
        </div>
      )}
    </div>
  </section>
  );
};

export const Spinner = ({ className = "min-h-[200px]" }) => (
  <div className={`flex items-center justify-center ${className}`}>
    <Loader2 className="h-8 w-8 animate-spin text-fuchsia-300" />
  </div>
);

export const Empty = ({ children }) => (
  <div className="rounded-3xl border border-dashed border-white/10 bg-black/30 p-10 text-center text-sm text-slate-400">
    {children}
  </div>
);

export const Toggle = ({ label, hint, checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
      checked
        ? "border-fuchsia-300/40 bg-fuchsia-400/10"
        : "border-white/10 bg-black/30 hover:border-white/20"
    }`}
  >
    <span>
      <span className="block text-sm font-bold text-slate-100">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-slate-400">{hint}</span>}
    </span>
    <span
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        checked ? "bg-fuchsia-500" : "bg-slate-600"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </span>
  </button>
);

/* Image picker with the exact size the site needs written under it. */
export const ImageDrop = ({ label, size, preview, onPick, onRemove, dark = true, tall = "h-28" }) => (
  <div>
    <label className={labelClass}>{label}</label>
    <label
      className={`relative flex ${tall} cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-fuchsia-300/30 p-3 text-center transition hover:border-fuchsia-300/70 ${
        dark ? "bg-[#010928]" : "bg-black/25"
      }`}
    >
      {preview ? (
        <img src={preview} alt={label} className="h-full w-full object-contain" />
      ) : (
        <>
          <UploadCloud className="mb-2 h-8 w-8 text-fuchsia-300" />
          <span className="text-xs font-black text-slate-100">Click to upload</span>
        </>
      )}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] || null)}
      />
    </label>
    <div className="mt-1.5 flex items-center justify-between gap-2">
      <span className="text-[11px] text-slate-500">{size}</span>
      {preview && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="flex cursor-pointer items-center gap-1 text-[11px] font-bold text-red-300 hover:text-red-200"
        >
          <X className="h-3 w-3" /> Remove
        </button>
      )}
    </div>
  </div>
);

/**
 * Drag-and-drop list. Rows are dragged by their grip; `onReorder` gets the
 * new array once, on drop — the page saves it right away.
 */
export const SortableList = ({ items, getId, onReorder, renderItem, className = "space-y-2" }) => {
  const [dragId, setDragId] = useState("");
  const [overId, setOverId] = useState("");
  const dragging = useRef("");

  const drop = (targetId) => {
    const fromId = dragging.current;
    dragging.current = "";
    setDragId("");
    setOverId("");

    if (!fromId || fromId === targetId) return;

    const next = [...items];
    const from = next.findIndex((item) => getId(item) === fromId);
    const to = next.findIndex((item) => getId(item) === targetId);
    if (from < 0 || to < 0) return;

    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next);
  };

  return (
    <div className={className}>
      {items.map((item, index) => {
        const id = getId(item);

        return (
          <div
            key={id}
            draggable
            onDragStart={(e) => {
              dragging.current = id;
              setDragId(id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (overId !== id) setOverId(id);
            }}
            onDragEnd={() => {
              dragging.current = "";
              setDragId("");
              setOverId("");
            }}
            onDrop={(e) => {
              e.preventDefault();
              drop(id);
            }}
            className={`transition ${dragId === id ? "opacity-40" : ""} ${
              overId === id && dragId && dragId !== id ? "ring-2 ring-fuchsia-400 rounded-2xl" : ""
            }`}
          >
            {renderItem(item, index, <DragHandle />)}
          </div>
        );
      })}
    </div>
  );
};

const DragHandle = () => (
  <span
    title="Drag to reorder"
    className="flex h-9 w-7 shrink-0 cursor-grab items-center justify-center rounded-xl text-slate-500 hover:bg-white/10 hover:text-white active:cursor-grabbing"
  >
    <GripVertical className="h-5 w-5" />
  </span>
);

/* ------------------------------------------------------------------
   Site look-alikes, drawn with CV666's own measurements and colours
   (wwwcv666.com) so the admin sees what the player will see before saving.
------------------------------------------------------------------ */

/* Desktop header nav item: 112 × 73, icon 25, label 16/500, grey bar,
   active = light-blue gradient. */
export const DeskTabPreview = ({ icon, label, active }) => (
  <div
    className="flex h-[73px] w-[112px] shrink-0 flex-col items-center justify-center gap-1 px-3 text-white"
    style={{ background: active ? SITE.navActive : SITE.nav }}
  >
    {icon ? (
      <img src={icon} alt="" className="h-[25px] w-[25px] object-contain" />
    ) : (
      <span className="flex h-[25px] w-[25px] items-center justify-center rounded border border-dashed border-white/40 text-[8px]">
        icon
      </span>
    )}
    <span className="max-w-full truncate text-[16px] font-medium leading-[21px]">{label || "—"}</span>
  </div>
);

/* Mobile category tab (414px phone): 77.5 × 66, icon 31, label 11. */
export const MobTabPreview = ({ icon, label, active }) => (
  <div
    className="flex h-[66px] w-[78px] shrink-0 flex-col items-center justify-center text-white"
    style={{ background: active ? SITE.navActive : SITE.nav }}
  >
    {icon ? (
      <img src={icon} alt="" className="mb-[9px] h-[31px] w-[31px] object-contain" />
    ) : (
      <span className="mb-[9px] flex h-[31px] w-[31px] items-center justify-center rounded border border-dashed border-white/40 text-[8px]">
        icon
      </span>
    )}
    <span className="max-w-full truncate text-[11px] leading-[13px]">{label || "—"}</span>
  </div>
);

/* Desktop home "<x> জন্য সবচেয়ে হট সুপারিশ" title: 36px icon + 32px blue. */
export const SectionTitlePreview = ({ icon, label }) => (
  <div className="flex items-center gap-3 rounded-xl bg-white px-3 py-2">
    {icon ? (
      <img src={icon} alt="" className="h-[30px] w-[30px] object-contain" />
    ) : (
      <span className="h-[30px] w-[30px] rounded-lg border border-dashed border-slate-300" />
    )}
    <span className="text-[22px] font-bold" style={{ color: SITE.title }}>
      {label || "—"}
    </span>
  </div>
);

/* Desktop home "সরবরাহকারীর তালিকা" card. Large 646 × 365 (2 per row),
   small 416 × 232 (3 in the white strip); drawn here at half size. */
export const HomeCardPreview = ({ banner, label, logos = [], size = "large" }) => {
  const large = size === "large";
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-xl bg-white"
      style={{ width: large ? 323 : 208, height: large ? 184 : 116 }}
    >
      {banner ? (
        <img src={banner} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">banner</span>
      )}
      {large && (
        <div className="absolute bottom-[4px] left-[4px] flex">
          {logos.slice(0, 4).map((src, index) => (
            <img key={index} src={src} alt="" className="h-[30px] w-[60px] object-contain" />
          ))}
        </div>
      )}
      <span
        className="absolute flex items-center justify-center rounded-full font-bold text-white"
        style={{
          right: large ? 4 : 22,
          bottom: large ? 4 : 18,
          width: 70,
          height: 30,
          fontSize: 12,
          background: SITE.button,
        }}
      >
        {label || "—"}
      </span>
    </div>
  );
};

/* Provider logo as it sits on the home card: 120 × 60 (half size here). */
export const DeskChipPreview = ({ icon, name }) => (
  <div className="flex h-[30px] w-[60px] shrink-0 items-center justify-center overflow-hidden rounded bg-white">
    {icon ? (
      <img src={icon} alt={name} className="h-full w-full object-contain" />
    ) : (
      <span className="text-[10px] font-bold text-slate-600">{name}</span>
    )}
  </div>
);

/* Mobile provider rail item (game center). */
export const MobRailPreview = ({ icon, name, active }) => (
  <div
    className="flex h-[38px] w-[80px] shrink-0 items-center justify-center overflow-hidden rounded-lg px-1"
    style={{
      background: active ? SITE.navActive : "#fff",
      border: `1px solid ${active ? "transparent" : "#E3E8EF"}`,
    }}
  >
    {icon ? (
      <img src={icon} alt={name} className="h-[28px] w-[72px] object-contain" />
    ) : (
      <span className="text-[11px] font-bold text-slate-600">{name}</span>
    )}
  </div>
);

/* Game card. Desktop 236 × 147 (label + provider logo left, art right,
   name under), mobile one third of the row (label, logo, art, name). */
export const GameCardPreview = ({ image, name, badge, logo, typeLabel, hot, mobile = false }) => (
  <div
    className="relative shrink-0 overflow-hidden rounded-lg"
    style={{
      width: mobile ? 128 : 236,
      height: mobile ? 92 : 147,
      background: "linear-gradient(180deg,#E8F1FB,#F7FAFE)",
      boxShadow: "0 2px 4px rgba(108,127,151,.25)",
    }}
  >
    <span
      className="absolute left-[6px] top-[4px] text-[12px] font-semibold"
      style={{ color: SITE.label }}
    >
      {typeLabel || "স্লট"}
    </span>
    {logo ? (
      <img
        src={logo}
        alt={badge}
        className="absolute left-[4px] object-contain"
        style={mobile ? { top: 22, width: 58, height: 30 } : { top: 30, width: 104, height: 52 }}
      />
    ) : (
      badge && (
        <span className="absolute left-[6px] top-[26px] max-w-[45%] truncate text-[13px] font-black text-slate-700">
          {badge}
        </span>
      )
    )}
    <div
      className="absolute overflow-hidden rounded-md bg-slate-200"
      style={mobile ? { right: 6, top: 6, width: 52, height: 52 } : { right: 12, top: 10, width: 96, height: 96 }}
    >
      {image && <img src={image} alt={name} className="h-full w-full object-cover" />}
    </div>
    <p
      className="absolute bottom-[4px] left-0 right-0 flex items-center justify-center gap-1 truncate px-2 font-bold"
      style={{ color: SITE.label, fontSize: mobile ? 11 : 15 }}
    >
      <span className="truncate">{name || "—"}</span>
      {hot && (
        <span className="shrink-0 rounded bg-orange-500 px-1 text-[9px] font-black text-white">গরম</span>
      )}
    </p>
  </div>
);
