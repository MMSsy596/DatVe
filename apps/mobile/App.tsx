import React from "react";
import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { ActivityIndicator, Linking, Pressable, SafeAreaView, Text, View } from "react-native";
import {
  CheckoutScreen,
  ExploreScreen,
  HomeScreen,
  MovieDetailScreen,
  ProfileScreen,
  SeatScreen,
  TicketDetailScreen,
  TicketsScreen,
  Toast,
} from "./src/components";
import { palette, styles } from "./src/theme";
import {
  Banner,
  ComboItem,
  Movie,
  PaymentProvider,
  ProfileData,
  ReminderItem,
  ScreenId,
  SeatMapRow,
  SeatSelection,
  SessionUser,
  ShowtimeItem,
  TabId,
  TicketDetail,
  TicketItem,
  Voucher,
} from "./src/types";

const DEFAULT_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || "http://10.20.3.64:3001/api/v1";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const fallbackBanners: Banner[] = [
  { id: 1, eyebrow: "Khuyen mai toan he thong", title: "Galaxy Week", text: "Mua 2 ve tang 1 combo mini vao khung gio vang.", accent: "#1f2f73" },
  { id: 2, eyebrow: "Suat chieu som", title: "Premiere Night", text: "Dat truoc phim hot va nhan ve uu dai hoi vien.", accent: "#5a1826" },
];

const fallbackMovies: Movie[] = [
  { id: 1, slug: "lat-mat-8", title: "Lat Mat 8", subtitle: "Tren duong dua doanh thu", genre: "Hanh dong", runtime: "128 phut", score: "9.1", badge: "Noi bat", tone: "#6d28d9", description: "Bo phim duoc day manh o suat toi, co tan suat day rap cao va luong dat truoc on dinh.", status: "NOW_SHOWING" },
  { id: 2, slug: "the-last-voyage", title: "The Last Voyage", subtitle: "Khong gian, bi an va survival", genre: "Vien tuong", runtime: "142 phut", score: "8.9", badge: "Top doanh thu", tone: "#0f766e", description: "Tac pham co nhu cau ghe VIP cao, phu hop de demo mini map va flow combo cao cap.", status: "TRENDING" },
  { id: 3, slug: "mua-he-truoc-cua-em", title: "Mua He Truoc Cua Em", subtitle: "Tinh cam, dep, de tiep can", genre: "Tinh cam", runtime: "115 phut", score: "8.6", badge: "Xu huong", tone: "#9333ea", description: "Noi dung phu hop tap nguoi dung tre, de khai thac watchlist, yeu thich va combo doi.", status: "COMING_SOON" },
];

const fallbackShowtimes: ShowtimeItem[] = [
  { id: 1, movieId: 1, cinemaId: 1, roomId: 1, cinemaName: "CGV Landmark 81", roomName: "Phong 01", startTime: "2026-03-30T18:45:00", formatLabel: "IMAX", languageLabel: "Phu de", basePrice: 120000, seatLayout: [["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8"], ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8"], ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"], ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"]] },
];

const fallbackCombos: ComboItem[] = [
  { id: 1, name: "Combo Couple", detail: "2 nuoc lon + 1 bap pho mai", price: "159.000d", unitPrice: 159000 },
  { id: 2, name: "Combo Family", detail: "4 nuoc + 2 bap caramel", price: "289.000d", unitPrice: 289000 },
  { id: 3, name: "Combo Night", detail: "1 hotdog + 1 nuoc + 1 bap caramel", price: "119.000d", unitPrice: 119000 },
];

function hourBucket(startTime: string) {
  const hour = Number(String(startTime).slice(11, 13));
  if (hour < 12) return "MORNING";
  if (hour < 18) return "AFTERNOON";
  return "EVENING";
}

export default function App() {
  const [activeTab, setActiveTab] = React.useState<TabId>("home");
  const [screen, setScreen] = React.useState<ScreenId>("tabs");
  const [apiBaseUrl, setApiBaseUrl] = React.useState(DEFAULT_API_BASE_URL);
  const [selectedMovie, setSelectedMovie] = React.useState<Movie>(fallbackMovies[0]);
  const [bannersData, setBannersData] = React.useState<Banner[]>(fallbackBanners);
  const [moviesData, setMoviesData] = React.useState<Movie[]>(fallbackMovies);
  const [showtimesData, setShowtimesData] = React.useState<ShowtimeItem[]>(fallbackShowtimes);
  const [combosData, setCombosData] = React.useState<ComboItem[]>(fallbackCombos);
  const [tickets, setTickets] = React.useState<TicketItem[]>([]);
  const [favoriteMovieIds, setFavoriteMovieIds] = React.useState<number[]>([]);
  const [watchlistMovieIds, setWatchlistMovieIds] = React.useState<number[]>([]);
  const [profileData, setProfileData] = React.useState<ProfileData | null>(null);
  const [sessionUser, setSessionUser] = React.useState<SessionUser | null>(null);
  const [authToken, setAuthToken] = React.useState<string | null>(null);
  const [authMode, setAuthMode] = React.useState<"login" | "register">("login");
  const [authName, setAuthName] = React.useState("Nguyen Van A");
  const [authEmail, setAuthEmail] = React.useState("user@datve.local");
  const [authPhone, setAuthPhone] = React.useState("0900000002");
  const [authPassword, setAuthPassword] = React.useState("User@123");
  const [authLoading, setAuthLoading] = React.useState(false);
  const [pushToken, setPushToken] = React.useState<string | null>(null);
  const [vouchersData, setVouchersData] = React.useState<Voucher[]>([]);
  const [voucherCode, setVoucherCode] = React.useState("");
  const [remindersData, setRemindersData] = React.useState<ReminderItem[]>([]);
  const [loadingRemote, setLoadingRemote] = React.useState(false);
  const [toast, setToast] = React.useState<{ message: string; tone: "info" | "success" | "error" } | null>(null);
  const [selectedSeats, setSelectedSeats] = React.useState<SeatSelection[]>([]);
  const [selectedShowtime, setSelectedShowtime] = React.useState<ShowtimeItem | null>(fallbackShowtimes[0]);
  const [selectedTicketDetail, setSelectedTicketDetail] = React.useState<TicketDetail | null>(null);
  const [seatMapRows, setSeatMapRows] = React.useState<SeatMapRow[]>([]);
  const [exploreStatusFilter, setExploreStatusFilter] = React.useState("ALL");
  const [exploreCinemaFilter, setExploreCinemaFilter] = React.useState("ALL");
  const [exploreGenreFilter, setExploreGenreFilter] = React.useState("ALL");
  const [exploreHourFilter, setExploreHourFilter] = React.useState("ALL");
  const [holding, setHolding] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const [heldBookingId, setHeldBookingId] = React.useState<number | null>(null);
  const [selectedComboIds, setSelectedComboIds] = React.useState<number[]>([]);
  const [selectedPaymentProvider, setSelectedPaymentProvider] = React.useState<PaymentProvider>("MOMO");
  const [selectedPaymentGatewayMode, setSelectedPaymentGatewayMode] = React.useState<"SANDBOX" | "REAL">("SANDBOX");
  const [customerName, setCustomerName] = React.useState("Nguyen Van A");
  const [customerEmail, setCustomerEmail] = React.useState("user@datve.local");
  const [customerPhone, setCustomerPhone] = React.useState("0900000002");

  const showToast = React.useCallback((message: string, tone: "info" | "success" | "error" = "info") => {
    setToast({ message, tone });
    setTimeout(() => setToast((prev) => (prev?.message === message ? null : prev)), 2600);
  }, []);

  const apiHeaders = React.useCallback(
    (extra?: Record<string, string>) => ({
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(extra ?? {}),
    }),
    [authToken]
  );

  const requestJson = React.useCallback(
    async (path: string, init?: RequestInit) => {
      const response = await fetch(`${apiBaseUrl}${path}`, {
        ...init,
        headers: {
          ...(init?.body ? { "Content-Type": "application/json" } : {}),
          ...apiHeaders(),
          ...(init?.headers ?? {}),
        },
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Request failed");
      }
      return json;
    },
    [apiBaseUrl, apiHeaders]
  );

  const apiOrigin = React.useMemo(() => apiBaseUrl.replace(/\/api\/v1\/?$/, ""), [apiBaseUrl]);

  const absolutizeAssetUrl = React.useCallback(
    (value?: string | null) => {
      if (!value) return null;
      if (/^https?:\/\//i.test(value)) return value;
      return value.startsWith("/") ? `${apiOrigin}${value}` : `${apiOrigin}/${value}`;
    },
    [apiOrigin]
  );

  const estimateVoucherDiscount = React.useCallback(() => {
    const voucher = vouchersData.find((item) => item.code === voucherCode.trim().toUpperCase());
    if (!voucher) return 0;
    const subtotal =
      selectedSeats.reduce((sum, item) => sum + item.price, 0) +
      combosData.filter((combo) => selectedComboIds.includes(combo.id)).reduce((sum, combo) => sum + combo.unitPrice, 0);
    if (subtotal < Number(voucher.min_order_value)) return 0;
    const raw =
      voucher.discount_type === "PERCENT"
        ? Math.floor((subtotal * Number(voucher.discount_value)) / 100)
        : Number(voucher.discount_value);
    return Math.min(raw, Number(voucher.max_discount_value ?? raw));
  }, [combosData, selectedComboIds, selectedSeats, voucherCode, vouchersData]);

  const loadRemoteData = React.useCallback(async () => {
    setLoadingRemote(true);
    try {
      const mePromise = authToken ? requestJson("/auth/me") : Promise.resolve(null);
      const [meJson, catalog, bookingJson, favoriteJson, watchlistJson, profileJson, voucherJson, reminderJson] = await Promise.all([
        mePromise,
        requestJson("/catalog"),
        requestJson(authToken ? "/bookings" : "/bookings?userId=2"),
        requestJson(authToken ? "/favorites" : "/favorites?userId=2"),
        requestJson(authToken ? "/watchlist" : "/watchlist?userId=2"),
        requestJson(authToken ? "/profile" : "/profile?userId=2"),
        requestJson(authToken ? "/vouchers" : "/vouchers?userId=2"),
        requestJson(authToken ? "/reminders" : "/reminders?userId=2"),
      ]);
      setSessionUser(meJson?.user ?? null);

      const remoteMovies: Movie[] = (catalog.featuredMovies ?? []).map((item: any) => ({
        id: item.id,
        slug: item.slug,
        title: item.title,
        subtitle: item.subtitle ?? "",
        genre: item.genre,
        runtime: `${item.durationMinutes} phut`,
        score: String(item.rating),
        badge: item.badge ?? "Dang chieu",
        tone: item.highlightColor ?? "#c41010",
        description: item.subtitle ?? "Phim dang duoc quan ly tu backend DatVe.",
        status: String(item.status ?? "NOW_SHOWING").toUpperCase(),
        posterUrl: absolutizeAssetUrl(item.posterUrl),
        bannerUrl: absolutizeAssetUrl(item.bannerUrl),
      }));

      setBannersData(
        ((catalog.banners ?? []).length > 0 ? catalog.banners : fallbackBanners).map((item: any) => ({
          id: item.id,
          eyebrow: item.eyebrow ?? "Khuyen mai toan he thong",
          title: item.title,
          text: item.subtitle ?? item.text ?? "Uu dai moi danh cho thanh vien DatVe.",
          accent: item.accentColor ?? item.accent ?? "#1f2f73",
          imageUrl: absolutizeAssetUrl(item.imageUrl),
        }))
      );
      setMoviesData(remoteMovies.length > 0 ? remoteMovies : fallbackMovies);
      setSelectedMovie((prev) => remoteMovies.find((item) => item.id === prev.id) ?? remoteMovies[0] ?? prev);
      setShowtimesData(
        (catalog.showtimes ?? []).map((item: any) => ({
          id: item.id,
          movieId: item.movieId,
          cinemaId: item.cinemaId,
          roomId: item.roomId,
          cinemaName: item.cinemaName,
          roomName: item.roomName,
          startTime: item.startTime,
          formatLabel: item.formatLabel,
          languageLabel: item.languageLabel,
          basePrice: item.basePrice,
          seatLayout: item.seatLayout ?? fallbackShowtimes[0].seatLayout,
        }))
      );
      setCombosData(
        ((catalog.foods ?? []).length > 0 ? catalog.foods : fallbackCombos).map((item: any) => ({
          id: item.id,
          name: item.name,
          detail: item.description ?? item.detail ?? "Combo DatVe",
          price: typeof item.price === "string" ? item.price : `${Number(item.price).toLocaleString("vi-VN")}d`,
          unitPrice: Number(item.unitPrice ?? item.price),
        }))
      );
      setTickets(
        (bookingJson.bookings ?? []).map((item: any) => ({
          id: item.id,
          bookingId: item.id,
          bookingCode: item.booking_code,
          movie: item.movie_title,
          cinema: item.cinema_name,
          seat: item.seat_codes ?? "...",
          time: String(item.start_time).replace("T", " ").slice(0, 16),
          status: item.status,
        }))
      );
      setFavoriteMovieIds((favoriteJson.favorites ?? []).map((item: any) => Number(item.id)));
      setWatchlistMovieIds((watchlistJson.watchlist ?? []).map((item: any) => Number(item.id)));
      setProfileData(profileJson);
      setVouchersData(voucherJson.vouchers ?? []);
      setRemindersData(reminderJson.reminders ?? []);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Khong tai duoc du lieu", "error");
    } finally {
      setLoadingRemote(false);
    }
  }, [absolutizeAssetUrl, authToken, requestJson, showToast]);

  const registerDevicePush = React.useCallback(async () => {
    if (!authToken || !Device.isDevice) return;

    const currentPermission = await Notifications.getPermissionsAsync();
    let finalStatus = currentPermission.status;
    if (finalStatus !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }
    if (finalStatus !== "granted") return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    setPushToken(tokenResponse.data);
    await requestJson("/devices/push-token", {
      method: "POST",
      body: JSON.stringify({
        expoPushToken: tokenResponse.data,
        platform: Device.osName?.toLowerCase() ?? "unknown",
        deviceId: Device.modelId ?? Device.deviceName ?? "unknown-device",
        appVersion: "1.0.0",
      }),
    });
  }, [authToken, requestJson]);

  const fetchSeatMap = React.useCallback(
    async (showtimeId: number, silent = false) => {
      try {
        const json = await requestJson(`/showtimes/${showtimeId}/seats`);
        const rows = (json.rows ?? []) as SeatMapRow[];
        setSeatMapRows(rows);
        return rows;
      } catch (error) {
        if (!silent) {
          showToast(error instanceof Error ? error.message : "Khong the tai seat map", "error");
        }
        setSeatMapRows([]);
        return null;
      }
    },
    [requestJson, showToast]
  );

  React.useEffect(() => {
    loadRemoteData();
  }, [loadRemoteData]);

  React.useEffect(() => {
    if (pushToken) return;
    registerDevicePush().catch(() => null);
  }, [pushToken, registerDevicePush]);

  React.useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      const normalized = url.replace("datve://", "https://datve.local/");
      const parsed = new URL(normalized);
      if (parsed.pathname.replace(/^\//, "") !== "payment-result") return;
      const status = String(parsed.searchParams.get("status") ?? "");
      const provider = String(parsed.searchParams.get("provider") ?? "");
      if (status === "SUCCESS") showToast(`${provider} da cap nhat ve cua ban sang PAID.`, "success");
      else if (status) showToast(`${provider} tra ve trang thai ${status}.`, "error");
      setScreen("tabs");
      setActiveTab("tickets");
      loadRemoteData();
    });
    return () => subscription.remove();
  }, [loadRemoteData, showToast]);

  React.useEffect(() => {
    if (screen !== "seats" || !selectedShowtime) return;

    const interval = setInterval(async () => {
      const rows = await fetchSeatMap(selectedShowtime.id, true);
      if (!rows) return;
      const availableSeats = new Set(
        rows.flatMap((row) => row.seats.filter((seat) => seat.status === "AVAILABLE").map((seat) => seat.seatCode))
      );

      setSelectedSeats((prev) => {
        const next = prev.filter((seat) => availableSeats.has(seat.seatCode));
        if (next.length !== prev.length) {
          showToast("Co ghe vua duoc giu o thiet bi khac. Danh sach ghe da duoc lam moi.", "info");
        }
        return next;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchSeatMap, screen, selectedShowtime, showToast]);

  const openMovie = React.useCallback((movie: Movie) => {
    setSelectedMovie(movie);
    setScreen("movie");
  }, []);

  const openSeats = React.useCallback(
    async (movie: Movie, showtime?: ShowtimeItem) => {
      const nextShowtime = showtime ?? showtimesData.find((item) => item.movieId === movie.id) ?? fallbackShowtimes[0];
      setSelectedMovie(movie);
      setSelectedShowtime(nextShowtime);
      setSelectedSeats([]);
      setSelectedComboIds([]);
      setSelectedPaymentProvider("MOMO");
      setSelectedPaymentGatewayMode("SANDBOX");
      setHeldBookingId(null);
      await fetchSeatMap(nextShowtime.id);
      setScreen("seats");
    },
    [fetchSeatMap, showtimesData]
  );

  const openTicketDetail = React.useCallback(
    async (ticket: TicketItem) => {
      try {
        const json = await requestJson(`/bookings/${ticket.bookingId}`);
        setSelectedTicketDetail(json);
        setScreen("ticket");
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Khong the tai chi tiet ve", "error");
      }
    },
    [requestJson, showToast]
  );

  const syncMovieListToggle = React.useCallback(
    async (kind: "favorites" | "watchlist", movieId: number, enabled: boolean) => {
      const endpoint = kind === "favorites" ? "favorites" : "watchlist";
      const response = await fetch(`${apiBaseUrl}/${endpoint}`, {
        method: enabled ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json", ...apiHeaders() },
        body: JSON.stringify({ movieId }),
      });
      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error ?? "Khong the cap nhat danh sach");
      }
    },
    [apiBaseUrl, apiHeaders]
  );

  const submitAuth = async () => {
    setAuthLoading(true);
    try {
      const endpoint = authMode === "login" ? "/auth/login" : "/auth/register";
      const json = await requestJson(endpoint, {
        method: "POST",
        body: JSON.stringify(
          authMode === "login"
            ? { email: authEmail, password: authPassword, deviceName: "Android Shell" }
            : { fullName: authName, email: authEmail, phone: authPhone, password: authPassword }
        ),
      });
      setAuthToken(json.token);
      setSessionUser(json.user);
      setCustomerName(json.user.fullName);
      setCustomerEmail(json.user.email);
      setCustomerPhone(json.user.phone ?? "");
      showToast(authMode === "login" ? "Dang nhap thanh cong." : "Dang ky thanh cong.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Khong the xac thuc tai khoan", "error");
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (authToken) {
        await requestJson("/auth/logout", { method: "POST" });
      }
    } catch {
      // ignore
    } finally {
      setAuthToken(null);
      setSessionUser(null);
      setProfileData(null);
      setTickets([]);
      setFavoriteMovieIds([]);
      setWatchlistMovieIds([]);
      setRemindersData([]);
      showToast("Da dang xuat.", "info");
    }
  };

  const toggleFavorite = async () => {
    const enabled = !favoriteMovieIds.includes(selectedMovie.id);
    try {
      await syncMovieListToggle("favorites", selectedMovie.id, enabled);
      setFavoriteMovieIds((prev) =>
        enabled ? [...prev, selectedMovie.id] : prev.filter((id) => id !== selectedMovie.id)
      );
      showToast(enabled ? "Da them vao yeu thich." : "Da bo khoi yeu thich.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Khong the cap nhat yeu thich", "error");
    }
  };

  const toggleWatchlist = async () => {
    const enabled = !watchlistMovieIds.includes(selectedMovie.id);
    try {
      await syncMovieListToggle("watchlist", selectedMovie.id, enabled);
      setWatchlistMovieIds((prev) =>
        enabled ? [...prev, selectedMovie.id] : prev.filter((id) => id !== selectedMovie.id)
      );
      showToast(enabled ? "Da them vao xem sau." : "Da bo khoi xem sau.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Khong the cap nhat xem sau", "error");
    }
  };

  const toggleSeat = React.useCallback((seat: SeatSelection) => {
    setSelectedSeats((prev) =>
      prev.some((item) => item.seatCode === seat.seatCode)
        ? prev.filter((item) => item.seatCode !== seat.seatCode)
        : [...prev, seat]
    );
  }, []);

  const holdCurrentSeats = async () => {
    if (selectedSeats.length === 0) return showToast("Hay chon it nhat 1 ghe truoc khi tiep tuc.", "error");
    const showtime = selectedShowtime ?? showtimesData.find((item) => item.movieId === selectedMovie.id);
    if (!showtime) return showToast("Backend chua co suat chieu phu hop cho phim nay.", "error");
    setHolding(true);
    try {
      const response = await fetch(`${apiBaseUrl}/bookings/hold`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...apiHeaders() },
        body: JSON.stringify({ showtimeId: showtime.id, seats: selectedSeats }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Khong the giu ghe");
      setHeldBookingId(json.id);
      setScreen("checkout");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Khong the giu ghe", "error");
      await fetchSeatMap(showtime.id);
    } finally {
      setHolding(false);
    }
  };

  const confirmBooking = async () => {
    if (!heldBookingId) return showToast("Can giu ghe truoc khi tao booking.", "error");
    setConfirming(true);
    try {
      const response = await fetch(`${apiBaseUrl}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...apiHeaders() },
        body: JSON.stringify({
          bookingId: heldBookingId,
          customerName,
          customerEmail,
          customerPhone,
          paymentMethod: selectedPaymentProvider,
          voucherCode: voucherCode.trim() || null,
          items: combosData
            .filter((combo) => selectedComboIds.includes(combo.id))
            .map((combo) => ({ foodId: combo.id, quantity: 1, price: combo.unitPrice })),
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Khong the tao booking");

      const paymentResponse = await fetch(`${apiBaseUrl}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...apiHeaders() },
        body: JSON.stringify({
          bookingId: json.id,
          provider: selectedPaymentProvider,
          returnUrl: "datve://payment-result",
          gatewayMode: selectedPaymentGatewayMode,
        }),
      });
      const paymentJson = await paymentResponse.json();
      if (!paymentResponse.ok) throw new Error(paymentJson.error ?? "Khong the tao payment");

      const seatLabel = (json.seats ?? []).map((item: any) => item.seatCode).join(", ");
      setTickets((prev) => [
        {
          id: json.id,
          bookingId: json.id,
          bookingCode: json.bookingCode,
          movie: json.showtime.movieTitle,
          cinema: json.showtime.cinemaName,
          seat: seatLabel,
          time: String(json.showtime.startTime).replace("T", " ").slice(0, 16),
          status: json.status,
        },
        ...prev,
      ]);
      showToast(`Ma ve ${json.bookingCode} da duoc tao. Dang mo ${selectedPaymentProvider}.`, "success");
      await Linking.openURL(paymentJson.checkoutUrl);
      setScreen("tabs");
      setActiveTab("tickets");
      setSelectedSeats([]);
      setSelectedComboIds([]);
      setVoucherCode("");
      setHeldBookingId(null);
      await loadRemoteData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Khong the tao booking", "error");
    } finally {
      setConfirming(false);
    }
  };

  const scheduleReminder = async () => {
    if (!selectedTicketDetail) return;
    const showtime = new Date(selectedTicketDetail.showtime.startTime);
    const remindAt = new Date(showtime.getTime() - 60 * 60_000).toISOString().slice(0, 19).replace("T", " ");
    try {
      await requestJson(`/bookings/${selectedTicketDetail.id}/reminder`, {
        method: "POST",
        body: JSON.stringify({ remindAt }),
      });
      showToast("Da dat nhac truoc 1 gio.", "success");
      await openTicketDetail({
        id: selectedTicketDetail.id,
        bookingId: selectedTicketDetail.id,
        bookingCode: selectedTicketDetail.bookingCode,
        movie: selectedTicketDetail.showtime.movieTitle,
        cinema: selectedTicketDetail.showtime.cinemaName,
        seat: selectedTicketDetail.seats.map((item) => item.seatCode).join(", "),
        time: String(selectedTicketDetail.showtime.startTime),
        status: selectedTicketDetail.status,
      });
      await loadRemoteData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Khong the dat reminder", "error");
    }
  };

  const cancelTicketReminder = async () => {
    if (!selectedTicketDetail) return;
    try {
      await requestJson(`/bookings/${selectedTicketDetail.id}/reminder`, { method: "DELETE" });
      showToast("Da huy reminder.", "info");
      await openTicketDetail({
        id: selectedTicketDetail.id,
        bookingId: selectedTicketDetail.id,
        bookingCode: selectedTicketDetail.bookingCode,
        movie: selectedTicketDetail.showtime.movieTitle,
        cinema: selectedTicketDetail.showtime.cinemaName,
        seat: selectedTicketDetail.seats.map((item) => item.seatCode).join(", "),
        time: String(selectedTicketDetail.showtime.startTime),
        status: selectedTicketDetail.status,
      });
      await loadRemoteData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Khong the huy reminder", "error");
    }
  };

  const favoriteMovies = React.useMemo(
    () => moviesData.filter((movie) => favoriteMovieIds.includes(movie.id)),
    [favoriteMovieIds, moviesData]
  );
  const watchlistMovies = React.useMemo(
    () => moviesData.filter((movie) => watchlistMovieIds.includes(movie.id)),
    [moviesData, watchlistMovieIds]
  );

  const cinemaOptions = React.useMemo(
    () => Array.from(new Set(showtimesData.map((showtime) => showtime.cinemaName))).sort(),
    [showtimesData]
  );
  const genreOptions = React.useMemo(
    () =>
      Array.from(
        new Set(
          moviesData.flatMap((movie) =>
            String(movie.genre)
              .split(",")
              .map((part) => part.trim())
              .filter(Boolean)
          )
        )
      ).sort(),
    [moviesData]
  );

  const exploreMovies = React.useMemo(() => {
    return moviesData.filter((movie) => {
      const matchesStatus = exploreStatusFilter === "ALL" ? true : movie.status === exploreStatusFilter;
      const movieGenres = String(movie.genre)
        .split(",")
        .map((item) => item.trim().toLowerCase());
      const matchesGenre =
        exploreGenreFilter === "ALL" ? true : movieGenres.includes(exploreGenreFilter.toLowerCase());
      const movieShowtimes = showtimesData.filter((showtime) => showtime.movieId === movie.id);
      const matchesCinema =
        exploreCinemaFilter === "ALL"
          ? true
          : movieShowtimes.some((showtime) => showtime.cinemaName === exploreCinemaFilter);
      const matchesHour =
        exploreHourFilter === "ALL"
          ? true
          : movieShowtimes.some((showtime) => hourBucket(showtime.startTime) === exploreHourFilter);
      return matchesStatus && matchesGenre && matchesCinema && matchesHour;
    });
  }, [exploreCinemaFilter, exploreGenreFilter, exploreHourFilter, exploreStatusFilter, moviesData, showtimesData]);

  let content: React.ReactNode = null;

  if (screen === "movie") {
    content = (
      <MovieDetailScreen
        movie={selectedMovie}
        onBack={() => setScreen("tabs")}
        onBook={(showtime) => openSeats(selectedMovie, showtime)}
        showtimesData={showtimesData}
        isFavorite={favoriteMovieIds.includes(selectedMovie.id)}
        isInWatchlist={watchlistMovieIds.includes(selectedMovie.id)}
        onToggleFavorite={toggleFavorite}
        onToggleWatchlist={toggleWatchlist}
      />
    );
  } else if (screen === "seats") {
    content = (
      <SeatScreen
        movie={selectedMovie}
        showtime={selectedShowtime}
        onBack={() => setScreen("movie")}
        onContinue={holdCurrentSeats}
        selectedSeats={selectedSeats}
        onToggleSeat={toggleSeat}
        holding={holding}
        seatMapRows={seatMapRows}
      />
    );
  } else if (screen === "ticket" && selectedTicketDetail) {
    content = <TicketDetailScreen ticket={selectedTicketDetail} onBack={() => setScreen("tabs")} onScheduleReminder={scheduleReminder} onCancelReminder={cancelTicketReminder} />;
  } else if (screen === "checkout") {
    content = (
      <CheckoutScreen
        movie={selectedMovie}
        onBack={() => setScreen("seats")}
        combosData={combosData}
        selectedSeats={selectedSeats}
        selectedComboIds={selectedComboIds}
        selectedPaymentProvider={selectedPaymentProvider}
        selectedPaymentGatewayMode={selectedPaymentGatewayMode}
        onSelectPaymentProvider={setSelectedPaymentProvider}
        onSelectPaymentGatewayMode={setSelectedPaymentGatewayMode}
        onToggleCombo={(id) =>
          setSelectedComboIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
        }
        customerName={customerName}
        setCustomerName={setCustomerName}
        customerEmail={customerEmail}
        setCustomerEmail={setCustomerEmail}
        customerPhone={customerPhone}
        setCustomerPhone={setCustomerPhone}
        onConfirm={confirmBooking}
        confirming={confirming}
        vouchers={vouchersData}
        voucherCode={voucherCode}
        setVoucherCode={setVoucherCode}
        appliedVoucherCode={voucherCode.trim() ? voucherCode.trim().toUpperCase() : null}
        estimatedDiscount={estimateVoucherDiscount()}
      />
    );
  } else if (activeTab === "home") {
    content = (
      <HomeScreen
        onMoviePress={openMovie}
        onSeatPress={(movie) => openSeats(movie)}
        bannersData={bannersData}
        moviesData={moviesData}
        loading={loadingRemote}
        fallbackMovie={fallbackMovies[0]}
      />
    );
  } else if (activeTab === "explore") {
    content = (
      <ExploreScreen
        onMoviePress={openMovie}
        moviesData={exploreMovies}
        loading={loadingRemote}
        statusFilter={exploreStatusFilter}
        setStatusFilter={setExploreStatusFilter}
        cinemaFilter={exploreCinemaFilter}
        setCinemaFilter={setExploreCinemaFilter}
        genreFilter={exploreGenreFilter}
        setGenreFilter={setExploreGenreFilter}
        hourFilter={exploreHourFilter}
        setHourFilter={setExploreHourFilter}
        cinemaOptions={cinemaOptions}
        genreOptions={genreOptions}
      />
    );
  } else if (activeTab === "tickets") {
    content = (
      <TicketsScreen
        onSeatPress={(movie) => openSeats(movie)}
        onTicketPress={openTicketDetail}
        tickets={tickets}
        moviesData={moviesData}
        loading={loadingRemote}
        fallbackMovie={fallbackMovies[0]}
      />
    );
  } else {
    content = (
      <ProfileScreen
        apiBaseUrl={apiBaseUrl}
        setApiBaseUrl={setApiBaseUrl}
        onReload={loadRemoteData}
        favoriteMovies={favoriteMovies}
        watchlistMovies={watchlistMovies}
        onMoviePress={openMovie}
        profile={profileData}
        sessionUser={sessionUser}
        reminders={remindersData}
        authMode={authMode}
        setAuthMode={setAuthMode}
        authName={authName}
        setAuthName={setAuthName}
        authEmail={authEmail}
        setAuthEmail={setAuthEmail}
        authPhone={authPhone}
        setAuthPhone={setAuthPhone}
        authPassword={authPassword}
        setAuthPassword={setAuthPassword}
        onSubmitAuth={submitAuth}
        onLogout={logout}
        authLoading={authLoading}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <Text style={styles.brand}>DATVE CINEMA BOOKING</Text>
        {loadingRemote ? <ActivityIndicator color={palette.cyan} /> : <View style={styles.avatarMini} />}
      </View>
      {toast ? <Toast message={toast.message} tone={toast.tone} /> : null}
      {content}
      {screen === "tabs" ? (
        <View style={styles.bottomBar}>
          {[["home", "Trang chu"], ["explore", "Kham pha"], ["tickets", "Ve cua toi"], ["profile", "Tai khoan"]].map(([id, label]) => (
            <Pressable key={id} onPress={() => setActiveTab(id as TabId)} style={styles.tabItem}>
              <Text style={[styles.tabText, activeTab === id && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </SafeAreaView>
  );
}
