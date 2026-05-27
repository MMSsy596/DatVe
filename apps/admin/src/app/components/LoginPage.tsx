"use client";

import { useState, useEffect } from "react";
import { GoogleLogin } from "@react-oauth/google";

// ─── SVG Icons ───────────────────────────────────────────────────────────────
function EyeIcon() {
  return (
    <svg
      className="h-5 w-5 text-gray-400 hover:text-gray-200 transition-colors"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      className="h-5 w-5 text-gray-400 hover:text-gray-200 transition-colors"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.024 10.024 0 014.138-4.755m3.07-1.735A10.047 10.047 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-2.24 4.054M9.73 9.73a3 3 0 004.24 4.24m-1.782-4.137l3.754 3.754M21 21l-2-2m-13.5-3.5l-2-2m2-2l-2-2m2-2L3 3"
      />
    </svg>
  );
}

// ─── LoginPage Component ─────────────────────────────────────────────────────
export function LoginPage({
  email,
  setEmail,
  password,
  setPassword,
  onLogin,
  onGoogleIdToken,
  error,
}: {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  onLogin: () => Promise<void>;
  onGoogleIdToken: (idToken: string) => Promise<void>;
  error: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  
  // State ẩn/hiện mật khẩu
  const [showPassword, setShowPassword] = useState(false);
  
  // State Remember me
  const [rememberMe, setRememberMe] = useState(false);
  
  // State quản lý hiển thị thông báo lỗi cục bộ
  const [localError, setLocalError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (loading) return;
    setLoading(true);
    await onLogin();
    setLoading(false);
  };

  // Đồng bộ hóa lỗi từ props và từ googleLogin
  useEffect(() => {
    if (error) {
      setLocalError(error);
    } else if (googleError) {
      setLocalError(googleError);
    } else {
      setLocalError(null);
    }
  }, [error, googleError]);

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 relative overflow-hidden"
      style={{
        background:
          "radial-gradient(circle at 12% 18%, rgba(230,57,70,0.15) 0%, transparent 45%), radial-gradient(circle at 88% 82%, rgba(139,92,246,0.1) 0%, transparent 45%), var(--bg-primary)",
      }}
    >
      {/* Background neon blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden select-none" aria-hidden="true">
        <div
          className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full opacity-15 blur-[120px]"
          style={{ background: "var(--accent)" }}
        />
        <div
          className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full blur-[120px]"
          style={{ background: "var(--accent-purple)", opacity: 0.12 }}
        />
      </div>

      <div className="fade-in relative w-full max-w-[460px] z-10 my-8">
        
        {/* Logo trôi nổi tinh tế phía trên card */}
        <div className="mb-6 flex flex-col items-center justify-center">
          <div
            className="pulse-glow flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-black transition-transform hover:scale-105 border"
            style={{
              background: "linear-gradient(135deg, var(--accent) 0%, #a1141e 100%)",
              color: "#ffffff",
              borderColor: "rgba(255, 255, 255, 0.15)",
              boxShadow: "0 8px 30px rgba(230, 57, 70, 0.35)",
            }}
          >
            C+
          </div>
        </div>

        {/* Main Glassmorphism Card */}
        <div
          className="rounded-3xl p-9 sm:p-10"
          style={{
            background: "rgba(9, 11, 20, 0.86)",
            border: "1px solid rgba(255, 255, 255, 0.07)",
            backdropFilter: "blur(24px)",
            boxShadow: "0 25px 80px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
          }}
        >
          {/* Header Title inside card for robust visual structure */}
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
              Welcome
            </h2>
            <p className="text-xs mt-1.5 font-medium tracking-wide" style={{ color: "var(--text-secondary)" }}>
              Hệ thống quản trị CinePlus — Đăng nhập
            </p>
          </div>

          {/* Custom Error Banner with Close Button */}
          {localError && (
            <div
              className="mb-6 rounded-xl px-4 py-3 text-xs flex items-start justify-between gap-3 animate-[fadeIn_0.3s_ease]"
              style={{
                background: "rgba(230, 57, 70, 0.08)",
                border: "1px solid rgba(230, 57, 70, 0.22)",
                color: "#ff6b75",
                boxShadow: "0 0 15px rgba(230, 57, 70, 0.08)",
              }}
            >
              <div className="flex gap-2">
                <span className="shrink-0">⚠️</span>
                <span className="font-semibold leading-relaxed">{localError}</span>
              </div>
              <button
                onClick={() => {
                  setLocalError(null);
                  setGoogleError(null);
                }}
                className="shrink-0 text-red-400 hover:text-red-200 transition-colors p-0.5 rounded hover:bg-white/5 active:scale-90"
                aria-label="Đóng thông báo"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Google Quick Sign-In */}
          <div className="mb-7">
            <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Đăng nhập nhanh với Google
            </p>

            {googleLoading ? (
              <div
                className="flex w-full items-center justify-center gap-3 rounded-xl py-3 border border-dashed"
                style={{
                  background: "rgba(255, 255, 255, 0.01)",
                  borderColor: "rgba(255, 255, 255, 0.08)",
                }}
              >
                <span className="spinner" style={{ width: 14, height: 14 }} />
                <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                  Xác thực danh tính Google...
                </span>
              </div>
            ) : (
              <div className="flex justify-center w-full min-h-[44px]">
                {/* GoogleLogin renders the official Google button */}
                <GoogleLogin
                  onSuccess={async (credentialResponse) => {
                    setGoogleError(null);
                    if (!credentialResponse.credential) {
                      setGoogleError("Không nhận được mã xác thực từ Google.");
                      return;
                    }
                    setGoogleLoading(true);
                    try {
                      await onGoogleIdToken(credentialResponse.credential);
                    } catch (e) {
                      setGoogleError(e instanceof Error ? e.message : "Đăng nhập Google thất bại");
                    } finally {
                      setGoogleLoading(false);
                    }
                  }}
                  onError={() => {
                    setGoogleError("Kết nối tới Google thất bại. Vui lòng thử lại.");
                  }}
                  theme="filled_black"
                  shape="rectangular"
                  size="large"
                  text="signin_with"
                  width="360"
                />
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="mb-7 flex items-center gap-4">
            <div className="h-px flex-1" style={{ background: "rgba(255, 255, 255, 0.05)" }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              hoặc sử dụng email
            </span>
            <div className="h-px flex-1" style={{ background: "rgba(255, 255, 255, 0.05)" }} />
          </div>

          {/* Credentials Form Layout */}
          <div className="text-left space-y-6">
            
            {/* Email Field with Floating Label */}
            <div className="custom-input-field">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder=" "
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
              <label>Enter your email</label>
            </div>

            {/* Password Field with Floating Label & absolute Eye Button */}
            <div className="custom-input-field relative flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder=" "
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="pr-14"
              />
              <label>Enter your password</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 focus:outline-none p-1.5 rounded-md hover:bg-white/5 active:scale-95 transition-all"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>

            {/* Remember & Forget section (mạch lạc, thoáng đãng) */}
            <div className="custom-forget">
              <label htmlFor="remember" className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <p className="text-xs font-semibold">Remember me</p>
              </label>
              <a href="#" className="text-xs font-semibold">Forgot password?</a>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full rounded-xl py-3.5 text-sm font-bold tracking-wider uppercase transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, var(--accent) 0%, #c72531 100%)",
                color: "#ffffff",
                boxShadow: "0 6px 20px rgba(230, 57, 70, 0.3)",
              }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="spinner" style={{ width: 14, height: 14 }} />
                  Logging in...
                </span>
              ) : (
                "Log In"
              )}
            </button>

            {/* Register redirection */}
            <div className="custom-register">
              <p className="text-xs font-medium">
                Don't have an account?
                <a href="#" className="text-xs font-bold">Register</a>
              </p>
            </div>
          </div>

          {/* Footer note */}
          <p className="mt-8 text-center text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Vùng bảo mật chỉ dành cho nhân sự CinePlus
          </p>
        </div>

        {/* Copyright Footer */}
        <p className="mt-6 text-center text-xs tracking-wider" style={{ color: "var(--text-muted)" }}>
          © 2026 CinePlus. Bảo lưu mọi quyền.
        </p>
      </div>
    </div>
  );
}
