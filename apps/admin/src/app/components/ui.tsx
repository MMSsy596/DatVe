"use client";

import React from "react";

// ─── Card (Premium Card Panel) ────────────────────────────────────
export function Card({
  title,
  hint,
  children,
  className = "",
  action,
}: {
  title?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <section
      className={`cyber-card p-7 sm:p-9 ${className}`}
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
        padding: "clamp(28px, 2.4vw, 42px)",
      }}
    >
      {(title || action) && (
        <div className="mb-7 flex flex-col gap-5 border-b border-white/[0.07] pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-100 sm:text-lg">
              {title}
            </h2>
            {hint && (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                {hint}
              </p>
            )}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className="pl-2 text-base leading-8 text-slate-300 sm:text-lg">{children}</div>
    </section>
  );
}

// ─── StatCard (Premium Metrics Panel) ──────────────────────────────
export function StatCard({
  label,
  value,
  icon,
  color = "var(--accent)",
  sub,
}: {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
  sub?: string;
}) {
  return (
    <div
      className="cyber-card group p-6 pl-9 transition-all duration-200 sm:p-7 sm:pl-10"
      style={{
        background: "var(--bg-card)",
        borderColor: "rgba(255,255,255,0.03)",
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.02)`,
        paddingLeft: "clamp(36px, 2.8vw, 48px)",
      }}
    >
      <div
        className="absolute left-0 top-0 h-full w-1.5 opacity-80 transition-all group-hover:w-2"
        style={{ background: color }}
      />

      <div className="mb-5 flex items-center justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] text-2xl ring-1 ring-white/[0.08] transition-transform group-hover:scale-105">
          {icon}
        </span>
        <div className="h-7 w-24 overflow-hidden rounded-full border border-white/[0.06] bg-black/20">
          <div className="metric-spark h-full w-full opacity-80" />
        </div>
      </div>
      
      <p 
        className="text-3xl font-black tracking-tight text-white sm:text-4xl"
      >
        {value}
      </p>
      
      <p className="mt-2 text-sm font-semibold text-slate-300">
        {label}
      </p>
      
      {sub && (
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Field (Premium Input) ────────────────────────────────────────
export function Field(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`cyber-input w-full rounded-2xl border px-6 py-4.5 text-base outline-none sm:text-lg ${props.className ?? ""}`}
    />
  );
}

// ─── Area (Premium Textarea) ──────────────────────────────────────
export function Area(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`cyber-input min-h-40 w-full resize-none rounded-2xl border px-6 py-5 text-base outline-none sm:text-lg ${props.className ?? ""}`}
    />
  );
}

// ─── Sel (Premium Selector) ───────────────────────────────────────
export function Sel(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`cyber-input w-full rounded-2xl border px-6 py-4.5 text-base outline-none sm:text-lg ${props.className ?? ""}`}
      style={{
        background: "#0e1017",
      }}
    />
  );
}

// ─── Btn (Premium Red & Neutral Buttons) ────────────────────────────────────────────────
export function Btn({
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled,
  size = "md",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "success" | "ghost";
  className?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const variantStyles = {
    primary: {
      background: "linear-gradient(135deg, var(--accent) 0%, #a1141e 100%)",
      color: "#fff",
      border: "1px solid rgba(255,255,255,0.08)",
      boxShadow: "0 6px 20px rgba(230, 57, 70, 0.3)",
    },
    secondary: {
      background: "rgba(255,255,255,0.02)",
      color: "var(--text-primary)",
      border: "1px solid rgba(255,255,255,0.06)",
      backdropFilter: "blur(12px)",
    },
    danger: {
      background: "rgba(230, 57, 70, 0.06)",
      color: "#ff6b75",
      border: "1px solid rgba(230, 57, 70, 0.15)",
    },
    success: {
      background: "rgba(16, 185, 129, 0.06)",
      color: "#34d399",
      border: "1px solid rgba(16, 185, 129, 0.15)",
    },
    ghost: {
      background: "transparent",
      color: "var(--text-secondary)",
      border: "1px solid rgba(255, 255, 255, 0.02)",
    },
  };
  
  const sizeStyles = {
    sm: "px-5 py-2.5 text-sm rounded-xl font-semibold tracking-wide",
    md: "px-6 py-3.5 text-base rounded-xl font-semibold tracking-wide",
    lg: "px-7 py-4 text-base rounded-2xl font-bold tracking-wide",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative overflow-hidden transition-all duration-300 hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-40 ${sizeStyles[size]} ${className}`}
      style={variantStyles[variant]}
    >
      {children}
    </button>
  );
}

// ─── Badge (Clean Status Badges) ─────────────────────────────────────────────
export function Badge({
  children,
  color = "default",
}: {
  children: React.ReactNode;
  color?: "default" | "green" | "red" | "yellow" | "blue" | "purple";
}) {
  const colors = {
    default: "rgba(255,255,255,0.04)",
    green: "rgba(16,185,129,0.08)",
    red: "rgba(230,57,70,0.08)",
    yellow: "rgba(245,158,11,0.08)",
    blue: "rgba(59,130,246,0.08)",
    purple: "rgba(230,57,70,0.08)",
  };
  const borderColors = {
    default: "rgba(255,255,255,0.08)",
    green: "rgba(16,185,129,0.2)",
    red: "rgba(230,57,70,0.2)",
    yellow: "rgba(245,158,11,0.2)",
    blue: "rgba(59,130,246,0.2)",
    purple: "rgba(230,57,70,0.2)",
  };
  const textColors = {
    default: "var(--text-secondary)",
    green: "#34d399",
    red: "#ff6b75",
    yellow: "#fbbf24",
    blue: "#60a5fa",
    purple: "#ff6b75",
  };

  return (
    <span
      className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-semibold tracking-wide"
      style={{
        background: colors[color],
        borderColor: borderColors[color],
        color: textColors[color],
      }}
    >
      {children}
    </span>
  );
}

// ─── Table (High-contrast Sans-serif Table - Cải tiến Hàng nổi Độc lập tinh tế) 
export function Table({
  headers,
  rows,
  emptyText = "Không có dữ liệu trong hệ thống",
}: {
  headers: string[];
  rows: React.ReactNode[][];
  emptyText?: string;
}) {
  return (
    <div className="overflow-auto rounded-3xl border border-white/[0.06] bg-black/10 p-2">
      <table className="w-full min-w-[860px] border-collapse text-base">
        <thead>
          <tr className="border-b border-white/[0.07] bg-white/[0.035]">
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-8 py-5 text-left text-sm font-bold uppercase tracking-[0.08em] text-slate-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={headers.length}
                className="px-9 py-16 text-base font-medium text-slate-500"
                style={{
                  background: "rgba(15, 17, 26, 0.8)",
                  borderRadius: "14px",
                }}
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-white/[0.055] transition-colors duration-200 last:border-b-0 hover:bg-white/[0.035]"
              >
                {row.map((cell, j) => (
                  <td 
                    key={j} 
                    className="px-8 py-6 align-middle text-base font-medium leading-7 text-slate-200"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── SectionHeader (Clean Title Header) ─────────────────────────────────────
export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-10 flex flex-col gap-5 border-b border-white/[0.07] pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-sm text-slate-400 sm:text-base">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
export function Divider() {
  return <hr style={{ borderColor: "rgba(255,255,255,0.02)", margin: "24px 0" }} />;
}

// ─── Loading (Clean Loading Spinner) ──────────────────────────────────────
export function Loading({ text = "Đang tải dữ liệu..." }: { text?: string }) {
  return (
    <div className="flex items-center gap-3 py-14 justify-center">
      <div className="spinner" style={{ borderColor: "rgba(230, 57, 70, 0.1)", borderTopColor: "var(--accent)" }} />
      <span className="text-lg sm:text-xl font-bold tracking-wider text-slate-400">
        {text}
      </span>
    </div>
  );
}
