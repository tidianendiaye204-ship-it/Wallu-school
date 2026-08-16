import React from "react";
import { T } from "../utils/theme";

export function Field({ icon: Icon, label, ...props }: { [key: string]: any; icon?: any; label?: any; }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      <div className="mt-1.5 flex items-center gap-2 rounded-md px-3 py-2.5 border" style={{ borderColor: T.inkLine, background: "#0C1626" }}>
        {Icon && <Icon size={16} className="text-gold" />}
        <input {...props} className="w-full bg-transparent outline-none text-sm placeholder:opacity-40 text-text" />
      </div>
    </label>
  );
}
