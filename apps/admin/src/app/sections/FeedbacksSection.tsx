"use client";

import { useState } from "react";
import {
  Card,
  Area,
  Sel,
  Btn,
  Badge,
  Table,
  SectionHeader,
  Divider,
} from "../components/ui";
import { FeedbackItem } from "../types";

const TYPE_LABELS: Record<string, string> = {
  SERVICE: "Dịch vụ",
  CINEMA: "Rạp",
  TICKET: "Vé",
  OTHER: "Khác",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Chờ xử lý",
  PROCESSING: "Đang xử lý",
  RESOLVED: "Đã giải quyết",
  REJECTED: "Từ chối",
};

type StatusColor = "yellow" | "blue" | "green" | "red" | "default";

const statusColor = (s: string): StatusColor => {
  if (s === "PENDING") return "yellow";
  if (s === "PROCESSING") return "blue";
  if (s === "RESOLVED") return "green";
  if (s === "REJECTED") return "red";
  return "default";
};

const typeColor = (t: string): StatusColor => {
  if (t === "SERVICE") return "blue";
  if (t === "CINEMA") return "yellow";
  if (t === "TICKET") return "green";
  return "default";
};

export function FeedbacksSection({
  feedbacks,
  onRespond,
  onReload,
}: {
  feedbacks: FeedbackItem[];
  onRespond: (
    id: number,
    response: string,
    status: "PROCESSING" | "RESOLVED" | "REJECTED"
  ) => Promise<void>;
  onReload: () => Promise<void>;
}) {
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [selected, setSelected] = useState<FeedbackItem | null>(null);
  const [response, setResponse] = useState("");
  const [newStatus, setNewStatus] = useState<"PROCESSING" | "RESOLVED" | "REJECTED">(
    "PROCESSING"
  );
  const [submitting, setSubmitting] = useState(false);

  const filtered = feedbacks.filter((f) => {
    if (filterStatus && f.status !== filterStatus) return false;
    if (filterType && f.type !== filterType) return false;
    return true;
  });

  const pendingCount = feedbacks.filter((f) => f.status === "PENDING").length;
  const resolvedCount = feedbacks.filter((f) => f.status === "RESOLVED").length;
  const processingCount = feedbacks.filter((f) => f.status === "PROCESSING").length;

  const openDetail = (fb: FeedbackItem) => {
    setSelected(fb);
    setResponse(fb.responseContent ?? "");
    setNewStatus(
      fb.status === "PENDING" || fb.status === "PROCESSING"
        ? "RESOLVED"
        : "RESOLVED"
    );
  };

  const handleSubmit = async () => {
    if (!selected || !response.trim()) return;
    setSubmitting(true);
    try {
      await onRespond(selected.id, response.trim(), newStatus);
      await onReload();
      setSelected(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fade-in space-y-6">
      <SectionHeader
        title="✉ Góp ý khách hàng"
        subtitle={`${feedbacks.length} góp ý — ${pendingCount} chờ xử lý`}
      />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Chờ xử lý", count: pendingCount, color: "#f59e0b" },
          { label: "Đang xử lý", count: processingCount, color: "#3b82f6" },
          { label: "Đã giải quyết", count: resolvedCount, color: "#10b981" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border p-5 text-center"
            style={{
              background: `rgba(${s.color === "#f59e0b" ? "245,158,11" : s.color === "#3b82f6" ? "59,130,246" : "16,185,129"},0.06)`,
              borderColor: `rgba(${s.color === "#f59e0b" ? "245,158,11" : s.color === "#3b82f6" ? "59,130,246" : "16,185,129"},0.15)`,
            }}
          >
            <p className="text-3xl font-black" style={{ color: s.color }}>
              {s.count}
            </p>
            <p className="mt-1 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <div className={`grid gap-6 ${selected ? "xl:grid-cols-5" : ""}`}>
        {/* Table */}
        <div className={selected ? "xl:col-span-3" : ""}>
          <Card
            title={`Danh sách góp ý (${filtered.length})`}
            action={
              <div className="flex gap-2">
                <Sel
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{ width: 140 }}
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="PENDING">Chờ xử lý</option>
                  <option value="PROCESSING">Đang xử lý</option>
                  <option value="RESOLVED">Đã giải quyết</option>
                  <option value="REJECTED">Từ chối</option>
                </Sel>
                <Sel
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  style={{ width: 120 }}
                >
                  <option value="">Tất cả loại</option>
                  <option value="SERVICE">Dịch vụ</option>
                  <option value="CINEMA">Rạp</option>
                  <option value="TICKET">Vé</option>
                  <option value="OTHER">Khác</option>
                </Sel>
              </div>
            }
          >
            <Table
              headers={["Khách hàng", "Loại", "Tiêu đề", "Rạp", "Trạng thái", "Ngày"]}
              emptyText="Chưa có góp ý nào"
              rows={filtered.map((fb) => [
                <div key="customer">
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {fb.customerName}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {fb.customerEmail}
                  </p>
                </div>,
                <Badge key="type" color={typeColor(fb.type)}>
                  {TYPE_LABELS[fb.type] ?? fb.type}
                </Badge>,
                <div key="title">
                  <p
                    className="max-w-[180px] cursor-pointer truncate text-sm font-medium hover:underline"
                    style={{ color: "var(--text-primary)" }}
                    onClick={() => openDetail(fb)}
                  >
                    {fb.title}
                  </p>
                </div>,
                <span key="cinema" className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {fb.cinemaName ?? "—"}
                </span>,
                <Badge key="status" color={statusColor(fb.status)}>
                  {STATUS_LABELS[fb.status] ?? fb.status}
                </Badge>,
                <span key="date" className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {new Date(fb.createdAt).toLocaleDateString("vi-VN")}
                </span>,
              ])}
            />
          </Card>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="xl:col-span-2">
            <Card
              title="Chi tiết góp ý"
              action={
                <button
                  onClick={() => setSelected(null)}
                  className="rounded-lg px-3 py-1 text-xs font-semibold transition-all"
                  style={{ color: "var(--text-secondary)", background: "var(--surface-2)" }}
                >
                  ✕ Đóng
                </button>
              }
            >
              <div className="space-y-4">
                {/* Customer info */}
                <div
                  className="rounded-xl border p-4"
                  style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
                >
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    Khách hàng
                  </p>
                  <p className="mt-1.5 font-semibold" style={{ color: "var(--text-primary)" }}>
                    {selected.customerName}
                  </p>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {selected.customerEmail}
                  </p>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="rounded-xl border p-3"
                    style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
                  >
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Loại góp ý</p>
                    <p className="mt-1 font-semibold" style={{ color: "var(--text-primary)" }}>
                      {TYPE_LABELS[selected.type]}
                    </p>
                  </div>
                  <div
                    className="rounded-xl border p-3"
                    style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
                  >
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Rạp</p>
                    <p className="mt-1 font-semibold" style={{ color: "var(--text-primary)" }}>
                      {selected.cinemaName ?? "—"}
                    </p>
                  </div>
                  {selected.bookingCode && (
                    <div
                      className="col-span-2 rounded-xl border p-3"
                      style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
                    >
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Mã đặt vé</p>
                      <p className="mt-1 font-mono font-bold" style={{ color: "var(--accent)" }}>
                        {selected.bookingCode}
                      </p>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div
                  className="rounded-xl border p-4"
                  style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
                >
                  <p className="mb-1.5 text-xs font-bold" style={{ color: "var(--text-muted)" }}>
                    {selected.title}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
                    {selected.content}
                  </p>
                </div>

                {/* Image preview */}
                {selected.imageUrl && (
                  <img
                    src={selected.imageUrl}
                    alt="Ảnh đính kèm"
                    className="w-full rounded-xl object-cover"
                    style={{ maxHeight: 200 }}
                  />
                )}

                <Divider />

                {/* Response form */}
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    Phản hồi
                  </p>

                  <div>
                    <p className="mb-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                      Cập nhật trạng thái
                    </p>
                    <Sel
                      value={newStatus}
                      onChange={(e) =>
                        setNewStatus(e.target.value as "PROCESSING" | "RESOLVED" | "REJECTED")
                      }
                    >
                      <option value="PROCESSING">Đang xử lý</option>
                      <option value="RESOLVED">Đã giải quyết</option>
                      <option value="REJECTED">Từ chối</option>
                    </Sel>
                  </div>

                  <Area
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Nhập nội dung phản hồi cho khách hàng..."
                    rows={4}
                  />

                  <Btn
                    onClick={handleSubmit}
                    disabled={submitting || !response.trim()}
                    variant="primary"
                    size="lg"
                    className="w-full"
                  >
                    {submitting ? "Đang gửi..." : "✉ Gửi phản hồi"}
                  </Btn>
                </div>

                {/* Previous response */}
                {selected.responseContent && (
                  <div
                    className="rounded-xl border p-4"
                    style={{
                      borderColor: "rgba(16,185,129,0.2)",
                      background: "rgba(16,185,129,0.05)",
                    }}
                  >
                    <p className="mb-1 text-xs font-bold uppercase tracking-wider" style={{ color: "#10b981" }}>
                      Phản hồi trước đó
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
                      {selected.responseContent}
                    </p>
                    {selected.respondedAt && (
                      <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
                        {new Date(selected.respondedAt).toLocaleString("vi-VN")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
      <Divider />
    </div>
  );
}
