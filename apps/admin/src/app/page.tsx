"use client";

import { useCallback, useEffect, useState } from "react";

import { Sidebar } from "./components/Sidebar";
import { LoginPage } from "./components/LoginPage";

import { DashboardSection } from "./sections/DashboardSection";
import { MoviesSection } from "./sections/MoviesSection";
import { CinemasSection } from "./sections/CinemasSection";
import { ShowtimesSection } from "./sections/ShowtimesSection";
import { FoodSection } from "./sections/FoodSection";
import { VouchersSection } from "./sections/VouchersSection";
import { PaymentsSection } from "./sections/PaymentsSection";
import { CheckinSection } from "./sections/CheckinSection";
import { BannersSection } from "./sections/BannersSection";
import { UsersSection } from "./sections/UsersSection";
import { FeedbacksSection } from "./sections/FeedbacksSection";

import type {
  ActiveSection,
  Item,
  Stats,
  MovieForm,
  CinemaForm,
  RoomForm,
  ShowtimeForm,
  FoodForm,
  VoucherForm,
  BannerForm,
  FeedbackItem,
} from "./types";

const apiBase =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";
const STORAGE_KEY = "cineplus.admin.token";

// ─── Topbar ───────────────────────────────────────────────────────────────────
function Topbar({
  section,
  loading,
  onReload,
  error,
}: {
  section: ActiveSection;
  loading: boolean;
  onReload: () => void;
  error: string | null;
}) {
  const LABELS: Record<ActiveSection, { title: string; desc: string }> = {
    dashboard: { title: "Dashboard", desc: "Tổng quan vận hành, doanh thu và hiệu suất rạp" },
    movies: { title: "Quản lý phim", desc: "Danh mục phim, poster, trạng thái và xếp hạng" },
    cinemas: { title: "Rạp & phòng", desc: "Cấu hình rạp, phòng chiếu và sơ đồ ghế" },
    showtimes: { title: "Suất chiếu", desc: "Lập lịch bán vé theo phim, rạp và phòng" },
    food: { title: "F&B", desc: "Combo, đồ ăn kèm và trạng thái kinh doanh" },
    vouchers: { title: "Voucher", desc: "Mã khuyến mãi và điều kiện áp dụng" },
    payments: { title: "Thanh toán", desc: "Theo dõi và xét duyệt giao dịch" },
    checkin: { title: "Check-in", desc: "Xác thực vé tại rạp" },
    banners: { title: "Banners", desc: "Nội dung quảng cáo hiển thị trên ứng dụng" },
    users: { title: "Người dùng", desc: "Tài khoản, vai trò và phân quyền" },
    feedbacks: { title: "Góp ý khách hàng", desc: "Tiếp nhận, phân loại và phản hồi góp ý" },
  };
  const current = LABELS[section];

  return (
    <header
      className="flex items-center justify-between border-b px-10 lg:px-12"
      style={{
        height: "var(--header-height)",
        borderColor: "rgba(255, 255, 255, 0.08)",
        background: "rgba(7, 8, 13, 0.82)",
        backdropFilter: "blur(22px)",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-100">
          {current.title}
        </h2>
        <p className="mt-1 text-sm text-slate-400">{current.desc}</p>
      </div>

      <div className="flex items-center gap-3">
        {loading && (
          <span className="flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200">
            <span className="spinner" style={{ width: 12, height: 12, borderTopColor: "var(--neon-cyan)" }} />
            Đang đồng bộ
          </span>
        )}
        {error && !loading && (
          <span className="max-w-[320px] truncate rounded-full border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200">
            {error}
          </span>
        )}
        <span
          className="hidden items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] sm:flex"
          style={{ 
            background: "rgba(16, 185, 129, 0.08)", 
            color: "var(--neon-green)", 
            borderColor: "rgba(16, 185, 129, 0.18)" 
          }}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Đang hoạt động
        </span>
        <button
          onClick={onReload}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 py-2.5 text-sm font-semibold text-slate-300 transition-all duration-200 hover:bg-white/[0.07] hover:text-white disabled:opacity-40"
        >
          Làm mới
        </button>
      </div>
    </header>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  // Auth
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<{ fullName: string; role: string } | null>(null);
  
  const [email, setEmail] = useState("admin@cineplus.local");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  // Navigation
  const [activeSection, setActiveSection] = useState<ActiveSection>("dashboard");

  // Data
  const [stats, setStats] = useState<Stats | null>(null);
  const [movies, setMovies] = useState<Item[]>([]);
  const [cinemas, setCinemas] = useState<Item[]>([]);
  const [rooms, setRooms] = useState<Item[]>([]);
  const [showtimes, setShowtimes] = useState<Item[]>([]);
  const [foods, setFoods] = useState<Item[]>([]);
  const [vouchers, setVouchers] = useState<Item[]>([]);
  const [payments, setPayments] = useState<Item[]>([]);
  const [banners, setBanners] = useState<Item[]>([]);
  const [users, setUsers] = useState<Item[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [seatEditor, setSeatEditor] = useState<any>(null);

  // Forms
  const [movieForm, setMovieForm] = useState<MovieForm>({
    slug: "",
    title: "",
    genre: "",
    durationMinutes: "120",
    status: "NOW_SHOWING",
    rating: "8.5",
    posterUrl: "",
    bannerUrl: "",
  });
  const [cinemaForm, setCinemaForm] = useState<CinemaForm>({
    name: "",
    city: "TP.HCM",
    address: "",
    description: "",
  });
  const [roomForm, setRoomForm] = useState<RoomForm>({
    cinemaId: "",
    name: "",
    formatLabel: "2D LUXE",
  });
  const [showtimeForm, setShowtimeForm] = useState<ShowtimeForm>({
    movieId: "",
    cinemaId: "",
    roomId: "",
    startTime: "",
    languageLabel: "Phu de",
    formatLabel: "2D",
    basePrice: "90000",
    status: "SELLING",
  });
  const [foodForm, setFoodForm] = useState<FoodForm>({
    name: "",
    description: "",
    price: "99000",
    category: "COMBO",
    isActive: true,
  });
  const [voucherForm, setVoucherForm] = useState<VoucherForm>({
    code: "",
    title: "",
    description: "",
    discountType: "PERCENT",
    discountValue: "10",
    minOrderValue: "0",
    maxDiscountValue: "0",
    assignedUserId: "",
    expiresAt: "",
    isActive: true,
  });
  const [bannerForm, setBannerForm] = useState<BannerForm>({
    eyebrow: "CinePlus",
    title: "",
    subtitle: "",
    accentColor: "#e63946",
    imageUrl: "",
    sortOrder: "0",
  });

  // ─── Restore token ────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = window.sessionStorage.getItem(STORAGE_KEY);
    if (saved) setToken(saved);
  }, []);

  // ─── API helpers ──────────────────────────────────────────────────────────
  const requestJson = useCallback(
    async (path: string, init?: RequestInit) => {
      const response = await fetch(`${apiBase}${path}`, {
        ...init,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(init?.body && typeof init.body === "string"
            ? { "Content-Type": "application/json" }
            : {}),
          ...(init?.headers ?? {}),
        },
      });
      const json = await response.json();
      if (!response.ok)
        throw new Error(json.error ?? `Request failed: ${response.status}`);
      return json;
    },
    [token]
  );

  const uploadImage = async (file: File, folder: "movies" | "banners") => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);
      const response = await fetch(`${apiBase}/admin/uploads`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Upload thất bại");
      return `${apiBase.replace(/\/api\/v1$/, "")}${json.url}`;
    } finally {
      setUploading(false);
    }
  };

  const post = useCallback(
    (path: string, body: unknown) =>
      requestJson(path, { method: "POST", body: JSON.stringify(body) }),
    [requestJson]
  );

  // ─── Load all data ────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [
        meRes,
        dashboard,
        movieRes,
        cinemaRes,
        roomRes,
        showtimeRes,
        foodRes,
        voucherRes,
        paymentRes,
        bannerRes,
        usersRes,
        feedbackRes,
      ] = await Promise.all([
        requestJson("/auth/me"),
        requestJson("/dashboard"),
        requestJson("/movies"),
        requestJson("/cinemas"),
        requestJson("/rooms"),
        requestJson("/showtimes"),
        requestJson("/foods"),
        requestJson("/vouchers?mode=admin"),
        requestJson("/operations/payments"),
        requestJson("/banners"),
        requestJson("/admin/users"),
        requestJson("/feedbacks"),
      ]);
      setMe(meRes.user);
      setStats(dashboard);
      setMovies(movieRes.movies ?? []);
      setCinemas(cinemaRes.cinemas ?? []);
      setRooms(roomRes.rooms ?? []);
      setShowtimes(showtimeRes.showtimes ?? []);
      setFoods(foodRes.foods ?? []);
      setVouchers(voucherRes.vouchers ?? []);
      setPayments(paymentRes.payments ?? []);
      setBanners(bannerRes.banners ?? []);
      setUsers(usersRes.users ?? []);
      setFeedbacks(feedbackRes.feedbacks ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [requestJson, token]);

  useEffect(() => {
    loadAll();
  }, [token, loadAll]);

  // ─── Auth ─────────────────────────────────────────────────────────────────
  const login = async () => {
    setAuthError(null);
    try {
      const json = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          deviceName: "CinePlus Admin",
        }),
      }).then((r) => r.json());
      if (!json.token) throw new Error(json.error ?? "Đăng nhập thất bại");
      window.sessionStorage.setItem(STORAGE_KEY, json.token);
      setToken(json.token);
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Đăng nhập thất bại");
    }
  };

  const googleLoginWithToken = async (accessToken: string) => {
    setAuthError(null);
    try {
      const json = await fetch(`${apiBase}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: accessToken,
          deviceName: "CinePlus Admin (Google)",
        }),
      }).then((r) => r.json());
      if (!json.token) throw new Error(json.error ?? "Đăng nhập Google thất bại");
      window.sessionStorage.setItem(STORAGE_KEY, json.token);
      setToken(json.token);
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Đăng nhập Google thất bại");
    }
  };

  const logout = () => {
    window.sessionStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setMe(null);
    setPassword("");
    setStats(null);
    setMovies([]);
    setCinemas([]);
    setRooms([]);
    setShowtimes([]);
    setFoods([]);
    setVouchers([]);
    setPayments([]);
    setBanners([]);
    setUsers([]);
    setFeedbacks([]);
  };

  // ─── Not logged in ────────────────────────────────────────────────────────
  if (!token) {
    return (
      <LoginPage
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        onLogin={login}
        onGoogleIdToken={googleLoginWithToken}
        error={authError}
      />
    );
  }

  // ─── Pending payments count ───────────────────────────────────────────────
  const pendingPayments = payments.filter((p) => p.review_status === "PENDING").length;
  const pendingFeedbacks = feedbacks.filter((f) => f.status === "PENDING").length;

  // ─── Render section ───────────────────────────────────────────────────────
  const renderSection = () => {
    switch (activeSection) {
      case "dashboard":
        return <DashboardSection stats={stats} rooms={rooms} payments={payments} />;

      case "movies":
        return (
          <MoviesSection
            movies={movies}
            movieForm={movieForm}
            setMovieForm={setMovieForm}
            onUpload={uploadImage}
            uploading={uploading}
            onSave={async () => {
              await post("/movies", {
                ...movieForm,
                durationMinutes: Number(movieForm.durationMinutes),
                rating: Number(movieForm.rating),
                subtitle: null,
                synopsis: null,
                releaseDate: null,
                badge: null,
                posterUrl: movieForm.posterUrl || null,
                bannerUrl: movieForm.bannerUrl || null,
                highlightColor: "#e63946",
                isFeatured: true,
                boxOfficeRank: null,
              });
              await loadAll();
              setMovieForm({ slug: "", title: "", genre: "", durationMinutes: "120", status: "NOW_SHOWING", rating: "8.5", posterUrl: "", bannerUrl: "" });
            }}
          />
        );

      case "cinemas":
        return (
          <CinemasSection
            cinemas={cinemas}
            rooms={rooms}
            cinemaForm={cinemaForm}
            setCinemaForm={setCinemaForm}
            roomForm={roomForm}
            setRoomForm={setRoomForm}
            seatEditor={seatEditor}
            setSeatEditor={setSeatEditor}
            requestJson={requestJson}
            onAddCinema={async () => {
              await post("/cinemas", { ...cinemaForm });
              await loadAll();
              setCinemaForm({ name: "", city: "TP.HCM", address: "", description: "" });
            }}
            onAddRoom={async () => {
              await post("/rooms", {
                cinemaId: Number(roomForm.cinemaId),
                name: roomForm.name,
                formatLabel: roomForm.formatLabel,
              });
              await loadAll();
              setRoomForm({ cinemaId: "", name: "", formatLabel: "2D LUXE" });
            }}
            onSaveSeatMap={async () => {
              await requestJson(`/rooms/${seatEditor.id}/seats`, {
                method: "PUT",
                body: JSON.stringify({
                  name: seatEditor.name,
                  formatLabel: seatEditor.formatLabel,
                  seats: seatEditor.seats,
                }),
              });
              await loadAll();
            }}
          />
        );

      case "showtimes":
        return (
          <ShowtimesSection
            movies={movies}
            cinemas={cinemas}
            rooms={rooms}
            showtimes={showtimes}
            showtimeForm={showtimeForm}
            setShowtimeForm={setShowtimeForm}
            onSave={async () => {
              await post("/showtimes", {
                movieId: Number(showtimeForm.movieId),
                cinemaId: Number(showtimeForm.cinemaId),
                roomId: Number(showtimeForm.roomId),
                startTime: showtimeForm.startTime.replace("T", " ") + ":00",
                languageLabel: showtimeForm.languageLabel,
                formatLabel: showtimeForm.formatLabel,
                basePrice: Number(showtimeForm.basePrice),
                status: showtimeForm.status,
              });
              await loadAll();
              setShowtimeForm({ movieId: "", cinemaId: "", roomId: "", startTime: "", languageLabel: "Phu de", formatLabel: "2D", basePrice: "90000", status: "SELLING" });
            }}
          />
        );

      case "food":
        return (
          <FoodSection
            foods={foods}
            foodForm={foodForm}
            setFoodForm={setFoodForm}
            onSave={async () => {
              await post("/foods", {
                ...foodForm,
                price: Number(foodForm.price),
              });
              await loadAll();
              setFoodForm({ name: "", description: "", price: "99000", category: "COMBO", isActive: true });
            }}
          />
        );

      case "vouchers":
        return (
          <VouchersSection
            vouchers={vouchers}
            voucherForm={voucherForm}
            setVoucherForm={setVoucherForm}
            onSave={async () => {
              await post("/vouchers", {
                code: voucherForm.code,
                title: voucherForm.title,
                description: voucherForm.description || null,
                discountType: voucherForm.discountType,
                discountValue: Number(voucherForm.discountValue),
                minOrderValue: Number(voucherForm.minOrderValue),
                maxDiscountValue:
                  Number(voucherForm.maxDiscountValue) > 0
                    ? Number(voucherForm.maxDiscountValue)
                    : null,
                assignedUserId: voucherForm.assignedUserId
                  ? Number(voucherForm.assignedUserId)
                  : null,
                expiresAt: voucherForm.expiresAt ? `${voucherForm.expiresAt}:00` : null,
                isActive: voucherForm.isActive,
              });
              await loadAll();
              setVoucherForm({ code: "", title: "", description: "", discountType: "PERCENT", discountValue: "10", minOrderValue: "0", maxDiscountValue: "0", assignedUserId: "", expiresAt: "", isActive: true });
            }}
          />
        );

      case "payments":
        return (
          <PaymentsSection
            payments={payments}
            onReview={async (txnRef, status, note) => {
              await post(`/operations/payments/${txnRef}/review`, {
                reviewStatus: status,
                reviewNote: note,
              });
              await loadAll();
            }}
          />
        );

      case "checkin":
        return (
          <CheckinSection
            onCheckin={async (qrRaw) => {
              const json = await post("/operations/checkin", { qrRaw });
              return {
                bookingCode: String(json.bookingCode),
                movieTitle: String(json.movieTitle),
                alreadyCheckedIn: Boolean(json.alreadyCheckedIn),
              };
            }}
          />
        );

      case "banners":
        return (
          <BannersSection
            banners={banners}
            bannerForm={bannerForm}
            setBannerForm={setBannerForm}
            onUpload={uploadImage}
            uploading={uploading}
            onSave={async () => {
              await post("/banners", {
                ...bannerForm,
                imageUrl: bannerForm.imageUrl || null,
                sortOrder: Number(bannerForm.sortOrder),
              });
              await loadAll();
              setBannerForm({ eyebrow: "CinePlus", title: "", subtitle: "", accentColor: "#e63946", imageUrl: "", sortOrder: "0" });
            }}
          />
        );

      case "users":
        return (
          <UsersSection
            users={users}
            onChangeRole={async (userId, role) => {
              await requestJson("/admin/users", {
                method: "PATCH",
                body: JSON.stringify({ userId, role }),
              });
              await loadAll();
            }}
          />
        );

      case "feedbacks":
        return (
          <FeedbacksSection
            feedbacks={feedbacks}
            onReload={loadAll}
            onRespond={async (id, responseContent, status) => {
              await requestJson(`/feedbacks/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ responseContent, status }),
              });
            }}
          />
        );

      default:
        return null;
    }
  };

  // ─── Layout ───────────────────────────────────────────────────────────────
  return (
    <div className="admin-shell relative flex h-full min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <Sidebar
        active={activeSection}
        onNavigate={setActiveSection}
        user={me}
        onLogout={logout}
        pendingPayments={pendingPayments}
        pendingFeedbacks={pendingFeedbacks}
      />

      {/* Main content */}
      <div
        className="flex flex-1 flex-col min-h-full"
        style={{ marginLeft: "var(--sidebar-width)" }}
      >
        <Topbar
          section={activeSection}
          loading={loading}
          onReload={loadAll}
          error={error}
        />

        <main className="z-10 flex-1 px-10 py-11 lg:px-14">
          {renderSection()}
        </main>
      </div>
    </div>
  );
}
