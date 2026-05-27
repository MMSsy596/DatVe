"use client";

import { useState } from "react";
import { Card, Field, Sel, Btn, Table, SectionHeader, Badge, Divider } from "../components/ui";
import { Item, CinemaForm, RoomForm } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SeatEditorState = any;

export function CinemasSection({
  cinemas,
  rooms,
  cinemaForm,
  setCinemaForm,
  roomForm,
  setRoomForm,
  seatEditor,
  setSeatEditor,
  onAddCinema,
  onAddRoom,
  onSaveSeatMap,
  requestJson,
}: {
  cinemas: Item[];
  rooms: Item[];
  cinemaForm: CinemaForm;
  setCinemaForm: React.Dispatch<React.SetStateAction<CinemaForm>>;
  roomForm: RoomForm;
  setRoomForm: React.Dispatch<React.SetStateAction<RoomForm>>;
  seatEditor: SeatEditorState;
  setSeatEditor: React.Dispatch<React.SetStateAction<SeatEditorState>>;
  onAddCinema: () => Promise<void>;
  onAddRoom: () => Promise<void>;
  onSaveSeatMap: () => Promise<void>;
  requestJson: (path: string, init?: RequestInit) => Promise<Record<string, unknown>>;
}) {
  const [tab, setTab] = useState<"cinemas" | "rooms" | "seats">("cinemas");
  const [savingCinema, setSavingCinema] = useState(false);
  const [savingRoom, setSavingRoom] = useState(false);
  const [savingSeat, setSavingSeat] = useState(false);

  const tabs = [
    { id: "cinemas" as const, label: "🏢 Rạp", count: cinemas.length },
    { id: "rooms" as const, label: "🎭 Phòng chiếu", count: rooms.length },
    { id: "seats" as const, label: "💺 Seat Map", count: null },
  ];

  return (
    <div className="fade-in space-y-6">
      <SectionHeader
        title="🏢 Rạp & Phòng chiếu"
        subtitle={`${cinemas.length} rạp · ${rooms.length} phòng`}
      />

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl p-1" style={{ background: "var(--bg-secondary)", width: "fit-content" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-all"
            style={
              tab === t.id
                ? { background: "var(--accent)", color: "#fff" }
                : { background: "transparent", color: "var(--text-secondary)" }
            }
          >
            {t.label}
            {t.count !== null && (
              <span
                className="ml-1.5 rounded-full px-1.5 py-0.5 text-xs"
                style={{
                  background: tab === t.id ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.06)",
                }}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Cinemas */}
      {tab === "cinemas" && (
        <div className="grid gap-6 xl:grid-cols-5">
          <Card title="Thêm rạp mới" className="xl:col-span-2">
            <div className="space-y-3">
              <Field
                value={cinemaForm.name}
                onChange={(e) => setCinemaForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Tên rạp (vd: CinePlus Quận 1)"
              />
              <Field
                value={cinemaForm.city}
                onChange={(e) => setCinemaForm((p) => ({ ...p, city: e.target.value }))}
                placeholder="Thành phố"
              />
              <Field
                value={cinemaForm.address}
                onChange={(e) => setCinemaForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="Địa chỉ đầy đủ"
              />
              <Field
                value={cinemaForm.description}
                onChange={(e) => setCinemaForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Mô tả (tùy chọn)"
              />
              <Btn
                onClick={async () => {
                  setSavingCinema(true);
                  await onAddCinema();
                  setSavingCinema(false);
                }}
                disabled={savingCinema || !cinemaForm.name}
                variant="primary"
                size="lg"
                className="w-full"
              >
                {savingCinema ? "Đang lưu..." : "🏢 Thêm rạp"}
              </Btn>
            </div>
          </Card>

          <div className="xl:col-span-3">
            <Card title="Danh sách rạp">
              <Table
                headers={["Tên rạp", "Thành phố", "Địa chỉ", "Phòng"]}
                emptyText="Chưa có rạp nào"
                rows={cinemas.map((c) => {
                  const roomCount = rooms.filter((r) => r.cinema_id === c.id).length;
                  return [
                    <span key="name" className="font-medium" style={{ color: "var(--text-primary)" }}>
                      {String(c.name)}
                    </span>,
                    <Badge key="city" color="blue">{String(c.city ?? "—")}</Badge>,
                    <span key="addr" className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {String(c.address ?? "—")}
                    </span>,
                    <span key="rooms" className="font-semibold" style={{ color: "var(--accent-gold)" }}>
                      {roomCount} phòng
                    </span>,
                  ];
                })}
              />
            </Card>
          </div>
        </div>
      )}

      {/* Tab: Rooms */}
      {tab === "rooms" && (
        <div className="grid gap-6 xl:grid-cols-5">
          <Card title="Thêm phòng chiếu" className="xl:col-span-2">
            <div className="space-y-3">
              <Sel
                value={roomForm.cinemaId}
                onChange={(e) => setRoomForm((p) => ({ ...p, cinemaId: e.target.value }))}
              >
                <option value="">-- Chọn rạp --</option>
                {cinemas.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {String(c.name)}
                  </option>
                ))}
              </Sel>
              <Field
                value={roomForm.name}
                onChange={(e) => setRoomForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Tên phòng (vd: Phòng 1, IMAX Hall)"
              />
              <Sel
                value={roomForm.formatLabel}
                onChange={(e) => setRoomForm((p) => ({ ...p, formatLabel: e.target.value }))}
              >
                <option value="2D">2D Thường</option>
                <option value="2D LUXE">2D LUXE</option>
                <option value="3D">3D</option>
                <option value="4DX">4DX</option>
                <option value="IMAX">IMAX</option>
                <option value="IMAX 3D">IMAX 3D</option>
              </Sel>
              <Btn
                onClick={async () => {
                  setSavingRoom(true);
                  await onAddRoom();
                  setSavingRoom(false);
                }}
                disabled={savingRoom || !roomForm.cinemaId || !roomForm.name}
                variant="primary"
                size="lg"
                className="w-full"
              >
                {savingRoom ? "Đang lưu..." : "🎭 Thêm phòng"}
              </Btn>
            </div>
          </Card>

          <div className="xl:col-span-3">
            <Card title="Danh sách phòng">
              <Table
                headers={["Phòng", "Rạp", "Format", "Ghế"]}
                emptyText="Chưa có phòng nào"
                rows={rooms.map((r) => [
                  <span key="name" className="font-medium" style={{ color: "var(--text-primary)" }}>
                    {String(r.name)}
                  </span>,
                  <span key="cinema" className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {String(r.cinema_name ?? "—")}
                  </span>,
                  <Badge key="format" color="purple">{String(r.format_label ?? "—")}</Badge>,
                  <span key="seats" className="text-xs" style={{ color: "var(--accent-green)" }}>
                    {r.total_seats ? `${r.total_seats} ghế` : "Chưa cấu hình"}
                  </span>,
                ])}
              />
            </Card>
          </div>
        </div>
      )}

      {/* Tab: Seat Map */}
      {tab === "seats" && (
        <Card title="💺 Seat Map Editor" hint="Chọn phòng, chỉnh sơ đồ ghế và lưu lại">
          <div className="space-y-4">
            <Sel
              value={String(seatEditor?.id ?? "")}
              onChange={async (e) => {
                const roomId = Number(e.target.value);
                if (!roomId) return;
                const room = await requestJson(`/rooms/${roomId}/seats`);
                type Seat = { isActive: boolean; rowLabel: string; seatCode: string };
                setSeatEditor({
                  ...room,
                  seatText: (room.seats as Seat[])
                    .filter((s) => s.isActive)
                    .reduce((acc: Record<string, string[]>, seat: Seat) => {
                      (acc[seat.rowLabel] ||= []).push(seat.seatCode);
                      return acc;
                    }, {}),
                });
              }}
            >
              <option value="">-- Chọn phòng để chỉnh sơ đồ ghế --</option>
              {rooms.map((r) => (
                <option key={String(r.id)} value={String(r.id)}>
                  {String(r.cinema_name)} — {String(r.name)}
                </option>
              ))}
            </Sel>

            {seatEditor && (
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <Field
                    value={seatEditor.name}
                    onChange={(e) =>
                      setSeatEditor((p: SeatEditorState) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="Tên phòng"
                  />
                  <Sel
                    value={seatEditor.formatLabel}
                    onChange={(e) =>
                      setSeatEditor((p: SeatEditorState) => ({ ...p, formatLabel: e.target.value }))
                    }
                  >
                    <option value="2D">2D Thường</option>
                    <option value="2D LUXE">2D LUXE</option>
                    <option value="3D">3D</option>
                    <option value="4DX">4DX</option>
                    <option value="IMAX">IMAX</option>
                    <option value="IMAX 3D">IMAX 3D</option>
                  </Sel>
                  <div>
                    <p className="mb-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                      Layout ghế — mỗi dòng là 1 hàng, các ghế cách nhau bằng dấu cách
                    </p>
                    <textarea
                      className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none font-mono"
                      style={{
                        background: "rgba(0,0,0,0.4)",
                        borderColor: "var(--border-light)",
                        color: "var(--accent-green)",
                        minHeight: 180,
                        resize: "vertical",
                      }}
                      value={Object.values(seatEditor.seatText as Record<string, string[]>)
                        .map((row: string[]) => row.join(" "))
                        .join("\n")}
                      onChange={(e) => {
                        const lines = e.target.value.split("\n").map((l) => l.trim()).filter(Boolean);
                        const seats = lines.flatMap((line, rowIdx) =>
                          line.split(/\s+/).map((seatCode, colIdx) => ({
                            seatCode,
                            rowLabel: seatCode.replace(/[0-9]/g, "") || String.fromCharCode(65 + rowIdx),
                            columnIndex: colIdx + 1,
                            seatType: "STANDARD",
                            isActive: true,
                          }))
                        );
                        setSeatEditor((p: SeatEditorState) => ({
                          ...p,
                          seats,
                          seatText: lines.reduce<Record<string, string[]>>(
                            (acc, line, idx) => ({ ...acc, [String.fromCharCode(65 + idx)]: line.split(/\s+/) }),
                            {}
                          ),
                        }));
                      }}
                    />
                  </div>
                  <Btn
                    onClick={async () => {
                      setSavingSeat(true);
                      await onSaveSeatMap();
                      setSavingSeat(false);
                    }}
                    disabled={savingSeat}
                    variant="primary"
                    size="lg"
                    className="w-full"
                  >
                    {savingSeat ? "Đang lưu..." : "💾 Lưu Seat Map"}
                  </Btn>
                </div>

                {/* Preview */}
                <div>
                  <p className="mb-2 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                    Preview sơ đồ ghế
                  </p>
                  <div
                    className="rounded-xl p-4 overflow-auto"
                    style={{ background: "rgba(0,0,0,0.4)", maxHeight: 320 }}
                  >
                    <div
                      className="mb-3 rounded py-1 text-center text-xs font-semibold"
                      style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)" }}
                    >
                      — MÀN HÌNH —
                    </div>
                    {Object.entries(seatEditor.seatText as Record<string, string[]>).map(
                      ([row, seats]) => (
                        <div key={row} className="mb-1 flex items-center gap-1">
                          <span className="w-6 text-center text-xs font-bold" style={{ color: "var(--text-muted)" }}>
                            {row}
                          </span>
                          {(seats as string[]).map((seat, i) => (
                            <div
                              key={i}
                              className="flex h-6 w-6 items-center justify-center rounded text-xs font-medium"
                              style={{ background: "rgba(16,185,129,0.2)", color: "var(--accent-green)" }}
                            >
                              {seat.replace(/[A-Z]/g, "")}
                            </div>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

            {!seatEditor && (
              <div className="py-12 text-center">
                <p className="text-4xl mb-3">💺</p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Chọn một phòng chiếu để bắt đầu chỉnh sơ đồ ghế
                </p>
              </div>
            )}
          </div>
        </Card>
      )}
      <Divider />
    </div>
  );
}
