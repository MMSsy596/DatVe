"use client";

import { useEffect, useState } from "react";
import { Badge, Card, StatCard } from "../components/ui";
import { Item, Stats } from "../types";

function formatVND(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B ₫`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M ₫`;
  return value.toLocaleString("vi-VN") + " ₫";
}

function LineChart() {
  const points = [
    { time: "08:00", val: 18 },
    { time: "10:00", val: 48 },
    { time: "12:00", val: 86 },
    { time: "14:00", val: 62 },
    { time: "16:00", val: 112 },
    { time: "18:00", val: 156 },
    { time: "20:00", val: 190 },
    { time: "22:00", val: 134 },
    { time: "00:00", val: 42 },
  ];
  const width = 900;
  const height = 320;
  const padding = 42;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const maxVal = 210;
  const coords = points.map((p, idx) => ({
    ...p,
    x: padding + (idx / (points.length - 1)) * chartWidth,
    y: padding + chartHeight - (p.val / maxVal) * chartHeight,
  }));
  const pathD = coords.reduce((acc, c, idx) => (idx === 0 ? `M ${c.x} ${c.y}` : `${acc} L ${c.x} ${c.y}`), "");
  const areaD = `${pathD} L ${coords.at(-1)?.x} ${padding + chartHeight} L ${coords[0].x} ${padding + chartHeight} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full overflow-visible">
      <defs>
        <linearGradient id="ticketArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const y = padding + chartHeight * pct;
        return <line key={pct} x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.07)" strokeDasharray="4 8" />;
      })}
      <path d={areaD} fill="url(#ticketArea)" />
      <path d={pathD} fill="none" stroke="var(--accent)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
      {coords.map((c) => (
        <g key={c.time}>
          <circle cx={c.x} cy={c.y} r="6" fill="#11131d" stroke="var(--accent)" strokeWidth="3" />
          <text x={c.x} y={height - 8} textAnchor="middle" fill="var(--text-muted)" className="text-xs font-semibold">
            {c.time}
          </text>
        </g>
      ))}
    </svg>
  );
}

function RevenueBars() {
  const cinemas = [
    { name: "Hùng Vương", val: 120 },
    { name: "3 Tháng 2", val: 154 },
    { name: "Quang Trung", val: 98 },
    { name: "Thảo Điền", val: 65 },
    { name: "Royal City", val: 110 },
  ];
  const max = Math.max(...cinemas.map((c) => c.val));

  return (
    <div className="space-y-4">
      {cinemas.map((cinema) => (
        <div key={cinema.name} className="grid grid-cols-[110px_1fr_72px] items-center gap-4">
          <span className="truncate text-sm font-semibold text-slate-300">{cinema.name}</span>
          <div className="h-4 overflow-hidden rounded-full border border-white/[0.06] bg-black/30">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(cinema.val / max) * 100}%`,
                background: "linear-gradient(90deg, var(--accent), #ff7b84)",
                boxShadow: "0 0 18px rgba(230, 57, 70, 0.28)",
              }}
            />
          </div>
          <span className="text-right text-sm font-bold text-red-300">{cinema.val}M</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart() {
  const items = [
    { label: "IMAX", value: 45, color: "#ef4444" },
    { label: "2D LUXE", value: 30, color: "#b91c1c" },
    { label: "3D", value: 15, color: "#f87171" },
    { label: "2D", value: 10, color: "#7f1d1d" },
  ];
  const r = 44;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-8 md:flex-row">
      <div className="relative flex h-48 w-48 items-center justify-center">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="13" />
          {items.map((item) => {
            const dash = (item.value / 100) * circ;
            const circle = (
              <circle
                key={item.label}
                cx="60"
                cy="60"
                r={r}
                fill="none"
                stroke={item.color}
                strokeDasharray={`${dash} ${circ}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                strokeWidth="13"
              />
            );
            offset += dash;
            return circle;
          })}
        </svg>
        <div className="absolute text-center">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Lấp đầy</p>
          <p className="mt-1 text-3xl font-black text-white">78%</p>
        </div>
      </div>
      <div className="grid flex-1 gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
            <span className="flex items-center gap-3 text-sm font-semibold text-slate-300">
              <span className="h-3 w-3 rounded-full" style={{ background: item.color }} />
              {item.label}
            </span>
            <span className="text-sm font-black text-white">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoomHeatmap() {
  const rooms = Array.from({ length: 24 }, (_, idx) => {
    const occupancy = [88, 72, 55, 0, 94, 0, 61, 42, 85, 78, 50, 66, 0, 90, 49, 0, 68, 91, 52, 40, 70, 58, 0, 95][idx];
    const inactive = occupancy === 0;
    return {
      name: `P${idx + 1}`,
      occupancy,
      status: inactive ? (idx % 2 ? "Bảo trì" : "Dọn dẹp") : "Đang chiếu",
    };
  });

  return (
    <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
      {rooms.map((room) => {
        const high = room.occupancy >= 85;
        const active = room.occupancy > 0;
        return (
          <div
            key={room.name}
            className="rounded-2xl border p-3"
            style={{
              background: active ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.018)",
              borderColor: high ? "rgba(230,57,70,0.32)" : "rgba(255,255,255,0.07)",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-white">{room.name}</span>
              <span className={`h-2 w-2 rounded-full ${active ? "bg-emerald-400" : "bg-slate-600"}`} />
            </div>
            <p className="mt-4 text-xs text-slate-500">{room.status}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/35">
              <div className="h-full rounded-full bg-red-500" style={{ width: `${room.occupancy}%` }} />
            </div>
            <p className="mt-2 text-right text-xs font-bold text-slate-300">{room.occupancy}%</p>
          </div>
        );
      })}
    </div>
  );
}

const LOG_TEMPLATES = [
  { level: "Thành công", tag: "Vé", text: "Đặt vé mới #[NUM] tại CinePlus Hùng Vương" },
  { level: "Phòng", tag: "Rạp", text: "Phòng [ROOM] đạt [PCT]% lấp đầy" },
  { level: "Thanh toán", tag: "Duyệt", text: "Giao dịch [REF] đang chờ xác minh" },
  { level: "Đồng bộ", tag: "API", text: "Danh mục phim phản hồi trong [MS]ms" },
];

export function DashboardSection({
  stats,
  rooms,
  payments,
}: {
  stats: Stats | null;
  rooms: Item[];
  payments: Item[];
}) {
  const [logs, setLogs] = useState<Array<{ time: string; level: string; tag: string; text: string }>>([]);

  useEffect(() => {
    const createLog = () => {
      const template = LOG_TEMPLATES[Math.floor(Math.random() * LOG_TEMPLATES.length)];
      return {
        time: new Date().toLocaleTimeString("vi-VN"),
        level: template.level,
        tag: template.tag,
        text: template.text
          .replace("[NUM]", String(Math.floor(1000 + Math.random() * 9000)))
          .replace("[ROOM]", String(Math.floor(1 + Math.random() * 12)))
          .replace("[PCT]", String(Math.floor(45 + Math.random() * 50)))
          .replace("[REF]", `TXN-${Math.floor(200000 + Math.random() * 800000)}`)
          .replace("[MS]", String(Math.floor(20 + Math.random() * 120))),
      };
    };

    setLogs(Array.from({ length: 6 }, createLog));
    const interval = setInterval(() => setLogs((prev) => [...prev.slice(1), createLog()]), 4500);
    return () => clearInterval(interval);
  }, []);

  if (!stats) return null;

  const pendingCount = payments.filter((p) => p.review_status === "PENDING").length;

  return (
    <div className="fade-in space-y-8 pb-16">
      <div
        className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(230,57,70,0.22),rgba(20,23,34,0.92)_42%,rgba(12,14,21,0.96))] shadow-[0_24px_80px_rgba(0,0,0,0.36)]"
        style={{ padding: "clamp(34px, 3vw, 52px)" }}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white lg:text-5xl">
              Bảng điều hành CinePlus
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">
              Theo dõi doanh thu, lượng vé, hiệu suất phòng chiếu và giao dịch cần xử lý trên cùng một màn hình.
            </p>
          </div>
          <div className="grid min-w-[300px] grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/[0.09] bg-black/20 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Doanh thu hôm nay</p>
              <p className="mt-2 text-2xl font-black text-white">{formatVND(stats.todayRevenue ?? 0)}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.09] bg-black/20 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Chờ duyệt</p>
              <p className="mt-2 text-2xl font-black text-red-200">{pendingCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Phim đang chiếu" value={stats.movies} icon="▶" color="var(--accent)" sub="Danh mục đang mở bán" />
        <StatCard label="Rạp vận hành" value={stats.cinemas} icon="▦" color="#60a5fa" sub="Cụm rạp đang hoạt động" />
        <StatCard label="Phòng active" value={rooms.length} icon="▤" color="#10b981" sub="Sẵn sàng phục vụ" />
        <StatCard label="Suất chiếu" value={stats.showtimes} icon="◷" color="#fbbf24" sub="Lịch bán vé hiện tại" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <Card title="Xu hướng vé bán ra trong ngày" hint="Đường biểu diễn giúp nhận biết nhanh khung giờ cao điểm.">
          <LineChart />
        </Card>
        <Card title="Doanh thu theo rạp" hint="So sánh đóng góp doanh thu giữa các cụm rạp.">
          <RevenueBars />
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Tỷ lệ lấp đầy theo định dạng" hint="Cơ cấu khai thác phòng theo IMAX, 2D LUXE, 3D và 2D.">
          <DonutChart />
        </Card>
        <Card title="Trạng thái phòng chiếu" hint="Heatmap giúp phát hiện nhanh phòng tải cao hoặc đang nghỉ.">
          <RoomHeatmap />
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <Card title="Doanh thu thống kê" hint="Tổng hợp doanh thu theo ngày, tuần và toàn hệ thống.">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Hôm nay", value: formatVND(stats.todayRevenue ?? 0), change: "+12.4%" },
              { label: "Tuần này", value: formatVND(stats.weekRevenue ?? 0), change: "+8.2%" },
              { label: "Tổng cộng", value: formatVND(stats.revenue ?? 0), change: "Đã đồng bộ" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
                <p className="mt-3 text-2xl font-black text-white">{item.value}</p>
                <p className="mt-2 text-sm font-semibold text-red-300">{item.change}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-4">
            {[
              { label: "Vé xem phim", pct: 65 },
              { label: "F&B combo", pct: 25 },
              { label: "Voucher / giảm giá", pct: 10 },
            ].map((item) => (
              <div key={item.label} className="grid grid-cols-[120px_1fr_48px] items-center gap-4">
                <span className="text-sm font-semibold text-slate-400">{item.label}</span>
                <div className="h-3 overflow-hidden rounded-full bg-black/35">
                  <div className="h-full rounded-full bg-red-500" style={{ width: `${item.pct}%` }} />
                </div>
                <span className="text-right text-sm font-bold text-slate-300">{item.pct}%</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Top phim doanh thu" hint="Các phim đang đóng góp doanh thu tốt nhất.">
          {stats.topMovies.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa ghi nhận dữ liệu trong ca trực.</p>
          ) : (
            <ul className="space-y-3">
              {stats.topMovies.slice(0, 5).map((movie, i) => (
                <li key={i} className="flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-sm font-black text-red-200">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-200">{movie.title}</span>
                  <span className="text-sm font-black text-white">{formatVND(movie.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Nhật ký vận hành realtime" hint="Luồng sự kiện mới nhất từ đặt vé, thanh toán và đồng bộ dữ liệu.">
        <div className="terminal-container max-h-[360px] overflow-y-auto rounded-2xl">
          <div className="space-y-3">
            {logs.map((log, i) => (
              <div key={`${log.time}-${i}`} className="terminal-line items-center">
                <span className="w-20 shrink-0 text-xs font-semibold text-slate-500">{log.time}</span>
                <Badge color={log.level === "Thanh toán" ? "red" : "default"}>{log.tag}</Badge>
                <span className="flex-1 text-sm font-medium text-slate-300">{log.text}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
