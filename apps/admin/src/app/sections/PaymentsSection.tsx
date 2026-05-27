"use client";

import { useState } from "react";
import { Card, Area, Btn, Badge, Table, SectionHeader } from "../components/ui";
import { Item } from "../types";

function formatDate(str: string) {
  if (!str) return "—";
  const d = new Date(str);
  return d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

function formatVND(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M ₫`;
  return value.toLocaleString("vi-VN") + " ₫";
}

// MoMo logo
function MoMoBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold"
      style={{ background: "rgba(174,32,112,0.2)", color: "#d46ca0" }}
    >
      <span
        className="flex h-3 w-3 items-center justify-center rounded-full text-white"
        style={{ background: "#AE2070", fontSize: 8 }}
      >
        M
      </span>
      MoMo
    </span>
  );
}

export function PaymentsSection({
  payments,
  onReview,
}: {
  payments: Item[];
  onReview: (txnRef: string, status: "APPROVED" | "REJECTED", note: string) => Promise<void>;
}) {
  const [reviewNote, setReviewNote] = useState("");
  const [processingRef, setProcessingRef] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterProvider, setFilterProvider] = useState("");

  const filtered = payments.filter((p) => {
    const statusMatch = filterStatus ? p.review_status === filterStatus : true;
    const providerMatch = filterProvider ? String(p.provider).toUpperCase() === filterProvider : true;
    return statusMatch && providerMatch;
  });

  const pending = payments.filter((p) => p.review_status === "PENDING");
  const approved = payments.filter((p) => p.review_status === "APPROVED");
  const rejected = payments.filter((p) => p.review_status === "REJECTED");

  const reviewStatusColor = (s: string) => {
    if (s === "APPROVED") return "green" as const;
    if (s === "REJECTED") return "red" as const;
    return "yellow" as const;
  };

  const providerColor = (p: string) => {
    const up = String(p).toUpperCase();
    if (up.includes("MOMO")) return "purple" as const;
    if (up.includes("VNPAY")) return "blue" as const;
    if (up.includes("COD")) return "yellow" as const;
    return "default" as const;
  };

  const handleReview = async (txnRef: string, status: "APPROVED" | "REJECTED") => {
    setProcessingRef(txnRef);
    await onReview(txnRef, status, reviewNote);
    setProcessingRef(null);
  };

  return (
    <div className="fade-in space-y-6">
      <SectionHeader
        title="💳 Quản lý Thanh toán"
        subtitle="Xét duyệt giao dịch — tích hợp MoMo, VNPay"
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center">
          <p className="text-3xl font-black" style={{ color: "var(--accent-gold)" }}>
            {pending.length}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>⏳ Chờ duyệt</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-black" style={{ color: "var(--accent-green)" }}>
            {approved.length}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>✅ Đã duyệt</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-black" style={{ color: "var(--accent)" }}>
            {rejected.length}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>❌ Từ chối</p>
        </Card>
      </div>

      {/* MoMo banner */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: "linear-gradient(135deg, rgba(174,32,112,0.15), rgba(174,32,112,0.05))",
          border: "1px solid rgba(174,32,112,0.2)",
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-xl font-black text-white"
            style={{ background: "#AE2070" }}
          >
            M
          </div>
          <div className="flex-1">
            <p className="font-bold" style={{ color: "#e091c0" }}>
              Tích hợp thanh toán MoMo
            </p>
            <p className="text-sm" style={{ color: "#d46ca0" }}>
              Xem và duyệt giao dịch MoMo trong danh sách bên dưới. Để kích hoạt cổng thanh toán, cần cấu hình{" "}
              <code
                className="rounded px-1 text-xs"
                style={{ background: "rgba(255,255,255,0.1)" }}
              >
                MOMO_PARTNER_CODE
              </code>{" "}
              trong backend.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge color="purple">Sandbox Ready</Badge>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Cấu hình tại backend</span>
          </div>
        </div>
      </div>

      {/* Review note */}
      {pending.length > 0 && (
        <Card title="📝 Ghi chú khi duyệt" hint="Điền ghi chú trước khi Approve / Reject">
          <Area
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="VD: Đã xác minh giao dịch thành công..."
          />
        </Card>
      )}

      {/* Payment table */}
      <Card
        title={`Danh sách giao dịch (${filtered.length})`}
        action={
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border px-2 py-1.5 text-xs outline-none"
              style={{
                background: "#0d1224",
                borderColor: "var(--border-light)",
                color: "var(--text-primary)",
              }}
            >
              <option value="">Tất cả TT</option>
              <option value="PENDING">Chờ duyệt</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="REJECTED">Từ chối</option>
            </select>
            <select
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value)}
              className="rounded-lg border px-2 py-1.5 text-xs outline-none"
              style={{
                background: "#0d1224",
                borderColor: "var(--border-light)",
                color: "var(--text-primary)",
              }}
            >
              <option value="">Tất cả cổng</option>
              <option value="MOMO">MoMo</option>
              <option value="VNPAY">VNPay</option>
              <option value="COD">COD</option>
            </select>
          </div>
        }
      >
        <Table
          headers={["Booking", "Cổng TT", "Số tiền", "Trạng thái", "Thời gian", "Thao tác"]}
          emptyText="Không có giao dịch nào"
          rows={filtered.slice(0, 25).map((p) => {
            const txnRef = String(p.provider_txn_ref ?? "");
            const isProcessing = processingRef === txnRef;
            return [
              <div key="booking">
                <p className="font-mono text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                  {String(p.booking_code ?? "—")}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  #{String(p.id ?? "")}
                </p>
              </div>,
              <span key="provider">
                {String(p.provider).toUpperCase().includes("MOMO") ? (
                  <MoMoBadge />
                ) : (
                  <Badge color={providerColor(String(p.provider))}>
                    {String(p.provider)}
                  </Badge>
                )}
              </span>,
              <span key="amount" className="font-semibold" style={{ color: "var(--accent-green)" }}>
                {p.amount ? formatVND(Number(p.amount)) : "—"}
              </span>,
              <Badge key="status" color={reviewStatusColor(String(p.review_status))}>
                {String(p.review_status)}
              </Badge>,
              <span key="time" className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {formatDate(String(p.created_at ?? ""))}
              </span>,
              p.review_status === "PENDING" ? (
                <div key="actions" className="flex gap-1.5">
                  <Btn
                    onClick={() => handleReview(txnRef, "APPROVED")}
                    disabled={isProcessing}
                    variant="success"
                    size="sm"
                  >
                    {isProcessing ? "..." : "✅ Duyệt"}
                  </Btn>
                  <Btn
                    onClick={() => handleReview(txnRef, "REJECTED")}
                    disabled={isProcessing}
                    variant="danger"
                    size="sm"
                  >
                    {isProcessing ? "..." : "❌ Từ chối"}
                  </Btn>
                </div>
              ) : (
                <span key="done" className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Đã xử lý
                </span>
              ),
            ];
          })}
        />
      </Card>
    </div>
  );
}
