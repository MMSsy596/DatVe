import React from "react";
import * as SecureStore from "expo-secure-store";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import { BlurView } from "expo-blur";
import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as WebBrowser from "expo-web-browser";
import { ActivityIndicator, Animated, BackHandler, Linking, Platform, Pressable, SafeAreaView, StatusBar as NativeStatusBar, Text, View } from "react-native";
import {
  CheckoutScreen,
  ExploreScreen,
  AuthScreen,
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
  ToastKind,
  ToastPayload,
  ToastTone,
  Voucher,
} from "./src/types";

const DEFAULT_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || "https://datve.up.railway.app/api/v1";
const SESSION_STORAGE_KEY = "datve.mobile.session";
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || "";
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || "";

WebBrowser.maybeCompleteAuthSession();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const movieVisualFallbacks: Record<string, { posterUrl: string; bannerUrl: string }> = {
  "lat-mat-8": {
    posterUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB2rgvSMbSgPRWHVJWKZboWP7oto9WeojcVcyjYezog7C3XhtiPT6_rAhybbWDbdYPbt1owampZ_Ib-4P7Ch_vv-cdChZn6cwQta_O0wHiFHLZwtU7ciPddOJxd2Gy00T-l72O7BDNUsTWL3NpChbctdkTmfjFxqLllkjHRCHzKxUgTYe77p2Kqwo2BLwGnPx_sgJDeFewRPA4hAlndAr_ZcMVvSubAs0egLzxiXsdOzFVxsC6uy4cTu05wtCeZbTbDynAjXmFPgKk",
    bannerUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAQ8A5NMTxAb-_Bmu89IP7-hrig8B8KEnr61OpIx37EiMlPgN1MJpk90-IUH4dqfw8IzzpRuNTDnHbOjf64qCLguwNRYWCekMG3Xdvm6Iuk0qyIgUZrox2AqBG8AvIG7xcwlDH5Xjh64sBHTSH-Kh2BUmx-tLE5lZJPGocbH_-ajI1DSXNEXSmi0s0NwSi7WgFesgpzN2HUdabSpDIFuAVw9urQKAhUmIere9Xshsbesr44WOZ4x2QkQwaH6ybS09KPnv1UZkHQDRY",
  },
  "the-last-voyage": {
    posterUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAuTMSOq4aEHNAsE8301be9PAkR5xaLhg-cVWO6ilEI_IBpXdQsJWYkEyV4sqBVsYFN_SScdsTOC5deQsrLpUOgDWEMUN-VVmoKXpBBjHEM_gO_A9P2vTl5nVqjpf3VUACSDEAOjYB6uK9aDjtde60WT319bo7erZnOLD5XwYnVLE9MJ9j366sCd1N4373rrEuF4BR3FZi6tDOJlFYhh2_wu4gHu0g06m8rzz_fYYDgzOHhfK7QU8Dbd1UsgLhHn7hpcguL3OiLOMk",
    bannerUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDBjub-xwkN_0VWM5G_5o99SB-3C0XBSBAEzCRD-L212cKEKpzyrt9Bvpdy914oHTk1IQi1doniZf5qIfDffq2fMBc7F6YArf3Fkv7T5XvrNeKT4Vjkwy73-V6nV5aRH7rGc8HBQhL2ihAnLI0h3Z5xQjJeK4LlHzdM-HkZj8FmKvPDCBPVVfwBilGM8PMGt1popQRwNvzPNEN2hL3CGuFseANDs7qlvkNMd7KnDydWxaB71xtoh1Qrl3YcI5XoQ-kO99BB4_9u6c4",
  },
  "mua-he-truoc-cua-em": {
    posterUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAaJMeybDDt7q8vRHoP8KkRjyc_QejMjd6SMASxAcqGII27A73dR89dcNe_ykEmHiOX-g1X6PrT9RJx0xGRN5OFjl7gpRHuOBUaFrmhB8zD12m-_8SXRQLEhVaBGwMIXo8hUT34yAW-E5fSmHufA6FBGgwmdEeor93WqFaO6jfYOLmwt6HYsmH-g8l8fn-f9VFvVLBLIQME_Ap92MLbA3LtAK_bvKovfE2MulJOswvjHadJIHkML2TLNXlH_NSHKXaT-7bugwovvrw",
    bannerUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC-tOaKsGJxT6_4WfRJMIMKH70-1CKNHiH2pJ4feAbz94pbydaGWSL09Z_7P3DkZOepZacVlNiQwJ9vIkGRvzhVRm7wq-i07UHvnf31Nkr7IEpCRDO8KNUKUsRvWTFS--DgvHpBN0Mtxxj6grCYQI5Oj4-oMHEQ8HP4HJJwMf6Qmp3kxAfrGiaJR4uJmAEW2Qbu_kBx0BU5ow-AR5cdbXSGcZENyQY0ylyJdWYMddNc62ltYqQZZzEQJVNBH0aX-wbe1u1vkcYybbw",
  },
};

const bannerVisualFallbacks: Record<number, string> = {
  1: "https://lh3.googleusercontent.com/aida-public/AB6AXuAQ8A5NMTxAb-_Bmu89IP7-hrig8B8KEnr61OpIx37EiMlPgN1MJpk90-IUH4dqfw8IzzpRuNTDnHbOjf64qCLguwNRYWCekMG3Xdvm6Iuk0qyIgUZrox2AqBG8AvIG7xcwlDH5Xjh64sBHTSH-Kh2BUmx-tLE5lZJPGocbH_-ajI1DSXNEXSmi0s0NwSi7WgFesgpzN2HUdabSpDIFuAVw9urQKAhUmIere9Xshsbesr44WOZ4x2QkQwaH6ybS09KPnv1UZkHQDRY",
  2: "https://lh3.googleusercontent.com/aida-public/AB6AXuC-tOaKsGJxT6_4WfRJMIMKH70-1CKNHiH2pJ4feAbz94pbydaGWSL09Z_7P3DkZOepZacVlNiQwJ9vIkGRvzhVRm7wq-i07UHvnf31Nkr7IEpCRDO8KNUKUsRvWTFS--DgvHpBN0Mtxxj6grCYQI5Oj4-oMHEQ8HP4HJJwMf6Qmp3kxAfrGiaJR4uJmAEW2Qbu_kBx0BU5ow-AR5cdbXSGcZENyQY0ylyJdWYMddNc62ltYqQZZzEQJVNBH0aX-wbe1u1vkcYybbw",
};

function applyMovieVisualFallback(movie: Movie): Movie {
  const visual = movieVisualFallbacks[movie.slug];
  if (!visual) return movie;
  return {
    ...movie,
    posterUrl: movie.posterUrl ?? visual.posterUrl,
    bannerUrl: movie.bannerUrl ?? visual.bannerUrl,
  };
}

const fallbackBanners: Banner[] = [
  { id: 1, eyebrow: "Khuyến mại toàn hệ thống", title: "Tuần lễ điện ảnh", text: "Mua 2 vé tặng 1 combo mini trong khung giờ vàng.", accent: "#1f2f73" },
  { id: 2, eyebrow: "Suất chiếu sớm", title: "Đêm công chiếu", text: "Đặt trước phim hot và nhận ưu đãi hội viên.", accent: "#5a1826" },
];

const fallbackMovies: Movie[] = [
  applyMovieVisualFallback({ id: 1, slug: "lat-mat-8", title: "Lật Mặt 8", subtitle: "Trên đường đua doanh thu", genre: "Hành động", runtime: "128 phút", score: "9.1", badge: "Nổi bật", tone: "#6d28d9", description: "Phim đang có lượng đặt vé buổi tối cao, phù hợp làm màn hình chủ lực cho trải nghiệm đặt vé.", status: "NOW_SHOWING" }),
  applyMovieVisualFallback({ id: 2, slug: "the-last-voyage", title: "The Last Voyage", subtitle: "Không gian, bí ẩn và sinh tồn", genre: "Viễn tưởng", runtime: "142 phút", score: "8.9", badge: "Đặt nhiều", tone: "#0f766e", description: "Tác phẩm có nhu cầu ghế VIP cao, thích hợp cho luồng chọn ghế và thanh toán thực tế.", status: "TRENDING" }),
  applyMovieVisualFallback({ id: 3, slug: "mua-he-truoc-cua-em", title: "Mùa Hè Trước Cửa Em", subtitle: "Tình cảm, dễ tiếp cận", genre: "Tình cảm", runtime: "115 phút", score: "8.6", badge: "Sắp chiếu", tone: "#9333ea", description: "Nội dung nhẹ, phù hợp nhóm người dùng trẻ và tính năng lưu xem sau.", status: "COMING_SOON" }),
];

const fallbackShowtimes: ShowtimeItem[] = [
  { id: 1, movieId: 1, cinemaId: 1, roomId: 1, cinemaName: "CGV Landmark 81", roomName: "Phòng 01", startTime: "2026-03-30T18:45:00", formatLabel: "IMAX", languageLabel: "Phụ đề", basePrice: 120000, seatLayout: [["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8"], ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8"], ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"], ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"]] },
];

const fallbackCombos: ComboItem[] = [
  { id: 1, name: "Combo Cặp đôi", detail: "2 nước lớn + 1 bắp phô mai", price: "159.000đ", unitPrice: 159000 },
  { id: 2, name: "Combo Gia đình", detail: "4 nước + 2 bắp caramel", price: "289.000đ", unitPrice: 289000 },
  { id: 3, name: "Combo Đêm", detail: "1 hotdog + 1 nước + 1 bắp caramel", price: "119.000đ", unitPrice: 119000 },
];

function hourBucket(startTime: string) {
  const hour = Number(String(startTime).slice(11, 13));
  if (hour < 12) return "MORNING";
  if (hour < 18) return "AFTERNOON";
  return "EVENING";
}

type RouteState = {
  screen: ScreenId;
  tab: TabId;
};

const tabItems: Array<{ id: TabId; label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; activeIcon: React.ComponentProps<typeof MaterialCommunityIcons>["name"] }> = [
  { id: "home", label: "Trang chủ", icon: "home-variant-outline", activeIcon: "home-variant" },
  { id: "explore", label: "Khám phá", icon: "compass-outline", activeIcon: "compass" },
  { id: "tickets", label: "Vé của tôi", icon: "ticket-confirmation-outline", activeIcon: "ticket-confirmation" },
  { id: "profile", label: "Tài khoản", icon: "account-circle-outline", activeIcon: "account-circle" },
];

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
  const [authName, setAuthName] = React.useState("Nguyễn Văn A");
  const [authEmail, setAuthEmail] = React.useState("user@datve.local");
  const [authPhone, setAuthPhone] = React.useState("0900000002");
  const [authPassword, setAuthPassword] = React.useState("User@123");
  const [authLoading, setAuthLoading] = React.useState(false);
  const [authReady, setAuthReady] = React.useState(false);
  const [pushToken, setPushToken] = React.useState<string | null>(null);
  const [vouchersData, setVouchersData] = React.useState<Voucher[]>([]);
  const [voucherCode, setVoucherCode] = React.useState("");
  const [remindersData, setRemindersData] = React.useState<ReminderItem[]>([]);
  const [loadingRemote, setLoadingRemote] = React.useState(false);
  const [toast, setToast] = React.useState<ToastPayload | null>(null);
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
  const [customerName, setCustomerName] = React.useState("Nguyễn Văn A");
  const [customerEmail, setCustomerEmail] = React.useState("user@datve.local");
  const [customerPhone, setCustomerPhone] = React.useState("0900000002");
  const [bottomBarWidth, setBottomBarWidth] = React.useState(0);
  const historyRef = React.useRef<RouteState[]>([]);
  const toastCloseTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastHideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabHighlightX = React.useRef(new Animated.Value(0)).current;
  const tabPressScales = React.useRef(tabItems.map(() => new Animated.Value(1))).current;
  const redirectUri = React.useMemo(
    () =>
      AuthSession.makeRedirectUri({
        scheme: "datve",
        path: "auth",
      }),
    []
  );
  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useIdTokenAuthRequest({
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
    webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
    redirectUri,
  });

  const persistSession = React.useCallback(
    async (nextToken: string | null, nextUser: SessionUser | null) => {
      if (!nextToken || !nextUser) {
        await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
        return;
      }
      await SecureStore.setItemAsync(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          token: nextToken,
          user: nextUser,
        })
      );
    },
    []
  );

  const showToast = React.useCallback((message: string, tone: ToastTone = "info", kind: ToastKind = "system") => {
    if (toastCloseTimerRef.current) clearTimeout(toastCloseTimerRef.current);
    if (toastHideTimerRef.current) clearTimeout(toastHideTimerRef.current);

    const id = Date.now();
    setToast({ id, message, tone, kind, closing: false });

    toastCloseTimerRef.current = setTimeout(() => {
      setToast((prev) => (prev?.id === id ? { ...prev, closing: true } : prev));
    }, 2200);
    toastHideTimerRef.current = setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 2460);
  }, []);

  const applyRoute = React.useCallback((route: RouteState) => {
    setScreen(route.screen);
    setActiveTab(route.tab);
  }, []);

  const navigate = React.useCallback(
    (route: RouteState) => {
      const currentRoute: RouteState = { screen, tab: activeTab };
      if (currentRoute.screen === route.screen && currentRoute.tab === route.tab) return;
      historyRef.current.push(currentRoute);
      applyRoute(route);
    },
    [activeTab, applyRoute, screen]
  );

  const resetNavigation = React.useCallback(
    (route: RouteState) => {
      historyRef.current = [];
      applyRoute(route);
    },
    [applyRoute]
  );

  const goBack = React.useCallback(() => {
    const previousRoute = historyRef.current.pop();
    if (!previousRoute) return false;
    applyRoute(previousRoute);
    return true;
  }, [applyRoute]);

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
        throw new Error(json.error ?? "Yêu cầu thất bại");
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
      const [meJson, catalog] = await Promise.all([
        authToken ? requestJson("/auth/me") : Promise.resolve(null),
        requestJson("/catalog"),
      ]);
      setSessionUser(meJson?.user ?? null);

      const remoteMovies: Movie[] = (catalog.featuredMovies ?? []).map((item: any) =>
        applyMovieVisualFallback({
          id: item.id,
          slug: item.slug,
          title: item.title,
          subtitle: item.subtitle ?? "",
          genre: item.genre,
          runtime: `${item.durationMinutes} phút`,
          score: String(item.rating),
          badge: item.badge ?? "Đang chiếu",
          tone: item.highlightColor ?? "#c41010",
          description: item.subtitle ?? "Phim đang được quản lý từ backend Đặt Vé.",
          status: String(item.status ?? "NOW_SHOWING").toUpperCase(),
          posterUrl: absolutizeAssetUrl(item.posterUrl),
          bannerUrl: absolutizeAssetUrl(item.bannerUrl),
        })
      );

      setBannersData(
        ((catalog.banners ?? []).length > 0 ? catalog.banners : fallbackBanners).map((item: any) => ({
          id: item.id,
          eyebrow: item.eyebrow ?? "Khuyến mại toàn hệ thống",
          title: item.title,
          text: item.subtitle ?? item.text ?? "Ưu đãi mới dành cho thành viên Đặt Vé.",
          accent: item.accentColor ?? item.accent ?? "#1f2f73",
          imageUrl: absolutizeAssetUrl(item.imageUrl) ?? bannerVisualFallbacks[item.id] ?? null,
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
          detail: item.description ?? item.detail ?? "Combo Đặt Vé",
          price: typeof item.price === "string" ? item.price : `${Number(item.price).toLocaleString("vi-VN")}đ`,
          unitPrice: Number(item.unitPrice ?? item.price),
        }))
      );
      if (!authToken) {
        setTickets([]);
        setFavoriteMovieIds([]);
        setWatchlistMovieIds([]);
        setProfileData(null);
        setVouchersData([]);
        setRemindersData([]);
        return;
      }

      const [bookingJson, favoriteJson, watchlistJson, profileJson, voucherJson, reminderJson] = await Promise.all([
        requestJson("/bookings"),
        requestJson("/favorites"),
        requestJson("/watchlist"),
        requestJson("/profile"),
        requestJson("/vouchers"),
        requestJson("/reminders"),
      ]);

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
      const message = error instanceof Error ? error.message : "Không tải được dữ liệu";
      if (authToken && /unauthorized|token|đăng nhập|phiên/i.test(message.toLowerCase())) {
        setAuthToken(null);
        setSessionUser(null);
        setProfileData(null);
        setTickets([]);
        setFavoriteMovieIds([]);
        setWatchlistMovieIds([]);
        setVouchersData([]);
        setRemindersData([]);
      }
      showToast(message, "error", "system");
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
          showToast(error instanceof Error ? error.message : "Kh?ng th? t?i s? ?? gh?", "error", "seat");
        }
        setSeatMapRows([]);
        return null;
      }
    },
    [requestJson, showToast]
  );

  React.useEffect(() => {
    let active = true;
    SecureStore.getItemAsync(SESSION_STORAGE_KEY)
      .then((raw) => {
        if (!active || !raw) return;
        const saved = JSON.parse(raw) as { token?: string; user?: SessionUser | null };
        if (!saved.token || !saved.user) return;
        setAuthToken(saved.token);
        setSessionUser(saved.user);
        setCustomerName(saved.user.fullName);
        setCustomerEmail(saved.user.email);
        setCustomerPhone(saved.user.phone ?? "");
      })
      .catch(() => null)
      .finally(() => {
        if (active) setAuthReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (!authReady) return;
    loadRemoteData();
  }, [authReady, loadRemoteData]);

  React.useEffect(() => {
    if (pushToken) return;
    registerDevicePush().catch(() => null);
  }, [pushToken, registerDevicePush]);

  React.useEffect(() => {
    if (!authReady) return;
    persistSession(authToken, sessionUser).catch(() => null);
  }, [authReady, authToken, persistSession, sessionUser]);

  React.useEffect(() => () => {
    if (toastCloseTimerRef.current) clearTimeout(toastCloseTimerRef.current);
    if (toastHideTimerRef.current) clearTimeout(toastHideTimerRef.current);
  }, []);

  React.useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => goBack());
    return () => subscription.remove();
  }, [goBack]);

  React.useEffect(() => {
    if (!bottomBarWidth) return;
    const activeIndex = tabItems.findIndex((item) => item.id === activeTab);
    const pillWidth = (bottomBarWidth - 24) / tabItems.length;
    Animated.spring(tabHighlightX, {
      toValue: pillWidth * Math.max(activeIndex, 0),
      tension: 90,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, [activeTab, bottomBarWidth, tabHighlightX]);

  const animateTabPress = React.useCallback(
    (index: number, pressed: boolean) => {
      const scale = tabPressScales[index];
      if (!scale) {
        return;
      }
      Animated.spring(scale, {
        toValue: pressed ? 0.94 : 1,
        tension: 220,
        friction: 14,
        useNativeDriver: true,
      }).start();
    },
    [tabPressScales]
  );

  React.useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      const normalized = url.replace("datve://", "https://datve.local/");
      const parsed = new URL(normalized);
      if (parsed.pathname.replace(/^\//, "") !== "payment-result") return;
      const status = String(parsed.searchParams.get("status") ?? "");
      const provider = String(parsed.searchParams.get("provider") ?? "");
      if (status === "SUCCESS") showToast(`${provider} ?? c?p nh?t v? c?a b?n sang ?? thanh to?n.`, "success", "payment");
      else if (status) showToast(`${provider} tr? v? tr?ng th?i ${status}.`, "error", "payment");
      resetNavigation({ screen: "tabs", tab: "tickets" });
      loadRemoteData();
    });
    return () => subscription.remove();
  }, [loadRemoteData, resetNavigation, showToast]);

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
          showToast("C? gh? v?a ???c gi? ? thi?t b? kh?c. Danh s?ch gh? ?? ???c l?m m?i.", "info", "seat");
        }
        return next;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchSeatMap, screen, selectedShowtime, showToast]);

  const openMovie = React.useCallback((movie: Movie) => {
    setSelectedMovie(movie);
    navigate({ screen: "movie", tab: activeTab });
  }, [activeTab, navigate]);

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
      navigate({ screen: "seats", tab: activeTab });
    },
    [activeTab, fetchSeatMap, navigate, showtimesData]
  );

  const openTicketDetail = React.useCallback(
    async (ticket: TicketItem) => {
      try {
        const json = await requestJson(`/bookings/${ticket.bookingId}`);
        setSelectedTicketDetail(json);
        navigate({ screen: "ticket", tab: activeTab });
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Kh?ng th? t?i chi ti?t v?", "error", "ticket");
      }
    },
    [activeTab, navigate, requestJson, showToast]
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
        throw new Error(json.error ?? "Không thể cập nhật danh sách");
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
            ? { email: authEmail, password: authPassword, deviceName: "Thiết bị Android" }
            : { fullName: authName, email: authEmail, phone: authPhone, password: authPassword }
        ),
      });
      setAuthToken(json.token);
      setSessionUser(json.user);
      setCustomerName(json.user.fullName);
      setCustomerEmail(json.user.email);
      setCustomerPhone(json.user.phone ?? "");
      showToast(authMode === "login" ? "??ng nh?p th?nh c?ng." : "??ng k? th?nh c?ng.", "success", "auth");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Kh?ng th? x?c th?c t?i kho?n", "error", "auth");
    } finally {
      setAuthLoading(false);
    }
  };

  const continueWithGoogle = React.useCallback(() => {
    if (!GOOGLE_ANDROID_CLIENT_ID || !GOOGLE_WEB_CLIENT_ID) {
      showToast("Chưa cấu hình Google Client ID cho Android/Web.", "error", "auth");
      return;
    }
    if (!googleRequest) {
      showToast("Đang chuẩn bị Google Sign-In, thử lại sau một chút.", "info", "auth");
      return;
    }
    setAuthLoading(true);
    promptGoogleAsync().catch((error) => {
      setAuthLoading(false);
      showToast(error instanceof Error ? error.message : "Không thể mở Google Sign-In", "error", "auth");
    });
  }, [googleRequest, promptGoogleAsync, showToast]);

  React.useEffect(() => {
    if (!googleResponse) {
      return;
    }
    if (googleResponse.type === "dismiss" || googleResponse.type === "cancel") {
      setAuthLoading(false);
      return;
    }
    if (googleResponse.type !== "success") {
      setAuthLoading(false);
      showToast("Đăng nhập Google thất bại.", "error", "auth");
      return;
    }

    const idToken =
      (typeof googleResponse.params?.id_token === "string" ? googleResponse.params.id_token : null) ??
      googleResponse.authentication?.idToken ??
      null;

    if (!idToken) {
      setAuthLoading(false);
      showToast("Google không trả về id_token hợp lệ.", "error", "auth");
      return;
    }

    let disposed = false;
    const run = async () => {
      try {
        const json = await requestJson("/auth/google", {
          method: "POST",
          body: JSON.stringify({
            idToken,
            deviceName: Device.deviceName || "Thiết bị Android",
          }),
        });
        if (disposed) {
          return;
        }
        setAuthToken(json.token);
        setSessionUser(json.user);
        setCustomerName(json.user.fullName);
        setCustomerEmail(json.user.email);
        setCustomerPhone(json.user.phone ?? "");
        showToast("Đăng nhập Google thành công.", "success", "auth");
      } catch (error) {
        if (disposed) {
          return;
        }
        showToast(
          error instanceof Error ? error.message : "Không thể hoàn tất đăng nhập Google",
          "error",
          "auth"
        );
      } finally {
        if (!disposed) {
          setAuthLoading(false);
        }
      }
    };

    void run();

    return () => {
      disposed = true;
    };
  }, [googleResponse, requestJson, showToast]);

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
      showToast("?? ??ng xu?t.", "info", "auth");
    }
  };

  const toggleFavorite = async () => {
    const enabled = !favoriteMovieIds.includes(selectedMovie.id);
    try {
      await syncMovieListToggle("favorites", selectedMovie.id, enabled);
      setFavoriteMovieIds((prev) =>
        enabled ? [...prev, selectedMovie.id] : prev.filter((id) => id !== selectedMovie.id)
      );
      showToast(enabled ? "?? th?m v?o y?u th?ch." : "?? b? kh?i y?u th?ch.", "success", "favorite");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Kh?ng th? c?p nh?t y?u th?ch", "error", "favorite");
    }
  };

  const toggleWatchlist = async () => {
    const enabled = !watchlistMovieIds.includes(selectedMovie.id);
    try {
      await syncMovieListToggle("watchlist", selectedMovie.id, enabled);
      setWatchlistMovieIds((prev) =>
        enabled ? [...prev, selectedMovie.id] : prev.filter((id) => id !== selectedMovie.id)
      );
      showToast(enabled ? "?? th?m v?o xem sau." : "?? b? kh?i xem sau.", "success", "favorite");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Kh?ng th? c?p nh?t xem sau", "error", "favorite");
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
    if (selectedSeats.length === 0) return showToast("H?y ch?n ?t nh?t 1 gh? tr??c khi ti?p t?c.", "error", "seat");
    const showtime = selectedShowtime ?? showtimesData.find((item) => item.movieId === selectedMovie.id);
    if (!showtime) return showToast("Hi?n ch?a c? su?t chi?u ph? h?p cho phim n?y.", "error", "seat");
    setHolding(true);
    try {
      const response = await fetch(`${apiBaseUrl}/bookings/hold`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...apiHeaders() },
        body: JSON.stringify({ showtimeId: showtime.id, seats: selectedSeats }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Không thể giữ ghế");
      setHeldBookingId(json.id);
      navigate({ screen: "checkout", tab: activeTab });
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Kh?ng th? gi? gh?", "error", "seat");
      await fetchSeatMap(showtime.id);
    } finally {
      setHolding(false);
    }
  };

  const confirmBooking = async () => {
    if (!heldBookingId) return showToast("C?n gi? gh? tr??c khi t?o booking.", "error", "seat");
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
      if (!response.ok) throw new Error(json.error ?? "Không thể tạo booking");

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
      if (!paymentResponse.ok) throw new Error(paymentJson.error ?? "Không thể tạo thanh toán");

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
      showToast(`M? v? ${json.bookingCode} ?? ???c t?o. ?ang m? ${selectedPaymentProvider}.`, "success", "payment");
      await Linking.openURL(paymentJson.checkoutUrl);
      resetNavigation({ screen: "tabs", tab: "tickets" });
      setSelectedSeats([]);
      setSelectedComboIds([]);
      setVoucherCode("");
      setHeldBookingId(null);
      await loadRemoteData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Kh?ng th? t?o booking", "error", "payment");
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
      showToast("?? ??t nh?c tr??c 1 gi?.", "success", "reminder");
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
      showToast(error instanceof Error ? error.message : "Kh?ng th? ??t nh?c l?ch", "error", "reminder");
    }
  };

  const cancelTicketReminder = async () => {
    if (!selectedTicketDetail) return;
    try {
      await requestJson(`/bookings/${selectedTicketDetail.id}/reminder`, { method: "DELETE" });
      showToast("?? h?y nh?c l?ch.", "info", "reminder");
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
      showToast(error instanceof Error ? error.message : "Kh?ng th? h?y nh?c l?ch", "error", "reminder");
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
  const activePillWidth = bottomBarWidth > 0 ? (bottomBarWidth - 24) / tabItems.length : 0;
  const requiresAuth = !sessionUser;

  if (!authReady) {
    content = (
      <View style={[styles.scrollContent, { flex: 1, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={palette.cyan} />
        <Text style={styles.accountDetail}>Đang khôi phục phiên đăng nhập...</Text>
      </View>
    );
  } else if (requiresAuth) {
    content = (
      <AuthScreen
        apiBaseUrl={apiBaseUrl}
        setApiBaseUrl={setApiBaseUrl}
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
        onGoogleAuth={continueWithGoogle}
        authLoading={authLoading}
      />
    );
  } else if (screen === "movie") {
    content = (
      <MovieDetailScreen
        movie={selectedMovie}
        onBack={() => goBack()}
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
        onBack={() => goBack()}
        onContinue={holdCurrentSeats}
        selectedSeats={selectedSeats}
        onToggleSeat={toggleSeat}
        holding={holding}
        seatMapRows={seatMapRows}
      />
    );
  } else if (screen === "ticket" && selectedTicketDetail) {
    content = <TicketDetailScreen ticket={selectedTicketDetail} onBack={() => goBack()} onScheduleReminder={scheduleReminder} onCancelReminder={cancelTicketReminder} />;
  } else if (screen === "checkout") {
    content = (
      <CheckoutScreen
        movie={selectedMovie}
        onBack={() => goBack()}
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
        onLogout={logout}
      />
    );
  }

  const androidTopInset = Platform.OS === "android" ? NativeStatusBar.currentHeight ?? 0 : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" translucent={false} />
      <View style={[styles.topBar, { paddingTop: 14 + androidTopInset }]}>
        <Text style={styles.brand}>ĐẶT VÉ</Text>
        {loadingRemote ? <ActivityIndicator color={palette.cyan} /> : <View style={styles.avatarMini} />}
      </View>
      {toast ? <Toast toastId={toast.id} message={toast.message} tone={toast.tone} kind={toast.kind} closing={toast.closing} /> : null}
      {content}
      {screen === "tabs" && !requiresAuth ? (
        <BlurView intensity={32} tint="dark" style={styles.bottomBar} onLayout={(event) => setBottomBarWidth(event.nativeEvent.layout.width)}>
          {bottomBarWidth > 0 ? (
            <>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.tabItemGlow,
                  {
                    width: activePillWidth,
                    transform: [{ translateX: tabHighlightX }],
                  },
                ]}
              />
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.tabItemActive,
                  {
                    width: activePillWidth,
                    transform: [{ translateX: tabHighlightX }],
                  },
                ]}
              />
            </>
          ) : null}
          {tabItems.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={() => navigate({ screen: "tabs", tab: item.id })}
              onPressIn={() => animateTabPress(index, true)}
              onPressOut={() => animateTabPress(index, false)}
              style={styles.tabPressable}
              hitSlop={10}
            >
              <Animated.View style={[styles.tabItem, { transform: [{ scale: tabPressScales[index] }] }]}>
                <MaterialCommunityIcons name={activeTab === item.id ? item.activeIcon : item.icon} size={20} style={[styles.tabIcon, activeTab === item.id && styles.tabIconActive]} />
                <Text style={[styles.tabText, activeTab === item.id && styles.tabTextActive]}>{item.label}</Text>
              </Animated.View>
            </Pressable>
          ))}
        </BlurView>
      ) : null}
    </SafeAreaView>
  );
}
