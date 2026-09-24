import React, { useEffect, useRef, useState } from "react";
import { GripVertical, Loader2, UploadCloud, X } from "lucide-react";
import { labelClass, SITE } from "./tbTheme";

/* ------------------------------------------------------------------
   TBAJEE38 (TB) — pieces shared by the TB admin pages.
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

/* Page header, same look as the other game pages but TB purple. */
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
          TBAJEE38{" "}
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
   Site look-alikes, drawn in TBAJEE38's own colours so the admin sees
   what the player will see before saving.
------------------------------------------------------------------ */


const ring = (active) => `url(/tb/${active ? "ring-active" : "ring"}.png)`;

/* Desktop category bar item (icon 60 over the purple ring, label 17px). */
export const DeskTabPreview = ({ icon, label, active, size }) => (
  <div className="relative flex w-[92px] shrink-0 flex-col items-center pb-2 text-white">
    <div className="relative flex h-[84px] w-[76px] items-end justify-center">
      <span
        className="absolute left-0 top-[36px] h-[48px] w-[76px]"
        style={{
          backgroundImage: ring(active),
          backgroundRepeat: "no-repeat",
          backgroundPosition: "50%",
          backgroundSize: active ? "cover" : "contain",
        }}
      />
      {icon ? (
        <span
          className="absolute top-[12px] h-[60px] w-[60px]"
          style={{
            backgroundImage: `url(${icon})`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "50%",
            backgroundSize: size?.[0] && size?.[1] ? `${size[0]}px ${size[1]}px` : "contain",
          }}
        />
      ) : (
        <span className="absolute top-[30px] text-[10px] text-slate-500">icon</span>
      )}
    </div>
    <span className="mt-2 max-w-full truncate text-[15px] font-medium">{label || "—"}</span>
    {active && <span className="absolute bottom-0 left-0 h-[2px] w-full" style={{ background: SITE.accent }} />}
  </div>
);

/* Mobile icon row item (≈ 390px phone: 135 design units → 70px). */
export const MobTabPreview = ({ icon, label, active }) => (
  <div className="flex w-[70px] shrink-0 flex-col items-center text-white">
    <div className="relative h-[48px] w-[52px]">
      <span
        className="absolute left-0 top-[13px] h-[36px] w-[52px]"
        style={{
          backgroundImage: ring(active),
          backgroundRepeat: "no-repeat",
          backgroundPosition: "50%",
          backgroundSize: "contain",
        }}
      />
      {icon ? (
        <img src={icon} alt="" className="absolute left-[9px] top-[4px] h-[34px] w-[34px] object-contain" />
      ) : (
        <span className="absolute left-[14px] top-[18px] text-[9px] text-slate-500">icon</span>
      )}
    </div>
    <span className="mt-1.5 max-w-full truncate text-[11px]">{label || "—"}</span>
  </div>
);

/* Desktop home section title: 34px icon + 25px title. */
export const SectionTitlePreview = ({ icon, label }) => (
  <div className="flex items-center gap-2 text-white">
    {icon ? (
      <img src={icon} alt="" className="h-[34px] w-[34px] object-contain" />
    ) : (
      <span className="h-[34px] w-[34px] rounded-lg border border-dashed border-white/20" />
    )}
    <span className="text-[22px] font-semibold">{label || "—"}</span>
  </div>
);

/* Desktop provider chip on the home section: 152×50, logo 150 wide. */
export const DeskChipPreview = ({ icon, name, active }) => (
  <div
    className="flex h-[50px] w-[152px] shrink-0 items-center justify-center overflow-hidden rounded-lg"
    style={{
      border: `1.5px solid ${active ? SITE.gold : SITE.accent}`,
      background: active ? "rgba(188,67,244,.25)" : "transparent",
    }}
  >
    {icon ? (
      <img src={icon} alt={name} className="h-[46px] w-[148px] object-contain" />
    ) : (
      <span className="text-sm font-bold text-white">{name}</span>
    )}
  </div>
);

/* Mobile provider rail item (left column of the game center). */
export const MobRailPreview = ({ icon, name, active }) => (
  <div
    className="flex h-[38px] w-[80px] shrink-0 items-center justify-center overflow-hidden rounded-lg px-1"
    style={{
      background: active ? "linear-gradient(90deg,#4ade80,#38bdf8)" : SITE.card,
      border: "1px solid rgba(255,255,255,.12)",
    }}
  >
    {icon ? (
      <img src={icon} alt={name} className="h-[28px] w-[72px] object-contain" />
    ) : (
      <span className="text-[11px] font-bold text-white">{name}</span>
    )}
  </div>
);

/* Game card: desktop square (contain) and mobile 217:245 (cover). */
export const GameCardPreview = ({ image, name, badge, hot, mobile = false }) => (
  <div className={mobile ? "w-[108px]" : "w-[120px]"}>
    <div
      className="relative overflow-hidden rounded-xl"
      style={{ aspectRatio: mobile ? "217 / 245" : "1 / 1", background: SITE.card }}
    >
      {image && (
        <img
          src={image}
          alt={name}
          className={`h-full w-full ${mobile ? "object-cover" : "object-contain"}`}
        />
      )}
      {badge && (
        <span
          className={`absolute px-2 py-0.5 text-[10px] font-bold text-white ${
            mobile ? "right-0 top-0 rounded-bl-lg" : "bottom-0 right-0 rounded-tl-xl"
          }`}
          style={{ background: SITE.accent }}
        >
          {badge}
        </span>
      )}
    </div>
    <p className="mt-1 flex items-center gap-1 truncate text-xs text-[#F0CDA3]">
      <span className="truncate">{name || "—"}</span>
      {hot && (
        <span className="shrink-0 rounded bg-amber-300 px-1 text-[9px] font-black text-[#7c2d12]">গরম</span>
      )}
    </p>
  </div>
);
