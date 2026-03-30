import React from "react";
import { ActivityIndicator, Animated, Easing, Image, ImageBackground, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { palette, styles } from "./theme";
import { Banner, ComboItem, Movie, PaymentProvider, ProfileData, ReminderItem, SeatMapRow, SeatSelection, Setter, SessionUser, ShowtimeItem, TicketDetail, TicketItem, ToastKind, ToastTone, Voucher } from "./types";

const formatCurrency = (value: number) => `${value.toLocaleString("vi-VN")}đ`;

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).replace("T", " ").slice(0, 16);
  }
  return `${date.toLocaleDateString("vi-VN")} • ${date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const mapBookingStatus = (status: string) => {
  switch (status) {
    case "PAID":
      return "Đã thanh toán";
    case "PENDING":
      return "Chờ thanh toán";
    case "CANCELLED":
      return "Đã hủy";
    default:
      return status;
  }
};

const mapCheckinStatus = (status?: string | null) => {
  switch (status) {
    case "CHECKED_IN":
      return "Đã check-in";
    case "NOT_CHECKED_IN":
      return "Chưa check-in";
    default:
      return status ?? "Chưa check-in";
  }
};

export function SectionHeader({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

export function NeonButton({ label, variant = "primary", onPress }: { label: string; variant?: "primary" | "secondary"; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.button, variant === "primary" ? styles.buttonPrimary : styles.buttonSecondary]}>
      <Text style={[styles.buttonText, variant === "primary" ? styles.buttonTextPrimary : styles.buttonTextSecondary]}>{label}</Text>
    </Pressable>
  );
}

const toastToneLabel = (tone: ToastTone) => (tone === "success" ? "Ho?n t?t" : tone === "error" ? "L?i" : "Th?ng b?o");

const toastKindMeta: Record<ToastKind, { label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; color: string; bg: string }> = {
  ticket: { label: "V?", icon: "ticket-confirmation-outline", color: palette.amber, bg: "rgba(255,207,106,0.14)" },
  favorite: { label: "Y?u th?ch", icon: "heart-outline", color: "#ff88a4", bg: "rgba(201,63,98,0.16)" },
  seat: { label: "Gh?", icon: "armchair", color: palette.cyan, bg: "rgba(115,246,221,0.14)" },
  payment: { label: "Thanh to?n", icon: "credit-card-outline", color: "#9cc7ff", bg: "rgba(98,141,235,0.16)" },
  reminder: { label: "Nh?c l?ch", icon: "bell-outline", color: "#ffd88d", bg: "rgba(255,184,72,0.16)" },
  auth: { label: "T?i kho?n", icon: "account-circle-outline", color: "#d7b8ff", bg: "rgba(147,51,234,0.18)" },
  system: { label: "H? th?ng", icon: "information-outline", color: palette.text, bg: "rgba(255,255,255,0.08)" },
};

export function Toast({ toastId, message, tone = "info", kind = "system", closing = false }: { toastId: number; message: string; tone?: ToastTone; kind?: ToastKind; closing?: boolean }) {
  const shellOpacity = React.useRef(new Animated.Value(0)).current;
  const shellScale = React.useRef(new Animated.Value(0.72)).current;
  const shellTranslateY = React.useRef(new Animated.Value(-20)).current;
  const shellWidth = React.useRef(new Animated.Value(0.76)).current;
  const iconScale = React.useRef(new Animated.Value(0.74)).current;
  const iconRotate = React.useRef(new Animated.Value(-0.18)).current;
  const bodyOpacity = React.useRef(new Animated.Value(0)).current;
  const bodyTranslateX = React.useRef(new Animated.Value(-14)).current;
  const toneLabel = toastToneLabel(tone);
  const meta = toastKindMeta[kind];
  const toneAccent = tone === "success" ? "#8affea" : tone === "error" ? "#ff8d8d" : meta.color;

  React.useEffect(() => {
    shellOpacity.setValue(0);
    shellScale.setValue(0.72);
    shellTranslateY.setValue(-20);
    shellWidth.setValue(0.76);
    iconScale.setValue(0.74);
    iconRotate.setValue(-0.18);
    bodyOpacity.setValue(0);
    bodyTranslateX.setValue(-14);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(shellOpacity, { toValue: 1, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(shellScale, { toValue: 0.88, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(shellWidth, { toValue: 0.84, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(iconScale, { toValue: 0.88, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(shellScale, { toValue: 1.03, tension: 95, friction: 8, useNativeDriver: true }),
        Animated.spring(shellWidth, { toValue: 1.02, tension: 90, friction: 9, useNativeDriver: true }),
        Animated.spring(shellTranslateY, { toValue: 0, tension: 85, friction: 12, useNativeDriver: true }),
        Animated.spring(iconScale, { toValue: 1.06, tension: 120, friction: 8, useNativeDriver: true }),
        Animated.timing(iconRotate, { toValue: 0.08, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.timing(shellOpacity, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(shellScale, { toValue: 1, tension: 90, friction: 10, useNativeDriver: true }),
        Animated.spring(shellWidth, { toValue: 1, tension: 88, friction: 10, useNativeDriver: true }),
        Animated.spring(iconScale, { toValue: 1, tension: 110, friction: 9, useNativeDriver: true }),
        Animated.timing(iconRotate, { toValue: 0, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(bodyOpacity, { toValue: 1, duration: 170, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(bodyTranslateX, { toValue: 0, duration: 190, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, [bodyOpacity, bodyTranslateX, iconRotate, iconScale, shellOpacity, shellScale, shellTranslateY, shellWidth, toastId]);

  React.useEffect(() => {
    if (!closing) return;
    Animated.parallel([
      Animated.timing(bodyOpacity, { toValue: 0, duration: 100, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(bodyTranslateX, { toValue: -8, duration: 120, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(shellOpacity, { toValue: 0, duration: 180, delay: 30, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(shellScale, { toValue: 0.8, duration: 180, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(shellWidth, { toValue: 0.78, duration: 180, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(shellTranslateY, { toValue: -14, duration: 180, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(iconScale, { toValue: 0.82, duration: 140, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(iconRotate, { toValue: -0.08, duration: 120, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [bodyOpacity, bodyTranslateX, closing, iconRotate, iconScale, shellOpacity, shellScale, shellTranslateY, shellWidth]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        tone === "success" && styles.toastSuccess,
        tone === "error" && styles.toastError,
        { opacity: shellOpacity, transform: [{ translateY: shellTranslateY }, { scaleX: shellWidth }, { scaleY: shellScale }] },
      ]}
    >
      <Animated.View style={[styles.toastIconWrap, tone === "success" && styles.toastIconWrapSuccess, tone === "error" && styles.toastIconWrapError, { backgroundColor: meta.bg, transform: [{ scale: iconScale }, { rotate: iconRotate.interpolate({ inputRange: [-1, 1], outputRange: ["-1rad", "1rad"] }) }] }]}>
        <MaterialCommunityIcons name={meta.icon} size={18} color={toneAccent} />
      </Animated.View>
      <Animated.View style={[styles.toastBody, { opacity: bodyOpacity, transform: [{ translateX: bodyTranslateX }] }]}>
        <View style={styles.toastHeader}>
          <Text style={styles.toastLabel}>{meta.label}</Text>
          <View style={[styles.toastDot, tone === "success" && styles.toastDotSuccess, tone === "error" && styles.toastDotError]} />
          <Text style={[styles.toastTone, tone === "success" && styles.toastToneSuccess, tone === "error" && styles.toastToneError]}>{toneLabel}</Text>
        </View>
        <Text style={styles.toastText} numberOfLines={2}>{message}</Text>
      </Animated.View>
    </Animated.View>
  );
}

export function SkeletonBlock({ height, width = "100%" }: { height: number; width?: number | `${number}%` }) {
  return <View style={[styles.skeletonBlock, { height, width }]} />;
}

export function HomeScreen(props: {
  onMoviePress: (movie: Movie) => void;
  onSeatPress: (movie: Movie) => void;
  bannersData: Banner[];
  moviesData: Movie[];
  loading: boolean;
  fallbackMovie: Movie;
}) {
  const { onMoviePress, onSeatPress, bannersData, moviesData, loading, fallbackMovie } = props;
  const heroMovie = moviesData[0] ?? fallbackMovie;
  const nowShowing = moviesData.filter((movie) => movie.status !== "COMING_SOON").slice(0, 6);
  const comingSoon = moviesData.filter((movie) => movie.status === "COMING_SOON").slice(0, 4);
  const featuredBanner = bannersData[0];

  if (loading && moviesData.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SkeletonBlock height={380} />
        <SkeletonBlock height={120} />
        <SkeletonBlock height={260} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={[styles.heroCard, { backgroundColor: heroMovie.tone }]}>
        {heroMovie.bannerUrl ? <Image source={{ uri: heroMovie.bannerUrl }} style={styles.heroImage} resizeMode="cover" /> : null}
        <View style={styles.heroOverlay} />
        <View style={styles.heroTopLine}>
          <Text style={styles.eyebrow}>ĐẶT VÉ ĐIỆN ẢNH</Text>
          <Text style={styles.heroTag}>Đang mở bán</Text>
        </View>
        <View style={styles.heroContent}>
          <Text style={styles.heroKicker}>{heroMovie.badge}</Text>
          <Text style={styles.heroTitle}>{heroMovie.title}</Text>
          <Text style={styles.heroSubline}>{heroMovie.genre} • {heroMovie.runtime} • IMDb {heroMovie.score}</Text>
          <Text style={styles.heroBody}>{heroMovie.description}</Text>
        </View>
        <View style={styles.heroMetrics}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Suất nổi bật</Text>
            <Text style={styles.metricValue}>20:45</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Định dạng</Text>
            <Text style={styles.metricValue}>IMAX</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Giá từ</Text>
            <Text style={styles.metricValue}>90.000đ</Text>
          </View>
        </View>
        <View style={styles.heroActions}>
          <NeonButton label="Đặt vé ngay" onPress={() => onSeatPress(heroMovie)} />
          <NeonButton label="Xem chi tiết" variant="secondary" onPress={() => onMoviePress(heroMovie)} />
        </View>
      </View>

      <View style={styles.quickStrip}>
        <View style={styles.quickStripItem}>
          <Text style={styles.quickStripLabel}>Đang chiếu</Text>
          <Text style={styles.quickStripValue}>{moviesData.filter((movie) => movie.status !== "COMING_SOON").length}</Text>
        </View>
        <View style={styles.quickStripItem}>
          <Text style={styles.quickStripLabel}>Sắp chiếu</Text>
          <Text style={styles.quickStripValue}>{moviesData.filter((movie) => movie.status === "COMING_SOON").length}</Text>
        </View>
        <View style={styles.quickStripItem}>
          <Text style={styles.quickStripLabel}>Thanh toán</Text>
          <Text style={styles.quickStripValue}>MoMo • ZaloPay</Text>
        </View>
      </View>

      {featuredBanner ? (
        <ImageBackground
          source={featuredBanner.imageUrl ? { uri: featuredBanner.imageUrl } : undefined}
          imageStyle={styles.bannerImage}
          style={[styles.bannerCard, { backgroundColor: featuredBanner.accent }]}
        >
          <View style={styles.bannerOverlay} />
          <Text style={styles.bannerEyebrow}>{featuredBanner.eyebrow}</Text>
          <Text style={styles.bannerTitle}>{featuredBanner.title}</Text>
          <Text style={styles.bannerText}>{featuredBanner.text}</Text>
        </ImageBackground>
      ) : null}

      <SectionHeader title="Đang chiếu" action="Chọn phim" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {nowShowing.map((movie) => (
          <Pressable key={movie.id} style={styles.movieCard} onPress={() => onMoviePress(movie)}>
            <ImageBackground source={movie.posterUrl ? { uri: movie.posterUrl } : undefined} imageStyle={styles.posterImage} style={[styles.poster, { backgroundColor: movie.tone }]}>
              <View style={styles.posterScrim} />
              <Text style={styles.posterBadge}>{movie.badge}</Text>
            </ImageBackground>
            <Text style={styles.movieTitle}>{movie.title}</Text>
            <Text style={styles.movieMeta}>{movie.genre} • {movie.runtime}</Text>
            <View style={styles.movieFooter}>
              <Text style={styles.movieScore}>IMDb {movie.score}</Text>
              <Text style={styles.movieAction}>Chi tiết</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {comingSoon.length > 0 ? (
        <>
          <SectionHeader title="Sắp chiếu" action="Theo dõi" />
          <View style={styles.rankingWrap}>
            {comingSoon.map((movie) => (
              <Pressable key={`coming-${movie.id}`} style={styles.rankingRow} onPress={() => onMoviePress(movie)}>
                <View style={[styles.rankPoster, { backgroundColor: movie.tone }]} />
                <View style={styles.rankMain}>
                  <Text style={styles.rankMovie}>{movie.title}</Text>
                  <Text style={styles.rankRevenue}>{movie.genre} • {movie.runtime}</Text>
                </View>
                <Text style={styles.rankActionText}>Xem</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

export function ExploreScreen(props: {
  onMoviePress: (movie: Movie) => void;
  moviesData: Movie[];
  loading: boolean;
  statusFilter: string;
  setStatusFilter: Setter<string>;
  cinemaFilter: string;
  setCinemaFilter: Setter<string>;
  genreFilter: string;
  setGenreFilter: Setter<string>;
  hourFilter: string;
  setHourFilter: Setter<string>;
  cinemaOptions: string[];
  genreOptions: string[];
}) {
  const { onMoviePress, moviesData, loading, statusFilter, setStatusFilter, cinemaFilter, setCinemaFilter, genreFilter, setGenreFilter, hourFilter, setHourFilter, cinemaOptions, genreOptions } = props;

  if (loading && moviesData.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SkeletonBlock height={96} />
        <SkeletonBlock height={220} />
        <SkeletonBlock height={220} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.exploreHero}>
        <Text style={styles.eyebrow}>KHÁM PHÁ</Text>
        <Text style={styles.sectionTitle}>Tìm phim theo rạp, thể loại và khung giờ.</Text>
        <Text style={styles.accountDetail}>Bộ lọc ngắn gọn hơn để giống trải nghiệm sản phẩm thật.</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {[["ALL", "Tất cả"], ["NOW_SHOWING", "Đang chiếu"], ["COMING_SOON", "Sắp chiếu"]].map(([id, label]) => (
          <Pressable key={id} style={[styles.paymentMethod, statusFilter === id && styles.paymentMethodActive]} onPress={() => setStatusFilter(id)}>
            <Text style={[styles.paymentMethodText, statusFilter === id && styles.paymentMethodTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {["ALL", ...cinemaOptions].map((cinema) => (
          <Pressable key={cinema} style={[styles.paymentMethod, cinemaFilter === cinema && styles.paymentMethodActive]} onPress={() => setCinemaFilter(cinema)}>
            <Text style={[styles.paymentMethodText, cinemaFilter === cinema && styles.paymentMethodTextActive]}>{cinema === "ALL" ? "Tất cả rạp" : cinema}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {["ALL", ...genreOptions].map((genre) => (
          <Pressable key={genre} style={[styles.paymentMethod, genreFilter === genre && styles.paymentMethodActive]} onPress={() => setGenreFilter(genre)}>
            <Text style={[styles.paymentMethodText, genreFilter === genre && styles.paymentMethodTextActive]}>{genre === "ALL" ? "Tất cả thể loại" : genre}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {[["ALL", "Mọi giờ"], ["MORNING", "Trước 12h"], ["AFTERNOON", "12h - 18h"], ["EVENING", "Sau 18h"]].map(([id, label]) => (
          <Pressable key={id} style={[styles.paymentMethod, hourFilter === id && styles.paymentMethodActive]} onPress={() => setHourFilter(id)}>
            <Text style={[styles.paymentMethodText, hourFilter === id && styles.paymentMethodTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {moviesData.length === 0 ? (
        <View style={styles.accountRow}>
          <Text style={styles.accountTitle}>Không có phim phù hợp</Text>
          <Text style={styles.accountDetail}>Hãy đổi bộ lọc để xem thêm lịch chiếu.</Text>
        </View>
      ) : null}

      {moviesData.map((movie) => (
        <Pressable key={`explore-${movie.id}`} style={styles.exploreCard} onPress={() => onMoviePress(movie)}>
          <View style={[styles.explorePoster, { backgroundColor: movie.tone }]}>
            {movie.posterUrl ? <Image source={{ uri: movie.posterUrl }} style={styles.explorePosterImage} resizeMode="cover" /> : null}
          </View>
          <View style={styles.exploreBody}>
            <Text style={styles.exploreBadge}>{movie.badge}</Text>
            <Text style={styles.exploreTitle}>{movie.title}</Text>
            <Text style={styles.exploreMeta}>{movie.genre} • {movie.runtime} • IMDb {movie.score}</Text>
            <Text style={styles.exploreDescription}>{movie.description}</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function TicketsScreen({ onSeatPress, onTicketPress, tickets, moviesData, loading, fallbackMovie }: { onSeatPress: (movie: Movie) => void; onTicketPress: (ticket: TicketItem) => void; tickets: TicketItem[]; moviesData: Movie[]; loading: boolean; fallbackMovie: Movie; }) {
  if (loading && tickets.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SkeletonBlock height={120} />
        <SkeletonBlock height={150} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.screenIntro}>
        <Text style={styles.eyebrow}>VÉ CỦA TÔI</Text>
        <Text style={styles.sectionTitle}>Quản lý vé đã đặt và mở lại QR khi cần.</Text>
      </View>

      {tickets.length === 0 ? (
        <View style={styles.ticketEmptyCard}>
          <Text style={styles.ticketEmptyLabel}>Chưa có giao dịch</Text>
          <View style={styles.ticketContent}>
            <Text style={styles.ticketMovie}>Kho vé đang trống</Text>
            <Text style={styles.ticketInfo}>Đặt suất đầu tiên để bắt đầu lưu vé tại đây.</Text>
          </View>
          <NeonButton label="Đặt vé ngay" onPress={() => onSeatPress(moviesData[0] ?? fallbackMovie)} />
        </View>
      ) : null}

      {tickets.map((ticket, index) => (
        <Pressable key={`${ticket.movie}-${ticket.time}`} style={styles.ticketCard} onPress={() => onTicketPress(ticket)}>
          <View style={styles.ticketStripe} />
          <View style={styles.ticketContent}>
            <View style={styles.ticketHead}>
              <Text style={styles.ticketMovie}>{ticket.movie}</Text>
              <Text style={[styles.ticketStatus, ticket.status === "PAID" && styles.ticketStatusPaid]}>{mapBookingStatus(ticket.status)}</Text>
            </View>
            <Text style={styles.ticketInfo}>{ticket.cinema}</Text>
            <Text style={styles.ticketInfo}>{ticket.time.replace("T", " • ")} • Ghế {ticket.seat}</Text>
            <Text style={styles.ticketInfo}>Mã vé {ticket.bookingCode}</Text>
          </View>
          <NeonButton label={index === 0 ? "Mở vé" : "Đặt lại"} variant="secondary" onPress={() => onSeatPress(moviesData[index % moviesData.length] ?? fallbackMovie)} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function AuthScreen(props: {
  apiBaseUrl: string;
  setApiBaseUrl: Setter<string>;
  authMode: "login" | "register";
  setAuthMode: Setter<"login" | "register">;
  authName: string;
  setAuthName: Setter<string>;
  authEmail: string;
  setAuthEmail: Setter<string>;
  authPhone: string;
  setAuthPhone: Setter<string>;
  authPassword: string;
  setAuthPassword: Setter<string>;
  onSubmitAuth: () => void;
  onGoogleAuth: () => void;
  authLoading: boolean;
}) {
  const { apiBaseUrl, setApiBaseUrl, authMode, setAuthMode, authName, setAuthName, authEmail, setAuthEmail, authPhone, setAuthPhone, authPassword, setAuthPassword, onSubmitAuth, onGoogleAuth, authLoading } = props;
  const slides = [
    {
      eyebrow: "??T V? TH?NG MINH",
      title: "Ch?n phim nhanh, gi? gh? ??p v? quay l?i ??ng b??c ?ang xem.",
      body: "App ghi nh? lu?ng ?ang m? ?? tr?i nghi?m gi?ng s?n ph?m th?t, kh?ng c?n c?m gi?c demo.",
      chips: ["Gi? gh? theo th?i gian th?c", "Back Android ??ng lu?ng"],
    },
    {
      eyebrow: "V? V? NH?C L?CH",
      title: "To?n b? v?, QR v? l?ch nh?c ???c gom v?o m?t n?i d? qu?t.",
      body: "B?n c? th? m? l?i v?, theo d?i tr?ng th?i thanh to?n v? nh?n nh?c l?ch tr??c gi? chi?u.",
      chips: ["V? ??ng b?", "Nh?c l?ch t? ??ng"],
    },
    {
      eyebrow: "PHI?N C? NH?N",
      title: "??ng nh?p m?t l?n, m? l?i app v?n v?o th?ng tr?i nghi?m c?a b?n.",
      body: "Phi?n ???c l?u an to?n b?ng Secure Store ?? d?ng t?t h?n cho m?i tr??ng production.",
      chips: ["Secure Store", "?u ??i c? nh?n"],
    },
  ] as const;
  const [onboardingStep, setOnboardingStep] = React.useState(0);
  const inAuthForm = onboardingStep >= slides.length;
  const currentSlide = slides[Math.min(onboardingStep, slides.length - 1)];

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {!inAuthForm ? (
        <>
          <View style={styles.authHero}>
            <Text style={styles.eyebrow}>{currentSlide.eyebrow}</Text>
            <Text style={styles.authTitle}>{currentSlide.title}</Text>
            <Text style={styles.authBody}>{currentSlide.body}</Text>
            <View style={styles.authFeatureRow}>
              {currentSlide.chips.map((chip) => (
                <View key={chip} style={styles.authFeatureChip}>
                  <Text style={styles.authFeatureText}>{chip}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.authStepRow}>
            {slides.map((_, index) => (
              <View key={`step-${index}`} style={[styles.authStepDot, onboardingStep === index && styles.authStepDotActive]} />
            ))}
          </View>

          <View style={styles.authNavRow}>
            <Pressable onPress={() => setOnboardingStep(slides.length)}>
              <Text style={styles.authLink}>B? qua</Text>
            </Pressable>
            <NeonButton label={onboardingStep === slides.length - 1 ? "B?t ??u" : "Ti?p theo"} onPress={() => setOnboardingStep((step) => Math.min(step + 1, slides.length))} />
          </View>
        </>
      ) : (
        <>
          <View style={styles.authHero}>
            <Text style={styles.eyebrow}>S?N S?NG ??NG NH?P</Text>
            <Text style={styles.authTitle}>??ng nh?p ?? ??ng b? v?, gh? ?? gi? v? l?ch nh?c tr?n thi?t b? c?a b?n.</Text>
            <Text style={styles.authBody}>M?i giao d?ch, m? QR v? ?u ??i s? ???c gi? l?i khi b?n m? app l?n sau.</Text>
          </View>

          <View style={styles.authCard}>
            <Text style={styles.accountTitle}>B?t ??u</Text>
            <Text style={styles.accountDetail}>T?o t?i kho?n m?i ho?c ??ng nh?p ?? v?o tr?i nghi?m ??t v? ??y ??.</Text>
            <Pressable style={styles.googleButton} onPress={onGoogleAuth}>
              <MaterialCommunityIcons name="google" size={18} color="#ffffff" />
              <Text style={styles.googleButtonText}>Ti?p t?c v?i Google</Text>
            </Pressable>
            <Text style={styles.authDivider}>ho?c d?ng email</Text>
            <View style={styles.paymentWrap}>
              {["login", "register"].map((mode) => (
                <Pressable key={mode} style={[styles.paymentMethod, authMode === mode && styles.paymentMethodActive]} onPress={() => setAuthMode(mode as "login" | "register")}>
                  <Text style={[styles.paymentMethodText, authMode === mode && styles.paymentMethodTextActive]}>{mode === "login" ? "??ng nh?p" : "??ng k?"}</Text>
                </Pressable>
              ))}
            </View>
            {authMode === "register" ? <TextInput value={authName} onChangeText={setAuthName} placeholder="H? v? t?n" placeholderTextColor={palette.muted} style={styles.input} /> : null}
            <TextInput value={authEmail} onChangeText={setAuthEmail} placeholder="Email" placeholderTextColor={palette.muted} style={styles.input} autoCapitalize="none" />
            {authMode === "register" ? <TextInput value={authPhone} onChangeText={setAuthPhone} placeholder="S? ?i?n tho?i" placeholderTextColor={palette.muted} style={styles.input} /> : null}
            <TextInput value={authPassword} onChangeText={setAuthPassword} placeholder="M?t kh?u" placeholderTextColor={palette.muted} style={styles.input} secureTextEntry />
            {authLoading ? <ActivityIndicator color={palette.cyan} /> : null}
            <NeonButton label={authMode === "login" ? "V?o ?ng d?ng" : "T?o t?i kho?n"} onPress={onSubmitAuth} />
            <Text style={styles.accountDetail}>T?i kho?n m?u: `admin@datve.local / Admin@123`, `user@datve.local / User@123`.</Text>
          </View>

          <View style={styles.accountRow}>
            <Text style={styles.accountTitle}>K?t n?i API</Text>
            <Text style={styles.accountDetail}>??i URL backend n?u thi?t b? ?ang ? m?ng kh?c.</Text>
            <TextInput value={apiBaseUrl} onChangeText={setApiBaseUrl} style={styles.input} autoCapitalize="none" />
          </View>
        </>
      )}
    </ScrollView>
  );
}

export function ProfileScreen(props: {
  apiBaseUrl: string;
  setApiBaseUrl: Setter<string>;
  onReload: () => void;
  favoriteMovies: Movie[];
  watchlistMovies: Movie[];
  onMoviePress: (movie: Movie) => void;
  profile: ProfileData | null;
  sessionUser: SessionUser | null;
  reminders: ReminderItem[];
  onLogout: () => void;
}) {
  const { apiBaseUrl, setApiBaseUrl, onReload, favoriteMovies, watchlistMovies, onMoviePress, profile, sessionUser, reminders, onLogout } = props;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.profileHero}>
        {profile?.avatarUrl ? <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} /> : <View style={styles.avatar} />}
        <View style={styles.profileMetaBlock}>
          <Text style={styles.profileName}>{profile?.fullName ?? sessionUser?.fullName ?? "Kh?ch"}</Text>
          <Text style={styles.profileMail}>{profile?.email ?? sessionUser?.email ?? "Ch?a ??ng nh?p"}</Text>
          <Text style={styles.accountDetail}>{profile?.phone ?? sessionUser?.phone ?? "??ng nh?p ?? ??ng b? v?, ?u ??i v? nh?c l?ch."}</Text>
        </View>
      </View>

      <View style={styles.accountRow}>
        <Text style={styles.accountTitle}>T?i kho?n</Text>
        <Text style={styles.accountDetail}>{sessionUser ? `?ang ??ng nh?p v?i vai tr? ${sessionUser.role}.` : "??ng nh?p ho?c ??ng k? ?? d?ng d? li?u c? nh?n v? voucher."}</Text>
        <NeonButton label="??ng xu?t" variant="secondary" onPress={onLogout} />
      </View>

      {profile ? (
        <View style={styles.checkoutSummaryGrid}>
          <View style={styles.checkoutSummaryCell}>
            <Text style={styles.summaryLabel}>Y?u th?ch</Text>
            <Text style={styles.summaryValue}>{profile.stats.favorites}</Text>
          </View>
          <View style={styles.checkoutSummaryCell}>
            <Text style={styles.summaryLabel}>V? ?? ??t</Text>
            <Text style={styles.summaryValue}>{profile.stats.bookings}</Text>
          </View>
          <View style={styles.checkoutSummaryCell}>
            <Text style={styles.summaryLabel}>Chi ti?u</Text>
            <Text style={styles.summaryValue}>{formatCurrency(profile.stats.spending)}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.accountRow}>
        <Text style={styles.accountTitle}>Nh?c l?ch v?</Text>
        {reminders.length === 0 ? <Text style={styles.accountDetail}>Ch?a c? l?ch nh?c n?o.</Text> : null}
        {reminders.slice(0, 4).map((item) => (
          <View key={`reminder-${item.id}`} style={styles.activityRow}>
            <Text style={styles.activityTitle}>{item.movie_title}</Text>
            <Text style={styles.activityMeta}>{item.cinema_name} ? {formatDateTime(item.start_time)}</Text>
            <Text style={styles.activityTime}>Nh?c l?c {formatDateTime(item.remind_at)} ? {item.status}</Text>
          </View>
        ))}
      </View>

      <View style={styles.accountRow}>
        <Text style={styles.accountTitle}>Y?u th?ch</Text>
        <View style={styles.profileMovieList}>
          {favoriteMovies.length === 0 ? <Text style={styles.accountDetail}>Ch?a c? phim y?u th?ch.</Text> : null}
          {favoriteMovies.map((movie) => (
            <Pressable key={`fav-${movie.id}`} onPress={() => onMoviePress(movie)} style={styles.profileMovieChip}>
              <Text style={styles.profileMovieChipText}>{movie.title}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.accountRow}>
        <Text style={styles.accountTitle}>Xem sau</Text>
        <View style={styles.profileMovieList}>
          {watchlistMovies.length === 0 ? <Text style={styles.accountDetail}>Ch?a c? phim trong danh s?ch xem sau.</Text> : null}
          {watchlistMovies.map((movie) => (
            <Pressable key={`watch-${movie.id}`} onPress={() => onMoviePress(movie)} style={styles.profileMovieChip}>
              <Text style={styles.profileMovieChipText}>{movie.title}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.accountRow}>
        <Text style={styles.accountTitle}>K?t n?i API</Text>
        <Text style={styles.accountDetail}>??i URL backend n?u thi?t b? ?ang ? m?ng kh?c.</Text>
        <TextInput value={apiBaseUrl} onChangeText={setApiBaseUrl} style={styles.input} autoCapitalize="none" />
        <NeonButton label="T?i l?i d? li?u" onPress={onReload} />
      </View>
    </ScrollView>
  );
}

export function MovieDetailScreen(props: { movie: Movie; onBack: () => void; onBook: (showtime: ShowtimeItem) => void; showtimesData: ShowtimeItem[]; isFavorite: boolean; isInWatchlist: boolean; onToggleFavorite: () => void; onToggleWatchlist: () => void; }) {
  const { movie, onBack, onBook, showtimesData, isFavorite, isInWatchlist, onToggleFavorite, onToggleWatchlist } = props;
  const movieShowtimes = showtimesData.filter((item) => item.movieId === movie.id);
  const featuredShowtime = movieShowtimes[0];

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Pressable onPress={onBack}>
        <Text style={styles.backLink}>? Quay l?i</Text>
      </Pressable>

      <View style={styles.detailHeaderRow}>
        <View style={styles.detailThumbWrap}>
          {movie.posterUrl ? <Image source={{ uri: movie.posterUrl }} style={styles.detailThumbImage} resizeMode="cover" /> : <View style={[styles.detailThumbImage, { backgroundColor: movie.tone }]} />}
        </View>
        <View style={styles.detailHeaderMeta}>
          <Text style={styles.detailHeaderTitle}>{movie.title}</Text>
          <View style={styles.detailHeaderChips}>
            <Text style={styles.detailHeaderChip}>{movie.status === "COMING_SOON" ? "S?p chi?u" : "?ang chi?u"}</Text>
            <Text style={styles.detailHeaderChipSecondary}>IMDb {movie.score}</Text>
          </View>
          <Text style={styles.detailHeaderSubline}>{movie.genre} ? {movie.runtime}</Text>
        </View>
      </View>

      <View style={[styles.detailPoster, { backgroundColor: movie.tone }]}>
        {movie.bannerUrl ? <Image source={{ uri: movie.bannerUrl }} style={styles.detailPosterImage} resizeMode="cover" /> : null}
        <View style={styles.detailPosterScrim} />
        <Text style={styles.posterBadge}>{movie.badge}</Text>
        <View style={styles.detailOverlayMeta}>
          <Text style={styles.detailOverlayText}>IMDb {movie.score}</Text>
          <Text style={styles.detailOverlayText}>{movie.status === "COMING_SOON" ? "S?p chi?u" : "?ang chi?u"}</Text>
        </View>
        <View style={styles.detailMediaBottom}>
          <View style={styles.detailMediaPlay}>
            <Text style={styles.detailMediaPlayText}>XEM TRAILER</Text>
          </View>
          <View style={styles.detailMediaFacts}>
            <Text style={styles.detailMediaFactText}>{featuredShowtime ? featuredShowtime.startTime.slice(11, 16) : "C?p nh?t s?m"}</Text>
            <Text style={styles.detailMediaFactDivider}>?</Text>
            <Text style={styles.detailMediaFactText}>{featuredShowtime ? featuredShowtime.formatLabel : movie.runtime}</Text>
            <Text style={styles.detailMediaFactDivider}>?</Text>
            <Text style={styles.detailMediaFactText}>{featuredShowtime ? featuredShowtime.languageLabel : movie.genre}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.detailTitle}>{movie.title}</Text>
      <Text style={styles.detailMeta}>{movie.genre} ? {movie.runtime}</Text>
      <Text style={styles.detailDescription}>{movie.description}</Text>

      <View style={styles.detailActionsRow}>
        <NeonButton label={isFavorite ? "B? y?u th?ch" : "Th?m y?u th?ch"} variant="secondary" onPress={onToggleFavorite} />
        <NeonButton label={isInWatchlist ? "B? xem sau" : "L?u xem sau"} variant="secondary" onPress={onToggleWatchlist} />
      </View>

      <View style={styles.detailStatsRow}>
        <View style={styles.detailStat}>
          <Text style={styles.detailStatLabel}>Tr?ng th?i</Text>
          <Text style={styles.detailStatValue}>{movie.status === "COMING_SOON" ? "S?p chi?u" : "?ang chi?u"}</Text>
        </View>
        <View style={styles.detailStat}>
          <Text style={styles.detailStatLabel}>??nh gi?</Text>
          <Text style={styles.detailStatValue}>{movie.score}/10</Text>
        </View>
        <View style={styles.detailStat}>
          <Text style={styles.detailStatLabel}>Th?i l??ng</Text>
          <Text style={styles.detailStatValue}>{movie.runtime}</Text>
        </View>
      </View>

      <SectionHeader title="L?ch chi?u h?m nay" action={`${movieShowtimes.length} su?t`} />
      <View style={styles.showtimeGrid}>
        {movieShowtimes.map((item) => (
          <Pressable key={`${item.id}-${item.roomName}`} style={styles.showtimeCard} onPress={() => onBook(item)}>
            <View style={styles.showtimePillRow}>
              <Text style={styles.showtimePill}>{item.formatLabel}</Text>
              <Text style={styles.showtimePillSecondary}>{item.languageLabel}</Text>
            </View>
            <Text style={styles.showtimeTime}>{item.startTime.slice(11, 16)}</Text>
            <Text style={styles.showtimeCinema}>{item.cinemaName}</Text>
            <Text style={styles.showtimeInfo}>{item.roomName}</Text>
            <Text style={styles.showtimePrice}>{formatCurrency(item.basePrice)}</Text>
          </Pressable>
        ))}
      </View>

      {featuredShowtime ? <NeonButton label="Ch?n gh?" onPress={() => onBook(featuredShowtime)} /> : null}
    </ScrollView>
  );
}

export function SeatScreen({ movie, showtime, onBack, onContinue, selectedSeats, onToggleSeat, holding, seatMapRows }: { movie: Movie; showtime: ShowtimeItem | null; onBack: () => void; onContinue: () => void; selectedSeats: SeatSelection[]; onToggleSeat: (seat: SeatSelection) => void; holding: boolean; seatMapRows: SeatMapRow[]; }) {
  const layout = seatMapRows;
  const standardRows = layout.filter((row) => row.seats.some((seat) => seat.seatType === "STANDARD"));
  const vipRows = layout.filter((row) => row.seats.some((seat) => seat.seatType === "VIP"));
  const coupleRows = layout.filter((row) => row.seats.some((seat) => seat.seatType === "COUPLE"));
  const subtotal = selectedSeats.reduce((sum, item) => sum + item.price, 0);

  const renderSeatRow = (row: SeatMapRow, accent: "standard" | "vip" | "couple" = "standard") => (
    <View key={row.rowLabel} style={styles.seatRow}>
      <Text style={[styles.seatRowLabel, accent === "vip" && styles.seatRowLabelVip, accent === "couple" && styles.seatRowLabelCouple]}>{row.rowLabel}</Text>
      {row.seats.map((seat, index) => {
        const active = selectedSeats.some((item) => item.seatCode === seat.seatCode);
        const disabled = seat.status !== "AVAILABLE";
        const backgroundColor =
          seat.status === "SOLD"
            ? palette.sold
            : seat.status === "HELD"
              ? palette.held
              : seat.seatType === "VIP"
                ? palette.vip
                : seat.seatType === "COUPLE"
                  ? palette.couple
                  : palette.seat;
        const needsAisleGap = row.seats.length >= 8 && index == Math.floor(row.seats.length / 2) - 1;

        return (
          <React.Fragment key={seat.seatCode}>
            <Pressable
              disabled={disabled}
              onPress={() => onToggleSeat({ seatCode: seat.seatCode, seatType: seat.seatType as "STANDARD" | "VIP" | "COUPLE", price: seat.price })}
              style={[styles.seatCell, seat.seatType === "COUPLE" && styles.coupleSeatCell, active && styles.seatActive, { backgroundColor }]}
            >
              <Text style={styles.seatCellText}>{seat.seatCode.replace(row.rowLabel, "")}</Text>
            </Pressable>
            {needsAisleGap ? <View style={styles.seatAisleGap} /> : null}
          </React.Fragment>
        );
      })}
      <Text style={[styles.seatRowLabel, accent === "vip" && styles.seatRowLabelVip, accent === "couple" && styles.seatRowLabelCouple]}>{row.rowLabel}</Text>
    </View>
  );

  return (
    <View style={styles.screenShell}>
      <ScrollView contentContainerStyle={[styles.scrollContent, styles.stickyScrollContent]} showsVerticalScrollIndicator={false}>
        <Pressable onPress={onBack}>
          <Text style={styles.backLink}>? Quay l?i</Text>
        </Pressable>

        <View style={styles.seatHeader}>
          <Text style={styles.detailTitle}>{movie.title}</Text>
          <Text style={styles.detailMeta}>{showtime ? `${showtime.cinemaName} ? ${showtime.roomName} ? ${showtime.startTime.slice(11, 16)}` : "Ch?a ch?n su?t chi?u"}</Text>
        </View>

        <View style={styles.seatPriceRow}>
          <View style={styles.seatPriceCard}>
            <Text style={styles.seatPriceLabel}>Gh? th??ng</Text>
            <Text style={styles.seatPriceValue}>C? b?n</Text>
          </View>
          <View style={styles.seatPriceCard}>
            <Text style={styles.seatPriceLabel}>Gh? VIP</Text>
            <Text style={styles.seatPriceValue}>+30.000?</Text>
          </View>
          <View style={styles.seatPriceCard}>
            <Text style={styles.seatPriceLabel}>Gh? ??i</Text>
            <Text style={styles.seatPriceValue}>+90.000?</Text>
          </View>
        </View>

        <View style={styles.screenArcWrap}>
          <View style={styles.screenArcGlow} />
          <Text style={styles.screenArcText}>M?N H?NH</Text>
        </View>

        <View style={styles.seatGridWrap}>
          {standardRows.length > 0 ? (
            <View style={styles.seatSection}>
              <Text style={styles.seatSectionLabel}>KHU TH??NG</Text>
              {standardRows.map((row) => renderSeatRow(row, "standard"))}
            </View>
          ) : null}
          {vipRows.length > 0 ? (
            <View style={styles.seatSectionVip}>
              <Text style={styles.seatSectionLabelVip}>KHU VIP</Text>
              {vipRows.map((row) => renderSeatRow(row, "vip"))}
            </View>
          ) : null}
          {coupleRows.length > 0 ? (
            <View style={styles.seatSectionCouple}>
              <Text style={styles.seatSectionLabelCouple}>SWEETBOX / GH? ??I</Text>
              {coupleRows.map((row) => renderSeatRow(row, "couple"))}
            </View>
          ) : null}
        </View>

        <View style={styles.legendGrid}>
          {[["Gh? th??ng", palette.seat], ["Gh? VIP", palette.vip], ["Gh? ??i", palette.couple], ["?? b?n", palette.sold], ["?ang gi?", palette.held]].map(([label, color]) => (
            <View key={label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendText}>{label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.stickyFooterWrap}>
        <View style={styles.stickyFooter}>
          <View style={styles.stickySummaryMain}>
            <Text style={styles.summaryLabel}>Gh? ?? ch?n</Text>
            <Text style={styles.stickyPrimaryValue}>{selectedSeats.map((item) => item.seatCode).join(", ") || "Ch?a ch?n"}</Text>
            <Text style={styles.stickySecondaryValue}>T?m t?nh {formatCurrency(subtotal)}</Text>
          </View>
          <View style={styles.stickyActionBlock}>
            {holding ? <ActivityIndicator color={palette.cyan} /> : null}
            <NeonButton label="Ti?p t?c" onPress={onContinue} />
          </View>
        </View>
      </View>
    </View>
  );
}

export function CheckoutScreen(props: { movie: Movie; onBack: () => void; combosData: ComboItem[]; selectedSeats: SeatSelection[]; selectedComboIds: number[]; selectedPaymentProvider: PaymentProvider; selectedPaymentGatewayMode: "SANDBOX" | "REAL"; onSelectPaymentProvider: (provider: PaymentProvider) => void; onSelectPaymentGatewayMode: (mode: "SANDBOX" | "REAL") => void; onToggleCombo: (id: number) => void; customerName: string; setCustomerName: Setter<string>; customerEmail: string; setCustomerEmail: Setter<string>; customerPhone: string; setCustomerPhone: Setter<string>; onConfirm: () => void; confirming: boolean; vouchers: Voucher[]; voucherCode: string; setVoucherCode: Setter<string>; appliedVoucherCode: string | null; estimatedDiscount: number; }) {
  const { movie, onBack, combosData, selectedSeats, selectedComboIds, selectedPaymentProvider, selectedPaymentGatewayMode, onSelectPaymentProvider, onSelectPaymentGatewayMode, onToggleCombo, customerName, setCustomerName, customerEmail, setCustomerEmail, customerPhone, setCustomerPhone, onConfirm, confirming, vouchers, voucherCode, setVoucherCode, appliedVoucherCode, estimatedDiscount } = props;
  const selectedCombos = combosData.filter((combo) => selectedComboIds.includes(combo.id));
  const subtotal = selectedSeats.reduce((sum, item) => sum + item.price, 0) + selectedCombos.reduce((sum, item) => sum + item.unitPrice, 0);
  const total = Math.max(subtotal - estimatedDiscount, 0);

  return (
    <View style={styles.screenShell}>
      <ScrollView contentContainerStyle={[styles.scrollContent, styles.stickyScrollContent]} showsVerticalScrollIndicator={false}>
        <Pressable onPress={onBack}>
          <Text style={styles.backLink}>? Quay l?i</Text>
        </Pressable>

        <Text style={styles.detailTitle}>Thanh to?n</Text>
        <Text style={styles.detailMeta}>{movie.title} ? {selectedSeats.map((item) => item.seatCode).join(", ") || "Ch?a ch?n gh?"}</Text>

        <View style={styles.checkoutSummaryGrid}>
          <View style={styles.checkoutSummaryCell}>
            <Text style={styles.summaryLabel}>S? gh?</Text>
            <Text style={styles.summaryValue}>{selectedSeats.length}</Text>
          </View>
          <View style={styles.checkoutSummaryCell}>
            <Text style={styles.summaryLabel}>Combo</Text>
            <Text style={styles.summaryValue}>{selectedCombos.length}</Text>
          </View>
          <View style={styles.checkoutSummaryCell}>
            <Text style={styles.summaryLabel}>C?ng</Text>
            <Text style={styles.summaryValue}>{selectedPaymentProvider}</Text>
          </View>
        </View>

        <SectionHeader title="Combo" action="T?y ch?n" />
        {combosData.map((combo) => (
          <Pressable key={combo.id} style={[styles.comboCard, selectedComboIds.includes(combo.id) && styles.comboCardActive]} onPress={() => onToggleCombo(combo.id)}>
            <View style={styles.comboInfo}>
              <Text style={styles.comboTitle}>{combo.name}</Text>
              <Text style={styles.comboDetail}>{combo.detail}</Text>
            </View>
            <Text style={styles.comboPrice}>{combo.price}</Text>
          </Pressable>
        ))}

        <View style={styles.accountRow}>
          <Text style={styles.accountTitle}>Voucher</Text>
          <TextInput value={voucherCode} onChangeText={setVoucherCode} placeholder="Nh?p m? voucher" placeholderTextColor={palette.muted} style={styles.input} autoCapitalize="characters" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {vouchers.slice(0, 8).map((voucher) => (
              <Pressable key={voucher.code} style={[styles.paymentMethod, voucherCode === voucher.code && styles.paymentMethodActive]} onPress={() => setVoucherCode(voucher.code)}>
                <Text style={[styles.paymentMethodText, voucherCode === voucher.code && styles.paymentMethodTextActive]}>{voucher.code}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={styles.accountDetail}>{appliedVoucherCode ? `?ang ?p d?ng ${appliedVoucherCode}, gi?m kho?ng ${formatCurrency(estimatedDiscount)}.` : "Ch?n voucher n?u b?n c? ?u ??i."}</Text>
        </View>

        <SectionHeader title="Ph??ng th?c thanh to?n" action="MoMo ? ZaloPay ? VNPay" />
        <View style={styles.paymentWrap}>
          {[["MOMO", "MoMo"], ["ZALOPAY", "ZaloPay"], ["VNPAY", "VNPay"]].map(([id, label]) => (
            <Pressable key={id} style={[styles.paymentMethod, selectedPaymentProvider === id && styles.paymentMethodActive]} onPress={() => onSelectPaymentProvider(id as PaymentProvider)}>
              <Text style={[styles.paymentMethodText, selectedPaymentProvider === id && styles.paymentMethodTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.paymentWrap}>
          {[["SANDBOX", "Th? nghi?m"], ["REAL", "Th?c t?"]].map(([id, label]) => (
            <Pressable key={id} style={[styles.paymentMethod, selectedPaymentGatewayMode === id && styles.paymentMethodActive]} onPress={() => onSelectPaymentGatewayMode(id as "SANDBOX" | "REAL")}>
              <Text style={[styles.paymentMethodText, selectedPaymentGatewayMode === id && styles.paymentMethodTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.checkoutCard}>
          <Text style={styles.summaryLabel}>T?ng thanh to?n</Text>
          <Text style={styles.checkoutPrice}>{formatCurrency(total)}</Text>
          <Text style={styles.checkoutHint}>T?m t?nh {formatCurrency(subtotal)} ? Gi?m gi? {formatCurrency(estimatedDiscount)}.</Text>
        </View>

        <View style={styles.accountRow}>
          <Text style={styles.accountTitle}>Th?ng tin nh?n v?</Text>
          <TextInput value={customerName} onChangeText={setCustomerName} placeholder="H? t?n" placeholderTextColor={palette.muted} style={styles.input} />
          <TextInput value={customerEmail} onChangeText={setCustomerEmail} placeholder="Email" placeholderTextColor={palette.muted} style={styles.input} autoCapitalize="none" />
          <TextInput value={customerPhone} onChangeText={setCustomerPhone} placeholder="S? ?i?n tho?i" placeholderTextColor={palette.muted} style={styles.input} />
        </View>
      </ScrollView>
      <View style={styles.stickyFooterWrap}>
        <View style={styles.stickyFooter}>
          <View style={styles.stickySummaryMain}>
            <Text style={styles.summaryLabel}>Thanh to?n</Text>
            <Text style={styles.stickyPrimaryValue}>{formatCurrency(total)}</Text>
            <Text style={styles.stickySecondaryValue}>T?m t?nh {formatCurrency(subtotal)} ? Gi?m {formatCurrency(estimatedDiscount)}</Text>
          </View>
          <View style={styles.stickyActionBlock}>
            {confirming ? <ActivityIndicator color={palette.cyan} /> : null}
            <NeonButton label={`Thanh to?n v?i ${selectedPaymentProvider}`} onPress={onConfirm} />
          </View>
        </View>
      </View>
    </View>
  );
}

export function TicketDetailScreen({ ticket, onBack, onScheduleReminder, onCancelReminder }: { ticket: TicketDetail; onBack: () => void; onScheduleReminder: () => void; onCancelReminder: () => void; }) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Pressable onPress={onBack}>
        <Text style={styles.backLink}>← Quay lại</Text>
      </Pressable>

      <View style={styles.ticketDetailHero}>
        <Text style={styles.eyebrow}>CHI TIẾT VÉ</Text>
        <Text style={styles.detailTitle}>{ticket.showtime.movieTitle}</Text>
        <Text style={styles.detailMeta}>{ticket.showtime.cinemaName} • {ticket.showtime.roomName}</Text>
      </View>

      <View style={styles.ticketDetailGrid}>
        <View style={styles.checkoutSummaryCell}>
          <Text style={styles.summaryLabel}>Mã vé</Text>
          <Text style={styles.summaryValue}>{ticket.bookingCode}</Text>
        </View>
        <View style={styles.checkoutSummaryCell}>
          <Text style={styles.summaryLabel}>Trạng thái</Text>
          <Text style={styles.summaryValue}>{mapBookingStatus(ticket.status)}</Text>
        </View>
      </View>

      <View style={styles.accountRow}>
        <Text style={styles.accountTitle}>Suất chiếu</Text>
        <Text style={styles.accountDetail}>{formatDateTime(ticket.showtime.startTime)} • {ticket.showtime.formatLabel} • {ticket.showtime.languageLabel}</Text>
        <Text style={styles.accountDetail}>Ghế: {ticket.seats.map((item) => item.seatCode).join(", ")}</Text>
        <Text style={styles.accountDetail}>Check-in: {mapCheckinStatus(ticket.checkInStatus)}{ticket.checkedInAt ? ` • ${formatDateTime(ticket.checkedInAt)}` : ""}</Text>
      </View>

      <View style={styles.accountRow}>
        <Text style={styles.accountTitle}>Combo đi kèm</Text>
        {ticket.items.length === 0 ? <Text style={styles.accountDetail}>Không có combo đi kèm.</Text> : null}
        {ticket.items.map((item) => (
          <Text key={`${item.foodId}-${item.name}`} style={styles.accountDetail}>{item.name} x{item.quantity} • {formatCurrency(item.price * item.quantity)}</Text>
        ))}
      </View>

      <View style={styles.accountRow}>
        <Text style={styles.accountTitle}>Voucher và nhắc lịch</Text>
        <Text style={styles.accountDetail}>Voucher: {ticket.voucherCode ?? "Không áp dụng"} • Giảm {formatCurrency(ticket.discountAmount ?? 0)}</Text>
        <Text style={styles.accountDetail}>Mã QR: {ticket.qrPayload ?? "Chưa tạo"}</Text>
        <View style={styles.paymentWrap}>
          <Pressable style={styles.paymentMethod} onPress={onScheduleReminder}>
            <Text style={styles.paymentMethodText}>Nhắc trước 1 giờ</Text>
          </Pressable>
          <Pressable style={styles.paymentMethod} onPress={onCancelReminder}>
            <Text style={styles.paymentMethodText}>Hủy nhắc</Text>
          </Pressable>
        </View>
        <Text style={styles.accountDetail}>Lịch nhắc: {ticket.reminder ? `${formatDateTime(ticket.reminder.remindAt)} • ${ticket.reminder.status}` : "Chưa đặt lịch nhắc"}</Text>
      </View>

      <View style={styles.accountRow}>
        <Text style={styles.accountTitle}>Thông tin khách hàng</Text>
        <Text style={styles.accountDetail}>{ticket.customerName}</Text>
        <Text style={styles.accountDetail}>{ticket.customerEmail}</Text>
        <Text style={styles.accountDetail}>{ticket.customerPhone}</Text>
      </View>

      <View style={styles.checkoutCard}>
        <Text style={styles.summaryLabel}>Tổng thanh toán</Text>
        <Text style={styles.checkoutPrice}>{formatCurrency(ticket.totalAmount)}</Text>
      </View>
    </ScrollView>
  );
}
