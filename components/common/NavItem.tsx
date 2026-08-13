import React from "react";
import { T } from "../utils/theme";

export function NavItem({ icon: Icon, label, active, onClick, badge }: { icon: any; label: string; active: boolean; onClick: () => void; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-md text-sm transition-colors"
      style={{
        background: active ? "rgba(205,164,52,0.12)" : "transparent",
        color: active ? T.gold : T.muted,
      }}
    >
      <div className="flex items-center gap-3">
        <Icon size={16} />
        {label}
      </div>
      {!!badge && badge > 0 && (
        <span className="flex h-5 items-center justify-center rounded-full px-2 text-[10px] font-bold text-white shadow" style={{ background: T.rust }}>
          {badge}
        </span>
      )}
    </button>
  );
}
