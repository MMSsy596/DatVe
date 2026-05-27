"use client";

import { useState } from "react";
import { Card, Field, Btn, SectionHeader } from "../components/ui";

export function CheckinSection({
  onCheckin,
}: {
  onCheckin: (qrRaw: string) => Promise<{ bookingCode: string; movieTitle: string; alreadyCheckedIn: boolean }>;
}) {
  const [qrRaw, setQrRaw] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{
    bookingCode: string;
    movieTitle: string;
    alreadyCheckedIn: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<
    { code: string; movie: string; time: string; alreadyChecked: boolean }[]
  >([]);

  const handleCheckin = async () => {
    if (!qrRaw.trim()) return;
    setChecking(true);
    setResult(null);
    setError(null);
    try {
      const res = await onCheckin(qrRaw.trim());
      setResult(res);
      setHistory((prev) =>
        [
          {
            code: res.bookingCode,
            movie: res.movieTitle,
            time: new Date().toLocaleTimeString("vi-VN"),
            alreadyChecked: res.alreadyCheckedIn,
          },
          ...prev,
        ].slice(0, 20)
      );
      setQrRaw("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check-in thất bại");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fade-in space-y-6">
      <SectionHeader
        title="✅ Check-in Vé"
        subtitle="Quét QR hoặc nhập mã booking để check-in"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Check-in form */}
        <Card title="Nhập mã / QR Payload">
          <div className="space-y-4">
            {/* Scanner illustration */}
            <div
              className="flex flex-col items-center justify-center rounded-2xl py-10"
              style={{ background: "rgba(0,0,0,0.3)", border: "2px dashed var(--border-light)" }}
            >
              <div
                className="relative mb-4 flex h-24 w-24 items-center justify-center rounded-2xl"
                style={{ background: "rgba(230,57,70,0.1)", border: "2px solid rgba(230,57,70,0.3)" }}
              >
                {/* QR icon */}
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="7" height="7" rx="1" stroke="var(--accent)" strokeWidth="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1" stroke="var(--accent)" strokeWidth="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1" stroke="var(--accent)" strokeWidth="1.5" />
                  <path d="M14 14h2v2h-2z M18 14h2v2h-2z M14 18h2v2h-2z M18 18h2v2h-2z" fill="var(--accent)" />
                </svg>
                {checking && (
                  <div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background:
                        "linear-gradient(180deg, transparent 40%, rgba(230,57,70,0.4) 50%, transparent 60%)",
                      animation: "scan 1.5s linear infinite",
                    }}
                  />
                )}
              </div>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Sẵn sàng quét vé
              </p>
            </div>

            <Field
              value={qrRaw}
              onChange={(e) => setQrRaw(e.target.value)}
              placeholder="Dán QR payload hoặc mã booking (vd: BK20250527001)"
              onKeyDown={(e) => e.key === "Enter" && handleCheckin()}
              autoFocus
            />

            <Btn
              onClick={handleCheckin}
              disabled={checking || !qrRaw.trim()}
              variant="primary"
              size="lg"
              className="w-full"
            >
              {checking ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="spinner" style={{ width: 16, height: 16 }} />
                  Đang kiểm tra...
                </span>
              ) : (
                "✅ Check-in"
              )}
            </Btn>

            {/* Result */}
            {result && (
              <div
                className="rounded-2xl p-4"
                style={{
                  background: result.alreadyCheckedIn
                    ? "rgba(245,158,11,0.1)"
                    : "rgba(16,185,129,0.1)",
                  border: `1px solid ${result.alreadyCheckedIn ? "rgba(245,158,11,0.3)" : "rgba(16,185,129,0.3)"}`,
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">
                    {result.alreadyCheckedIn ? "⚠️" : "✅"}
                  </span>
                  <div>
                    <p
                      className="font-bold"
                      style={{
                        color: result.alreadyCheckedIn ? "var(--accent-gold)" : "var(--accent-green)",
                      }}
                    >
                      {result.alreadyCheckedIn ? "Đã check-in trước đó!" : "Check-in thành công!"}
                    </p>
                    <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                      {result.bookingCode} — {result.movieTitle}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div
                className="rounded-2xl p-4"
                style={{
                  background: "rgba(230,57,70,0.1)",
                  border: "1px solid rgba(230,57,70,0.3)",
                }}
              >
                <p className="text-sm" style={{ color: "#ff6b75" }}>
                  ❌ {error}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* History */}
        <Card title={`Lịch sử check-in hôm nay (${history.length})`}>
          {history.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Chưa có lượt check-in nào
              </p>
            </div>
          ) : (
            <ul className="space-y-2 max-h-96 overflow-auto">
              {history.map((item, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 rounded-xl p-3"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}
                >
                  <span className="text-lg">{item.alreadyChecked ? "⚠️" : "✅"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                      {item.code}
                    </p>
                    <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                      {item.movie}
                    </p>
                  </div>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {item.time}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {history.length > 0 && (
            <div className="mt-4 flex justify-between">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                ✅ {history.filter((h) => !h.alreadyChecked).length} thành công
                &nbsp;·&nbsp;
                ⚠️ {history.filter((h) => h.alreadyChecked).length} đã check
              </span>
              <button
                onClick={() => setHistory([])}
                className="text-xs"
                style={{ color: "var(--accent)" }}
              >
                Xóa lịch sử
              </button>
            </div>
          )}
        </Card>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(100%); }
        }
      `}</style>
    </div>
  );
}
