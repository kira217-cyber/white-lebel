import React from "react";
import { ListOrdered } from "lucide-react";

/**
 * Number input for an admin-controlled position (game order, provider order).
 * An empty value means "no fixed position" — those rows always render after
 * every numbered one. `conflict` is the row already holding this number, and
 * passing it turns the field into a warning instead of blocking silently.
 */
const OrderField = ({
  label,
  hint,
  value,
  conflict,
  onChange,
  inputClass,
  labelClass,
}) => {
  const conflictName =
    conflict?.providerCode || conflict?.providerName || conflict?.gameUId || "";

  return (
    <div>
      <label className={labelClass}>
        <span className="flex items-center gap-2">
          <ListOrdered className="h-4 w-4 text-cyan-300" />
          {label}
        </span>
      </label>

      <input
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="No position"
        className={`${inputClass} ${
          conflict ? "border-red-400/60 focus:border-red-400/60" : ""
        }`}
      />

      {conflict ? (
        <p className="mt-2 text-xs font-black text-red-300">
          This number is already added to "{conflictName}"
        </p>
      ) : (
        <p className="mt-2 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
};

export default OrderField;
