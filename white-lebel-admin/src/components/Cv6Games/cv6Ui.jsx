import React, { useEffect, useRef, useState } from "react";
import { GripVertical, Heart, Loader2, UploadCloud, X } from "lucide-react";
import { isSvgUrl, labelClass, SITE } from "./cv6Theme";

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
   Site look-alikes — the CV666 client's own pieces, at the sizes and
   colours the client draws them (desktop at 1920, mobile on a 414px
   phone), so the admin sees what the player will see before saving.
------------------------------------------------------------------ */

/*
 * Category icon the way the site draws it: an SVG is painted in the text
 * colour (so it turns mint when active), a PNG/JPG is shown as it is.
 */
export const SiteIcon = ({ src, svg, size }) => {
  const box = { width: size, height: size };
  if (!src) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded border border-dashed text-[8px]"
        style={{ ...box, borderColor: "currentColor", opacity: 0.5 }}
      >
        icon
      </span>
    );
  }
  if (svg ?? isSvgUrl(src)) {
    return (
      <span
        className="block shrink-0"
        style={{
          ...box,
          background: "currentColor",
          WebkitMask: `url("${src}") center / contain no-repeat`,
          mask: `url("${src}") center / contain no-repeat`,
        }}
      />
    );
  }
  return <img src={src} alt="" className="shrink-0 object-contain" style={box} />;
};

/* Desktop home category row (`.dk-cat`): 92 × 60, icon 28, label 12/700;
   hover/active = mint text and border. */
export const DeskCatPreview = ({ icon, svg, label, active }) => (
  <div
    className="flex shrink-0 flex-col items-center gap-[5px] rounded-[10px] p-[7px] text-[12px] font-bold"
    style={{
      width: 92,
      height: 60,
      color: active ? SITE.accent : SITE.text,
      background: SITE.tile2,
      border: `1px solid ${active ? "rgba(35,255,200,.5)" : "rgba(0,28,44,.4)"}`,
      boxShadow: `inset 0 2px 0 0 ${SITE.line}, 0 1px 0 0 #001c2c`,
    }}
  >
    <SiteIcon src={icon} svg={svg} size={28} />
    <span className="max-w-full truncate leading-4">{label || "—"}</span>
  </div>
);

/* Desktop left bar tile (`.dk-left-item`): 97 × 85, icon 30, label 12/700
   uppercase; hover = lighter tile and mint border. */
export const DeskSideTilePreview = ({ icon, svg, label, active }) => (
  <div
    className="flex shrink-0 flex-col items-center justify-center gap-2 rounded-[10px] p-[9px] text-center text-[12px] font-bold uppercase"
    style={{
      width: 97,
      height: 85,
      color: SITE.text,
      background: active ? SITE.tileHover : SITE.tile,
      border: `1px solid ${active ? "rgba(35,255,200,.5)" : "transparent"}`,
      boxShadow: `0 1px 0 0 #001f23, inset 0 1px 0 0 ${SITE.line}`,
    }}
  >
    <SiteIcon src={icon} svg={svg} size={30} />
    <span className="line-clamp-2 max-w-full leading-[13px]">{label || "—"}</span>
  </div>
);

/* Mobile home game menu (`.mb-menu-item`): 132 × 44, icon 24 left of the
   label, 13/700 uppercase; active = mint. */
export const MobMenuPreview = ({ icon, svg, label, active }) => (
  <div
    className="flex shrink-0 items-center justify-center rounded-[8px] px-[7px] text-[13px] font-bold uppercase"
    style={{
      width: 132,
      height: 44,
      color: active ? SITE.accent : SITE.text,
      background: SITE.tile2,
      boxShadow: `0 1px 0 0 #001c2c, inset 0 1px 0 0 ${SITE.line}`,
    }}
  >
    <span className="mr-[5px]">
      <SiteIcon src={icon} svg={svg} size={24} />
    </span>
    <span className="truncate">{label || "—"}</span>
  </div>
);

/* Mobile side drawer tile (`.mb-drawer-item`): 105 × 77, icon 24 over the
   label, 13/700. */
export const MobDrawerPreview = ({ icon, svg, label }) => (
  <div
    className="flex shrink-0 flex-col items-center justify-center rounded-[10px] px-[10px] py-[8px] text-center text-[13px] font-bold"
    style={{
      width: 105,
      height: 77,
      color: SITE.text,
      background: SITE.tile,
      boxShadow: `0 1px 0 0 #001f23, inset 0 1px 0 0 ${SITE.line}`,
    }}
  >
    <span className="mb-[9px]">
      <SiteIcon src={icon} svg={svg} size={24} />
    </span>
    <span className="line-clamp-2 leading-[15px]">{label || "—"}</span>
  </div>
);

/*
 * Game center provider chip (`.cvgc-chip`), showing the white "mobile logo".
 * Desktop 52 × 28 (logo 40 × 20), mobile 73 × 35 (logo 61 × 24); the picked
 * chip and "সব" are yellow, the others teal.
 */
export const ChipPreview = ({ logo, name, active, all, mobile }) => {
  const yellow = active || all;
  return (
    <div
      className="flex shrink-0 items-center justify-center px-[5px] font-semibold"
      style={{
        width: mobile ? 73 : 52,
        height: mobile ? 35 : 28,
        fontSize: mobile ? 14 : 12,
        borderRadius: mobile ? 6.6 : 8,
        color: yellow ? "#000" : "#fff",
        background: yellow ? SITE.yellow : SITE.chip,
        border: `1px solid ${yellow ? "rgba(255,242,166,.5)" : "rgba(35,255,200,.1)"}`,
        boxShadow: yellow ? "0 1px 0 0 #b64100, inset 0 1px 0 1px #fff2a6" : "0 1px 0 0 #005540",
      }}
    >
      {all ? (
        "সব"
      ) : logo ? (
        <img
          src={logo}
          alt={name}
          className="object-contain"
          style={{ width: mobile ? 61 : 40, height: mobile ? 24 : 20 }}
        />
      ) : (
        <em className="truncate not-italic">{name}</em>
      )}
    </div>
  );
};

/*
 * Provider card on the live/sports pages and home rows (`.dk-vendor`,
 * `.cvgc-vendor`): the lobby picture. Desktop 160 × 219, mobile 125 × 168.
 * Without a lobby picture the site shows the colour logo and the name.
 */
export const LobbyCardPreview = ({ image, logo, name, mobile }) => (
  <div
    className="relative shrink-0 overflow-hidden"
    style={{
      width: mobile ? 125 : 160,
      height: mobile ? 168 : 219,
      borderRadius: mobile ? 9 : 10,
    }}
  >
    {image ? (
      <img src={image} alt={name} className="h-full w-full object-cover" />
    ) : (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-[10px] font-bold"
        style={{ color: SITE.text, background: SITE.tile }}
      >
        {logo && <img src={logo} alt="" className="h-[55px] w-[110px] object-contain" />}
        <span>{name || "—"}</span>
      </div>
    )}
  </div>
);

/* Desktop footer provider strip: 70 × 35 colour logos. */
export const FooterLogoPreview = ({ logo, name }) =>
  logo ? (
    <img src={logo} alt={name} title={name} className="h-[35px] w-[70px] shrink-0 object-contain" />
  ) : (
    <span
      className="flex h-[35px] w-[70px] shrink-0 items-center justify-center text-[10px]"
      style={{ color: SITE.text }}
    >
      {name || "—"}
    </span>
  );

/*
 * Game card. Desktop (`.dk-game`) 160 × 216, radius 8, art only, a 28px
 * heart top right. Mobile (`.mb-game`) 121 × 164, radius 11, heart top
 * right and the provider's white logo (44 × 22) on a dark fade at the bottom.
 */
export const GameCardPreview = ({ image, name, vendorLogo, mobile = false }) => (
  <div
    className="relative shrink-0 overflow-hidden"
    title={name}
    style={{
      width: mobile ? 121 : 160,
      height: mobile ? 164 : 216,
      borderRadius: mobile ? 11 : 8,
      background: mobile ? SITE.dark : "rgba(0,0,0,.2)",
    }}
  >
    {image ? (
      <img src={image} alt={name} className="h-full w-full object-cover" />
    ) : (
      <span
        className="absolute inset-0 flex items-center justify-center px-2 text-center text-[11px]"
        style={{ color: SITE.text }}
      >
        {name || "—"}
      </span>
    )}
    <span
      className="absolute flex items-center justify-center rounded-full text-white"
      style={
        mobile
          ? { top: 9, right: 9, width: 24, height: 24 }
          : { top: 10, right: 10, width: 28, height: 28, background: "rgba(255,255,255,.3)" }
      }
    >
      <Heart className={mobile ? "h-5 w-5" : "h-4 w-4"} />
    </span>
    {mobile && vendorLogo && (
      <div
        className="absolute bottom-0 left-0 right-0 flex justify-center pt-[17px]"
        style={{ height: 44, background: `linear-gradient(rgba(0,62,62,0), ${SITE.page})` }}
      >
        <img src={vendorLogo} alt="" className="h-[22px] w-[44px] object-contain" />
      </div>
    )}
  </div>
);
