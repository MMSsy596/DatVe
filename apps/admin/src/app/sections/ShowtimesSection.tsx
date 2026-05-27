"use client";

import { useState } from "react";
import { Card, Field, Sel, Btn, Badge, Table, SectionHeader } from "../components/ui";
import { Item, ShowtimeForm } from "../types";

function formatDate(str: string) {
  if (!str) return "—";
  const d = new Date(str);
  return d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

export function ShowtimesSection({
  movies,
  cinemas,
  rooms,
  showtimes,
  showtimeForm,
  setShowtimeForm,
  onSave,
}: {
  movies: Item[];
  cinemas: Item[];
  rooms: Item[];
  showtimes: Item[];
  showtimeForm: ShowtimeForm;
  setShowtimeForm: React.Dispatch<React.SetStateAction<ShowtimeForm>>;
  onSave: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [filterCinema, setFilterCinema] = useState("");

  const filteredRooms = rooms.filter((r) =>
    showtimeForm.cinemaId ? r.cinema_id === Number(showtimeForm.cinemaId) : true
  );

  const filtered = showtimes.filter((s) =>
    filterCinema ? s.cinema_id === Number(filterCinema) : true
  );

  const statusColor = (s: string) => {
    if (s === "SELLING") return "green" as const;
    if (s === "FULL") return "red" as const;
    if (s === "CANCELLED") return "default" as const;
    return "yellow" as const;
  };

  return (
    <div className="fade-in space-y-6">
      <SectionHeader
        title="🕐 Suất chiếu"
        subtitle={`${showtimes.length} suất trong hệ thống`}
      />

      <div className="grid gap-6 xl:grid-cols-5">
        {/* Form */}
        <Card title="Tạo suất chiếu" className="xl:col-span-2">
          <div className="space-y-3">
            <Sel
              value={showtimeForm.movieId}
              onChange={(e) => setShowtimeForm((p) => ({ ...p, movieId: e.target.value }))}
            >
              <option value="">-- Chọn phim --</option>
              {movies.map((m) => (
                <option key={String(m.id)} value={String(m.id)}>
                  {String(m.title)}
                </option>
              ))}
            </Sel>

            <Sel
              value={showtimeForm.cinemaId}
              onChange={(e) =>
                setShowtimeForm((p) => ({ ...p, cinemaId: e.target.value, roomId: "" }))
              }
            >
              <option value="">-- Chọn rạp --</option>
              {cinemas.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {String(c.name)}
                </option>
              ))}
            </Sel>

            <Sel
              value={showtimeForm.roomId}
              onChange={(e) => setShowtimeForm((p) => ({ ...p, roomId: e.target.value }))}
            >
              <option value="">-- Chọn phòng --</option>
              {filteredRooms.map((r) => (
                <option key={String(r.id)} value={String(r.id)}>
                  {String(r.name)} ({String(r.format_label ?? "")})
                </option>
              ))}
            </Sel>

            <div>
              <p className="mb-1 text-xs" style={{ color: "var(--text-secondary)" }}>Thời gian bắt đầu</p>
              <Field
                type="datetime-local"
                value={showtimeForm.startTime}
                onChange={(e) => setShowtimeForm((p) => ({ ...p, startTime: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Sel
                value={showtimeForm.languageLabel}
                onChange={(e) => setShowtimeForm((p) => ({ ...p, languageLabel: e.target.value }))}
              >
                <option value="Phu de">Phụ đề</option>
                <option value="Thuyet minh">Thuyết minh</option>
                <option value="Long tieng">Lồng tiếng</option>
              </Sel>
              <Sel
                value={showtimeForm.formatLabel}
                onChange={(e) => setShowtimeForm((p) => ({ ...p, formatLabel: e.target.value }))}
              >
                <option value="2D">2D</option>
                <option value="3D">3D</option>
                <option value="4DX">4DX</option>
                <option value="IMAX">IMAX</option>
                <option value="IMAX 3D">IMAX 3D</option>
              </Sel>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1 text-xs" style={{ color: "var(--text-secondary)" }}>Giá vé (₫)</p>
                <Field
                  type="number"
                  value={showtimeForm.basePrice}
                  onChange={(e) => setShowtimeForm((p) => ({ ...p, basePrice: e.target.value }))}
                  placeholder="90000"
                />
              </div>
              <div>
                <p className="mb-1 text-xs" style={{ color: "var(--text-secondary)" }}>Trạng thái</p>
                <Sel
                  value={showtimeForm.status}
                  onChange={(e) => setShowtimeForm((p) => ({ ...p, status: e.target.value }))}
                >
                  <option value="SELLING">Đang bán</option>
                  <option value="FULL">Hết ghế</option>
                  <option value="CANCELLED">Huỷ</option>
                </Sel>
              </div>
            </div>

            <Btn
              onClick={async () => {
                setSaving(true);
                await onSave();
                setSaving(false);
              }}
              disabled={
                saving ||
                !showtimeForm.movieId ||
                !showtimeForm.cinemaId ||
                !showtimeForm.roomId ||
                !showtimeForm.startTime
              }
              variant="primary"
              size="lg"
              className="w-full"
            >
              {saving ? "Đang lưu..." : "🕐 Tạo suất chiếu"}
            </Btn>
          </div>
        </Card>

        {/* List */}
        <div className="xl:col-span-3">
          <Card
            title={`Danh sách suất chiếu (${filtered.length})`}
            action={
              <Sel
                value={filterCinema}
                onChange={(e) => setFilterCinema(e.target.value)}
                style={{ width: 160 }}
              >
                <option value="">Tất cả rạp</option>
                {cinemas.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {String(c.name)}
                  </option>
                ))}
              </Sel>
            }
          >
            <Table
              headers={["Phim", "Rạp / Phòng", "Thời gian", "Giá", "Trạng thái"]}
              emptyText="Chưa có suất chiếu nào"
              rows={filtered.slice(0, 20).map((s) => [
                <div key="movie">
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {String(s.movie_title ?? "—")}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {String(s.format_label ?? "")} · {String(s.language_label ?? "")}
                  </p>
                </div>,
                <div key="cinema">
                  <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                    {String(s.cinema_name ?? "—")}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {String(s.room_name ?? "—")}
                  </p>
                </div>,
                <span key="time" className="text-xs" style={{ color: "var(--accent-gold)" }}>
                  {formatDate(String(s.start_time ?? ""))}
                </span>,
                <span key="price" className="text-xs font-semibold" style={{ color: "var(--accent-green)" }}>
                  {s.base_price ? Number(s.base_price).toLocaleString("vi-VN") + "₫" : "—"}
                </span>,
                <Badge key="status" color={statusColor(String(s.status))}>
                  {String(s.status)}
                </Badge>,
              ])}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
