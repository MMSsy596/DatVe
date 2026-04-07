import React from "react";
import * as SecureStore from "expo-secure-store";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
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

const DEFAULT_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || "https://datve.up.railway.app/api/v1";
const SESSION_STORAGE_KEY = "phimbook.mobile.session";
const DEFAULT_API_ORIGIN = DEFAULT_API_BASE_URL.replace(/\/api\/v1\/?$/, "");
const APP_DISPLAY_NAME = "PhimBook";
const TOAST_HIDE_BUFFER_MS = 260;
const SWIPE_BACK_EDGE_WIDTH = Platform.OS === "android" ? 30 : 24;
const SWIPE_BACK_TRIGGER_X = Platform.OS === "android" ? 94 : 78;
const SWIPE_BACK_MIN_VELOCITY = Platform.OS === "android" ? 0.24 : 0.18;
const ASSISTANT_BUBBLE_SIZE = 58;
const ASSISTANT_SEED_PROMPTS = [
  "MÃ¬nh ráº£nh 20:00 tá»‘i nay, gá»£i Ã½ phim Ä‘ang hot.",
  "NgÃ¢n sÃ¡ch 350k cho 2 ngÆ°á»i, chá»n phim + combo giÃºp mÃ¬nh.",
  "MÃ¬nh thÃ­ch hÃ nh Ä‘á»™ng, ráº¡p nÃ o cÃ²n nhiá»u gháº¿ Ä‘áº¹p?",
  "Gá»£i Ã½ suáº¥t chiáº¿u ngÃ y mai sau 19:30.",
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
  { id: 1, eyebrow: "Khuyáº¿n máº¡i toÃ n há»‡ thá»‘ng", title: "Tuáº§n lá»… Ä‘iá»‡n áº£nh", text: "Mua 2 vÃ© táº·ng 1 combo mini trong khung giá» vÃ ng.", accent: "#1f2f73", imageUrl: demoMediaUrl("/demo-media/promos/banner-1.svg") },
  { id: 2, eyebrow: "Suáº¥t chiáº¿u sá»›m", title: "ÄÃªm cÃ´ng chiáº¿u", text: "Äáº·t trÆ°á»›c phim hot vÃ  nháº­n Æ°u Ä‘Ã£i há»™i viÃªn.", accent: "#5a1826", imageUrl: demoMediaUrl("/demo-media/promos/banner-2.svg") },
];

const fallbackMovies: Movie[] = [
  { id: 1, slug: "lat-mat-8", title: "Láº­t Máº·t 8", subtitle: "TrÃªn Ä‘Æ°á»ng Ä‘ua doanh thu", genre: "HÃ nh Ä‘á»™ng", runtime: "118 phÃºt", score: "7.6", badge: "Ná»•i báº­t", tone: "#6d28d9", description: "Chuyá»‡n gia Ä‘Ã¬nh vá»›i nhiá»u tÃ¬nh huá»‘ng báº¥t ngá», hÃ i hÆ°á»›c vÃ  cáº£m xÃºc.", status: "NOW_SHOWING", posterUrl: demoMediaUrl("/demo-media/posters/lat-mat-8.svg"), bannerUrl: demoMediaUrl("/demo-media/banners/lat-mat-8.svg"), trailerUrl: "https://www.youtube.com/embed/EXeTwQWrcwY?playsinline=1" },
  { id: 2, slug: "nguoi-nhen-da-vu-tru", title: "NgÆ°á»i Nhá»‡n Äa VÅ© Trá»¥", subtitle: "Cuá»™c Ä‘ua vÃ¡ láº¡i Ä‘a vÅ© trá»¥", genre: "HÃ nh Ä‘á»™ng, Viá»…n tÆ°á»Ÿng", runtime: "142 phÃºt", score: "8.7", badge: "Äáº·t nhiá»u", tone: "#0f766e", description: "Peter vÃ  cÃ¡c Ä‘á»“ng Ä‘á»™i pháº£i vÃ¡ láº¡i váº¿t ná»©t Ä‘a vÅ© trá»¥ trÆ°á»›c khi má»i thá»±c táº¡i sá»¥p Ä‘á»•.", status: "TRENDING", posterUrl: demoMediaUrl("/demo-media/posters/nguoi-nhen-da-vu-tru.svg"), bannerUrl: demoMediaUrl("/demo-media/banners/nguoi-nhen-da-vu-tru.svg"), trailerUrl: "https://www.youtube.com/embed/TcMBFSGVi1c?playsinline=1" },
  { id: 3, slug: "mat-ma-bien-dem", title: "Máº­t MÃ£ Biá»ƒn ÄÃªm", subtitle: "Truy Ä‘uá»•i xuyÃªn biÃªn giá»›i", genre: "HÃ nh Ä‘á»™ng, Tá»™i pháº¡m", runtime: "123 phÃºt", score: "8.2", badge: "Hot", tone: "#9333ea", description: "Äá»™i Ä‘iá»u tra truy Ä‘uá»•i Ä‘Æ°á»ng dÃ¢y rá»­a tiá»n xuyÃªn quá»‘c gia.", status: "NOW_SHOWING", posterUrl: demoMediaUrl("/demo-media/posters/mat-ma-bien-dem.svg"), bannerUrl: demoMediaUrl("/demo-media/banners/mat-ma-bien-dem.svg"), trailerUrl: "https://www.youtube.com/embed/8ugaeA-nMTc?playsinline=1" },
  { id: 4, slug: "hanh-tinh-thu-chin", title: "HÃ nh Tinh Thá»© ChÃ­n", subtitle: "BÃ­ máº­t ngoÃ i Há»‡ Máº·t Trá»i", genre: "Viá»…n tÆ°á»Ÿng, Khoa há»c", runtime: "131 phÃºt", score: "8.1", badge: "Ná»•i báº­t", tone: "#c41010", description: "Chuyáº¿n bay thÄƒm dÃ² xa nháº¥t loÃ i ngÆ°á»i má»Ÿ ra bÃ­ máº­t ngoÃ i Há»‡ Máº·t Trá»i.", status: "NOW_SHOWING", posterUrl: demoMediaUrl("/demo-media/posters/hanh-tinh-thu-chin.svg"), bannerUrl: demoMediaUrl("/demo-media/banners/hanh-tinh-thu-chin.svg"), trailerUrl: "https://www.youtube.com/embed/hA6hldpSTF8?playsinline=1" },
  { id: 5, slug: "chien-tuyen-do", title: "Chiáº¿n Tuyáº¿n Äá»", subtitle: "Nhiá»‡m vá»¥ sÃ¡t biÃªn giá»›i", genre: "Chiáº¿n tranh, ChÃ­nh ká»‹ch", runtime: "133 phÃºt", score: "7.4", badge: "Sáº¯p chiáº¿u", tone: "#0f4c81", description: "Tiá»ƒu Ä‘á»™i Ä‘áº·c nhiá»‡m nháº­n nhiá»‡m vá»¥ khÃ´ng tÆ°á»Ÿng á»Ÿ biÃªn giá»›i.", status: "COMING_SOON", posterUrl: demoMediaUrl("/demo-media/posters/chien-tuyen-do.svg"), bannerUrl: demoMediaUrl("/demo-media/banners/chien-tuyen-do.svg"), trailerUrl: "https://www.youtube.com/embed/qSqVVswa420?playsinline=1" },
  { id: 6, slug: "mua-he-cua-chung-ta", title: "MÃ¹a HÃ¨ Cá»§a ChÃºng Ta", subtitle: "Thanh xuÃ¢n gáº·p láº¡i", genre: "Thanh xuÃ¢n, TÃ¬nh cáº£m", runtime: "113 phÃºt", score: "7.8", badge: "Theo dÃµi", tone: "#8a1f3d", description: "NhÃ³m báº¡n cÅ© gáº·p láº¡i sau 10 nÄƒm trong chuyáº¿n Ä‘i cuá»‘i hÃ¨.", status: "COMING_SOON", posterUrl: demoMediaUrl("/demo-media/posters/mua-he-cua-chung-ta.svg"), bannerUrl: demoMediaUrl("/demo-media/banners/mua-he-cua-chung-ta.svg"), trailerUrl: "https://www.youtube.com/embed/6ZfuNTqbHE8?playsinline=1" },
];

const fallbackShowtimes: ShowtimeItem[] = [
  { id: 1, movieId: 1, cinemaId: 1, roomId: 1, cinemaName: "CGV Landmark 81", roomName: "PhÃ²ng 01", startTime: "2026-03-30T18:45:00", formatLabel: "IMAX", languageLabel: "Phá»¥ Ä‘á»", basePrice: 120000, seatLayout: [["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8"], ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8"], ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"], ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"]] },
];

const fallbackCombos: ComboItem[] = [
  { id: 1, name: "Combo Cáº·p Ä‘Ã´i", detail: "2 nÆ°á»›c lá»›n + 1 báº¯p phÃ´ mai", price: "159.000Ä‘", unitPrice: 159000 },
  { id: 2, name: "Combo Gia Ä‘Ã¬nh", detail: "4 nÆ°á»›c + 2 báº¯p caramel", price: "289.000Ä‘", unitPrice: 289000 },
  { id: 3, name: "Combo ÄÃªm", detail: "1 hotdog + 1 nÆ°á»›c + 1 báº¯p caramel", price: "119.000Ä‘", unitPrice: 119000 },
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
  { id: "home", label: "Trang chá»§", icon: "home-variant-outline", activeIcon: "home-variant" },
  { id: "explore", label: "KhÃ¡m phÃ¡", icon: "compass-outline", activeIcon: "compass" },
  { id: "assistant", label: "AI", icon: "robot-outline", activeIcon: "robot" },
  { id: "favorites", label: "YÃªu thÃ­ch", icon: "heart-outline", activeIcon: "heart" },
  { id: "watchlist", label: "Xem sau", icon: "bookmark-outline", activeIcon: "bookmark" },
  { id: "tickets", label: "VÃ©", icon: "ticket-confirmation-outline", activeIcon: "ticket-confirmation" },
  { id: "profile", label: "TÃ i khoáº£n", icon: "account-circle-outline", activeIcon: "account-circle" },
];

export default function App() {
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
  const [authName, setAuthName] = React.useState("Nguyá»…n VÄƒn A");
  const [authEmail, setAuthEmail] = React.useState("user@phimbook.local");
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
  const [customerName, setCustomerName] = React.useState("Nguyá»…n VÄƒn A");
  const [customerEmail, setCustomerEmail] = React.useState("user@phimbook.local");
  const [customerPhone, setCustomerPhone] = React.useState("0900000002");
  const [bottomBarWidth, setBottomBarWidth] = React.useState(0);
  const [authGateMessage, setAuthGateMessage] = React.useState<string | null>(null);
  const [authReturnRoute, setAuthReturnRoute] = React.useState<RouteState | null>(null);
  const [assistantMessages, setAssistantMessages] = React.useState<AssistantMessage[]>([
    {
      id: "assistant-welcome",
      role: "assistant",
      text: "Xin chÃ o NanBao ç”·å®, mÃ¬nh lÃ  trá»£ lÃ½ AI Ä‘áº·t vÃ©. Báº¡n cÃ³ thá»ƒ há»i theo giá» ráº£nh, gu phim, ngÃ¢n sÃ¡ch hoáº·c yÃªu cáº§u gá»£i Ã½ combo.",
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
        throw new Error(json.error ?? "YÃªu cáº§u tháº¥t báº¡i");
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
        runtime: `${item.durationMinutes} phÃºt`,
        score: String(item.rating),
        badge: item.badge ?? "Äang chiáº¿u",
        tone: item.highlightColor ?? "#c41010",
        description: item.subtitle ?? "Phim Ä‘ang Ä‘Æ°á»£c quáº£n lÃ½ tá»« backend Äáº·t VÃ©.",
        status: String(item.status ?? "NOW_SHOWING").toUpperCase(),
        posterUrl: absolutizeAssetUrl(item.posterUrl),
        bannerUrl: absolutizeAssetUrl(item.bannerUrl),
        trailerUrl: absolutizeAssetUrl(item.trailerUrl),
      }));

      setBannersData(
        ((catalog.banners ?? []).length > 0 ? catalog.banners : fallbackBanners).map((item: any) => ({
          id: item.id,
          eyebrow: item.eyebrow ?? "Khuyáº¿n máº¡i toÃ n há»‡ thá»‘ng",
          title: item.title,
          text: item.subtitle ?? item.text ?? "Æ¯u Ä‘Ã£i má»›i dÃ nh cho thÃ nh viÃªn Äáº·t VÃ©.",
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
          detail: item.description ?? item.detail ?? "Combo Äáº·t VÃ©",
          price: typeof item.price === "string" ? item.price : `${Number(item.price).toLocaleString("vi-VN")}Ä‘`,
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
      const message = error instanceof Error ? error.message : "KhÃ´ng táº£i Ä‘Æ°á»£c dá»¯ liá»‡u";
      if (authToken && /unauthorized|token|Ä‘Äƒng nháº­p|phiÃªn/i.test(message.toLowerCase())) {
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
          showToast(error instanceof Error ? error.message : "KhÃ´ng thá»ƒ táº£i sÆ¡ Ä‘á»“ gháº¿", "error", "seat");
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
      const normalized = url.replace("phimbook://", "https://phimbook.local/").replace("datve://", "https://phimbook.local/");
      const parsed = new URL(normalized);
      if (parsed.pathname.replace(/^\//, "") !== "payment-result") return;
      const status = String(parsed.searchParams.get("status") ?? "");
      const provider = String(parsed.searchParams.get("provider") ?? "");
      if (status === "SUCCESS") showToast(`${provider} Ä‘Ã£ cáº­p nháº­t vÃ© cá»§a báº¡n sang tráº¡ng thÃ¡i Ä‘Ã£ thanh toÃ¡n.`, "success", "payment");
      else if (status) showToast(`${provider} tráº£ vá» tráº¡ng thÃ¡i ${status}.`, "error", "payment");
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
          showToast("CÃ³ gháº¿ vá»«a Ä‘Æ°á»£c giá»¯ á»Ÿ thiáº¿t bá»‹ khÃ¡c. Danh sÃ¡ch gháº¿ Ä‘Ã£ Ä‘Æ°á»£c lÃ m má»›i.", "info", "seat");
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
        promptAuth("HÃ£y Ä‘Äƒng nháº­p Ä‘á»ƒ Ä‘áº·t vÃ© vÃ  giá»¯ gháº¿.", { screen, tab: activeTab });
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
        promptAuth("HÃ£y Ä‘Äƒng nháº­p Ä‘á»ƒ xem vÃ© cá»§a báº¡n.", { screen: "tabs", tab: activeTab });
        return;
      }
      setTicketOpeningId(ticket.bookingId);
      try {
        const json = await requestJson(`/bookings/${ticket.bookingId}`);
        setSelectedTicketDetail(json);
        navigate({ screen: "ticket", tab: activeTab });
      } catch (error) {
        showToast(error instanceof Error ? error.message : "KhÃ´ng thá»ƒ táº£i chi tiáº¿t vÃ©", "error", "ticket");
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
        throw new Error(json.error ?? "KhÃ´ng thá»ƒ cáº­p nháº­t danh sÃ¡ch");
      }
    },
    [apiBaseUrl, apiHeaders]
  );

  const buildAssistantSeatSelection = React.useCallback((rows: SeatMapRow[], ticketCount: number): SeatSelection[] => {
    const normalizedCount = Math.max(1, Math.min(8, Number(ticketCount) || 1));
    for (const row of rows) {
      const available = row.seats.filter((seat) => seat.status === "AVAILABLE");
      if (available.length < normalizedCount) continue;
      for (let start = 0; start <= available.length - normalizedCount; start += 1) {
        const chunk = available.slice(start, start + normalizedCount);
        const contiguous = chunk.every((seat, idx) => {
          if (idx === 0) return true;
          const prev = chunk[idx - 1];
          return Number(seat.columnIndex ?? idx) - Number(prev.columnIndex ?? idx - 1) === 1;
        });
        if (!contiguous) continue;
        return chunk.map((seat) => ({
          seatCode: seat.seatCode,
          seatType: String(seat.seatType).toUpperCase() as "STANDARD" | "VIP" | "COUPLE",
          price: Number(seat.price),
        }));
      }
    }

    const fallback = rows
      .flatMap((row) => row.seats)
      .filter((seat) => seat.status === "AVAILABLE")
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
        throw new Error(json.error ?? "KhÃ´ng thá»ƒ giá»¯ gháº¿ tá»« gá»£i Ã½ AI.");
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
        throw new Error(json.error ?? "AI Ä‘ang báº­n, vui lÃ²ng thá»­ láº¡i.");
      }

      return {
        answer: String(json.answer ?? "MÃ¬nh chÆ°a cÃ³ Ä‘á» xuáº¥t phÃ¹ há»£p á»Ÿ lÃºc nÃ y."),
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
        showToast("Suáº¥t chiáº¿u AI gá»£i Ã½ khÃ´ng cÃ²n kháº£ dá»¥ng. Báº¡n thá»­ lÃ m má»›i dá»¯ liá»‡u nhÃ©.", "error", "system");
        return;
      }
      if (!sessionUser) {
        promptAuth("HÃ£y Ä‘Äƒng nháº­p Ä‘á»ƒ AI giá»¯ gháº¿ vÃ  chuáº©n bá»‹ checkout cho báº¡n.", { screen, tab: activeTab });
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
          showToast("AI chÆ°a táº£i Ä‘Æ°á»£c sÆ¡ Ä‘á»“ gháº¿, báº¡n chá»n tay giÃºp mÃ¬nh nhÃ©.", "info", "seat");
          return;
        }

        const autoSeats = buildAssistantSeatSelection(rows, ticketCount);
        if (autoSeats.length === 0) {
          navigate({ screen: "seats", tab: activeTab });
          showToast("Suáº¥t nÃ y khÃ´ng cÃ²n gháº¿ phÃ¹ há»£p, báº¡n thá»­ suáº¥t khÃ¡c nhÃ©.", "error", "seat");
          return;
        }

        setSelectedSeats(autoSeats);
        setHolding(true);
        const held = await holdAssistantSelection(showtime, autoSeats);
        setHeldBookingId(held.id);
        navigate({ screen: "checkout", tab: activeTab });
        showToast(
          comboId
            ? "AI Ä‘Ã£ giá»¯ gháº¿ vÃ  Ã¡p combo Ä‘á» xuáº¥t. Báº¡n kiá»ƒm tra láº¡i trÆ°á»›c khi thanh toÃ¡n."
            : "AI Ä‘Ã£ giá»¯ gháº¿ Ä‘á» xuáº¥t. Báº¡n kiá»ƒm tra láº¡i trÆ°á»›c khi thanh toÃ¡n.",
          "success",
          "seat"
        );
      } catch (error) {
        navigate({ screen: "seats", tab: activeTab });
        showToast(error instanceof Error ? error.message : "KhÃ´ng thá»ƒ giá»¯ gháº¿ tá»± Ä‘á»™ng.", "error", "seat");
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
        showToast("Suáº¥t chiáº¿u AI gá»£i Ã½ Ä‘Ã£ thay Ä‘á»•i. Vui lÃ²ng thá»­ láº¡i.", "error", "system");
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
      promptAuth("HÃ£y Ä‘Äƒng nháº­p Ä‘á»ƒ dÃ¹ng AI Ä‘áº·t nhanh.", { screen, tab: activeTab });
      return;
    }

    const nextHour = `${(clockNow.getHours() + 1) % 24}`.padStart(2, "0");
    const quickPrompt = `MÃ¬nh muá»‘n Ä‘áº·t nhanh cho ${assistantQuickPeople} ngÆ°á»i lÃºc ${nextHour}:00 tá»‘i nay, ngÃ¢n sÃ¡ch ${Math.max(100000, assistantQuickBudget).toLocaleString("vi-VN")}Ä‘, Æ°u tiÃªn phim Ä‘ang chiáº¿u vÃ  combo há»£p lÃ½.`;

    setAssistantQuickLoading(true);
    try {
      const result = await requestAssistant(quickPrompt);
      if (!result.suggestions.length) {
        showToast("AI chÆ°a tÃ¬m Ä‘Æ°á»£c phÆ°Æ¡ng Ã¡n Ä‘áº·t nhanh phÃ¹ há»£p.", "info", "system");
        return;
      }

      const top = result.suggestions[0];
      await handleAssistantSuggestionPress(top.movieId, top.showtimeId, top.comboId, top.ticketCount);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "KhÃ´ng thá»ƒ cháº¡y AI Ä‘áº·t nhanh.", "error", "system");
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
          text: "Mï¿½nh chua x? lï¿½ du?c yï¿½u c?u v?a r?i. B?n th? nï¿½i c? th? hon: gi? r?nh, s? ngu?i, ngï¿½n sï¿½ch vï¿½ th? lo?i nhï¿½.",
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
            ? { email: authEmail, password: authPassword, deviceName: "Thiáº¿t bá»‹ Android" }
            : { fullName: authName, email: authEmail, phone: authPhone, password: authPassword }
        ),
      });
      setAuthToken(json.token);
      setSessionUser(json.user);
      setCustomerName(json.user.fullName);
      setCustomerEmail(json.user.email);
      setCustomerPhone(json.user.phone ?? "");
      showToast(authMode === "login" ? "ÄÄƒng nháº­p thÃ nh cÃ´ng." : "ÄÄƒng kÃ½ thÃ nh cÃ´ng.", "success", "auth");
      finishAuthGate();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "KhÃ´ng thá»ƒ xÃ¡c thá»±c tÃ i khoáº£n", "error", "auth");
    } finally {
      setAuthLoading(false);
    }
  };

  const continueWithGoogle = React.useCallback(() => {
    showToast("ÄÄƒng nháº­p Google Ä‘ang Ä‘Æ°á»£c táº¡m táº¯t Ä‘á»ƒ á»•n Ä‘á»‹nh báº£n Android má»›i.", "info", "auth");
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
      showToast("ÄÃ£ Ä‘Äƒng xuáº¥t.", "info", "auth");
    } finally {
      setLogoutLoading(false);
    }
  };

  const toggleFavorite = async () => {
    if (favoriteSubmitting) return;
    if (!sessionUser) {
      promptAuth("HÃ£y Ä‘Äƒng nháº­p Ä‘á»ƒ thÃªm phim vÃ o yÃªu thÃ­ch.", { screen, tab: activeTab });
      return;
    }
    const enabled = !favoriteMovieIds.includes(selectedMovie.id);
    setFavoriteSubmitting(true);
    try {
      await syncMovieListToggle("favorites", selectedMovie.id, enabled);
      setFavoriteMovieIds((prev) =>
        enabled ? [...prev, selectedMovie.id] : prev.filter((id) => id !== selectedMovie.id)
      );
      showToast(enabled ? "ÄÃ£ thÃªm vÃ o yÃªu thÃ­ch." : "ÄÃ£ bá» khá»i yÃªu thÃ­ch.", "success", "favorite");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "KhÃ´ng thá»ƒ cáº­p nháº­t yÃªu thÃ­ch", "error", "favorite");
    } finally {
      setFavoriteSubmitting(false);
    }
  };

  const toggleWatchlist = async () => {
    if (watchlistSubmitting) return;
    if (!sessionUser) {
      promptAuth("HÃ£y Ä‘Äƒng nháº­p Ä‘á»ƒ lÆ°u phim vÃ o xem sau.", { screen, tab: activeTab });
      return;
    }
    const enabled = !watchlistMovieIds.includes(selectedMovie.id);
    setWatchlistSubmitting(true);
    try {
      await syncMovieListToggle("watchlist", selectedMovie.id, enabled);
      setWatchlistMovieIds((prev) =>
        enabled ? [...prev, selectedMovie.id] : prev.filter((id) => id !== selectedMovie.id)
      );
      showToast(enabled ? "ÄÃ£ thÃªm vÃ o xem sau." : "ÄÃ£ bá» khá»i xem sau.", "success", "favorite");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "KhÃ´ng thá»ƒ cáº­p nháº­t xem sau", "error", "favorite");
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
      promptAuth("HÃ£y Ä‘Äƒng nháº­p Ä‘á»ƒ tiáº¿p tá»¥c Ä‘áº·t vÃ©.", { screen: "seats", tab: activeTab });
      return;
    }
    if (selectedSeats.length === 0) return showToast("HÃ£y chá»n Ã­t nháº¥t 1 gháº¿ trÆ°á»›c khi tiáº¿p tá»¥c.", "error", "seat");
    const showtime = selectedShowtime ?? showtimesData.find((item) => item.movieId === selectedMovie.id);
    if (!showtime) return showToast("Hiá»‡n chÆ°a cÃ³ suáº¥t chiáº¿u phÃ¹ há»£p cho phim nÃ y.", "error", "seat");
    setHolding(true);
    try {
      const response = await fetch(`${apiBaseUrl}/bookings/hold`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...apiHeaders() },
        body: JSON.stringify({ showtimeId: showtime.id, seats: selectedSeats }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "KhÃ´ng thá»ƒ giá»¯ gháº¿");
      setHeldBookingId(json.id);
      navigate({ screen: "checkout", tab: activeTab });
    } catch (error) {
      showToast(error instanceof Error ? error.message : "KhÃ´ng thá»ƒ giá»¯ gháº¿", "error", "seat");
      await fetchSeatMap(showtime.id);
    } finally {
      setHolding(false);
    }
  };

  const confirmBooking = async () => {
    if (confirming) return;
    if (!sessionUser) {
      promptAuth("HÃ£y Ä‘Äƒng nháº­p Ä‘á»ƒ thanh toÃ¡n vÃ©.", { screen: "checkout", tab: activeTab });
      return;
    }
    if (!heldBookingId) return showToast("Cáº§n giá»¯ gháº¿ trÆ°á»›c khi táº¡o booking.", "error", "seat");
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
      if (!response.ok) throw new Error(json.error ?? "KhÃ´ng thá»ƒ táº¡o booking");

      const paymentResponse = await fetch(`${apiBaseUrl}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...apiHeaders() },
        body: JSON.stringify({
          bookingId: json.id,
          provider: selectedPaymentProvider,
          returnUrl: "phimbook://payment-result",
          gatewayMode: selectedPaymentGatewayMode,
        }),
      });
      const paymentJson = await paymentResponse.json();
      if (!paymentResponse.ok) throw new Error(paymentJson.error ?? "KhÃ´ng thá»ƒ táº¡o thanh toÃ¡n");

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
      showToast(`MÃ£ vÃ© ${json.bookingCode} Ä‘Ã£ Ä‘Æ°á»£c táº¡o. Äang má»Ÿ ${selectedPaymentProvider}.`, "success", "payment");
      await Linking.openURL(paymentJson.checkoutUrl);
      resetNavigation({ screen: "tabs", tab: "tickets" });
      setSelectedSeats([]);
      setSelectedComboIds([]);
      setVoucherCode("");
      setHeldBookingId(null);
      await loadRemoteData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "KhÃ´ng thá»ƒ táº¡o booking", "error", "payment");
    } finally {
      setConfirming(false);
    }
  };

  const scheduleReminder = async () => {
    if (reminderLoading) return;
    if (!sessionUser) {
      promptAuth("HÃ£y Ä‘Äƒng nháº­p Ä‘á»ƒ dÃ¹ng nháº¯c lá»‹ch cho vÃ©.", { screen, tab: activeTab });
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
      showToast("ÄÃ£ Ä‘áº·t nháº¯c trÆ°á»›c 1 giá».", "success", "reminder");
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
      showToast(error instanceof Error ? error.message : "KhÃ´ng thá»ƒ Ä‘áº·t nháº¯c lá»‹ch", "error", "reminder");
    } finally {
      setReminderLoading(null);
    }
  };

  const cancelTicketReminder = async () => {
    if (reminderLoading) return;
    if (!sessionUser) {
      promptAuth("HÃ£y Ä‘Äƒng nháº­p Ä‘á»ƒ quáº£n lÃ½ nháº¯c lá»‹ch.", { screen, tab: activeTab });
      return;
    }
    if (!selectedTicketDetail) return;
    setReminderLoading("cancel");
    try {
      await requestJson(`/bookings/${selectedTicketDetail.id}/reminder`, { method: "DELETE" });
      showToast("ÄÃ£ há»§y nháº¯c lá»‹ch.", "info", "reminder");
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
      showToast(error instanceof Error ? error.message : "KhÃ´ng thá»ƒ há»§y nháº¯c lá»‹ch", "error", "reminder");
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

  const handleTabPress = React.useCallback(
    (tab: TabId) => {
      if (!sessionUser && (tab === "tickets" || tab === "profile" || tab === "favorites" || tab === "watchlist")) {
        promptAuth(
          tab === "tickets"
            ? "HÃ£y Ä‘Äƒng nháº­p Ä‘á»ƒ xem vÃ© cá»§a báº¡n."
            : tab === "favorites"
              ? "HÃ£y Ä‘Äƒng nháº­p Ä‘á»ƒ xem danh sÃ¡ch yÃªu thÃ­ch cá»§a báº¡n."
              : tab === "watchlist"
                ? "HÃ£y Ä‘Äƒng nháº­p Ä‘á»ƒ xem danh sÃ¡ch xem sau cá»§a báº¡n."
                : "HÃ£y Ä‘Äƒng nháº­p Ä‘á»ƒ xem tÃ i khoáº£n cá»§a báº¡n.",
          { screen: "tabs", tab: activeTab }
        );
        return;
      }
      navigate({ screen: "tabs", tab });
    },
    [activeTab, navigate, promptAuth, sessionUser]
  );

  if (!authReady) {
    content = (
      <View style={[styles.scrollContent, { flex: 1, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={palette.cyan} />
        <Text style={styles.accountDetail}>Äang khÃ´i phá»¥c phiÃªn Ä‘Äƒng nháº­p...</Text>
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
        title="YÃªu thÃ­ch"
        description="Nhá»¯ng phim báº¡n Ä‘Ã¡nh dáº¥u Ä‘á»ƒ quay láº¡i nhanh khi muá»‘n Ä‘áº·t vÃ© hoáº·c xem láº¡i thÃ´ng tin."
        emptyMessage="ChÆ°a cÃ³ phim yÃªu thÃ­ch."
        movies={favoriteMovies}
        onMoviePress={openMovie}
      />
    );
  } else if (activeTab === "watchlist") {
    content = (
      <UserMovieListScreen
        title="Xem sau"
        description="Danh sÃ¡ch phim báº¡n lÆ°u láº¡i Ä‘á»ƒ cÃ¢n nháº¯c lá»‹ch chiáº¿u, rá»§ báº¡n bÃ¨ hoáº·c sÄƒn suáº¥t Ä‘áº¹p sau."
        emptyMessage="ChÆ°a cÃ³ phim trong danh sÃ¡ch xem sau."
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" translucent={false} />
      <View style={[styles.topBar, { paddingTop: 14 + androidTopInset }]}>
        <View style={styles.brandWrap}>
          <View style={styles.brandLogo}>
            <Image source={require("./assets/brand-mark.png")} style={styles.brandLogoImage} resizeMode="contain" />
          </View>
          <View style={styles.brandMeta}>
            <Text style={styles.brandCaption}>NEON CINEMA</Text>
            <Text style={styles.brand}>{APP_DISPLAY_NAME}</Text>
          </View>
        </View>
        <View style={styles.topBarStatusWrap}>
          <Pressable
            style={[styles.aiQuickButton, assistantQuickLoading && styles.aiQuickButtonDisabled]}
            onPress={runAssistantQuickBooking}
            onLongPress={() => setAssistantQuickConfigVisible(true)}
            delayLongPress={320}
          >
            {assistantQuickLoading ? (
              <ActivityIndicator size="small" color="#fff7f2" />
            ) : (
              <MaterialCommunityIcons name="robot-love-outline" size={14} color="#fff7f2" />
            )}
            <Text style={styles.aiQuickButtonText}>AI d?t nhanh</Text>
          </Pressable>
          <View style={[styles.networkIndicator, networkStatus === "online" ? styles.networkIndicatorOnline : styles.networkIndicatorOffline]}>
            <View style={[styles.networkIndicatorCore, networkStatus === "online" ? styles.networkIndicatorCoreOnline : styles.networkIndicatorCoreOffline]} />
          </View>
          <Text style={styles.liveClock}>{liveClockLabel}</Text>
          {loadingRemote ? <ActivityIndicator size="small" color={palette.cyan} /> : null}
        </View>
      </View>
      {toast ? <Toast toastId={toast.id} message={toast.message} tone={toast.tone} kind={toast.kind} closing={toast.closing} visibleMs={toast.visibleMs} topOffset={androidTopInset + 14} /> : null}
      <Animated.View style={[styles.routeFrame, contentAnimatedStyle]} {...(canSwipeBack ? swipeBackPanResponder.panHandlers : {})}>
        {content}
      </Animated.View>
      {canSwipeBack ? (
        <Animated.View pointerEvents="none" style={[styles.swipeBackCue, { opacity: swipeBackTranslateX.interpolate({ inputRange: [0, 44], outputRange: [0.16, 0.55], extrapolate: "clamp" }) }]} />
      ) : null}
      {assistantMiniOpen ? (
        <View style={styles.aiMiniPanel}>
          <View style={styles.aiMiniHeader}>
            <Text style={styles.aiMiniTitle}>Trá»£ lÃ½ AI</Text>
            <Pressable onPress={() => setAssistantMiniOpen(false)}>
              <Text style={styles.backLink}>ÄÃ³ng</Text>
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
          />
        </View>
      ) : null}
      <Animated.View
        style={[
          styles.aiFab,
          {
            transform: [{ translateX: assistantBubblePos.x }, { translateY: assistantBubblePos.y }],
          },
        ]}
        {...assistantBubblePanResponder.panHandlers}
      >
        <Pressable onPress={() => setAssistantMiniOpen((prev) => !prev)} style={{ alignItems: "center", gap: 1 }} hitSlop={8}>
          <MaterialCommunityIcons name="robot" size={22} color="#fff7f2" />
          <Text style={styles.aiFabLabel}>AI</Text>
        </Pressable>
      </Animated.View>
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
      {screen === "tabs" ? (
        <BlurView intensity={32} tint="dark" style={styles.bottomBar} onLayout={(event: any) => setBottomBarWidth(event.nativeEvent.layout.width)}>
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
        </BlurView>
      ) : null}
    </SafeAreaView>
  );
}



