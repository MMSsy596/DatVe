import Link from "next/link";
import { notFound } from "next/navigation";
import { getPaymentDetail } from "@/lib/payments";

function formatVnd(amount: number) {
  return amount.toLocaleString("vi-VN") + "đ";
}

function formatDateTime(startTime: string | Date | null) {
  if (!startTime) return "—";
  const d = new Date(startTime);
  return d.toLocaleString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Badge hiển thị loại ghế */
const SEAT_TYPE_LABEL: Record<string, string> = {
  STANDARD: "Thường",
  VIP: "VIP",
  COUPLE: "Đôi",
};

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ txnRef: string }>;
}) {
  const { txnRef } = await params;
  const payment = await getPaymentDetail(txnRef);

  if (!payment) {
    notFound();
  }

  const completeBase = `/api/v1/payments/${payment.providerTxnRef}/complete`;

  const seatByType = payment.seats.reduce<Record<string, typeof payment.seats>>(
    (acc, s) => {
      const key = s.seatType ?? "STANDARD";
      if (!acc[key]) acc[key] = [];
      acc[key].push(s);
      return acc;
    },
    {}
  );

  const seatTotal = payment.seats.reduce((sum, s) => sum + s.price, 0);
  const foodTotal = payment.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const originalTotal = seatTotal + foodTotal;
  const discount = payment.discountAmount ?? 0;

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(100,16,16,1) 0%, rgba(8,10,18,1) 58%, rgba(4,5,10,1) 100%)",
        color: "#f8f4ec",
        padding: "32px 20px",
        fontFamily: "'Segoe UI', Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 680,
          margin: "0 auto",
          background: "rgba(13,14,24,0.95)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 28,
          padding: "32px 28px",
          boxShadow: "0 8px 48px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <p style={{ color: "#ffbf47", fontWeight: 800, letterSpacing: 2, fontSize: 11, marginBottom: 8 }}>
          DATVE PAYMENT
        </p>
        <h1 style={{ fontSize: 28, margin: "0 0 6px", fontWeight: 900, lineHeight: 1.2 }}>
          {payment.provider} {payment.mode === "MOCK" ? "Sandbox (Giả lập)" : "Redirect"}
        </h1>
        <p style={{ color: "#b8b0c0", lineHeight: 1.6, fontSize: 14, marginBottom: 28 }}>
          {payment.mode === "MOCK"
            ? "Môi trường local chưa có callback công khai. Nhấn nút bên dưới để giả lập kết quả thanh toán."
            : "VNPAY đã redirect về đây, backend sẽ xử lý callback và mở lại ứng dụng tự động."}
        </p>

        {/* Thông tin phim / suất chiếu */}
        <Section title="🎬 Thông tin suất chiếu">
          <Row label="Mã đặt vé" value={<code style={codeStyle}>{payment.bookingCode}</code>} />
          <Row label="Phim" value={<strong>{payment.movieTitle}</strong>} />
          <Row label="Rạp" value={payment.cinemaName} />
          {payment.roomName && <Row label="Phòng chiếu" value={payment.roomName} />}
          <Row label="Thời gian" value={formatDateTime(payment.startTime)} />
          {payment.formatLabel && <Row label="Định dạng" value={payment.formatLabel} />}
          {payment.languageLabel && <Row label="Ngôn ngữ" value={payment.languageLabel} />}
        </Section>

        {/* Ghế ngồi */}
        {payment.seats.length > 0 && (
          <Section title={`🪑 Ghế ngồi (${payment.seats.length} ghế)`}>
            {Object.entries(seatByType).map(([type, seats]) => (
              <Row
                key={type}
                label={`Ghế ${SEAT_TYPE_LABEL[type] ?? type}`}
                value={
                  <span>
                    {seats.map((s) => (
                      <span key={s.seatCode} style={seatBadgeStyle}>
                        {s.seatCode}
                      </span>
                    ))}
                    <span style={{ color: "#b8b0c0", marginLeft: 6, fontSize: 13 }}>
                      ({formatVnd(seats.reduce((a, s) => a + s.price, 0))})
                    </span>
                  </span>
                }
              />
            ))}
            <Row label="Tiền ghế" value={formatVnd(seatTotal)} highlight />
          </Section>
        )}

        {/* Đồ ăn / uống */}
        {payment.items.length > 0 && (
          <Section title="🍿 Đồ ăn & Nước uống">
            {payment.items.map((item) => (
              <Row
                key={item.name}
                label={`${item.name} × ${item.quantity}`}
                value={formatVnd(item.price * item.quantity)}
              />
            ))}
            <Row label="Tiền bắp nước" value={formatVnd(foodTotal)} highlight />
          </Section>
        )}

        {/* Tổng tiền */}
        <Section title="💳 Tổng thanh toán">
          <Row label="Tạm tính" value={formatVnd(originalTotal)} />
          {discount > 0 && (
            <>
              <Row
                label={`Giảm giá${payment.voucherCode ? ` (${payment.voucherCode})` : ""}`}
                value={<span style={{ color: "#4ade80" }}>- {formatVnd(discount)}</span>}
              />
            </>
          )}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: 10, paddingTop: 10 }}>
            <Row
              label="THÀNH TIỀN"
              value={
                <span style={{ fontSize: 22, fontWeight: 900, color: "#ffbf47" }}>
                  {formatVnd(Number(payment.amount))}
                </span>
              }
            />
          </div>
          {/* Mã giao dịch */}
          <Row
            label="Mã giao dịch"
            value={<code style={{ ...codeStyle, fontSize: 11 }}>{payment.providerTxnRef}</code>}
          />
        </Section>

        {/* Nút hành động */}
        {payment.mode === "MOCK" && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28 }}>
            <Link
              href={`${completeBase}?status=SUCCESS`}
              style={{
                padding: "14px 24px",
                borderRadius: 999,
                background: "linear-gradient(135deg, #17b978, #0d9159)",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 800,
                fontSize: 15,
                boxShadow: "0 4px 20px rgba(23,185,120,0.4)",
              }}
            >
              ✓ Thanh toán thành công
            </Link>
            <Link
              href={`${completeBase}?status=FAILED`}
              style={{
                padding: "14px 24px",
                borderRadius: 999,
                background: "linear-gradient(135deg, #9f1d1d, #7a1212)",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 800,
                fontSize: 15,
                boxShadow: "0 4px 20px rgba(159,29,29,0.4)",
              }}
            >
              ✕ Thanh toán thất bại
            </Link>
          </div>
        )}

        <p style={{ marginTop: 20, color: "#6b657a", fontSize: 12, lineHeight: 1.7 }}>
          Return URL: <code style={{ color: "#8f8997", wordBreak: "break-all" }}>{payment.returnUrl}</code>
        </p>
      </div>
    </main>
  );
}

/* ─── Helper Components ────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16,
        padding: "16px 18px",
        marginBottom: 14,
      }}
    >
      <p style={{ margin: "0 0 12px", fontWeight: 800, fontSize: 13, color: "#8ec5c0", letterSpacing: 0.5 }}>
        {title}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <span style={{ color: highlight ? "#f8f4ec" : "#9c97a8", fontSize: 13, fontWeight: highlight ? 700 : 400, flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontSize: 14, fontWeight: highlight ? 700 : 500, textAlign: "right", wordBreak: "break-word" }}>
        {value}
      </span>
    </div>
  );
}

const codeStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  padding: "2px 8px",
  borderRadius: 6,
  fontSize: 13,
  fontFamily: "monospace",
  color: "#e2cffe",
};

const seatBadgeStyle: React.CSSProperties = {
  display: "inline-block",
  background: "rgba(142,197,192,0.15)",
  border: "1px solid rgba(142,197,192,0.3)",
  color: "#8ec5c0",
  borderRadius: 6,
  padding: "1px 7px",
  fontSize: 13,
  fontWeight: 700,
  marginRight: 4,
};
