"use client";

import { ActiveSection } from "../types";

type MenuItem = {
  id: ActiveSection;
  label: string;
  icon: string;
  badge?: number;
};

const MENU_ITEMS: MenuItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "⌁" },
  { id: "movies", label: "Phim", icon: "▶" },
  { id: "cinemas", label: "Rạp & Phòng", icon: "▦" },
  { id: "showtimes", label: "Suất chiếu", icon: "◷" },
  { id: "food", label: "F&B", icon: "◌" },
  { id: "vouchers", label: "Voucher", icon: "%" },
  { id: "payments", label: "Thanh toán", icon: "₫" },
  { id: "checkin", label: "Check-in", icon: "✓" },
  { id: "banners", label: "Banners", icon: "▱" },
  { id: "users", label: "Người dùng", icon: "◎" },
  { id: "feedbacks", label: "Góp ý", icon: "✉" },
];

export function Sidebar({
  active,
  onNavigate,
  user,
  onLogout,
  pendingPayments,
  pendingFeedbacks,
}: {
  active: ActiveSection;
  onNavigate: (s: ActiveSection) => void;
  user: { fullName: string; role: string } | null;
  onLogout: () => void;
  pendingPayments?: number;
  pendingFeedbacks?: number;
}) {
  return (
    <aside
      className="fixed left-0 top-0 h-full flex flex-col z-40"
      style={{
        width: "var(--sidebar-width)",
        background: "linear-gradient(180deg, rgba(9, 10, 16, 0.98), rgba(5, 6, 10, 0.98))",
        borderRight: "1px solid rgba(255, 255, 255, 0.08)",
        backdropFilter: "blur(24px)",
      }}
    >
      <div className="flex items-center gap-4 border-b border-white/[0.07] px-7 py-8">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl border text-2xl font-black transition-transform hover:scale-105"
          style={{
            background: "linear-gradient(135deg, var(--accent) 0%, #a1141e 100%)",
            color: "#ffffff",
            borderColor: "rgba(255, 255, 255, 0.15)",
          }}
        >
          C+
        </div>
        <div>
          <p className="text-2xl font-black tracking-tight text-slate-100">
            CinePlus
          </p>
          <p className="mt-1.5 text-xs font-semibold tracking-[0.18em] text-red-400 uppercase">
            Admin Center
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-5 py-7">
        <p
          className="mb-5 px-4 text-xs font-bold tracking-[0.18em] uppercase text-slate-500"
        >
          Điều hướng
        </p>
        <ul className="space-y-2.5">
          {MENU_ITEMS.map((item) => {
            const isActive = active === item.id;
            const hasBadge =
              (item.id === "payments" && pendingPayments && pendingPayments > 0) ||
              (item.id === "feedbacks" && pendingFeedbacks && pendingFeedbacks > 0);
            const badgeCount =
              item.id === "payments" ? pendingPayments : pendingFeedbacks;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-transparent px-5 py-4 text-base font-semibold transition-all duration-200"
                  style={
                    isActive
                      ? {
                          background: "linear-gradient(135deg, rgba(230, 57, 70, 0.18), rgba(230, 57, 70, 0.06))",
                          color: "#fff",
                          borderColor: "rgba(230, 57, 70, 0.28)",
                          boxShadow: "0 14px 34px rgba(230, 57, 70, 0.10)",
                        }
                      : {
                          background: "rgba(255, 255, 255, 0.015)",
                          color: "var(--text-secondary)",
                        }
                  }
                >
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-black transition-transform group-hover:scale-105"
                    style={{
                      background: isActive ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.055)",
                      color: isActive ? "#fff" : "var(--accent)",
                    }}
                  >
                    {item.icon}
                  </span>
                  <span className="flex-1 text-left">{item.label}</span>
                  
                  {hasBadge && (
                    <span
                      className="flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-black"
                      style={{
                        background: "var(--accent)",
                        color: "#fff",
                        boxShadow: "0 0 10px rgba(230,57,70,0.5)",
                      }}
                    >
                      {badgeCount}
                    </span>
                  )}
                  
                  {isActive && (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        background: "var(--accent)",
                        boxShadow: "0 0 8px var(--accent)",
                      }}
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/[0.07] px-5 py-6">
        {user && (
          <div
            className="mb-4 flex items-center gap-3.5 rounded-2xl border p-4"
            style={{
              background: "rgba(255, 255, 255, 0.01)",
              borderColor: "rgba(255, 255, 255, 0.08)",
            }}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-black uppercase"
              style={{
                background: "linear-gradient(135deg, var(--accent) 0%, #a1141e 100%)",
                color: "#ffffff",
                boxShadow: "0 0 12px rgba(230, 57, 70, 0.25)",
              }}
            >
              {user.fullName?.charAt(0) ?? "A"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold text-slate-200">
                {user.fullName}
              </p>
              <p className="mt-1 truncate text-xs font-semibold tracking-[0.12em] text-red-400 uppercase">
                {user.role}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border px-5 py-4 text-base font-bold transition-all duration-200"
          style={{
            background: "rgba(230, 57, 70, 0.04)",
            borderColor: "rgba(230, 57, 70, 0.15)",
            color: "#ff6b75",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(230, 57, 70, 0.08)";
            e.currentTarget.style.boxShadow = "0 0 10px rgba(230, 57, 70, 0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(230, 57, 70, 0.04)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <span>↪</span>
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
