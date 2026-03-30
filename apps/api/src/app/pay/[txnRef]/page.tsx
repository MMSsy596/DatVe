import Link from "next/link";
import { notFound } from "next/navigation";
import { getPaymentDetail } from "@/lib/payments";

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

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(100,16,16,1) 0%, rgba(8,10,18,1) 58%, rgba(4,5,10,1) 100%)",
        color: "#f8f4ec",
        padding: "32px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          background: "rgba(13,14,24,0.92)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 28,
          padding: 28,
        }}
      >
        <p style={{ color: "#ffbf47", fontWeight: 800, letterSpacing: 2, fontSize: 12 }}>
          DATVE PAYMENT
        </p>
        <h1 style={{ fontSize: 34, margin: "12px 0 8px", fontWeight: 900 }}>
          {payment.provider} {payment.mode === "MOCK" ? "Sandbox Mock" : "Redirect"}
        </h1>
        <p style={{ color: "#b8b0c0", lineHeight: 1.6 }}>
          {payment.mode === "MOCK"
            ? "Moi truong local chua co callback cong khai hoac chua du credential. Ban co the mo phong ket qua thanh toan ngay tai day."
            : "Neu VNPAY da redirect ve day, backend se xu ly callback va mo lai app tu dong."}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
            marginTop: 24,
          }}
        >
          {[
            ["Booking", payment.bookingCode],
            ["Phim", payment.movieTitle],
            ["Rap", payment.cinemaName],
            ["Tong tien", `${Number(payment.amount).toLocaleString("vi-VN")}d`],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 20,
                padding: 16,
              }}
            >
              <div style={{ color: "#8ec5c0", fontSize: 12, fontWeight: 700 }}>{label}</div>
              <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800 }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28 }}>
          <Link
            href={`${completeBase}?status=SUCCESS`}
            style={{
              padding: "14px 18px",
              borderRadius: 999,
              background: "#17b978",
              color: "#fff",
              textDecoration: "none",
              fontWeight: 800,
            }}
          >
            Thanh toan thanh cong
          </Link>
          <Link
            href={`${completeBase}?status=FAILED`}
            style={{
              padding: "14px 18px",
              borderRadius: 999,
              background: "#9f1d1d",
              color: "#fff",
              textDecoration: "none",
              fontWeight: 800,
            }}
          >
            Thanh toan that bai
          </Link>
        </div>

        <p style={{ marginTop: 18, color: "#8f8997", fontSize: 13, lineHeight: 1.7 }}>
          Return URL hien tai: {payment.returnUrl}
        </p>
      </div>
    </main>
  );
}
