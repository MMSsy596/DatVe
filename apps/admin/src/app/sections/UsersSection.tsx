"use client";

import { useState } from "react";
import { Card, SectionHeader, Badge, Btn } from "../components/ui";
import { Item } from "../types";

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "var(--accent)",
  STAFF: "var(--accent-gold)",
  USER: "var(--text-muted)",
};

export function UsersSection({
  users,
  onChangeRole,
}: {
  users: Item[];
  onChangeRole: (userId: number, role: string) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      String(u.full_name ?? "").toLowerCase().includes(q) ||
      String(u.email ?? "").toLowerCase().includes(q) ||
      String(u.role ?? "").toLowerCase().includes(q)
    );
  });

  const admins = users.filter((u) => u.role === "ADMIN").length;
  const staff = users.filter((u) => u.role === "STAFF").length;
  const normalUsers = users.filter((u) => u.role === "USER").length;

  return (
    <div className="fade-in space-y-6">
      <SectionHeader
        title="👤 Quản lý người dùng"
        subtitle={`${users.length} tài khoản — ${admins} Admin · ${staff} Staff · ${normalUsers} User`}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Admin", count: admins, color: "var(--accent)" },
          { label: "Staff", count: staff, color: "var(--accent-gold)" },
          { label: "User", count: normalUsers, color: "var(--accent-green)" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl p-4 text-center"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}
          >
            <p className="text-3xl font-black" style={{ color: s.color }}>{s.count}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      <Card title="Danh sách tài khoản">
        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Tìm theo tên, email, role..."
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--border-light)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        <div className="space-y-2 max-h-[520px] overflow-auto">
          {filtered.map((user) => {
            const uid = Number(user.id);
            return (
              <div
                key={uid}
                className="flex items-center gap-3 rounded-xl p-3"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}
              >
                {/* Avatar */}
                {user.avatar_url ? (
                  <img
                    src={String(user.avatar_url)}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover flex-shrink-0"
                    style={{ border: "2px solid var(--border-light)" }}
                  />
                ) : (
                  <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold"
                    style={{ background: "rgba(230,57,70,0.15)", color: "var(--accent)" }}
                  >
                    {String(user.full_name ?? "?")[0]?.toUpperCase()}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                    {String(user.full_name ?? "—")}
                  </p>
                  <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                    {String(user.email ?? "—")}
                  </p>
                </div>

                {/* Role badge */}
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-bold flex-shrink-0"
                  style={{
                    background: `${ROLE_COLORS[String(user.role)] ?? "var(--border)"}22`,
                    color: ROLE_COLORS[String(user.role)] ?? "var(--text-muted)",
                    border: `1px solid ${ROLE_COLORS[String(user.role)] ?? "var(--border)"}44`,
                  }}
                >
                  {String(user.role)}
                </span>

                {/* Role changer */}
                <select
                  value={String(user.role)}
                  disabled={loadingId === uid}
                  onChange={async (e) => {
                    setLoadingId(uid);
                    await onChangeRole(uid, e.target.value);
                    setLoadingId(null);
                  }}
                  className="rounded-lg px-2 py-1.5 text-xs outline-none flex-shrink-0"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid var(--border-light)",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                  }}
                >
                  <option value="USER">USER</option>
                  <option value="STAFF">STAFF</option>
                  <option value="ADMIN">ADMIN</option>
                </select>

                {loadingId === uid && (
                  <span className="spinner flex-shrink-0" style={{ width: 14, height: 14 }} />
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-3xl mb-2">🔍</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Không tìm thấy user nào</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
