"use client";

import { useCallback, useEffect, useState } from "react";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";
const adminTokenStorageKey = "datve.admin.token";

type Stats = {
  movies: number;
  cinemas: number;
  showtimes: number;
  foods: number;
  vouchers: number;
  bookings: number;
  revenue: number;
  todayRevenue: number;
  weekRevenue: number;
  pendingReviews: number;
  topMovies: Array<{ title: string; revenue: number }>;
};

type Item = Record<string, unknown>;

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-5">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {hint ? <p className="mt-1 text-sm text-slate-400">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none" />;
}

function Area(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className="min-h-24 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none" />;
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none" />;
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<{ fullName: string; role: string } | null>(null);
  const [email, setEmail] = useState("admin@datve.local");
  const [password, setPassword] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [movies, setMovies] = useState<Item[]>([]);
  const [cinemas, setCinemas] = useState<Item[]>([]);
  const [rooms, setRooms] = useState<Item[]>([]);
  const [showtimes, setShowtimes] = useState<Item[]>([]);
  const [foods, setFoods] = useState<Item[]>([]);
  const [vouchers, setVouchers] = useState<Item[]>([]);
  const [payments, setPayments] = useState<Item[]>([]);
  const [banners, setBanners] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [seatEditor, setSeatEditor] = useState<any>(null);
  const [checkinRaw, setCheckinRaw] = useState("");
  const [checkinResult, setCheckinResult] = useState("");
  const [reviewNote, setReviewNote] = useState("");

  const [movieForm, setMovieForm] = useState({ slug: "", title: "", genre: "", durationMinutes: "120", status: "NOW_SHOWING", rating: "8.5", posterUrl: "", bannerUrl: "" });
  const [bannerForm, setBannerForm] = useState({ eyebrow: "Khuyen mai DatVe", title: "", subtitle: "", accentColor: "#5a1826", imageUrl: "", sortOrder: "0" });
  const [cinemaForm, setCinemaForm] = useState({ name: "", city: "TP.HCM", address: "", description: "" });
  const [roomForm, setRoomForm] = useState({ cinemaId: "", name: "", formatLabel: "2D LUXE" });
  const [showtimeForm, setShowtimeForm] = useState({ movieId: "", cinemaId: "", roomId: "", startTime: "", languageLabel: "Phu de", formatLabel: "2D", basePrice: "90000", status: "SELLING" });
  const [foodForm, setFoodForm] = useState({ name: "", description: "", price: "99000", category: "COMBO", isActive: true });
  const [voucherForm, setVoucherForm] = useState({ code: "", title: "", description: "", discountType: "PERCENT", discountValue: "10", minOrderValue: "0", maxDiscountValue: "0", assignedUserId: "", expiresAt: "", isActive: true });

  useEffect(() => {
    const savedToken = window.sessionStorage.getItem(adminTokenStorageKey);
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  const requestJson = useCallback(async (path: string, init?: RequestInit) => {
    const response = await fetch(`${apiBase}${path}`, {
      ...init,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error ?? `Request failed: ${response.status}`);
    return json;
  }, [token]);

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
      if (!response.ok) throw new Error(json.error ?? "Upload that bai");
      return `${apiBase.replace(/\/api\/v1$/, "")}${json.url}`;
    } finally {
      setUploading(false);
    }
  };

  const loadAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [meRes, dashboard, movieRes, cinemaRes, roomRes, showtimeRes, foodRes, voucherRes, paymentRes, bannerRes] = await Promise.all([
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Khong the tai du lieu");
    } finally {
      setLoading(false);
    }
  }, [requestJson, token]);

  useEffect(() => {
    loadAll();
  }, [token, loadAll]);

  const login = async () => {
    try {
      const json = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, deviceName: "Admin Dashboard" }),
      }).then((r) => r.json());
      if (!json.token) throw new Error(json.error ?? "Dang nhap that bai");
      window.sessionStorage.setItem(adminTokenStorageKey, json.token);
      setToken(json.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Dang nhap that bai");
    }
  };

  const logout = () => {
    window.sessionStorage.removeItem(adminTokenStorageKey);
    setToken(null);
    setMe(null);
    setPassword("");
  };

  const post = async (path: string, body: unknown) => requestJson(path, { method: "POST", body: JSON.stringify(body) });

  if (!token) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#2f1114,_#05070d_60%)] px-6 py-10 text-slate-50">
        <div className="mx-auto max-w-xl">
          <Card title="Dang nhap admin" hint="Session admin/staff bat buoc cho dashboard moi.">
            <div className="grid gap-3">
              <Field value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
              <Field type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mat khau" />
              <button className="rounded-full bg-red-600 px-5 py-3 text-sm font-semibold" onClick={login}>Dang nhap</button>
              {error ? <p className="text-sm text-red-300">{error}</p> : null}
            </div>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#2f1114,_#05070d_60%)] px-6 py-10 text-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[32px] border border-red-500/15 bg-black/30 p-8 backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-400">DatVe Admin</p>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tight">Dashboard van hanh dat ve thuc te</h1>
              <p className="mt-3 text-sm text-slate-300">{me?.fullName} | {me?.role}. Da mo voucher, room CRUD, payment review, check-in va seat map.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm font-semibold text-cyan-300" onClick={loadAll}>Tai lai</button>
              <button className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200" onClick={logout}>Dang xuat</button>
            </div>
          </div>
        </section>

        {error ? <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}
        {loading ? <Card title="Dang tai">Dang dong bo du lieu...</Card> : null}

        {stats ? (
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-8">
            {[["Phim", stats.movies], ["Rap", stats.cinemas], ["Phong", rooms.length], ["Suat", stats.showtimes], ["Combo", stats.foods], ["Voucher", stats.vouchers], ["Booking", stats.bookings], ["Review", stats.pendingReviews]].map(([label, value]) => (
              <Card key={String(label)} title={String(label)}><p className="text-3xl font-black">{value}</p></Card>
            ))}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Them phim">
            <div className="grid gap-3">
              <Field value={movieForm.slug} onChange={(e) => setMovieForm((p) => ({ ...p, slug: e.target.value }))} placeholder="slug" />
              <Field value={movieForm.title} onChange={(e) => setMovieForm((p) => ({ ...p, title: e.target.value }))} placeholder="Ten phim" />
              <Field value={movieForm.genre} onChange={(e) => setMovieForm((p) => ({ ...p, genre: e.target.value }))} placeholder="The loai" />
              <Field value={movieForm.posterUrl} onChange={(e) => setMovieForm((p) => ({ ...p, posterUrl: e.target.value }))} placeholder="Poster URL" />
              <Field value={movieForm.bannerUrl} onChange={(e) => setMovieForm((p) => ({ ...p, bannerUrl: e.target.value }))} placeholder="Banner URL" />
              <div className="grid grid-cols-2 gap-3">
                <Field type="file" accept="image/*" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const url = await uploadImage(file, "movies"); setMovieForm((p) => ({ ...p, posterUrl: url })); }} />
                <Field type="file" accept="image/*" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const url = await uploadImage(file, "movies"); setMovieForm((p) => ({ ...p, bannerUrl: url })); }} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field value={movieForm.durationMinutes} onChange={(e) => setMovieForm((p) => ({ ...p, durationMinutes: e.target.value }))} placeholder="Phut" />
                <Select value={movieForm.status} onChange={(e) => setMovieForm((p) => ({ ...p, status: e.target.value }))}><option value="NOW_SHOWING">NOW_SHOWING</option><option value="COMING_SOON">COMING_SOON</option><option value="TRENDING">TRENDING</option></Select>
                <Field value={movieForm.rating} onChange={(e) => setMovieForm((p) => ({ ...p, rating: e.target.value }))} placeholder="Rating" />
              </div>
              <button className="rounded-full bg-red-600 px-5 py-3 text-sm font-semibold" onClick={async () => { await post("/movies", { ...movieForm, durationMinutes: Number(movieForm.durationMinutes), rating: Number(movieForm.rating), subtitle: null, synopsis: null, releaseDate: null, badge: null, posterUrl: movieForm.posterUrl || null, bannerUrl: movieForm.bannerUrl || null, highlightColor: "#c41010", isFeatured: true, boxOfficeRank: null }); await loadAll(); }}>Luu phim</button>
              {uploading ? <p className="text-xs text-amber-300">Dang upload anh...</p> : null}
              <div className="max-h-80 space-y-2 overflow-auto">{movies.slice(0, 16).map((movie) => <div key={String(movie.id)} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm">{String(movie.title)} | {String(movie.genre)}{movie.poster_url ? " | poster" : ""}{movie.banner_url ? " | banner" : ""}</div>)}</div>
            </div>
          </Card>

          <Card title="Them rap / phong / suat chieu">
            <div className="grid gap-3">
              <Field value={cinemaForm.name} onChange={(e) => setCinemaForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ten rap" />
              <Field value={cinemaForm.address} onChange={(e) => setCinemaForm((p) => ({ ...p, address: e.target.value }))} placeholder="Dia chi" />
              <button className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold" onClick={async () => { await post("/cinemas", { ...cinemaForm }); await loadAll(); }}>Them rap</button>
              <div className="grid grid-cols-3 gap-3">
                <Select value={roomForm.cinemaId} onChange={(e) => setRoomForm((p) => ({ ...p, cinemaId: e.target.value }))}><option value="">Rap</option>{cinemas.map((cinema) => <option key={String(cinema.id)} value={String(cinema.id)}>{String(cinema.name)}</option>)}</Select>
                <Field value={roomForm.name} onChange={(e) => setRoomForm((p) => ({ ...p, name: e.target.value }))} placeholder="Phong" />
                <Field value={roomForm.formatLabel} onChange={(e) => setRoomForm((p) => ({ ...p, formatLabel: e.target.value }))} placeholder="Format" />
              </div>
              <button className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold" onClick={async () => { await post("/rooms", { cinemaId: Number(roomForm.cinemaId), name: roomForm.name, formatLabel: roomForm.formatLabel }); await loadAll(); }}>Them phong</button>
              <div className="grid grid-cols-2 gap-3">
                <Select value={showtimeForm.movieId} onChange={(e) => setShowtimeForm((p) => ({ ...p, movieId: e.target.value }))}><option value="">Phim</option>{movies.map((movie) => <option key={String(movie.id)} value={String(movie.id)}>{String(movie.title)}</option>)}</Select>
                <Select value={showtimeForm.cinemaId} onChange={(e) => setShowtimeForm((p) => ({ ...p, cinemaId: e.target.value }))}><option value="">Rap</option>{cinemas.map((cinema) => <option key={String(cinema.id)} value={String(cinema.id)}>{String(cinema.name)}</option>)}</Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select value={showtimeForm.roomId} onChange={(e) => setShowtimeForm((p) => ({ ...p, roomId: e.target.value }))}><option value="">Phong</option>{rooms.filter((room) => showtimeForm.cinemaId ? room.cinema_id === Number(showtimeForm.cinemaId) : true).map((room) => <option key={String(room.id)} value={String(room.id)}>{String(room.cinema_name)} - {String(room.name)}</option>)}</Select>
                <Field type="datetime-local" value={showtimeForm.startTime} onChange={(e) => setShowtimeForm((p) => ({ ...p, startTime: e.target.value }))} />
              </div>
              <button className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold" onClick={async () => { await post("/showtimes", { movieId: Number(showtimeForm.movieId), cinemaId: Number(showtimeForm.cinemaId), roomId: Number(showtimeForm.roomId), startTime: showtimeForm.startTime.replace("T", " ") + ":00", languageLabel: showtimeForm.languageLabel, formatLabel: showtimeForm.formatLabel, basePrice: Number(showtimeForm.basePrice), status: showtimeForm.status }); await loadAll(); }}>Them suat chieu</button>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Combo va voucher">
            <div className="grid gap-3">
              <Field value={foodForm.name} onChange={(e) => setFoodForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ten item" />
              <Area value={foodForm.description} onChange={(e) => setFoodForm((p) => ({ ...p, description: e.target.value }))} placeholder="Mo ta" />
              <div className="grid grid-cols-2 gap-3">
                <Field value={foodForm.price} onChange={(e) => setFoodForm((p) => ({ ...p, price: e.target.value }))} placeholder="Gia" />
                <Select value={foodForm.category} onChange={(e) => setFoodForm((p) => ({ ...p, category: e.target.value }))}><option value="COMBO">COMBO</option><option value="FOOD">FOOD</option><option value="DRINK">DRINK</option></Select>
              </div>
              <button className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold" onClick={async () => { await post("/foods", { ...foodForm, price: Number(foodForm.price), isActive: foodForm.isActive }); await loadAll(); }}>Them F&B</button>
              <hr className="border-white/10" />
              <div className="grid grid-cols-2 gap-3">
                <Field value={voucherForm.code} onChange={(e) => setVoucherForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="SALE20" />
                <Field value={voucherForm.title} onChange={(e) => setVoucherForm((p) => ({ ...p, title: e.target.value }))} placeholder="Tieu de voucher" />
              </div>
              <Area value={voucherForm.description} onChange={(e) => setVoucherForm((p) => ({ ...p, description: e.target.value }))} placeholder="Mo ta voucher" />
              <div className="grid grid-cols-3 gap-3">
                <Select value={voucherForm.discountType} onChange={(e) => setVoucherForm((p) => ({ ...p, discountType: e.target.value }))}><option value="PERCENT">PERCENT</option><option value="FIXED">FIXED</option></Select>
                <Field value={voucherForm.discountValue} onChange={(e) => setVoucherForm((p) => ({ ...p, discountValue: e.target.value }))} placeholder="Gia tri" />
                <Field value={voucherForm.minOrderValue} onChange={(e) => setVoucherForm((p) => ({ ...p, minOrderValue: e.target.value }))} placeholder="Don toi thieu" />
              </div>
              <button className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold" onClick={async () => { await post("/vouchers", { code: voucherForm.code, title: voucherForm.title, description: voucherForm.description || null, discountType: voucherForm.discountType, discountValue: Number(voucherForm.discountValue), minOrderValue: Number(voucherForm.minOrderValue), maxDiscountValue: Number(voucherForm.maxDiscountValue) > 0 ? Number(voucherForm.maxDiscountValue) : null, assignedUserId: voucherForm.assignedUserId ? Number(voucherForm.assignedUserId) : null, expiresAt: voucherForm.expiresAt ? `${voucherForm.expiresAt}:00` : null, isActive: voucherForm.isActive }); await loadAll(); }}>Tao voucher</button>
            </div>
          </Card>

          <Card title="Voucher / payment review / check-in">
            <div className="max-h-44 space-y-2 overflow-auto">{vouchers.slice(0, 8).map((voucher) => <div key={String(voucher.code)} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm">{String(voucher.code)} | {String(voucher.title)} | {voucher.is_active ? "ON" : "OFF"}</div>)}</div>
            <div className="mt-5 grid gap-3">
              <Area value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Review note" />
              <div className="max-h-52 space-y-2 overflow-auto">{payments.slice(0, 10).map((payment) => <div key={String(payment.provider_txn_ref)} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm"><p>{String(payment.booking_code)} | {String(payment.provider)} | {String(payment.review_status)}</p><div className="mt-2 flex gap-2"><button className="rounded-full border border-emerald-400/30 px-3 py-2 text-xs text-emerald-300" onClick={async () => { await post(`/operations/payments/${String(payment.provider_txn_ref)}/review`, { reviewStatus: "APPROVED", reviewNote }); await loadAll(); }}>Approve</button><button className="rounded-full border border-red-400/30 px-3 py-2 text-xs text-red-300" onClick={async () => { await post(`/operations/payments/${String(payment.provider_txn_ref)}/review`, { reviewStatus: "REJECTED", reviewNote }); await loadAll(); }}>Reject</button></div></div>)}</div>
              <Field value={checkinRaw} onChange={(e) => setCheckinRaw(e.target.value)} placeholder="QR payload / booking code" />
              <button className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold" onClick={async () => { const json = await post("/operations/checkin", { qrRaw: checkinRaw }); setCheckinResult(`${json.bookingCode} | ${json.movieTitle} | ${json.alreadyCheckedIn ? "Da check-in" : "Thanh cong"}`); setCheckinRaw(""); }}>Check-in ve</button>
              {checkinResult ? <p className="text-sm text-emerald-300">{checkinResult}</p> : null}
            </div>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Seat map editor" hint="Chon phong, tai so do, sua text layout va luu lai.">
            <div className="grid gap-3">
              <Select value={String(seatEditor?.id ?? "")} onChange={async (e) => { const roomId = Number(e.target.value); if (!roomId) return; const room = await requestJson(`/rooms/${roomId}/seats`); setSeatEditor({ ...room, seatText: room.seats.filter((seat: { isActive: boolean; rowLabel: string; seatCode: string }) => seat.isActive).reduce((acc: Record<string, string[]>, seat: { rowLabel: string; seatCode: string }) => { (acc[seat.rowLabel] ||= []).push(seat.seatCode); return acc; }, {}), }); }}>
                <option value="">Chon phong</option>
                {rooms.map((room) => <option key={String(room.id)} value={String(room.id)}>{String(room.cinema_name)} - {String(room.name)}</option>)}
              </Select>
              {seatEditor ? (
                <>
                  <Field value={seatEditor.name} onChange={(e) => setSeatEditor((prev: typeof seatEditor) => ({ ...prev, name: e.target.value }))} placeholder="Ten phong" />
                  <Field value={seatEditor.formatLabel} onChange={(e) => setSeatEditor((prev: typeof seatEditor) => ({ ...prev, formatLabel: e.target.value }))} placeholder="Format" />
                  <Area value={Object.values(seatEditor.seatText as Record<string, string[]>).map((row: string[]) => row.join(" ")).join("\n")} onChange={(e) => {
                    const lines = e.target.value.split("\n").map((line) => line.trim()).filter(Boolean);
                    const seats = lines.flatMap((line, rowIndex) => line.split(/\s+/).map((seatCode, colIndex) => ({ seatCode, rowLabel: seatCode.replace(/[0-9]/g, "") || String.fromCharCode(65 + rowIndex), columnIndex: colIndex + 1, seatType: "STANDARD", isActive: true })));
                    setSeatEditor((prev: typeof seatEditor) => ({ ...prev, seats, seatText: lines.reduce<Record<string, string[]>>((acc, line, idx) => ({ ...acc, [String.fromCharCode(65 + idx)]: line.split(/\s+/) }), {}) }));
                  }} />
                  <button className="rounded-full bg-red-600 px-5 py-3 text-sm font-semibold" onClick={async () => { await requestJson(`/rooms/${seatEditor.id}/seats`, { method: "PUT", body: JSON.stringify({ name: seatEditor.name, formatLabel: seatEditor.formatLabel, seats: seatEditor.seats }) }); await loadAll(); }}>Luu seat map</button>
                </>
              ) : null}
            </div>
          </Card>

          <Card title="Banner / media">
            <div className="grid gap-3 text-sm">
              <Field value={bannerForm.eyebrow} onChange={(e) => setBannerForm((p) => ({ ...p, eyebrow: e.target.value }))} placeholder="Eyebrow" />
              <Field value={bannerForm.title} onChange={(e) => setBannerForm((p) => ({ ...p, title: e.target.value }))} placeholder="Tieu de banner" />
              <Area value={bannerForm.subtitle} onChange={(e) => setBannerForm((p) => ({ ...p, subtitle: e.target.value }))} placeholder="Mo ta banner" />
              <div className="grid grid-cols-2 gap-3">
                <Field value={bannerForm.accentColor} onChange={(e) => setBannerForm((p) => ({ ...p, accentColor: e.target.value }))} placeholder="#5a1826" />
                <Field value={bannerForm.sortOrder} onChange={(e) => setBannerForm((p) => ({ ...p, sortOrder: e.target.value }))} placeholder="Thu tu" />
              </div>
              <Field value={bannerForm.imageUrl} onChange={(e) => setBannerForm((p) => ({ ...p, imageUrl: e.target.value }))} placeholder="Banner image URL" />
              <Field type="file" accept="image/*" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const url = await uploadImage(file, "banners"); setBannerForm((p) => ({ ...p, imageUrl: url })); }} />
              <button className="rounded-full bg-red-600 px-5 py-3 text-sm font-semibold" onClick={async () => { await post("/banners", { ...bannerForm, imageUrl: bannerForm.imageUrl || null, sortOrder: Number(bannerForm.sortOrder) }); await loadAll(); }}>Luu banner</button>
              <p>Top phim: {stats?.topMovies.map((item) => item.title).join(", ")}</p>
              <p>Rap: {cinemas.length} | Phong: {rooms.length} | Suat chieu: {showtimes.length}</p>
              <p>F&B: {foods.length} | Voucher: {vouchers.length} | Payment queue: {payments.length}</p>
              <div className="max-h-64 space-y-2 overflow-auto">{banners.slice(0, 12).map((item) => <div key={String(item.id)} className="rounded-2xl border border-white/10 bg-white/5 p-3">{String(item.title)} | {String(item.eyebrow ?? "DatVe")} | {item.image_url ? "co anh" : "chua co anh"}</div>)}</div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
