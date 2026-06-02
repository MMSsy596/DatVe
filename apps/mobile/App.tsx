import React from "react";
import * as SecureStore from "expo-secure-store";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { ActivityIndicator, Animated, BackHandler, Dimensions, Image, Linking, Modal, PanResponder, Platform, Pressable, SafeAreaView, StatusBar as NativeStatusBar, Text, View } from "react-native";
import {
  AssistantScreen,
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
  UserMovieListScreen,
} from "./src/components";
import {
  useFonts,
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_700Bold,
  BeVietnamPro_800ExtraBold,
  BeVietnamPro_900Black,
} from "@expo-google-fonts/be-vietnam-pro";
import { palette, styles } from "./src/theme";
import {
  AssistantMessage,
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

const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const isLocalWebHost =
  Platform.OS === "web" &&
  typeof globalThis.location?.hostname === "string" &&
  ["localhost", "127.0.0.1"].includes(globalThis.location.hostname);
const localNativeApiBaseUrl =
  Platform.OS === "android" ? "http://10.0.2.2:3001/api/v1" : "http://localhost:3001/api/v1";
const DEFAULT_API_BASE_URL = isLocalWebHost
  ? "http://localhost:3001/api/v1"
  : configuredApiBaseUrl || localNativeApiBaseUrl;
const SESSION_STORAGE_KEY = "cineplus.mobile.session";
const ASSISTANT_SETTINGS_STORAGE_KEY = "cineplus.mobile.assistant.settings";
const DEFAULT_API_ORIGIN = DEFAULT_API_BASE_URL.replace(/\/api\/v1\/?$/, "");
const APP_DISPLAY_NAME = "CinePlus";
const TOAST_HIDE_BUFFER_MS = 260;
const SWIPE_BACK_EDGE_WIDTH = Platform.OS === "android" ? 30 : 24;
const SWIPE_BACK_TRIGGER_X = Platform.OS === "android" ? 94 : 78;
const SWIPE_BACK_MIN_VELOCITY = Platform.OS === "android" ? 0.24 : 0.18;
const ASSISTANT_BUBBLE_SIZE = 58;
const ASSISTANT_SEED_PROMPTS = [
  "Mình rảnh 20:00 tối nay, gợi ý phim đang hot.",
  "Ngân sách 350k cho 2 người, chọn phim + combo giúp mình.",
  "Mình thích hành động, rạp nào còn nhiều ghế đẹp?",
  "Gợi ý suất chiếu ngày mai sau 19:30.",
];

type AssistantApiResponse = {
  answer: string;
  suggestions: Array<{
    movieId: number;
    showtimeId: number;
    comboId: number | null;
    ticketCount: number;
    movieTitle: string;
    cinemaName: string;
    startTime: string;
    estimatedTotal: number;
    reason: string;
    comboName?: string | null;
  }>;
  source: "llm" | "rule-based";
};

function estimateToastVisibleMs(message: string) {
  const trimmedLength = message.trim().length;
  return Math.min(7600, Math.max(2400, 2200 + Math.max(0, trimmedLength - 24) * 72));
}

function demoMediaUrl(path: string) {
  return path.startsWith("/") ? `${DEFAULT_API_ORIGIN}${path}` : `${DEFAULT_API_ORIGIN}/${path}`;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const fallbackBanners: Banner[] = [
  { id: 1, eyebrow: "Khuyến mại toàn hệ thống", title: "Tuần lễ điện ảnh", text: "Mua 2 vé tặng 1 combo mini trong khung giờ vàng.", accent: "#1f2f73", imageUrl: demoMediaUrl("/demo-media/promos/banner-1.svg") },
  { id: 2, eyebrow: "Suất chiếu sớm", title: "Đêm công chiếu", text: "Đặt trước phim hot và nhận ưu đãi hội viên.", accent: "#5a1826", imageUrl: demoMediaUrl("/demo-media/promos/banner-2.svg") },
];

const fallbackMovies: Movie[] = [
  { id: 1, slug: "lat-mat-8", title: "Lật Mặt 8", subtitle: "Trên đường đua doanh thu", genre: "Hành động", runtime: "118 phút", score: "7.6", badge: "Nổi bật", tone: "#6d28d9", description: "Chuyện gia đình với nhiều tình huống bất ngờ, hài hước và cảm xúc.", status: "NOW_SHOWING", posterUrl: demoMediaUrl("/demo-media/posters/lat-mat-8.svg"), bannerUrl: demoMediaUrl("/demo-media/banners/lat-mat-8.svg"), trailerUrl: "https://www.youtube.com/embed/EXeTwQWrcwY?playsinline=1" },
  { id: 2, slug: "nguoi-nhen-da-vu-tru", title: "Người Nhện Đa Vũ Trụ", subtitle: "Cuộc đua vá lại đa vũ trụ", genre: "Hành động, Viễn tưởng", runtime: "142 phút", score: "8.7", badge: "Đặt nhiều", tone: "#0f766e", description: "Peter và các đồng đội phải vá lại vết nứt đa vũ trụ trước khi mọi thực tại sụp đổ.", status: "TRENDING", posterUrl: demoMediaUrl("/demo-media/posters/nguoi-nhen-da-vu-tru.svg"), bannerUrl: demoMediaUrl("/demo-media/banners/nguoi-nhen-da-vu-tru.svg"), trailerUrl: "https://www.youtube.com/embed/TcMBFSGVi1c?playsinline=1" },
  { id: 3, slug: "mat-ma-bien-dem", title: "Mật Mã Biển Đêm", subtitle: "Truy đuổi xuyên biên giới", genre: "Hành động, Tội phạm", runtime: "123 phút", score: "8.2", badge: "Hot", tone: "#9333ea", description: "Đội điều tra truy đuổi đường dây rửa tiền xuyên quốc gia.", status: "NOW_SHOWING", posterUrl: demoMediaUrl("/demo-media/posters/mat-ma-bien-dem.svg"), bannerUrl: demoMediaUrl("/demo-media/banners/mat-ma-bien-dem.svg"), trailerUrl: "https://www.youtube.com/embed/8ugaeA-nMTc?playsinline=1" },
  { id: 4, slug: "hanh-tinh-thu-chin", title: "Hành Tinh Thứ Chín", subtitle: "Bí mật ngoài Hệ Mặt Trời", genre: "Viễn tưởng, Khoa học", runtime: "131 phút", score: "8.1", badge: "Nổi bật", tone: "#c41010", description: "Chuyến bay thăm dò xa nhất loài người mở ra bí mật ngoài Hệ Mặt Trời.", status: "NOW_SHOWING", posterUrl: demoMediaUrl("/demo-media/posters/hanh-tinh-thu-chin.svg"), bannerUrl: demoMediaUrl("/demo-media/banners/hanh-tinh-thu-chin.svg"), trailerUrl: "https://www.youtube.com/embed/hA6hldpSTF8?playsinline=1" },
  { id: 5, slug: "chien-tuyen-do", title: "Chiến Tuyến Đỏ", subtitle: "Nhiệm vụ sát biên giới", genre: "Chiến tranh, Chính kịch", runtime: "133 phút", score: "7.4", badge: "Sắp chiếu", tone: "#0f4c81", description: "Tiểu đội đặc nhiệm nhận nhiệm vụ không tưởng ở biên giới.", status: "COMING_SOON", posterUrl: demoMediaUrl("/demo-media/posters/chien-tuyen-do.svg"), bannerUrl: demoMediaUrl("/demo-media/banners/chien-tuyen-do.svg"), trailerUrl: "https://www.youtube.com/embed/qSqVVswa420?playsinline=1" },
  { id: 6, slug: "mua-he-cua-chung-ta", title: "Mùa Hè Của Chúng Ta", subtitle: "Thanh xuân gặp lại", genre: "Thanh xuân, Tình cảm", runtime: "113 phút", score: "7.8", badge: "Theo dõi", tone: "#8a1f3d", description: "Nhóm bạn cũ gặp lại sau 10 năm trong chuyến đi cuối hè.", status: "COMING_SOON", posterUrl: demoMediaUrl("/demo-media/posters/mua-he-cua-chung-ta.svg"), bannerUrl: demoMediaUrl("/demo-media/banners/mua-he-cua-chung-ta.svg"), trailerUrl: "https://www.youtube.com/embed/6ZfuNTqbHE8?playsinline=1" },
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

function hasNotificationPermission(permission: Notifications.NotificationPermissionsStatus) {
  const normalized = permission as Notifications.NotificationPermissionsStatus & {
    granted?: boolean;
    status?: string;
  };
  return (
    normalized.granted === true ||
    normalized.status === "granted" ||
    normalized.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

type RouteState = {
  screen: ScreenId;
  tab: TabId;
};

const tabItems: Array<{ id: TabId; label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; activeIcon: React.ComponentProps<typeof MaterialCommunityIcons>["name"] }> = [
  { id: "home", label: "Trang chủ", icon: "home-variant-outline", activeIcon: "home-variant" },
  { id: "explore", label: "Khám phá", icon: "compass-outline", activeIcon: "compass" },
  { id: "assistant", label: "AI", icon: "robot-outline", activeIcon: "robot" },
  { id: "favorites", label: "Yêu thích", icon: "heart-outline", activeIcon: "heart" },
  { id: "watchlist", label: "Xem sau", icon: "bookmark-outline", activeIcon: "bookmark" },
  { id: "tickets", label: "Vé", icon: "ticket-confirmation-outline", activeIcon: "ticket-confirmation" },
  { id: "profile", label: "Tài khoản", icon: "account-circle-outline", activeIcon: "account-circle" },
];

export default function App() {
  const [fontsLoaded] = useFonts({
    "BeVietnamPro-Regular": BeVietnamPro_400Regular,
    "BeVietnamPro-Medium": BeVietnamPro_500Medium,
    "BeVietnamPro-Bold": BeVietnamPro_700Bold,
    "BeVietnamPro-ExtraBold": BeVietnamPro_800ExtraBold,
    "BeVietnamPro-Black": BeVietnamPro_900Black,
  });
  const [activeTab, setActiveTab] = React.useState<TabId>("home");
  const [screen, setScreen] = React.useState<ScreenId>("tabs");
  const [apiBaseUrl, setApiBaseUrl] = React.useState(DEFAULT_API_BASE_URL);
  const [clockNow, setClockNow] = React.useState(() => new Date());
  const [networkStatus, setNetworkStatus] = React.useState<"online" | "offline">("offline");
  const [selectedMovie, setSelectedMovie] = React.useState<Movie>(fallbackMovies[0]);
  const [movieEntrySource, setMovieEntrySource] = React.useState<"home" | "default">("default");
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
  const [authEmail, setAuthEmail] = React.useState("user@cineplus.local");
  const [authPhone, setAuthPhone] = React.useState("0900000002");
  const [authPassword, setAuthPassword] = React.useState("User@123");
  const [authLoading, setAuthLoading] = React.useState(false);
  const [logoutLoading, setLogoutLoading] = React.useState(false);
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
  const [exploreFavoriteFilter, setExploreFavoriteFilter] = React.useState<"ALL" | "ONLY">("ALL");
  const [exploreWatchlistFilter, setExploreWatchlistFilter] = React.useState<"ALL" | "ONLY">("ALL");
  const [holding, setHolding] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const [favoriteSubmitting, setFavoriteSubmitting] = React.useState(false);
  const [watchlistSubmitting, setWatchlistSubmitting] = React.useState(false);
  const [ticketOpeningId, setTicketOpeningId] = React.useState<number | null>(null);
  const [seatLoadingMovieId, setSeatLoadingMovieId] = React.useState<number | null>(null);
  const [seatLoadingShowtimeId, setSeatLoadingShowtimeId] = React.useState<number | null>(null);
  const [reminderLoading, setReminderLoading] = React.useState<"schedule" | "cancel" | null>(null);
  const [heldBookingId, setHeldBookingId] = React.useState<number | null>(null);
  const [selectedComboIds, setSelectedComboIds] = React.useState<number[]>([]);
  const [selectedPaymentProvider, setSelectedPaymentProvider] = React.useState<PaymentProvider>("MOMO");
  const [selectedPaymentGatewayMode, setSelectedPaymentGatewayMode] = React.useState<"SANDBOX" | "REAL">("SANDBOX");
  const [customerName, setCustomerName] = React.useState("Nguyễn Văn A");
  const [customerEmail, setCustomerEmail] = React.useState("user@cineplus.local");
  const [customerPhone, setCustomerPhone] = React.useState("0900000002");
  const [bottomBarWidth, setBottomBarWidth] = React.useState(0);
  const [authGateMessage, setAuthGateMessage] = React.useState<string | null>(null);
  const [authReturnRoute, setAuthReturnRoute] = React.useState<RouteState | null>(null);
  const [assistantMessages, setAssistantMessages] = React.useState<AssistantMessage[]>([
    {
      id: "assistant-welcome",
      role: "assistant",
      text: "Xin chào NanBao 男宝, mình là trợ lý AI đặt vé. Bạn có thể hỏi theo giờ rảnh, gu phim, ngân sách hoặc yêu cầu gợi ý combo.",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [assistantInput, setAssistantInput] = React.useState("");
  const [assistantSending, setAssistantSending] = React.useState(false);
  const [assistantMiniOpen, setAssistantMiniOpen] = React.useState(false);
  const [assistantQuickLoading, setAssistantQuickLoading] = React.useState(false);
  const [assistantQuickPeople, setAssistantQuickPeople] = React.useState(2);
  const [assistantQuickBudget, setAssistantQuickBudget] = React.useState(350000);
  const [assistantQuickConfigVisible, setAssistantQuickConfigVisible] = React.useState(false);
  const [assistantTrustSession, setAssistantTrustSession] = React.useState(false);
  const [assistantSettingsHydrated, setAssistantSettingsHydrated] = React.useState(false);
  const [assistantConfirmVisible, setAssistantConfirmVisible] = React.useState(false);
  const [assistantConfirmRemember, setAssistantConfirmRemember] = React.useState(false);
  const [assistantPendingSuggestion, setAssistantPendingSuggestion] = React.useState<{
    movieId: number;
    showtimeId: number;
    comboId: number | null;
    ticketCount: number;
    movieTitle: string;
    cinemaName: string;
    startTime: string;
    comboName?: string | null;
  } | null>(null);
  const historyRef = React.useRef<RouteState[]>([]);
  const toastCloseTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastHideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabHighlightX = React.useRef(new Animated.Value(0)).current;
  const tabPressScales = React.useRef(tabItems.map(() => new Animated.Value(1))).current;
  const routeOpacity = React.useRef(new Animated.Value(1)).current;
  const routeTranslateX = React.useRef(new Animated.Value(0)).current;
  const routeTranslateY = React.useRef(new Animated.Value(0)).current;
  const routeScale = React.useRef(new Animated.Value(1)).current;
  const swipeBackTranslateX = React.useRef(new Animated.Value(0)).current;
  const routeDirectionRef = React.useRef<1 | -1 | 0>(0);
  const previousRouteKeyRef = React.useRef(`${screen}:${activeTab}`);
  const assistantBubblePos = React.useRef(new Animated.ValueXY({
    x: Math.max(12, Dimensions.get("window").width - 12 - ASSISTANT_BUBBLE_SIZE),
    y: Math.max(96, Dimensions.get("window").height - 210 - ASSISTANT_BUBBLE_SIZE),
  })).current;
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
    const visibleMs = estimateToastVisibleMs(message);
    setToast({ id, message, tone, kind, closing: false, visibleMs });

    toastCloseTimerRef.current = setTimeout(() => {
      setToast((prev) => (prev?.id === id ? { ...prev, closing: true } : prev));
    }, visibleMs);
    toastHideTimerRef.current = setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, visibleMs + TOAST_HIDE_BUFFER_MS);
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
      routeDirectionRef.current = 1;
      applyRoute(route);
    },
    [activeTab, applyRoute, screen]
  );

  const resetNavigation = React.useCallback(
    (route: RouteState) => {
      historyRef.current = [];
      routeDirectionRef.current = 0;
      applyRoute(route);
    },
    [applyRoute]
  );

  const goBack = React.useCallback(() => {
    const previousRoute = historyRef.current.pop();
    if (!previousRoute) return false;
    routeDirectionRef.current = -1;
    Haptics.impactAsync(Platform.OS === "android" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => null);
    applyRoute(previousRoute);
    return true;
  }, [applyRoute]);

  const promptAuth = React.useCallback(
    (message: string, returnRoute?: RouteState) => {
      const nextReturnRoute = returnRoute ?? { screen, tab: activeTab };
      setAuthGateMessage(message);
      setAuthReturnRoute(nextReturnRoute);
      navigate({ screen: "auth", tab: nextReturnRoute.tab });
    },
    [activeTab, navigate, screen]
  );

  const finishAuthGate = React.useCallback(() => {
    const nextRoute =
      authReturnRoute && authReturnRoute.screen !== "auth"
        ? authReturnRoute
        : { screen: "tabs" as ScreenId, tab: activeTab };
    setAuthGateMessage(null);
    setAuthReturnRoute(null);
    resetNavigation(nextRoute);
  }, [activeTab, authReturnRoute, resetNavigation]);

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
  const healthcheckUrl = React.useMemo(() => `${apiOrigin}/api/health`, [apiOrigin]);
  const liveClockLabel = React.useMemo(
    () =>
      clockNow.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    [clockNow]
  );

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

      const remoteMovies: Movie[] = (catalog.featuredMovies ?? []).map((item: any) => ({
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
        trailerUrl: absolutizeAssetUrl(item.trailerUrl),
      }));

      setBannersData(
        ((catalog.banners ?? []).length > 0 ? catalog.banners : fallbackBanners).map((item: any) => ({
          id: item.id,
          eyebrow: item.eyebrow ?? "Khuyến mại toàn hệ thống",
          title: item.title,
          text: item.subtitle ?? item.text ?? "Ưu đãi mới dành cho thành viên Đặt Vé.",
          accent: item.accentColor ?? item.accent ?? "#1f2f73",
          imageUrl: absolutizeAssetUrl(item.imageUrl) ?? null,
        }))
      );
      setMoviesData(remoteMovies.length > 0 ? remoteMovies : fallbackMovies);
      setSelectedMovie((prev) => remoteMovies.find((item) => item.id === prev.id) ?? remoteMovies[0] ?? prev);
      setShowtimesData(
        (catalog.showtimes ?? []).map((item: any) => {
          const seatLayout = item.seatLayout ?? fallbackShowtimes[0].seatLayout;
          const totalSeats = Number(item.totalSeats ?? seatLayout.flat().length ?? 0);
          return {
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
            seatLayout,
            totalSeats,
            availableSeats: Number(item.availableSeats ?? totalSeats),
          };
        })
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
    let granted = hasNotificationPermission(currentPermission);
    if (!granted) {
      const requested = await Notifications.requestPermissionsAsync();
      granted = hasNotificationPermission(requested);
    }
    if (!granted) return;

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

  const pingHealthcheck = React.useCallback(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    try {
      const response = await fetch(healthcheckUrl, {
        method: "GET",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      setNetworkStatus(response.ok ? "online" : "offline");
    } catch {
      setNetworkStatus("offline");
    } finally {
      clearTimeout(timeout);
    }
  }, [healthcheckUrl]);

  const fetchSeatMap = React.useCallback(
    async (showtimeId: number, silent = false) => {
      try {
        const json = await requestJson(`/showtimes/${showtimeId}/seats`);
        const rows = (json.rows ?? []) as SeatMapRow[];
        setSeatMapRows(rows);
        return rows;
      } catch (error) {
        if (!silent) {
          showToast(error instanceof Error ? error.message : "Không thể tải sơ đồ ghế", "error", "seat");
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
    let active = true;
    SecureStore.getItemAsync(ASSISTANT_SETTINGS_STORAGE_KEY)
      .then((raw) => {
        if (!active || !raw) return;
        const saved = JSON.parse(raw) as {
          quickPeople?: number;
          quickBudget?: number;
          trustByDefault?: boolean;
        };
        if (typeof saved.quickPeople === "number" && Number.isFinite(saved.quickPeople)) {
          setAssistantQuickPeople(Math.max(1, Math.min(8, Math.round(saved.quickPeople))));
        }
        if (typeof saved.quickBudget === "number" && Number.isFinite(saved.quickBudget)) {
          setAssistantQuickBudget(Math.max(100000, Math.round(saved.quickBudget)));
        }
        if (typeof saved.trustByDefault === "boolean") {
          setAssistantTrustSession(saved.trustByDefault);
        }
      })
      .catch(() => null)
      .finally(() => {
        if (active) setAssistantSettingsHydrated(true);
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
    const interval = setInterval(() => setClockNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    pingHealthcheck();
    const interval = setInterval(() => {
      pingHealthcheck().catch(() => null);
    }, 15000);
    return () => clearInterval(interval);
  }, [pingHealthcheck]);

  React.useEffect(() => {
    if (pushToken) return;
    registerDevicePush().catch(() => null);
  }, [pushToken, registerDevicePush]);

  React.useEffect(() => {
    if (!authReady) return;
    persistSession(authToken, sessionUser).catch(() => null);
  }, [authReady, authToken, persistSession, sessionUser]);

  React.useEffect(() => {
    if (!assistantSettingsHydrated) return;
    SecureStore.setItemAsync(
      ASSISTANT_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        quickPeople: assistantQuickPeople,
        quickBudget: assistantQuickBudget,
        trustByDefault: assistantTrustSession,
      })
    ).catch(() => null);
  }, [assistantQuickBudget, assistantQuickPeople, assistantSettingsHydrated, assistantTrustSession]);

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

  const routeKey = `${screen}:${activeTab}`;

  React.useEffect(() => {
    if (previousRouteKeyRef.current === routeKey) return;
    const direction = routeDirectionRef.current;
    previousRouteKeyRef.current = routeKey;
    routeDirectionRef.current = 0;
    const startX = direction === 0 ? 0 : direction > 0 ? 22 : -22;
    const startY = direction === 0 ? 8 : 0;

    routeOpacity.setValue(direction === 0 ? 0.88 : 0.82);
    routeScale.setValue(direction === 0 ? 0.992 : 0.98);
    routeTranslateX.setValue(startX);
    routeTranslateY.setValue(startY);

    Animated.parallel([
      Animated.timing(routeOpacity, {
        toValue: 1,
        duration: direction === 0 ? 180 : 220,
        useNativeDriver: true,
      }),
      Animated.spring(routeScale, {
        toValue: 1,
        tension: 110,
        friction: 14,
        useNativeDriver: true,
      }),
      Animated.spring(routeTranslateX, {
        toValue: 0,
        tension: 92,
        friction: 15,
        useNativeDriver: true,
      }),
      Animated.spring(routeTranslateY, {
        toValue: 0,
        tension: 96,
        friction: 13,
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeTab, routeKey, routeOpacity, routeScale, routeTranslateX, routeTranslateY, screen]);

  React.useEffect(() => {
    if (screen === "tabs") {
      swipeBackTranslateX.setValue(0);
    }
  }, [screen, swipeBackTranslateX]);

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
    const handlePaymentUrl = (url: string | null | undefined) => {
      if (!url) return;
      const normalized = url.replace("cineplus://", "https://cineplus.local/").replace("datve://", "https://cineplus.local/");
      const parsed = new URL(normalized);
      if (parsed.pathname.replace(/^\//, "") !== "payment-result") return;
      const status = String(parsed.searchParams.get("status") ?? "");
      const provider = String(parsed.searchParams.get("provider") ?? "");
      if (status === "SUCCESS") showToast(`${provider} đã cập nhật vé của bạn sang trạng thái đã thanh toán.`, "success", "payment");
      else if (status) showToast(`${provider} trả về trạng thái ${status}.`, "error", "payment");
      resetNavigation({ screen: "tabs", tab: "tickets" });
      loadRemoteData();
    };

    Linking.getInitialURL().then(handlePaymentUrl).catch(() => null);
    const subscription = Linking.addEventListener("url", ({ url }) => {
      handlePaymentUrl(url);
    });
    return () => subscription.remove();
  }, [loadRemoteData, resetNavigation, showToast]);

  React.useEffect(() => {
    if (screen !== "seats" || !selectedShowtime) return;

    const interval = setInterval(async () => {
      const rows = await fetchSeatMap(selectedShowtime.id, true);
      if (!rows) return;
      const availableSeats = new Set(
        rows.flatMap((row) => row.seats.filter((seat) => seat.status === "AVAILABLE").map((seat) => `${seat.seatCode}:${seat.seatType}`))
      );

      setSelectedSeats((prev) => {
        const next = prev.filter((seat) => availableSeats.has(`${seat.seatCode}:${seat.seatType}`));
        if (next.length !== prev.length) {
          showToast("Có ghế vừa được giữ ở thiết bị khác. Danh sách ghế đã được làm mới.", "info", "seat");
        }
        return next;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchSeatMap, screen, selectedShowtime, showToast]);

  const openMovie = React.useCallback((movie: Movie, source: "home" | "default" = "default") => {
    setMovieEntrySource(source);
    setSelectedMovie(movie);
    navigate({ screen: "movie", tab: activeTab });
  }, [activeTab, navigate]);

  const openSeats = React.useCallback(
    async (movie: Movie, showtime?: ShowtimeItem) => {
      if (seatLoadingMovieId === movie.id) return;
      if (!sessionUser) {
        promptAuth("Hãy đăng nhập để đặt vé và giữ ghế.", { screen, tab: activeTab });
        return;
      }
      const nextShowtime = showtime ?? showtimesData.find((item) => item.movieId === movie.id) ?? fallbackShowtimes[0];
      setSeatLoadingMovieId(movie.id);
      setSeatLoadingShowtimeId(nextShowtime.id);
      setSelectedMovie(movie);
      setSelectedShowtime(nextShowtime);
      setSelectedSeats([]);
      setSelectedComboIds([]);
      setSelectedPaymentProvider("MOMO");
      setSelectedPaymentGatewayMode("SANDBOX");
      setHeldBookingId(null);
      try {
        await fetchSeatMap(nextShowtime.id);
        navigate({ screen: "seats", tab: activeTab });
      } finally {
        setSeatLoadingMovieId(null);
        setSeatLoadingShowtimeId(null);
      }
    },
    [activeTab, fetchSeatMap, navigate, promptAuth, screen, seatLoadingMovieId, sessionUser, showtimesData]
  );

  const openTicketDetail = React.useCallback(
    async (ticket: TicketItem) => {
      if (ticketOpeningId === ticket.bookingId) return;
      if (!sessionUser) {
        promptAuth("Hãy đăng nhập để xem vé của bạn.", { screen: "tabs", tab: activeTab });
        return;
      }
      setTicketOpeningId(ticket.bookingId);
      try {
        const json = await requestJson(`/bookings/${ticket.bookingId}`);
        setSelectedTicketDetail(json);
        navigate({ screen: "ticket", tab: activeTab });
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Không thể tải chi tiết vé", "error", "ticket");
      } finally {
        setTicketOpeningId(null);
      }
    },
    [activeTab, navigate, promptAuth, requestJson, sessionUser, showToast, ticketOpeningId]
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

  const buildAssistantSeatSelection = React.useCallback((rows: SeatMapRow[], ticketCount: number): SeatSelection[] => {
    const normalizedCount = Math.max(1, Math.min(8, Number(ticketCount) || 1));

    // Ưu tiên: VIP > COUPLE > STANDARD
    const seatTypePriority = (type: string) => {
      const t = String(type).toUpperCase();
      if (t === "VIP") return 3;
      if (t === "COUPLE") return 2;
      return 1;
    };

    // Sắp xếp rows: ưu tiên hàng giữa rạp (index gần tổng/2)
    const totalRows = rows.length;
    const sortedRows = [...rows].sort((a, b) => {
      const aIdx = rows.indexOf(a);
      const bIdx = rows.indexOf(b);
      const aMidDist = Math.abs(aIdx - totalRows / 2);
      const bMidDist = Math.abs(bIdx - totalRows / 2);
      // Ưu tiên hàng giữa, trong cùng khoảng cách ưu tiên ghế xịn hơn
      return aMidDist - bMidDist;
    });

    // Tìm cụm ghế liền kề tốt nhất (ưu tiên VIP/COUPLE ở giữa)
    let bestChunk: typeof rows[0]["seats"] | null = null;
    let bestScore = -1;

    for (const row of sortedRows) {
      const available = row.seats.filter((seat) => seat.status === "AVAILABLE");
      if (available.length < normalizedCount) continue;

      // Sắp xếp available theo ghế xịn xuất hiện nhiều hơn
      const totalCols = row.seats.length;
      for (let start = 0; start <= available.length - normalizedCount; start += 1) {
        const chunk = available.slice(start, start + normalizedCount);
        const contiguous = chunk.every((seat, idx) => {
          if (idx === 0) return true;
          const prev = chunk[idx - 1];
          return Number(seat.columnIndex ?? idx) - Number(prev.columnIndex ?? idx - 1) === 1;
        });
        if (!contiguous) continue;

        // Score: ưu tiên loại ghế xịn, ghế giữa cột
        const typeScore = chunk.reduce((s, seat) => s + seatTypePriority(seat.seatType), 0);
        const firstColIdx = Number(chunk[0].columnIndex ?? start);
        const lastColIdx = Number(chunk[chunk.length - 1].columnIndex ?? start + normalizedCount - 1);
        const chunkMid = (firstColIdx + lastColIdx) / 2;
        const colMidDist = Math.abs(chunkMid - totalCols / 2);
        const rowIdx = rows.indexOf(row);
        const rowMidDist = Math.abs(rowIdx - totalRows / 2);

        // Score cao hơn = tốt hơn: ghế xịn * 100 - khoảng cách giữa cột * 5 - khoảng cách giữa hàng * 3
        const score = typeScore * 100 - colMidDist * 5 - rowMidDist * 3;
        if (score > bestScore) {
          bestScore = score;
          bestChunk = chunk;
        }
      }
    }

    if (bestChunk) {
      return bestChunk.map((seat) => ({
        seatCode: seat.seatCode,
        seatType: String(seat.seatType).toUpperCase() as "STANDARD" | "VIP" | "COUPLE",
        price: Number(seat.price),
      }));
    }

    // Fallback: lấy ghế bất kỳ còn trống
    const fallback = rows
      .flatMap((row) => row.seats)
      .filter((seat) => seat.status === "AVAILABLE")
      .sort((a, b) => seatTypePriority(b.seatType) - seatTypePriority(a.seatType))
      .slice(0, normalizedCount);
    return fallback.map((seat) => ({
      seatCode: seat.seatCode,
      seatType: String(seat.seatType).toUpperCase() as "STANDARD" | "VIP" | "COUPLE",
      price: Number(seat.price),
    }));
  }, []);

  const holdAssistantSelection = React.useCallback(
    async (showtime: ShowtimeItem, seats: SeatSelection[]) => {
      const response = await fetch(`${apiBaseUrl}/bookings/hold`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...apiHeaders() },
        body: JSON.stringify({ showtimeId: showtime.id, seats }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Không thể giữ ghế từ gợi ý AI.");
      }
      return json as { id: number };
    },
    [apiBaseUrl, apiHeaders]
  );

  const requestAssistant = React.useCallback(
    async (message: string): Promise<AssistantApiResponse> => {
      const response = await fetch(`${apiBaseUrl}/ai/assistant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...apiHeaders(),
        },
        body: JSON.stringify({
          message,
          context: {
            now: new Date().toISOString(),
            favoriteMovieIds,
            watchlistMovieIds,
            selectedMovieId: selectedMovie.id,
          },
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "AI đang bận, vui lòng thử lại.");
      }

      return {
        answer: String(json.answer ?? "Mình chưa có đề xuất phù hợp ở lúc này."),
        suggestions: Array.isArray(json.suggestions) ? json.suggestions : [],
        source: json.source === "llm" ? "llm" : "rule-based",
      };
    },
    [apiBaseUrl, apiHeaders, favoriteMovieIds, selectedMovie.id, watchlistMovieIds]
  );

  const openAssistantSuggestion = React.useCallback(
    async (movieId: number, showtimeId: number, comboId: number | null, ticketCount: number) => {
      const movie = moviesData.find((item) => item.id === movieId);
      const showtime = showtimesData.find((item) => item.id === showtimeId);
      if (!movie || !showtime) {
        showToast("Suất chiếu AI gợi ý không còn khả dụng. Bạn thử làm mới dữ liệu nhé.", "error", "system");
        return;
      }
      if (!sessionUser) {
        promptAuth("Hãy đăng nhập để AI giữ ghế và chuẩn bị checkout cho bạn.", { screen, tab: activeTab });
        return;
      }
      setAssistantMiniOpen(false);
      setSeatLoadingMovieId(movie.id);
      setSeatLoadingShowtimeId(showtime.id);
      setSelectedMovie(movie);
      setSelectedShowtime(showtime);
      setSelectedComboIds(comboId ? [comboId] : []);
      setSelectedPaymentProvider("MOMO");
      setSelectedPaymentGatewayMode("SANDBOX");
      setSelectedSeats([]);
      setHeldBookingId(null);

      try {
        const rows = await fetchSeatMap(showtime.id);
        if (!rows || rows.length === 0) {
          navigate({ screen: "seats", tab: activeTab });
          showToast("AI chưa tải được sơ đồ ghế, bạn chọn tay giúp mình nhé.", "info", "seat");
          return;
        }

        const autoSeats = buildAssistantSeatSelection(rows, ticketCount);
        if (autoSeats.length === 0) {
          navigate({ screen: "seats", tab: activeTab });
          showToast("Suất này không còn ghế phù hợp, bạn thử suất khác nhé.", "error", "seat");
          return;
        }

        // AI chọn ghế xịn nhất → cho người dùng xem lại sơ đồ ghế trước khi thanh toán
        setSelectedSeats(autoSeats);
        navigate({ screen: "seats", tab: activeTab });
        const seatTypeLabel = autoSeats.every((s) => s.seatType === "VIP")
          ? "VIP"
          : autoSeats.every((s) => s.seatType === "COUPLE")
          ? "Đôi"
          : "Standard";
        showToast(
          `AI đã chọn ${autoSeats.length} ghế ${seatTypeLabel} tốt nhất cho bạn. Bạn có thể điều chỉnh lại rồi nhấn Tiếp tục.`,
          "success",
          "seat"
        );
      } catch (error) {
        navigate({ screen: "seats", tab: activeTab });
        showToast(error instanceof Error ? error.message : "Không thể chọn ghế tự động.", "error", "seat");
      } finally {
        setHolding(false);
        setSeatLoadingMovieId(null);
        setSeatLoadingShowtimeId(null);
      }
    },
    [
      activeTab,
      apiBaseUrl,
      buildAssistantSeatSelection,
      fetchSeatMap,
      holdAssistantSelection,
      moviesData,
      navigate,
      promptAuth,
      screen,
      sessionUser,
      showtimesData,
      showToast,
    ]
  );

  const confirmPendingAssistantSuggestion = React.useCallback(async () => {
    if (!assistantPendingSuggestion) return;
    const pending = assistantPendingSuggestion;
    setAssistantConfirmVisible(false);
    setAssistantPendingSuggestion(null);
    if (assistantConfirmRemember) {
      setAssistantTrustSession(true);
    }
    setAssistantConfirmRemember(false);
    await openAssistantSuggestion(pending.movieId, pending.showtimeId, pending.comboId, pending.ticketCount);
  }, [assistantConfirmRemember, assistantPendingSuggestion, openAssistantSuggestion]);

  const handleAssistantSuggestionPress = React.useCallback(
    async (movieId: number, showtimeId: number, comboId: number | null, ticketCount: number) => {
      const suggestionMovie = moviesData.find((item) => item.id === movieId);
      const suggestionShowtime = showtimesData.find((item) => item.id === showtimeId);
      if (!suggestionMovie || !suggestionShowtime) {
        showToast("Suất chiếu AI gợi ý đã thay đổi. Vui lòng thử lại.", "error", "system");
        return;
      }

      if (assistantTrustSession) {
        await openAssistantSuggestion(movieId, showtimeId, comboId, ticketCount);
        return;
      }

      setAssistantPendingSuggestion({
        movieId,
        showtimeId,
        comboId,
        ticketCount,
        movieTitle: suggestionMovie.title,
        cinemaName: suggestionShowtime.cinemaName,
        startTime: suggestionShowtime.startTime,
        comboName: comboId ? combosData.find((item) => item.id === comboId)?.name ?? null : null,
      });
      setAssistantConfirmRemember(false);
      setAssistantConfirmVisible(true);
    },
    [assistantTrustSession, combosData, moviesData, openAssistantSuggestion, showtimesData, showToast]
  );

  const runAssistantQuickBooking = React.useCallback(async () => {
    if (assistantQuickLoading || assistantSending) return;
    if (!sessionUser) {
      promptAuth("Hãy đăng nhập để dùng AI đặt nhanh.", { screen, tab: activeTab });
      return;
    }

    const nextHour = `${(clockNow.getHours() + 1) % 24}`.padStart(2, "0");
    const quickPrompt = `Mình muốn đặt nhanh cho ${assistantQuickPeople} người lúc ${nextHour}:00 tối nay, ngân sách ${Math.max(100000, assistantQuickBudget).toLocaleString("vi-VN")}đ, ưu tiên phim đang chiếu và combo hợp lý.`;

    setAssistantQuickLoading(true);
    try {
      const result = await requestAssistant(quickPrompt);
      if (!result.suggestions.length) {
        showToast("AI chưa tìm được phương án đặt nhanh phù hợp.", "info", "system");
        return;
      }

      const top = result.suggestions[0];
      await handleAssistantSuggestionPress(top.movieId, top.showtimeId, top.comboId, top.ticketCount);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể chạy AI đặt nhanh.", "error", "system");
    } finally {
      setAssistantQuickLoading(false);
    }
  }, [activeTab, assistantQuickBudget, assistantQuickLoading, assistantQuickPeople, assistantSending, clockNow, handleAssistantSuggestionPress, promptAuth, requestAssistant, screen, sessionUser, showToast]);

  const askAssistant = React.useCallback(
    async (forcedMessage?: string) => {
      const text = (forcedMessage ?? assistantInput).trim();
      if (!text || assistantSending) return;

      const userMessage: AssistantMessage = {
        id: `${Date.now()}-user`,
        role: "user",
        text,
        createdAt: new Date().toISOString(),
      };
      setAssistantMessages((prev) => [...prev, userMessage]);
      setAssistantInput("");
      setAssistantSending(true);

      try {
        const result = await requestAssistant(text);

        const assistantMessage: AssistantMessage = {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          text: result.answer,
          createdAt: new Date().toISOString(),
          suggestions: result.suggestions,
          source: result.source,
        };
        setAssistantMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        const message = error instanceof Error ? error.message : "AI đang tạm lỗi.";
        showToast(message, "error", "system");
        const assistantMessage: AssistantMessage = {
          id: `${Date.now()}-assistant-error`,
          role: "assistant",
          text: "Mình chưa xử lý được yêu cầu vừa rồi. Bạn thử nói cụ thể hơn: giờ rảnh, số người, ngân sách và thể loại nhé.",
          createdAt: new Date().toISOString(),
        };
        setAssistantMessages((prev) => [...prev, assistantMessage]);
      } finally {
        setAssistantSending(false);
      }
    },
    [assistantInput, assistantSending, requestAssistant, showToast]
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
      showToast(authMode === "login" ? "Đăng nhập thành công." : "Đăng ký thành công.", "success", "auth");
      finishAuthGate();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể xác thực tài khoản", "error", "auth");
    } finally {
      setAuthLoading(false);
    }
  };

  const continueWithGoogle = React.useCallback(() => {
    showToast("Đăng nhập Google đang được tạm tắt để ổn định bản Android mới.", "info", "auth");
  }, [showToast]);

  const logout = async () => {
    if (logoutLoading) return;
    setLogoutLoading(true);
    try {
      try {
        if (authToken) {
          await requestJson("/auth/logout", { method: "POST" });
        }
      } catch {
        // ignore
      }
      setAuthToken(null);
      setSessionUser(null);
      setProfileData(null);
      setTickets([]);
      setFavoriteMovieIds([]);
      setWatchlistMovieIds([]);
      setRemindersData([]);
      setAuthGateMessage(null);
      setAuthReturnRoute(null);
      resetNavigation({ screen: "tabs", tab: "home" });
      showToast("Đã đăng xuất.", "info", "auth");
    } finally {
      setLogoutLoading(false);
    }
  };

  const toggleFavorite = async () => {
    if (favoriteSubmitting) return;
    if (!sessionUser) {
      promptAuth("Hãy đăng nhập để thêm phim vào yêu thích.", { screen, tab: activeTab });
      return;
    }
    const enabled = !favoriteMovieIds.includes(selectedMovie.id);
    setFavoriteSubmitting(true);
    try {
      await syncMovieListToggle("favorites", selectedMovie.id, enabled);
      setFavoriteMovieIds((prev) =>
        enabled ? [...prev, selectedMovie.id] : prev.filter((id) => id !== selectedMovie.id)
      );
      showToast(enabled ? "Đã thêm vào yêu thích." : "Đã bỏ khỏi yêu thích.", "success", "favorite");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể cập nhật yêu thích", "error", "favorite");
    } finally {
      setFavoriteSubmitting(false);
    }
  };

  const toggleWatchlist = async () => {
    if (watchlistSubmitting) return;
    if (!sessionUser) {
      promptAuth("Hãy đăng nhập để lưu phim vào xem sau.", { screen, tab: activeTab });
      return;
    }
    const enabled = !watchlistMovieIds.includes(selectedMovie.id);
    setWatchlistSubmitting(true);
    try {
      await syncMovieListToggle("watchlist", selectedMovie.id, enabled);
      setWatchlistMovieIds((prev) =>
        enabled ? [...prev, selectedMovie.id] : prev.filter((id) => id !== selectedMovie.id)
      );
      showToast(enabled ? "Đã thêm vào xem sau." : "Đã bỏ khỏi xem sau.", "success", "favorite");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể cập nhật xem sau", "error", "favorite");
    } finally {
      setWatchlistSubmitting(false);
    }
  };

  const toggleSeat = React.useCallback((seats: SeatSelection[]) => {
    setSelectedSeats((prev) =>
      seats.every((seat) => prev.some((item) => item.seatCode === seat.seatCode && item.seatType === seat.seatType))
        ? prev.filter((item) => !seats.some((seat) => seat.seatCode === item.seatCode && seat.seatType === item.seatType))
        : [
            ...prev,
            ...seats.filter((seat) => !prev.some((item) => item.seatCode === seat.seatCode && item.seatType === seat.seatType)),
          ]
    );
  }, []);

  const holdCurrentSeats = async () => {
    if (holding) return;
    if (!sessionUser) {
      promptAuth("Hãy đăng nhập để tiếp tục đặt vé.", { screen: "seats", tab: activeTab });
      return;
    }
    if (selectedSeats.length === 0) return showToast("Hãy chọn ít nhất 1 ghế trước khi tiếp tục.", "error", "seat");
    const showtime = selectedShowtime ?? showtimesData.find((item) => item.movieId === selectedMovie.id);
    if (!showtime) return showToast("Hiện chưa có suất chiếu phù hợp cho phim này.", "error", "seat");
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
      showToast(error instanceof Error ? error.message : "Không thể giữ ghế", "error", "seat");
      await fetchSeatMap(showtime.id);
    } finally {
      setHolding(false);
    }
  };

  const confirmBooking = async () => {
    if (confirming) return;
    if (!sessionUser) {
      promptAuth("Hãy đăng nhập để thanh toán vé.", { screen: "checkout", tab: activeTab });
      return;
    }
    if (!heldBookingId) return showToast("Cần giữ ghế trước khi tạo booking.", "error", "seat");
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
          returnUrl: "cineplus://payment-result",
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
      showToast(`Mã vé ${json.bookingCode} đã được tạo. Đang mở ${selectedPaymentProvider}.`, "success", "payment");
      await Linking.openURL(paymentJson.checkoutUrl);
      resetNavigation({ screen: "tabs", tab: "tickets" });
      setSelectedSeats([]);
      setSelectedComboIds([]);
      setVoucherCode("");
      setHeldBookingId(null);
      await loadRemoteData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể tạo booking", "error", "payment");
    } finally {
      setConfirming(false);
    }
  };

  const scheduleReminder = async () => {
    if (reminderLoading) return;
    if (!sessionUser) {
      promptAuth("Hãy đăng nhập để dùng nhắc lịch cho vé.", { screen, tab: activeTab });
      return;
    }
    if (!selectedTicketDetail) return;
    const showtime = new Date(selectedTicketDetail.showtime.startTime);
    const remindAt = new Date(showtime.getTime() - 60 * 60_000).toISOString().slice(0, 19).replace("T", " ");
    setReminderLoading("schedule");
    try {
      await requestJson(`/bookings/${selectedTicketDetail.id}/reminder`, {
        method: "POST",
        body: JSON.stringify({ remindAt }),
      });
      showToast("Đã đặt nhắc trước 1 giờ.", "success", "reminder");
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
      showToast(error instanceof Error ? error.message : "Không thể đặt nhắc lịch", "error", "reminder");
    } finally {
      setReminderLoading(null);
    }
  };

  const cancelTicketReminder = async () => {
    if (reminderLoading) return;
    if (!sessionUser) {
      promptAuth("Hãy đăng nhập để quản lý nhắc lịch.", { screen, tab: activeTab });
      return;
    }
    if (!selectedTicketDetail) return;
    setReminderLoading("cancel");
    try {
      await requestJson(`/bookings/${selectedTicketDetail.id}/reminder`, { method: "DELETE" });
      showToast("Đã hủy nhắc lịch.", "info", "reminder");
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
      showToast(error instanceof Error ? error.message : "Không thể hủy nhắc lịch", "error", "reminder");
    } finally {
      setReminderLoading(null);
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
    const favoriteSet = new Set(favoriteMovieIds);
    const watchlistSet = new Set(watchlistMovieIds);
    return moviesData
    .filter((movie) => {
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
      const matchesFavorite = exploreFavoriteFilter === "ONLY" ? favoriteSet.has(movie.id) : true;
      const matchesWatchlist = exploreWatchlistFilter === "ONLY" ? watchlistSet.has(movie.id) : true;
      return matchesStatus && matchesGenre && matchesCinema && matchesHour && matchesFavorite && matchesWatchlist;
    })
    .sort((left, right) => {
      const leftScore = (favoriteSet.has(left.id) ? 2 : 0) + (watchlistSet.has(left.id) ? 1 : 0);
      const rightScore = (favoriteSet.has(right.id) ? 2 : 0) + (watchlistSet.has(right.id) ? 1 : 0);
      if (leftScore !== rightScore) {
        return rightScore - leftScore;
      }
      return left.id - right.id;
    });
  }, [exploreCinemaFilter, exploreFavoriteFilter, exploreGenreFilter, exploreHourFilter, exploreStatusFilter, exploreWatchlistFilter, favoriteMovieIds, moviesData, showtimesData, watchlistMovieIds]);

  const canSwipeBack = screen !== "tabs" && historyRef.current.length > 0;

  const swipeBackPanResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          canSwipeBack &&
          gestureState.moveX <= SWIPE_BACK_EDGE_WIDTH &&
          gestureState.dx > 14 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.25,
        onPanResponderMove: (_, gestureState) => {
          swipeBackTranslateX.setValue(Math.max(0, gestureState.dx));
        },
        onPanResponderRelease: (_, gestureState) => {
          const screenWidth = Dimensions.get("window").width;
          const shouldGoBack =
            gestureState.dx >= SWIPE_BACK_TRIGGER_X ||
            (gestureState.vx > SWIPE_BACK_MIN_VELOCITY && gestureState.dx > 20);

          if (shouldGoBack) {
            Animated.timing(swipeBackTranslateX, {
              toValue: screenWidth * 0.26,
              duration: 120,
              useNativeDriver: true,
            }).start(() => {
              goBack();
              swipeBackTranslateX.setValue(0);
            });
            return;
          }

          Animated.spring(swipeBackTranslateX, {
            toValue: 0,
            tension: 130,
            friction: 16,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(swipeBackTranslateX, {
            toValue: 0,
            tension: 130,
            friction: 16,
            useNativeDriver: true,
          }).start();
        },
      }),
    [canSwipeBack, goBack, swipeBackTranslateX]
  );

  const contentAnimatedStyle = {
    opacity: routeOpacity,
    transform: [
      { translateX: Animated.add(routeTranslateX, swipeBackTranslateX) },
      { translateY: routeTranslateY },
      { scale: routeScale },
    ],
  };

  const assistantBubblePanResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 6 || Math.abs(gestureState.dy) > 6,
        onPanResponderGrant: () => {
          assistantBubblePos.extractOffset();
        },
        onPanResponderMove: Animated.event([null, { dx: assistantBubblePos.x, dy: assistantBubblePos.y }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: () => {
          assistantBubblePos.flattenOffset();
          const { width, height } = Dimensions.get("window");
          const rawX = Number((assistantBubblePos.x as unknown as { _value?: number })._value ?? 0);
          const rawY = Number((assistantBubblePos.y as unknown as { _value?: number })._value ?? 0);
          const clampedX = Math.min(Math.max(rawX, 12), width - ASSISTANT_BUBBLE_SIZE - 12);
          const clampedY = Math.min(Math.max(rawY, 96), height - ASSISTANT_BUBBLE_SIZE - 116);
          Animated.spring(assistantBubblePos, {
            toValue: { x: clampedX, y: clampedY },
            useNativeDriver: false,
            tension: 120,
            friction: 12,
          }).start();
        },
      }),
    [assistantBubblePos]
  );

  let content: React.ReactNode = null;
  const activePillWidth = bottomBarWidth > 0 ? (bottomBarWidth - 24) / tabItems.length : 0;
  const shouldShowAssistantFloating = screen !== "tabs" && screen !== "auth";

  const handleTabPress = React.useCallback(
    (tab: TabId) => {
      if (!sessionUser && (tab === "tickets" || tab === "profile" || tab === "favorites" || tab === "watchlist")) {
        promptAuth(
          tab === "tickets"
            ? "Hãy đăng nhập để xem vé của bạn."
            : tab === "favorites"
              ? "Hãy đăng nhập để xem danh sách yêu thích của bạn."
              : tab === "watchlist"
                ? "Hãy đăng nhập để xem danh sách xem sau của bạn."
                : "Hãy đăng nhập để xem tài khoản của bạn.",
          { screen: "tabs", tab: activeTab }
        );
        return;
      }
      navigate({ screen: "tabs", tab });
    },
    [activeTab, navigate, promptAuth, sessionUser]
  );

  if (!authReady || !fontsLoaded) {
    content = (
      <View style={[styles.scrollContent, { flex: 1, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={palette.red} />
        <Text style={{ color: palette.muted, fontSize: 13, marginTop: 12 }}>Đang chuẩn bị dữ liệu...</Text>
      </View>
    );
  } else if (screen === "auth") {
    content = (
      <AuthScreen
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
        initialStep={3}
        onBack={() => {
          setAuthGateMessage(null);
          setAuthReturnRoute(null);
          goBack();
        }}
        helperMessage={authGateMessage}
      />
    );
  } else if (screen === "movie") {
    content = (
      <MovieDetailScreen
        movie={selectedMovie}
        onBack={() => goBack()}
        onBook={(showtime) => openSeats(selectedMovie, showtime)}
        showtimesData={showtimesData}
        entrySource={movieEntrySource}
        isFavorite={favoriteMovieIds.includes(selectedMovie.id)}
        isInWatchlist={watchlistMovieIds.includes(selectedMovie.id)}
        onToggleFavorite={toggleFavorite}
        onToggleWatchlist={toggleWatchlist}
        favoriteLoading={favoriteSubmitting}
        watchlistLoading={watchlistSubmitting}
        bookingLoadingMovieId={seatLoadingMovieId}
        bookingLoadingShowtimeId={seatLoadingShowtimeId}
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
    content = <TicketDetailScreen ticket={selectedTicketDetail} onBack={() => goBack()} onScheduleReminder={scheduleReminder} onCancelReminder={cancelTicketReminder} reminderLoading={reminderLoading} />;
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
        loadingSeatMovieId={seatLoadingMovieId}
        favoriteMovieIds={favoriteMovieIds}
        watchlistMovieIds={watchlistMovieIds}
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
        favoriteFilter={exploreFavoriteFilter}
        setFavoriteFilter={setExploreFavoriteFilter}
        watchlistFilter={exploreWatchlistFilter}
        setWatchlistFilter={setExploreWatchlistFilter}
        cinemaOptions={cinemaOptions}
        genreOptions={genreOptions}
        favoriteMovieIds={favoriteMovieIds}
        watchlistMovieIds={watchlistMovieIds}
      />
    );
  } else if (activeTab === "assistant") {
    content = (
      <AssistantScreen
        messages={assistantMessages}
        input={assistantInput}
        setInput={setAssistantInput}
        sending={assistantSending}
        seedPrompts={ASSISTANT_SEED_PROMPTS}
        onPromptPress={(prompt) => askAssistant(prompt)}
        onSend={() => askAssistant()}
        onSuggestionPress={handleAssistantSuggestionPress}
        trustByDefault={assistantTrustSession}
        onToggleTrustByDefault={() => setAssistantTrustSession((prev) => !prev)}
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
        loadingTicketId={ticketOpeningId}
        loadingSeatMovieId={seatLoadingMovieId}
        favoriteMovieIds={favoriteMovieIds}
        watchlistMovieIds={watchlistMovieIds}
      />
    );
  } else if (activeTab === "favorites") {
    content = (
      <UserMovieListScreen
        title="Yêu thích"
        description="Những phim bạn đánh dấu để quay lại nhanh khi muốn đặt vé hoặc xem lại thông tin."
        emptyMessage="Chưa có phim yêu thích."
        movies={favoriteMovies}
        onMoviePress={openMovie}
      />
    );
  } else if (activeTab === "watchlist") {
    content = (
      <UserMovieListScreen
        title="Xem sau"
        description="Danh sách phim bạn lưu lại để cân nhắc lịch chiếu, rủ bạn bè hoặc săn suất đẹp sau."
        emptyMessage="Chưa có phim trong danh sách xem sau."
        movies={watchlistMovies}
        onMoviePress={openMovie}
      />
    );
  } else {
    content = (
      <ProfileScreen
        onReload={loadRemoteData}
        profile={profileData}
        sessionUser={sessionUser}
        reminders={remindersData}
        onLogout={logout}
        loading={loadingRemote}
        logoutLoading={logoutLoading}
      />
    );
  }

  const androidTopInset = Platform.OS === "android" ? NativeStatusBar.currentHeight ?? 0 : 0;
  const topBarSideWidth = 128;
  const topBarActionSize = 36;
  const topBarActionStyle = {
    width: topBarActionSize,
    height: topBarActionSize,
    borderRadius: 999,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" translucent={false} />
      <View style={[styles.topBar, { paddingTop: 14 + androidTopInset }]}>
        <View style={{ width: topBarSideWidth, gap: 2 }}>
          <Text style={{ color: "#bca6a9", fontSize: 9, fontWeight: "900", letterSpacing: 0.8, textTransform: "uppercase" }}>Vị trí hiện tại</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <MaterialCommunityIcons name="map-marker-radius-outline" size={13} color="#f2d8d1" />
            <Text style={{ color: "#fff4ef", fontSize: 13, fontWeight: "800" }}>TP.HCM</Text>
          </View>
        </View>

        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#d43b36", fontSize: 24, fontWeight: "900", fontStyle: "italic", letterSpacing: 0.2 }}>{APP_DISPLAY_NAME}</Text>
        </View>

        <View style={{ width: topBarSideWidth, flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
          <Pressable onPress={() => setActiveTab("explore")} style={topBarActionStyle}>
            <MaterialCommunityIcons name="magnify" size={18} color="#fff4ef" />
          </Pressable>
          <Pressable onPress={() => setActiveTab("tickets")} style={topBarActionStyle}>
            <MaterialCommunityIcons name="bell-outline" size={18} color="#fff4ef" />
            {remindersData.length > 0 ? (
              <View style={{ position: "absolute", top: 5, right: 5, minWidth: 14, height: 14, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: "#c30d12", paddingHorizontal: 2 }}>
                <Text style={{ color: "#fff7f2", fontSize: 9, fontWeight: "900" }}>{Math.min(remindersData.length, 9)}</Text>
              </View>
            ) : null}
          </Pressable>
          {loadingRemote ? (
            <View style={{ position: "absolute", left: 2, bottom: -2 }}>
              <ActivityIndicator size="small" color={palette.cyan} />
            </View>
          ) : null}
        </View>
      </View>
      {toast ? <Toast toastId={toast.id} message={toast.message} tone={toast.tone} kind={toast.kind} closing={toast.closing} visibleMs={toast.visibleMs} topOffset={androidTopInset + 14} /> : null}
      <Animated.View style={[styles.routeFrame, contentAnimatedStyle]} {...(canSwipeBack ? swipeBackPanResponder.panHandlers : {})}>
        {content}
      </Animated.View>
      {canSwipeBack ? (
        <Animated.View pointerEvents="none" style={[styles.swipeBackCue, { opacity: swipeBackTranslateX.interpolate({ inputRange: [0, 44], outputRange: [0.16, 0.55], extrapolate: "clamp" }) }]} />
      ) : null}
      {shouldShowAssistantFloating && assistantMiniOpen ? (
        <View style={styles.aiMiniPanel}>
          <View style={styles.aiMiniHeader}>
            <Text style={styles.aiMiniTitle}>Trợ lý AI</Text>
            <Pressable onPress={() => setAssistantMiniOpen(false)}>
              <Text style={styles.backLink}>Đóng</Text>
            </Pressable>
          </View>
          <AssistantScreen
            compact
            messages={assistantMessages}
            input={assistantInput}
            setInput={setAssistantInput}
            sending={assistantSending}
            seedPrompts={ASSISTANT_SEED_PROMPTS}
            onPromptPress={(prompt) => askAssistant(prompt)}
            onSend={() => askAssistant()}
            onSuggestionPress={handleAssistantSuggestionPress}
            trustByDefault={assistantTrustSession}
            onToggleTrustByDefault={() => setAssistantTrustSession((prev) => !prev)}
          />
        </View>
      ) : null}
      {shouldShowAssistantFloating && !assistantMiniOpen ? (
        <Animated.View
          style={[
            styles.aiFab,
            {
              transform: [{ translateX: assistantBubblePos.x }, { translateY: assistantBubblePos.y }],
            },
          ]}
          {...assistantBubblePanResponder.panHandlers}
        >
          <Pressable testID="assistant-floating-button" onPress={() => setAssistantMiniOpen((prev) => !prev)} style={{ alignItems: "center", gap: 1 }} hitSlop={8}>
            <MaterialCommunityIcons name="robot" size={22} color="#fff7f2" />
            <Text style={styles.aiFabLabel}>AI</Text>
          </Pressable>
        </Animated.View>
      ) : null}
      <Modal
        visible={assistantConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setAssistantConfirmVisible(false);
          setAssistantPendingSuggestion(null);
          setAssistantConfirmRemember(false);
        }}
      >
        <View style={styles.aiConfirmBackdrop}>
          <View style={styles.aiConfirmCard}>
            <Text style={styles.accountTitle}>Xác nhận AI giữ ghế</Text>
            {assistantPendingSuggestion ? (
              <>
                <Text style={styles.accountDetail}>
                  {assistantPendingSuggestion.movieTitle}
                </Text>
                <Text style={styles.accountDetail}>
                  {assistantPendingSuggestion.cinemaName} • {new Date(assistantPendingSuggestion.startTime).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                </Text>
                <Text style={styles.accountDetail}>
                  {assistantPendingSuggestion.ticketCount} vé{assistantPendingSuggestion.comboName ? ` • ${assistantPendingSuggestion.comboName}` : ""}
                </Text>
              </>
            ) : null}
            <Pressable style={styles.aiTrustRow} onPress={() => setAssistantConfirmRemember((prev) => !prev)}>
              <MaterialCommunityIcons
                name={assistantConfirmRemember ? "checkbox-marked" : "checkbox-blank-outline"}
                size={20}
                color={assistantConfirmRemember ? palette.cyan : palette.muted}
              />
              <Text style={styles.accountDetail}>Tin AI cho lần sau (bỏ xác nhận trong phiên hiện tại)</Text>
            </Pressable>
            <View style={styles.aiConfirmActions}>
              <Pressable
                style={[styles.paymentMethod, styles.aiConfirmAction]}
                onPress={() => {
                  setAssistantConfirmVisible(false);
                  setAssistantPendingSuggestion(null);
                  setAssistantConfirmRemember(false);
                }}
              >
                <Text style={styles.paymentMethodText}>Không</Text>
              </Pressable>
              <Pressable style={[styles.paymentMethod, styles.paymentMethodActive, styles.aiConfirmAction]} onPress={confirmPendingAssistantSuggestion}>
                <Text style={[styles.paymentMethodText, styles.paymentMethodTextActive]}>Đồng ý</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={assistantQuickConfigVisible} transparent animationType="fade" onRequestClose={() => setAssistantQuickConfigVisible(false)}>
        <View style={styles.aiConfirmBackdrop}>
          <View style={styles.aiConfirmCard}>
            <Text style={styles.accountTitle}>Cấu hình AI đặt nhanh</Text>
            <Text style={styles.accountDetail}>Nhấn giữ nút AI đặt nhanh để mở lại cấu hình này.</Text>
            <View style={styles.aiConfigRow}>
              <Text style={styles.summaryLabel}>Số người</Text>
              <View style={styles.aiConfigStepper}>
                <Pressable style={styles.aiStepperButton} onPress={() => setAssistantQuickPeople((prev) => Math.max(1, prev - 1))}>
                  <Text style={styles.aiStepperButtonText}>-</Text>
                </Pressable>
                <Text style={styles.aiConfigValue}>{assistantQuickPeople}</Text>
                <Pressable style={styles.aiStepperButton} onPress={() => setAssistantQuickPeople((prev) => Math.min(8, prev + 1))}>
                  <Text style={styles.aiStepperButtonText}>+</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.aiConfigRow}>
              <Text style={styles.summaryLabel}>Ngân sách mặc định</Text>
              <Text style={styles.aiConfigValue}>{assistantQuickBudget.toLocaleString("vi-VN")}đ</Text>
            </View>
            <View style={styles.paymentWrap}>
              {[250000, 350000, 500000, 700000].map((budget) => (
                <Pressable key={budget} style={[styles.paymentMethod, assistantQuickBudget === budget && styles.paymentMethodActive]} onPress={() => setAssistantQuickBudget(budget)}>
                  <Text style={[styles.paymentMethodText, assistantQuickBudget === budget && styles.paymentMethodTextActive]}>{Math.round(budget / 1000)}k</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.aiConfirmActions}>
              <Pressable style={[styles.paymentMethod, styles.aiConfirmAction]} onPress={() => setAssistantQuickConfigVisible(false)}>
                <Text style={styles.paymentMethodText}>Xong</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      {(screen === "tabs" || screen === "auth") ? (
        <View style={styles.bottomBar} onLayout={(event: any) => setBottomBarWidth(event.nativeEvent.layout.width)}>
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
              onPress={() => handleTabPress(item.id)}
              onPressIn={() => {
                if (Platform.OS === "android") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
                } else {
                  Haptics.selectionAsync().catch(() => null);
                }
                animateTabPress(index, true);
              }}
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
        </View>
      ) : null}
    </SafeAreaView>
  );
}
