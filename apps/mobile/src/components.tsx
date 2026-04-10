import React from "react";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import { ActivityIndicator, Animated, Easing, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { palette, styles } from "./theme";
import { AssistantMessage, Banner, ComboItem, Movie, PaymentProvider, ProfileData, ReminderItem, SeatMapRow, SeatSelection, Setter, SessionUser, ShowtimeItem, TicketDetail, TicketItem, ToastKind, ToastTone, Voucher } from "./types";

const formatCurrency = (value: number) => `${value.toLocaleString("vi-VN")}đ`;

function isSvgAsset(uri?: string | null) {
  return Boolean(uri && /\.svg(?:\?|#|$)/i.test(uri));
}

function MediaAsset({ uri, style, resizeMode = "cover" }: { uri?: string | null; style: any; resizeMode?: "cover" | "contain" | "stretch" | "center" }) {
  if (!uri) return null;
  if (isSvgAsset(uri)) {
    return <View style={style} />;
  }
  return <Image source={{ uri }} style={style} resizeMode={resizeMode} />;
}

function MediaBackground({ uri, style, mediaStyle, children }: { uri?: string | null; style: any; mediaStyle?: any; children?: React.ReactNode }) {
  return (
    <View style={style}>
      {uri ? <MediaAsset uri={uri} style={[mediaStyle, { position: "absolute", inset: 0 }]} /> : null}
      {children}
    </View>
  );
}

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

const toDateKey = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatShowtimeDateLabel = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }
  return date.toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
};

const formatShowtimeDayNumber = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(-2);
  }
  return `${date.getDate()}`.padStart(2, "0");
};

const formatShowtimeWeekday = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Ngày";
  }
  return date.toLocaleDateString("vi-VN", { weekday: "short" });
};

const formatRelativeShowtimeLabel = (value: string, now: number) => {
  const date = new Date(value);
  const today = new Date(now);
  if (Number.isNaN(date.getTime()) || Number.isNaN(today.getTime())) {
    return "Lịch chiếu";
  }

  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const diffDays = Math.round((startOfDate - startOfToday) / 86400000);

  if (diffDays === 0) return "Hôm nay";
  if (diffDays === 1) return "Ngày mai";
  return "Lịch chiếu";
};

const showtimeBucketLabel = (startTime: string) => {
  const hour = Number(String(startTime).slice(11, 13));
  if (hour < 12) return "Sáng";
  if (hour < 18) return "Chiều";
  return "Tối";
};

const getSeatAvailabilityMeta = (availableSeats: number, totalSeats: number) => {
  if (totalSeats <= 0 || availableSeats <= 0) {
    return { label: "Gần kín", tone: "critical" as const };
  }

  const ratio = availableSeats / totalSeats;
  if (ratio <= 0.2) {
    return { label: "Gần kín", tone: "critical" as const };
  }
  if (ratio <= 0.45) {
    return { label: "Sắp hết", tone: "warning" as const };
  }
  return { label: "Còn nhiều", tone: "good" as const };
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

function useMinuteNow() {
  const [minuteNow, setMinuteNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const refresh = () => setMinuteNow(Date.now());
    const timeoutMs = 15000 - (Date.now() % 15000);
    const bootstrap = setTimeout(() => {
      refresh();
      const interval = setInterval(refresh, 15000);
      (refresh as typeof refresh & { interval?: ReturnType<typeof setInterval> }).interval = interval;
    }, timeoutMs);

    return () => {
      clearTimeout(bootstrap);
      const interval = (refresh as typeof refresh & { interval?: ReturnType<typeof setInterval> }).interval;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  return minuteNow;
}

function normalizeTrailerUrl(value?: string | null) {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.includes("/embed/")) {
    return trimmed.includes("?") ? trimmed : `${trimmed}?playsinline=1`;
  }
  const vimeoPlayerMatch = trimmed.match(/player\.vimeo\.com\/video\/(\d+)/i);
  if (vimeoPlayerMatch?.[1]) {
    return `https://player.vimeo.com/video/${vimeoPlayerMatch[1]}?autoplay=1&playsinline=1`;
  }
  const vimeoMatch = trimmed.match(/vimeo\.com\/(\d+)/i);
  if (vimeoMatch?.[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&playsinline=1`;
  }
  const shortMatch = trimmed.match(/youtu\.be\/([^?&/]+)/i);
  if (shortMatch?.[1]) {
    return `https://www.youtube.com/embed/${shortMatch[1]}?autoplay=1&playsinline=1`;
  }
  const watchMatch = trimmed.match(/[?&]v=([^?&]+)/i);
  if (trimmed.includes("youtube.com") && watchMatch?.[1]) {
    return `https://www.youtube.com/embed/${watchMatch[1]}?autoplay=1&playsinline=1`;
  }
  return trimmed;
}

function formatCountdownLabel(startTime: string, now: number) {
  const diffMs = new Date(startTime).getTime() - now;
  if (diffMs <= 0) {
    return "Hết giờ";
  }
  if (diffMs < 60000) {
    return "Đang vào rạp";
  }
  const minutes = Math.max(1, Math.ceil(diffMs / 60000));
  if (minutes <= 3) {
    return "Sắp bắt đầu";
  }
  return `Bắt đầu sau ${minutes} phút`;
}

function getCountdownLevel(startTime: string, now: number) {
  const diffMs = new Date(startTime).getTime() - now;
  if (diffMs <= 0) {
    return "disabled" as const;
  }
  if (diffMs < 60000) {
    return "boarding" as const;
  }
  if (diffMs <= 10 * 60000) {
    return "soon" as const;
  }
  return "active" as const;
}

function detectTrailerKind(url: string | null) {
  if (!url) {
    return "none" as const;
  }
  if (/\.(mp4|m3u8|mov)(\?|$)/i.test(url)) {
    return "native" as const;
  }
  if (/youtube\.com|youtu\.be|vimeo\.com|player\.vimeo\.com/i.test(url)) {
    return "web" as const;
  }
  return "web" as const;
}

const glassNoiseDots = [
  { left: "8%", top: 8, size: 2, opacity: 0.12 },
  { left: "18%", top: 18, size: 1.6, opacity: 0.1 },
  { left: "29%", top: 12, size: 2.4, opacity: 0.11 },
  { left: "43%", top: 20, size: 1.8, opacity: 0.08 },
  { left: "57%", top: 10, size: 2, opacity: 0.1 },
  { left: "69%", top: 18, size: 1.5, opacity: 0.07 },
  { left: "82%", top: 11, size: 2.2, opacity: 0.1 },
  { left: "91%", top: 19, size: 1.4, opacity: 0.08 },
] as const;

function TrailerPlayer({ url, posterUrl, title }: { url: string | null; posterUrl?: string | null; title: string }) {
  const kind = detectTrailerKind(url);
  const [started, setStarted] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [loadProgress, setLoadProgress] = React.useState(0);
  const player = useVideoPlayer(kind === "native" && url ? url : null, (instance) => {
    instance.loop = false;
    instance.muted = false;
  });

  React.useEffect(() => {
    if (!player || kind !== "native") {
      return;
    }
    if (started) {
      setLoading(true);
      player.play();
    } else {
      player.pause();
      setLoading(false);
      setLoadProgress(0);
    }
  }, [kind, player, started]);

  if (!url) {
    return (
      <View style={styles.accountRow}>
        <Text style={styles.accountTitle}>Chưa có trailer</Text>
        <Text style={styles.accountDetail}>Phim này hiện chưa có link trailer để phát trong app.</Text>
      </View>
    );
  }

  if (!started) {
    return (
      <Pressable style={styles.trailerPosterPreview} onPress={() => setStarted(true)}>
        <MediaAsset uri={posterUrl} style={styles.trailerPosterImage} />
        <LinearGradient
          colors={["rgba(5,5,7,0.08)", "rgba(5,5,7,0.62)", "rgba(5,5,7,0.9)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.trailerPosterScrim}
        />
        <View style={styles.trailerPosterCenter}>
          <View style={styles.trailerPosterPlay}>
            <MaterialCommunityIcons name="play" size={24} color="#fff6f0" />
          </View>
          <Text style={styles.trailerPosterTitle}>{title}</Text>
          <Text style={styles.trailerPosterHint}>Bấm để phát trailer</Text>
        </View>
      </Pressable>
    );
  }

  if (kind === "native") {
    return (
      <View style={styles.trailerPlayerWrap}>
        <VideoView
          player={player}
          style={styles.trailerWebview}
          allowsFullscreen
          allowsPictureInPicture={false}
          contentFit="contain"
        />
        {loading ? (
          <View style={styles.trailerLoadingOverlay}>
            <ActivityIndicator color={palette.cyan} />
            <Text style={styles.trailerLoadingText}>{loadProgress > 0 ? `Đang tải ${loadProgress}%` : "Đang tải trailer"}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.trailerPlayerWrap}>
      <WebView
        source={{ uri: url }}
        style={styles.trailerWebview}
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        onLoadStart={() => {
          setLoading(true);
          setLoadProgress(12);
        }}
        onLoadProgress={({ nativeEvent }) => setLoadProgress(Math.max(12, Math.round(nativeEvent.progress * 100)))}
        onLoadEnd={() => {
          setLoading(false);
          setLoadProgress(100);
        }}
      />
      {loading ? (
        <View style={styles.trailerLoadingOverlay}>
          <ActivityIndicator color={palette.cyan} />
          <Text style={styles.trailerLoadingText}>{`Đang tải ${Math.max(loadProgress, 12)}%`}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

export function NeonButton({
  label,
  variant = "primary",
  onPress,
  loading = false,
  disabled = false,
}: {
  label: string;
  variant?: "primary" | "secondary";
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const blocked = loading || disabled;
  return (
    <Pressable
      onPress={blocked ? undefined : onPress}
      disabled={blocked}
      style={[styles.button, variant === "primary" ? styles.buttonPrimary : styles.buttonSecondary, blocked && styles.buttonDisabled]}
    >
      {loading ? <ActivityIndicator size="small" color={variant === "primary" ? "#fff8f6" : palette.cyan} /> : null}
      <Text style={[styles.buttonText, variant === "primary" ? styles.buttonTextPrimary : styles.buttonTextSecondary]}>{label}</Text>
    </Pressable>
  );
}

const toastToneLabel = (tone: ToastTone) => (tone === "success" ? "Hoàn tất" : tone === "error" ? "Lỗi" : "Thông báo");

const toastKindMeta: Record<ToastKind, { label: string; outlineIcon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; filledIcon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; color: string; bg: string }> = {
  ticket: { label: "Vé", outlineIcon: "ticket-confirmation-outline", filledIcon: "ticket-confirmation", color: palette.amber, bg: "rgba(255,207,106,0.14)" },
  favorite: { label: "Yêu thích", outlineIcon: "heart-outline", filledIcon: "heart", color: "#ff88a4", bg: "rgba(201,63,98,0.16)" },
  seat: { label: "Ghế", outlineIcon: "sofa-single-outline", filledIcon: "sofa-single", color: palette.cyan, bg: "rgba(115,246,221,0.14)" },
  payment: { label: "Thanh toán", outlineIcon: "credit-card-outline", filledIcon: "credit-card", color: "#9cc7ff", bg: "rgba(98,141,235,0.16)" },
  reminder: { label: "Nhắc lịch", outlineIcon: "bell-outline", filledIcon: "bell", color: "#ffd88d", bg: "rgba(255,184,72,0.16)" },
  auth: { label: "Tài khoản", outlineIcon: "account-circle-outline", filledIcon: "account-circle", color: "#d7b8ff", bg: "rgba(147,51,234,0.18)" },
  system: { label: "Hệ thống", outlineIcon: "information-outline", filledIcon: "information", color: palette.text, bg: "rgba(255,255,255,0.08)" },
};

const toastKindMotion: Record<
  ToastKind,
  {
    delay: number;
    outputRange: [number, number];
    keyframes: number[];
    iconScalePeak: number;
    iconRotatePeak: number;
    iconLift: number;
    hapticSuccess: Haptics.ImpactFeedbackStyle;
    hapticError: Haptics.ImpactFeedbackStyle;
  }
> = {
  ticket: {
    delay: 52,
    outputRange: [-7.5, 7.5],
    keyframes: [1, -1, 0.7, -0.35, 0],
    iconScalePeak: 1.16,
    iconRotatePeak: 0.1,
    iconLift: -5,
    hapticSuccess: Haptics.ImpactFeedbackStyle.Medium,
    hapticError: Haptics.ImpactFeedbackStyle.Heavy,
  },
  favorite: {
    delay: 66,
    outputRange: [-5.5, 5.5],
    keyframes: [0.85, -0.85, 0.45, -0.2, 0],
    iconScalePeak: 1.2,
    iconRotatePeak: 0.14,
    iconLift: -4,
    hapticSuccess: Haptics.ImpactFeedbackStyle.Light,
    hapticError: Haptics.ImpactFeedbackStyle.Medium,
  },
  seat: {
    delay: 42,
    outputRange: [-8.5, 8.5],
    keyframes: [1, -1, 0.85, -0.45, 0],
    iconScalePeak: 1.14,
    iconRotatePeak: 0.06,
    iconLift: -6,
    hapticSuccess: Haptics.ImpactFeedbackStyle.Rigid,
    hapticError: Haptics.ImpactFeedbackStyle.Heavy,
  },
  payment: {
    delay: 36,
    outputRange: [-9.5, 9.5],
    keyframes: [1, -1, 0.9, -0.5, 0],
    iconScalePeak: 1.12,
    iconRotatePeak: 0.08,
    iconLift: -7,
    hapticSuccess: Haptics.ImpactFeedbackStyle.Heavy,
    hapticError: Haptics.ImpactFeedbackStyle.Heavy,
  },
  reminder: {
    delay: 72,
    outputRange: [-4.5, 4.5],
    keyframes: [0.7, -0.7, 0.35, -0.14, 0],
    iconScalePeak: 1.1,
    iconRotatePeak: 0.18,
    iconLift: -3,
    hapticSuccess: Haptics.ImpactFeedbackStyle.Light,
    hapticError: Haptics.ImpactFeedbackStyle.Medium,
  },
  auth: {
    delay: 58,
    outputRange: [-6, 6],
    keyframes: [0.9, -0.9, 0.5, -0.24, 0],
    iconScalePeak: 1.13,
    iconRotatePeak: 0.09,
    iconLift: -4,
    hapticSuccess: Haptics.ImpactFeedbackStyle.Medium,
    hapticError: Haptics.ImpactFeedbackStyle.Rigid,
  },
  system: {
    delay: 76,
    outputRange: [-4, 4],
    keyframes: [0.6, -0.6, 0.25, -0.1, 0],
    iconScalePeak: 1.08,
    iconRotatePeak: 0.05,
    iconLift: -2,
    hapticSuccess: Haptics.ImpactFeedbackStyle.Light,
    hapticError: Haptics.ImpactFeedbackStyle.Medium,
  },
};

export function Toast({ toastId, message, tone = "info", kind = "system", closing = false, visibleMs = 2400, topOffset }: { toastId: number; message: string; tone?: ToastTone; kind?: ToastKind; closing?: boolean; visibleMs?: number; topOffset?: number }) {
  const shellOpacity = React.useRef(new Animated.Value(0)).current;
  const shellScale = React.useRef(new Animated.Value(0.72)).current;
  const shellTranslateY = React.useRef(new Animated.Value(-20)).current;
  const shellWidth = React.useRef(new Animated.Value(0.76)).current;
  const iconScale = React.useRef(new Animated.Value(0.74)).current;
  const iconRotate = React.useRef(new Animated.Value(-0.18)).current;
  const iconTranslateY = React.useRef(new Animated.Value(2)).current;
  const wobble = React.useRef(new Animated.Value(0)).current;
  const bodyOpacity = React.useRef(new Animated.Value(0)).current;
  const bodyTranslateX = React.useRef(new Animated.Value(-14)).current;
  const progress = React.useRef(new Animated.Value(1)).current;
  const shimmer = React.useRef(new Animated.Value(0)).current;
  const marqueeX = React.useRef(new Animated.Value(0)).current;
  const [messageViewportWidth, setMessageViewportWidth] = React.useState(0);
  const [messageContentWidth, setMessageContentWidth] = React.useState(0);
  const toneLabel = toastToneLabel(tone);
  const meta = toastKindMeta[kind];
  const motion = toastKindMotion[kind];
  const toneAccent = tone === "success" ? "#8affea" : tone === "error" ? "#ff8d8d" : meta.color;
  const iconName = tone === "success" ? meta.filledIcon : meta.outlineIcon;
  const progressColor = tone === "success" ? "#8affea" : tone === "error" ? "#ff7b7b" : meta.color;
  const progressGlow = tone === "success" ? "rgba(138,255,234,0.3)" : tone === "error" ? "rgba(255,123,123,0.28)" : meta.bg;
  const overflowDistance = Math.max(0, messageContentWidth - messageViewportWidth);

  React.useEffect(() => {
    shellOpacity.setValue(0);
    shellScale.setValue(0.72);
    shellTranslateY.setValue(-20);
    shellWidth.setValue(0.76);
    iconScale.setValue(0.74);
    iconRotate.setValue(-0.18);
    iconTranslateY.setValue(2);
    wobble.setValue(0);
    bodyOpacity.setValue(0);
    bodyTranslateX.setValue(-8);
    progress.setValue(1);
    shimmer.setValue(0);
    marqueeX.setValue(0);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(shellOpacity, { toValue: 1, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(shellScale, { toValue: 0.88, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(shellWidth, { toValue: 0.84, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(iconScale, { toValue: 0.88, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(iconTranslateY, { toValue: 0, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(bodyOpacity, { toValue: 0.9, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(bodyTranslateX, { toValue: -1, duration: 130, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(shellScale, { toValue: 1.03, tension: 95, friction: 8, useNativeDriver: true }),
        Animated.spring(shellWidth, { toValue: 1.02, tension: 90, friction: 9, useNativeDriver: true }),
        Animated.spring(shellTranslateY, { toValue: 0, tension: 85, friction: 12, useNativeDriver: true }),
        Animated.spring(iconScale, { toValue: motion.iconScalePeak, tension: 120, friction: 8, useNativeDriver: true }),
        Animated.timing(iconRotate, { toValue: motion.iconRotatePeak, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(iconTranslateY, { toValue: motion.iconLift, tension: 110, friction: 9, useNativeDriver: true }),
        Animated.timing(bodyOpacity, { toValue: 1, duration: 130, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(bodyTranslateX, { toValue: 0, duration: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.timing(shellOpacity, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(shellScale, { toValue: 1, tension: 90, friction: 10, useNativeDriver: true }),
        Animated.spring(shellWidth, { toValue: 1, tension: 88, friction: 10, useNativeDriver: true }),
        Animated.spring(iconScale, { toValue: 1, tension: 110, friction: 9, useNativeDriver: true }),
        Animated.timing(iconRotate, { toValue: 0, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(iconTranslateY, { toValue: 0, tension: 110, friction: 10, useNativeDriver: true }),
      ]),
    ]).start();
    Animated.sequence([
      Animated.delay(motion.delay + (tone === "error" ? 0 : tone === "success" ? 8 : 18)),
      Animated.timing(wobble, { toValue: motion.keyframes[0], duration: 60, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(wobble, { toValue: motion.keyframes[1], duration: 72, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(wobble, { toValue: motion.keyframes[2], duration: 58, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(wobble, { toValue: motion.keyframes[3], duration: 52, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(wobble, { toValue: motion.keyframes[4], duration: 74, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
    Animated.timing(progress, {
      toValue: 0,
      duration: visibleMs,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(120),
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(260),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    shimmerLoop.start();
    if (tone === "success") {
      void Haptics.impactAsync(motion.hapticSuccess);
    } else if (tone === "error") {
      void Haptics.impactAsync(motion.hapticError);
    }
    return () => {
      shimmerLoop.stop();
    };
  }, [bodyOpacity, bodyTranslateX, iconRotate, iconScale, iconTranslateY, marqueeX, motion.delay, motion.hapticError, motion.hapticSuccess, motion.iconLift, motion.iconRotatePeak, motion.iconScalePeak, motion.keyframes, progress, shellOpacity, shellScale, shellTranslateY, shellWidth, shimmer, toastId, visibleMs, wobble, tone]);

  React.useEffect(() => {
    marqueeX.stopAnimation();
    marqueeX.setValue(0);
    if (overflowDistance <= 4) {
      return;
    }
    const marqueeDuration = Math.max(1800, Math.min(visibleMs - 780, overflowDistance * 18));
    if (marqueeDuration <= 0) {
      return;
    }
    const animation = Animated.sequence([
      Animated.delay(460),
      Animated.timing(marqueeX, {
        toValue: -overflowDistance,
        duration: marqueeDuration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => {
      animation.stop();
    };
  }, [marqueeX, overflowDistance, toastId, visibleMs]);

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
      Animated.timing(iconTranslateY, { toValue: 1, duration: 120, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [bodyOpacity, bodyTranslateX, closing, iconRotate, iconScale, iconTranslateY, shellOpacity, shellScale, shellTranslateY, shellWidth]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        tone === "success" && styles.toastSuccess,
        tone === "error" && styles.toastError,
        topOffset != null && { top: topOffset },
        { opacity: shellOpacity, transform: [{ translateX: wobble.interpolate({ inputRange: [-1, 1], outputRange: motion.outputRange }) }, { translateY: shellTranslateY }, { scaleX: shellWidth }, { scaleY: shellScale }] },
      ]}
    >
      <Animated.View style={[styles.toastIconWrap, tone === "success" && styles.toastIconWrapSuccess, tone === "error" && styles.toastIconWrapError, { backgroundColor: meta.bg, transform: [{ translateY: iconTranslateY }, { scale: iconScale }, { rotate: iconRotate.interpolate({ inputRange: [-1, 1], outputRange: ["-1rad", "1rad"] }) }] }]}>
        <MaterialCommunityIcons name={iconName} size={18} color={toneAccent} />
      </Animated.View>
      <Animated.View style={[styles.toastBody, { opacity: bodyOpacity, transform: [{ translateX: bodyTranslateX }] }]}>
        <View style={styles.toastHeader}>
          <Text style={styles.toastLabel}>{meta.label}</Text>
          <View style={[styles.toastDot, tone === "success" && styles.toastDotSuccess, tone === "error" && styles.toastDotError]} />
          <Text style={[styles.toastTone, tone === "success" && styles.toastToneSuccess, tone === "error" && styles.toastToneError]}>{toneLabel}</Text>
        </View>
        <View style={styles.toastMessageViewport} onLayout={(event) => setMessageViewportWidth(event.nativeEvent.layout.width)}>
          <Animated.View style={[styles.toastMessageRail, { transform: [{ translateX: marqueeX }] }]}>
            <Text style={styles.toastText} numberOfLines={1}>{message}</Text>
          </Animated.View>
        </View>
        <Text
          style={[styles.toastText, styles.toastTextMeasure]}
          numberOfLines={1}
          onLayout={(event) => setMessageContentWidth(event.nativeEvent.layout.width)}
        >
          {message}
        </Text>
        <View style={styles.toastProgressTrack}>
          <Animated.View style={[styles.toastProgressFill, tone === "success" && styles.toastProgressFillSuccess, tone === "error" && styles.toastProgressFillError, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }), backgroundColor: progressColor, shadowColor: progressColor }]} />
          <View pointerEvents="none" style={[styles.toastProgressGlow, { backgroundColor: progressGlow }]} />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.toastProgressShimmer,
              {
                transform: [{ translateX: shimmer.interpolate({ inputRange: [0, 1], outputRange: [-84, 244] }) }],
              },
            ]}
          />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

export function SkeletonBlock({ height, width = "100%" }: { height: number; width?: number | `${number}%` }) {
  return <View style={[styles.skeletonBlock, { height, width }]} />;
}

function StaggerSection({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) {
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(18)).current;
  const scale = React.useRef(new Animated.Value(0.985)).current;

  React.useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(18);
    scale.setValue(0.985);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        delay: Math.min(420, index * 72),
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 340,
        delay: Math.min(420, index * 72),
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 320,
        delay: Math.min(420, index * 72),
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, scale, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
      {children}
    </Animated.View>
  );
}

function MovieStateBadges({ isFavorite, isInWatchlist, compact = false }: { isFavorite: boolean; isInWatchlist: boolean; compact?: boolean }) {
  if (!isFavorite && !isInWatchlist) {
    return null;
  }

  return (
    <View style={[styles.movieStateBadgeRow, compact && styles.movieStateBadgeRowCompact]}>
      {isFavorite ? (
        <View style={[styles.movieStateBadge, styles.movieStateBadgeFavorite, compact && styles.movieStateBadgeCompact]}>
          <MaterialCommunityIcons name="heart" size={compact ? 11 : 12} color="#ffe7ef" />
          {!compact ? <Text style={styles.movieStateBadgeText}>Yêu thích</Text> : null}
        </View>
      ) : null}
      {isInWatchlist ? (
        <View style={[styles.movieStateBadge, styles.movieStateBadgeWatchlist, compact && styles.movieStateBadgeCompact]}>
          <MaterialCommunityIcons name="bookmark" size={compact ? 11 : 12} color="#e7fff8" />
          {!compact ? <Text style={styles.movieStateBadgeText}>Xem sau</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

function prioritizeSavedMovies(movies: Movie[], favoriteMovieIds: number[], watchlistMovieIds: number[]) {
  const favoriteSet = new Set(favoriteMovieIds);
  const watchlistSet = new Set(watchlistMovieIds);
  return [...movies].sort((left, right) => {
    const leftScore = (favoriteSet.has(left.id) ? 2 : 0) + (watchlistSet.has(left.id) ? 1 : 0);
    const rightScore = (favoriteSet.has(right.id) ? 2 : 0) + (watchlistSet.has(right.id) ? 1 : 0);
    if (leftScore !== rightScore) {
      return rightScore - leftScore;
    }
    return left.id - right.id;
  });
}

function getSavedMovieCardStyle(isFavorite: boolean, isInWatchlist: boolean) {
  if (isFavorite && isInWatchlist) {
    return styles.savedMovieCardBoth;
  }
  if (isFavorite) {
    return styles.savedMovieCardFavorite;
  }
  if (isInWatchlist) {
    return styles.savedMovieCardWatchlist;
  }
  return null;
}

export function HomeScreen(props: {
  onMoviePress: (movie: Movie, source?: "home" | "default") => void;
  onSeatPress: (movie: Movie) => void;
  bannersData: Banner[];
  moviesData: Movie[];
  loading: boolean;
  fallbackMovie: Movie;
  loadingSeatMovieId?: number | null;
  favoriteMovieIds?: number[];
  watchlistMovieIds?: number[];
}) {
  const { onMoviePress, onSeatPress, bannersData, moviesData, loading, fallbackMovie, loadingSeatMovieId = null, favoriteMovieIds = [], watchlistMovieIds = [] } = props;
  const openMovieFromHome = React.useCallback((movie: Movie) => onMoviePress(movie, "home"), [onMoviePress]);
  const heroMovie = moviesData[0] ?? fallbackMovie;
  const nowShowing = prioritizeSavedMovies(moviesData.filter((movie) => movie.status !== "COMING_SOON"), favoriteMovieIds, watchlistMovieIds);
  const nowShowingFeatured = nowShowing.slice(0, 12);
  const nowShowingExtended = nowShowing.slice(12);
  const comingSoon = prioritizeSavedMovies(moviesData.filter((movie) => movie.status === "COMING_SOON"), favoriteMovieIds, watchlistMovieIds).slice(0, 10);
  const hotToday = nowShowing.slice(0, 5);
  const genrePicks = prioritizeSavedMovies(moviesData, favoriteMovieIds, watchlistMovieIds).reduce<Movie[]>((acc, movie) => {
    const mainGenre = movie.genre.split(",")[0]?.trim().toLowerCase();
    if (!mainGenre || acc.some((item) => item.genre.split(",")[0]?.trim().toLowerCase() === mainGenre)) {
      return acc;
    }
    acc.push(movie);
    return acc;
  }, []).slice(0, 6);

  const promoBanners = React.useMemo(() => {
    if (bannersData.length > 0) return bannersData.slice(0, 6);
    return [
      {
        id: -1,
        eyebrow: "PROMO",
        title: "Mở bán suất hot",
        text: "Đặt sớm để chọn ghế đẹp, ưu đãi combo và voucher thành viên.",
        accent: "#5d1618",
        imageUrl: heroMovie.bannerUrl ?? heroMovie.posterUrl,
      },
    ] satisfies Banner[];
  }, [bannersData, heroMovie.bannerUrl, heroMovie.posterUrl]);

  if (loading && moviesData.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SkeletonBlock height={220} />
        <SkeletonBlock height={380} />
        <SkeletonBlock height={120} />
        <SkeletonBlock height={260} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <StaggerSection index={0}>
        <View style={{ gap: 8 }}>
          <SectionHeader title="Ưu đãi hôm nay" action="Promo 21:9" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} pagingEnabled decelerationRate="fast" contentContainerStyle={styles.row}>
            {promoBanners.map((banner) => (
              <MediaBackground
                key={`promo-${banner.id}`}
                uri={banner.imageUrl}
                mediaStyle={styles.bannerImage}
                style={{ width: 320, aspectRatio: 21 / 9, borderRadius: 20, overflow: "hidden", backgroundColor: banner.accent, padding: 14, justifyContent: "space-between" }}
              >
                <LinearGradient colors={["rgba(5,5,7,0.16)", "rgba(5,5,7,0.72)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
                <Text style={{ color: "#f8d9cf", fontSize: 10, fontWeight: "900", letterSpacing: 0.8 }}>{banner.eyebrow}</Text>
                <View style={{ gap: 4 }}>
                  <Text style={{ color: "#fff7f3", fontSize: 20, fontWeight: "900" }}>{banner.title}</Text>
                  <Text style={{ color: "#f1dfd9", fontSize: 12, lineHeight: 18 }}>{banner.text}</Text>
                </View>
              </MediaBackground>
            ))}
          </ScrollView>
        </View>
      </StaggerSection>

      <StaggerSection index={1}>
        <View style={[styles.heroCard, { backgroundColor: heroMovie.tone }]}>
          <MediaAsset uri={heroMovie.bannerUrl} style={styles.heroImage} />
          <View style={styles.heroOverlay} />
          <View style={styles.heroTopLine}>
            <Text style={styles.eyebrow}>ĐẶT VÉ ĐIỆN ẢNH</Text>
            <Text style={styles.heroTag}>Đang mở bán</Text>
          </View>
          <MovieStateBadges isFavorite={favoriteMovieIds.includes(heroMovie.id)} isInWatchlist={watchlistMovieIds.includes(heroMovie.id)} />
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
            <NeonButton label="Đặt vé ngay" onPress={() => onSeatPress(heroMovie)} loading={loadingSeatMovieId === heroMovie.id} />
            <NeonButton label="Xem chi tiết" variant="secondary" onPress={() => openMovieFromHome(heroMovie)} />
          </View>
        </View>
      </StaggerSection>

      <StaggerSection index={2}>
        <View style={styles.quickStrip}>
          <View style={styles.quickStripItemWrap}>
            <View style={styles.quickStripItem}>
              <Text style={styles.quickStripLabel}>Đang chiếu</Text>
              <Text style={styles.quickStripValue}>{moviesData.filter((movie) => movie.status !== "COMING_SOON").length}</Text>
            </View>
          </View>
          <View style={styles.quickStripItemWrap}>
            <View style={styles.quickStripItem}>
              <Text style={styles.quickStripLabel}>Sắp chiếu</Text>
              <Text style={styles.quickStripValue}>{moviesData.filter((movie) => movie.status === "COMING_SOON").length}</Text>
            </View>
          </View>
          <View style={styles.quickStripItemWrap}>
            <View style={styles.quickStripItem}>
              <Text style={styles.quickStripLabel}>Thanh toán</Text>
              <Text style={styles.quickStripValue}>MoMo • ZaloPay</Text>
            </View>
          </View>
        </View>
      </StaggerSection>

      <StaggerSection index={3}>
        <SectionHeader title="Đang chiếu" action="Chọn phim" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {nowShowingFeatured.map((movie) => {
            const isFavorite = favoriteMovieIds.includes(movie.id);
            const isInWatchlist = watchlistMovieIds.includes(movie.id);
            return (
              <Pressable key={movie.id} style={[styles.movieCard, getSavedMovieCardStyle(isFavorite, isInWatchlist)]} onPress={() => openMovieFromHome(movie)}>
                <MediaBackground uri={movie.posterUrl} mediaStyle={styles.posterImage} style={[styles.poster, { backgroundColor: movie.tone }]}>
                  <LinearGradient colors={["transparent", "rgba(10,10,18,0.2)", "rgba(10,10,18,0.85)"]} style={styles.posterGradient} />
                  <View style={styles.posterScrim} />
                  <View style={styles.posterTopRow}>
                    <View style={styles.posterBadgeWrap}>
                      <Text style={styles.posterBadge}>{movie.badge}</Text>
                    </View>
                    <MovieStateBadges isFavorite={isFavorite} isInWatchlist={isInWatchlist} compact />
                  </View>
                </MediaBackground>
                <Text style={styles.movieTitle}>{movie.title}</Text>
                <Text style={styles.movieMeta}>{movie.genre} • {movie.runtime}</Text>
                <View style={styles.movieFooter}>
                  <Text style={styles.movieScore}>IMDb {movie.score}</Text>
                  <Text style={styles.movieAction}>Chi tiết</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </StaggerSection>

      {nowShowingExtended.length > 0 ? (
        <StaggerSection index={4}>
          <SectionHeader title="Lướt thêm" action={`${nowShowing.length} phim`} />
          <View style={styles.rankingWrap}>
            {nowShowingExtended.map((movie) => {
              const isFavorite = favoriteMovieIds.includes(movie.id);
              const isInWatchlist = watchlistMovieIds.includes(movie.id);
              return (
                <Pressable key={`extended-${movie.id}`} style={[styles.rankingRow, getSavedMovieCardStyle(isFavorite, isInWatchlist)]} onPress={() => openMovieFromHome(movie)}>
                  <View style={[styles.rankPoster, { backgroundColor: movie.tone, overflow: "hidden" }]}>
                    <MediaAsset uri={movie.posterUrl} style={styles.explorePosterImage} />
                  </View>
                  <View style={styles.rankMain}>
                    <Text style={styles.rankMovie}>{movie.title}</Text>
                    <MovieStateBadges isFavorite={isFavorite} isInWatchlist={isInWatchlist} compact />
                    <Text style={styles.rankRevenue}>{movie.genre} • {movie.runtime} • IMDb {movie.score}</Text>
                  </View>
                  <Text style={styles.rankActionText}>Mở</Text>
                </Pressable>
              );
            })}
          </View>
        </StaggerSection>
      ) : null}

      {hotToday.length > 0 ? (
        <StaggerSection index={5}>
          <SectionHeader title="Top đặt nhiều hôm nay" action="Ưu tiên ghế đẹp" />
          <View style={styles.rankingWrap}>
            {hotToday.map((movie, index) => {
              const isFavorite = favoriteMovieIds.includes(movie.id);
              const isInWatchlist = watchlistMovieIds.includes(movie.id);
              return (
                <Pressable key={`hot-${movie.id}`} style={[styles.rankingRow, getSavedMovieCardStyle(isFavorite, isInWatchlist)]} onPress={() => onSeatPress(movie)} disabled={loadingSeatMovieId === movie.id}>
                  <View style={[styles.rankPoster, { backgroundColor: movie.tone, overflow: "hidden" }]}>
                    <MediaAsset uri={movie.posterUrl} style={styles.explorePosterImage} />
                  </View>
                  <View style={styles.rankMain}>
                    <Text style={styles.rankMovie}>{`#${index + 1} ${movie.title}`}</Text>
                    <MovieStateBadges isFavorite={isFavorite} isInWatchlist={isInWatchlist} compact />
                    <Text style={styles.rankRevenue}>{movie.genre} • {movie.runtime} • IMDb {movie.score}</Text>
                  </View>
                  {loadingSeatMovieId === movie.id ? <ActivityIndicator size="small" color={palette.cyan} /> : <Text style={styles.rankActionText}>Đặt</Text>}
                </Pressable>
              );
            })}
          </View>
        </StaggerSection>
      ) : null}

      {genrePicks.length > 0 ? (
        <StaggerSection index={6}>
          <SectionHeader title="Phim theo gu" action="Grid 2 cột" />
          <View style={styles.homeGrid}>
            {genrePicks.map((movie) => {
              const isFavorite = favoriteMovieIds.includes(movie.id);
              const isInWatchlist = watchlistMovieIds.includes(movie.id);
              return (
                <Pressable key={`genre-${movie.id}`} style={[styles.homeGridCard, getSavedMovieCardStyle(isFavorite, isInWatchlist)]} onPress={() => openMovieFromHome(movie)}>
                  <MediaBackground uri={movie.posterUrl} mediaStyle={styles.posterImage} style={[styles.homeGridPoster, { backgroundColor: movie.tone }]}>
                    <LinearGradient colors={["transparent", "rgba(10,10,18,0.2)", "rgba(10,10,18,0.85)"]} style={styles.posterGradient} />
                    <View style={styles.posterScrim} />
                    <View style={styles.posterTopRow}>
                      <View style={styles.posterBadgeWrap}>
                        <Text style={styles.posterBadge}>{movie.badge}</Text>
                      </View>
                      <MovieStateBadges isFavorite={isFavorite} isInWatchlist={isInWatchlist} compact />
                    </View>
                  </MediaBackground>
                  <View style={styles.homeGridBody}>
                    <Text style={styles.homeGridTitle}>{movie.title}</Text>
                    <Text style={styles.homeGridMeta}>{movie.genre}</Text>
                    <Text style={styles.homeGridMeta}>{movie.runtime} • IMDb {movie.score}</Text>
                    <View style={styles.homeGridFooter}>
                      <Text style={styles.movieScore}>Hot</Text>
                      <Text style={styles.homeGridAction}>Xem nhanh</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </StaggerSection>
      ) : null}

      {comingSoon.length > 0 ? (
        <StaggerSection index={7}>
          <SectionHeader title="Sắp chiếu" action="Theo dõi" />
          <View style={styles.rankingWrap}>
            {comingSoon.map((movie) => {
              const isFavorite = favoriteMovieIds.includes(movie.id);
              const isInWatchlist = watchlistMovieIds.includes(movie.id);
              return (
                <Pressable key={`coming-${movie.id}`} style={[styles.rankingRow, getSavedMovieCardStyle(isFavorite, isInWatchlist)]} onPress={() => openMovieFromHome(movie)}>
                  <View style={[styles.rankPoster, { backgroundColor: movie.tone, overflow: "hidden" }]}>
                    <MediaAsset uri={movie.posterUrl} style={styles.explorePosterImage} />
                  </View>
                  <View style={styles.rankMain}>
                    <Text style={styles.rankMovie}>{movie.title}</Text>
                    <MovieStateBadges isFavorite={isFavorite} isInWatchlist={isInWatchlist} compact />
                    <Text style={styles.rankRevenue}>{movie.genre} • {movie.runtime}</Text>
                  </View>
                  <Text style={styles.rankActionText}>Xem</Text>
                </Pressable>
              );
            })}
          </View>
        </StaggerSection>
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
  favoriteFilter: "ALL" | "ONLY";
  setFavoriteFilter: Setter<"ALL" | "ONLY">;
  watchlistFilter: "ALL" | "ONLY";
  setWatchlistFilter: Setter<"ALL" | "ONLY">;
  cinemaOptions: string[];
  genreOptions: string[];
  favoriteMovieIds?: number[];
  watchlistMovieIds?: number[];
}) {
  const { onMoviePress, moviesData, loading, statusFilter, setStatusFilter, cinemaFilter, setCinemaFilter, genreFilter, setGenreFilter, hourFilter, setHourFilter, favoriteFilter, setFavoriteFilter, watchlistFilter, setWatchlistFilter, cinemaOptions, genreOptions, favoriteMovieIds = [], watchlistMovieIds = [] } = props;
  const [searchText, setSearchText] = React.useState("");

  const searchedMovies = React.useMemo(() => {
    const normalized = searchText.trim().toLowerCase();
    if (!normalized) return moviesData;
    return moviesData.filter((movie) => {
      const title = movie.title.toLowerCase();
      const genre = movie.genre.toLowerCase();
      const badge = movie.badge.toLowerCase();
      return title.includes(normalized) || genre.includes(normalized) || badge.includes(normalized);
    });
  }, [moviesData, searchText]);

  if (loading && moviesData.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SkeletonBlock height={96} />
        <SkeletonBlock height={220} />
        <SkeletonBlock height={220} />
      </ScrollView>
    );
  }

  const getAsymmetricCardWidth = (index: number) => {
    const slot = index % 5;
    if (slot === 0) return "100%";
    if (slot === 3) return "58%";
    if (slot === 4) return "38%";
    return "48%";
  };

  const getAsymmetricPosterHeight = (index: number) => {
    const slot = index % 5;
    if (slot === 0) return 240;
    if (slot === 3) return 218;
    if (slot === 4) return 176;
    return 188;
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <StaggerSection index={0}>
        <View style={styles.exploreHero}>
          <Text style={styles.eyebrow}>KHÁM PHÁ</Text>
          <Text style={styles.sectionTitle}>Tìm phim theo rạp, thể loại và khung giờ.</Text>
          <Text style={styles.accountDetail}>Bộ lọc ngắn gọn hơn để giống trải nghiệm sản phẩm thật.</Text>
        </View>
      </StaggerSection>

      <StaggerSection index={1}>
        <View style={{ gap: 8, paddingHorizontal: 2 }}>
          <Text style={{ color: palette.muted, fontSize: 11, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" }}>Tìm kiếm nhanh</Text>
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Nhập tên phim, thể loại hoặc định dạng"
            placeholderTextColor="rgba(255,255,255,0.32)"
            style={{ color: palette.text, fontSize: 17, fontWeight: "700", paddingVertical: 6 }}
          />
          <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.18)" }} />
        </View>
      </StaggerSection>

      <StaggerSection index={2}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {[ ["ALL", "Tất cả"], ["NOW_SHOWING", "Đang chiếu"], ["COMING_SOON", "Sắp chiếu"] ].map(([id, label]) => (
            <Pressable key={id} style={[styles.paymentMethod, statusFilter === id && styles.paymentMethodActive]} onPress={() => setStatusFilter(id)}>
              <Text style={[styles.paymentMethodText, statusFilter === id && styles.paymentMethodTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </StaggerSection>

      <StaggerSection index={3}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {["ALL", ...cinemaOptions].map((cinema) => (
            <Pressable key={cinema} style={[styles.paymentMethod, cinemaFilter === cinema && styles.paymentMethodActive]} onPress={() => setCinemaFilter(cinema)}>
              <Text style={[styles.paymentMethodText, cinemaFilter === cinema && styles.paymentMethodTextActive]}>{cinema === "ALL" ? "Tất cả rạp" : cinema}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </StaggerSection>

      <StaggerSection index={4}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {["ALL", ...genreOptions].map((genre) => (
            <Pressable key={genre} style={[styles.paymentMethod, genreFilter === genre && styles.paymentMethodActive]} onPress={() => setGenreFilter(genre)}>
              <Text style={[styles.paymentMethodText, genreFilter === genre && styles.paymentMethodTextActive]}>{genre === "ALL" ? "Tất cả thể loại" : genre}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </StaggerSection>

      <StaggerSection index={5}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {[ ["ALL", "Mọi giờ"], ["MORNING", "Trước 12h"], ["AFTERNOON", "12h - 18h"], ["EVENING", "Sau 18h"] ].map(([id, label]) => (
            <Pressable key={id} style={[styles.paymentMethod, hourFilter === id && styles.paymentMethodActive]} onPress={() => setHourFilter(id)}>
              <Text style={[styles.paymentMethodText, hourFilter === id && styles.paymentMethodTextActive]}>{label}</Text>
            </Pressable>
          ))}
          {[ ["ALL", "Tất cả phim"], ["ONLY", "Đã yêu thích"] ].map(([id, label]) => (
            <Pressable key={`favorite-${id}`} style={[styles.paymentMethod, favoriteFilter === id && styles.paymentMethodActive]} onPress={() => setFavoriteFilter(id as "ALL" | "ONLY")}>
              <Text style={[styles.paymentMethodText, favoriteFilter === id && styles.paymentMethodTextActive]}>{label}</Text>
            </Pressable>
          ))}
          {[ ["ALL", "Tất cả lưu"], ["ONLY", "Đã lưu xem sau"] ].map(([id, label]) => (
            <Pressable key={`watchlist-${id}`} style={[styles.paymentMethod, watchlistFilter === id && styles.paymentMethodActive]} onPress={() => setWatchlistFilter(id as "ALL" | "ONLY")}>
              <Text style={[styles.paymentMethodText, watchlistFilter === id && styles.paymentMethodTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </StaggerSection>

      {searchedMovies.length === 0 ? (
        <StaggerSection index={6}>
          <View style={styles.accountRow}>
            <Text style={styles.accountTitle}>Không có phim phù hợp</Text>
            <Text style={styles.accountDetail}>Hãy đổi bộ lọc hoặc từ khóa để xem thêm lịch chiếu.</Text>
          </View>
        </StaggerSection>
      ) : null}

      <StaggerSection index={7}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {searchedMovies.map((movie, index) => {
            const isFavorite = favoriteMovieIds.includes(movie.id);
            const isInWatchlist = watchlistMovieIds.includes(movie.id);
            const cardWidth = getAsymmetricCardWidth(index);
            const posterHeight = getAsymmetricPosterHeight(index);

            return (
              <Pressable
                key={`explore-${movie.id}`}
                style={[
                  styles.exploreCard,
                  getSavedMovieCardStyle(isFavorite, isInWatchlist),
                  { width: cardWidth },
                ]}
                onPress={() => onMoviePress(movie)}
              >
                <View style={[styles.explorePoster, { backgroundColor: movie.tone, height: posterHeight }]}>
                  <MediaAsset uri={movie.posterUrl} style={styles.explorePosterImage} />
                  <View style={styles.explorePosterOverlay}>
                    <MovieStateBadges isFavorite={isFavorite} isInWatchlist={isInWatchlist} compact />
                  </View>
                </View>
                <View style={[styles.exploreBody, index % 5 === 4 && { padding: 12 }]}> 
                  <Text style={styles.exploreBadge}>{movie.badge}</Text>
                  <Text style={[styles.exploreTitle, index % 5 === 4 && { fontSize: 17 }]}>{movie.title}</Text>
                  <Text style={styles.exploreMeta}>{movie.genre} • {movie.runtime} • IMDb {movie.score}</Text>
                  {index % 5 !== 4 ? <Text style={styles.exploreDescription}>{movie.description}</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </StaggerSection>
    </ScrollView>
  );
}
export function AssistantScreen(props: {
  messages: AssistantMessage[];
  input: string;
  setInput: Setter<string>;
  sending: boolean;
  seedPrompts: string[];
  onPromptPress: (prompt: string) => void;
  onSend: () => void;
  onSuggestionPress: (movieId: number, showtimeId: number, comboId: number | null, ticketCount: number) => void;
  trustByDefault: boolean;
  onToggleTrustByDefault: () => void;
  compact?: boolean;
}) {
  const { messages, input, setInput, sending, seedPrompts, onPromptPress, onSend, onSuggestionPress, trustByDefault, onToggleTrustByDefault, compact = false } = props;
  const keyboardVerticalOffset = Platform.OS === "ios" ? (compact ? 18 : 108) : 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, compact && styles.aiCompactScrollContent]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View style={styles.exploreHero}>
          <Text style={styles.eyebrow}>AI AGENT</Text>
          <Text style={styles.sectionTitle}>Trợ lý đặt vé, combo và lịch chiếu theo dữ liệu thật.</Text>
          <Text style={styles.accountDetail}>Bạn có thể hỏi theo giờ rảnh, ngân sách, thể loại yêu thích hoặc ra lệnh đặt vé nhanh.</Text>
        </View>

        <View style={styles.accountRow}>
          <Text style={styles.accountTitle}>Câu hỏi gợi ý</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {seedPrompts.map((prompt) => (
              <Pressable key={prompt} style={styles.paymentMethod} onPress={() => onPromptPress(prompt)}>
                <Text style={styles.paymentMethodText}>{prompt}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.accountRow}>
          <Text style={styles.accountTitle}>Tin AI mặc định</Text>
          <Text style={styles.accountDetail}>Bật để AI bỏ qua bước xác nhận popup khi giữ ghế theo gợi ý.</Text>
          <Pressable style={[styles.paymentMethod, trustByDefault && styles.paymentMethodActive]} onPress={onToggleTrustByDefault}>
            <Text style={[styles.paymentMethodText, trustByDefault && styles.paymentMethodTextActive]}>{trustByDefault ? "Đang bật" : "Đang tắt"}</Text>
          </Pressable>
        </View>

        <View style={styles.accountRow}>
          <Text style={styles.accountTitle}>Hướng dẫn nhanh</Text>
          <Text style={styles.accountDetail}>1. Viết nhu cầu cụ thể: giờ rảnh, số người, ngân sách.</Text>
          <Text style={styles.accountDetail}>2. AI gợi ý phim, suất chiếu và combo phù hợp.</Text>
          <Text style={styles.accountDetail}>3. Chạm vào gợi ý để đi thẳng sang luồng chọn ghế.</Text>
        </View>

        <View style={styles.aiChatWrap}>
          <Text style={styles.accountTitle}>Hội thoại</Text>
          {messages.length === 0 ? <Text style={styles.accountDetail}>Chưa có hội thoại. Hãy thử một câu hỏi ở trên.</Text> : null}
          <View style={styles.aiMessageStack}>
            {messages.map((item) => (
              <View key={item.id} style={[styles.aiMessageBubble, item.role === "user" ? styles.aiMessageBubbleUser : styles.aiMessageBubbleAssistant]}>
                <Text style={styles.aiMessageRole}>{item.role === "user" ? "Bạn" : "AI"}</Text>
                <Text style={styles.aiMessageText}>{item.text}</Text>
                {item.suggestions?.length ? (
                  <View style={styles.aiSuggestionStack}>
                    {item.suggestions.map((suggestion) => (
                      <Pressable
                        key={`${item.id}-${suggestion.showtimeId}`}
                        style={styles.aiSuggestionCard}
                        onPress={() => onSuggestionPress(suggestion.movieId, suggestion.showtimeId, suggestion.comboId, suggestion.ticketCount)}
                      >
                        <Text style={styles.aiSuggestionTitle}>{suggestion.movieTitle}</Text>
                        <Text style={styles.aiSuggestionMeta}>{suggestion.cinemaName} • {formatDateTime(suggestion.startTime)}</Text>
                        <Text style={styles.aiSuggestionMeta}>
                          Tạm tính: {formatCurrency(suggestion.estimatedTotal)}{suggestion.comboName ? ` • ${suggestion.comboName}` : ""}
                        </Text>
                        <Text style={styles.aiSuggestionReason}>{suggestion.reason}</Text>
                        <Text style={styles.homeGridAction}>Chạm để đặt suất này</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.accountRow}>
          <Text style={styles.accountTitle}>Nhập yêu cầu</Text>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ví dụ: tối nay 2 người, ngân sách 450k, muốn ghế đẹp"
            placeholderTextColor={palette.muted}
            style={[styles.input, styles.aiInput]}
            multiline
          />
          <NeonButton label={sending ? "AI đang xử lý" : "Gửi cho AI"} onPress={onSend} loading={sending} disabled={!input.trim() && !sending} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function TicketsScreen(props: {
  onSeatPress: (movie: Movie) => void;
  onTicketPress: (ticket: TicketItem) => void;
  tickets: TicketItem[];
  moviesData: Movie[];
  loading?: boolean;
  fallbackMovie: Movie;
  loadingTicketId?: number | null;
  loadingSeatMovieId?: number | null;
  favoriteMovieIds?: number[];
  watchlistMovieIds?: number[];
}) {
  const { onSeatPress, onTicketPress, tickets, moviesData, loading = false, fallbackMovie, loadingTicketId = null, loadingSeatMovieId = null, favoriteMovieIds = [], watchlistMovieIds = [] } = props;
  const TICKET_CARD_HEIGHT = 172;
  const TICKET_POSTER_WIDTH = 110;
  const [activeTab, setActiveTab] = React.useState<"upcoming" | "history">("upcoming");
  const now = useMinuteNow();

  const visibleTickets = React.useMemo(() => {
    return tickets.filter((ticket) => {
      const isUpcoming = new Date(ticket.time).getTime() >= now;
      return activeTab === "upcoming" ? isUpcoming : !isUpcoming;
    });
  }, [activeTab, now, tickets]);

  const promoMovie = React.useMemo(() => {
    const savedMovie = moviesData.find((movie) => favoriteMovieIds.includes(movie.id) || watchlistMovieIds.includes(movie.id));
    return savedMovie ?? moviesData[0] ?? fallbackMovie;
  }, [favoriteMovieIds, fallbackMovie, moviesData, watchlistMovieIds]);

  const getTicketMovie = React.useCallback((ticket: TicketItem) => {
    const normalizedTitle = ticket.movie.trim().toLowerCase();
    return moviesData.find((movie) => movie.title.trim().toLowerCase() === normalizedTitle) ?? fallbackMovie;
  }, [fallbackMovie, moviesData]);

  const getTicketShellStyle = (status: string) => {
    switch (status) {
      case "PAID":
        return [styles.ticketCard, styles.ticketCardPaid];
      case "PENDING":
        return [styles.ticketCard, styles.ticketCardPending];
      case "CANCELLED":
        return [styles.ticketCard, styles.ticketCardCancelled];
      default:
        return [styles.ticketCard];
    }
  };

  const getTicketBadgeStyle = (status: string) => {
    switch (status) {
      case "PAID":
        return [styles.ticketStatusBadge, styles.ticketStatusBadgePaid];
      case "PENDING":
        return [styles.ticketStatusBadge, styles.ticketStatusBadgePending];
      case "CANCELLED":
        return [styles.ticketStatusBadge, styles.ticketStatusBadgeCancelled];
      default:
        return [styles.ticketStatusBadge];
    }
  };

  const getTicketBadgeTextStyle = (status: string) => {
    switch (status) {
      case "PAID":
        return [styles.ticketStatusText, styles.ticketStatusTextPaid];
      case "PENDING":
        return [styles.ticketStatusText, styles.ticketStatusTextPending];
      case "CANCELLED":
        return [styles.ticketStatusText, styles.ticketStatusTextCancelled];
      default:
        return [styles.ticketStatusText];
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <StaggerSection index={0}>
        <View style={styles.screenIntro}>
          <Text style={styles.eyebrow}>VÉ CỦA TÔI</Text>
          <Text style={styles.sectionTitle}>Quản lý vé đã đặt và mở lại QR khi cần.</Text>
        </View>
      </StaggerSection>

      <StaggerSection index={1}>
        <View style={styles.ticketTabRow}>
          <Pressable style={styles.ticketTab} onPress={() => setActiveTab("upcoming")}>
            <Text style={[styles.ticketTabText, activeTab === "upcoming" && styles.ticketTabTextActive]}>Sắp tới</Text>
            {activeTab === "upcoming" ? <View style={styles.ticketTabUnderline} /> : null}
          </Pressable>
          <Pressable style={styles.ticketTab} onPress={() => setActiveTab("history")}>
            <Text style={[styles.ticketTabText, activeTab === "history" && styles.ticketTabTextActive]}>Lịch sử</Text>
            {activeTab === "history" ? <View style={styles.ticketTabUnderline} /> : null}
          </Pressable>
        </View>
      </StaggerSection>

      {loading ? (
        <StaggerSection index={2}>
          <View style={[styles.ticketEmptyCard, { alignItems: "center", paddingVertical: 32 }]}>
            <ActivityIndicator color={palette.cyan} />
            <Text style={[styles.ticketMovie, { textAlign: "center", marginTop: 10 }]}>Đang tải danh sách vé</Text>
            <Text style={[styles.ticketInfo, { textAlign: "center" }]}>Hệ thống đang đồng bộ vé mới nhất của bạn.</Text>
          </View>
        </StaggerSection>
      ) : null}

      {!loading && visibleTickets.length === 0 ? (
        <StaggerSection index={2}>
          <View style={[styles.ticketEmptyCard, { alignItems: "center", paddingVertical: 32 }]}>
            <MaterialCommunityIcons name="ticket-confirmation-outline" size={40} color={palette.muted} />
            <Text style={[styles.ticketMovie, { textAlign: "center", marginTop: 10 }]}> 
              {activeTab === "upcoming" ? "Chưa có vé sắp tới" : "Chưa có lịch sử đặt vé"}
            </Text>
            <Text style={[styles.ticketInfo, { textAlign: "center" }]}> 
              {activeTab === "upcoming" ? "Đặt vé ngay để xem phim yêu thích." : "Các vé đã xem sẽ hiện ở đây."}
            </Text>
            {activeTab === "upcoming" ? (
              <View style={{ marginTop: 12 }}>
                <NeonButton label="Đặt vé ngay" onPress={() => onSeatPress(moviesData[0] ?? fallbackMovie)} loading={loadingSeatMovieId === (moviesData[0] ?? fallbackMovie).id} />
              </View>
            ) : null}
          </View>
        </StaggerSection>
      ) : null}

      {!loading && visibleTickets.length > 0 ? (
        <StaggerSection index={2}>
          <View style={styles.rankingWrap}>
            {visibleTickets.map((ticket) => {
              const movie = getTicketMovie(ticket);
              const isPending = ticket.status === "PENDING";

              return (
                <Pressable
                  key={ticket.id}
                  style={[
                    getTicketShellStyle(ticket.status),
                    {
                      height: TICKET_CARD_HEIGHT,
                      minHeight: TICKET_CARD_HEIGHT,
                      maxHeight: TICKET_CARD_HEIGHT,
                      alignSelf: "stretch",
                    },
                  ]}
                  onPress={() => onTicketPress(ticket)}
                >
                  <View style={[styles.ticketPosterWrap, { width: TICKET_POSTER_WIDTH, height: TICKET_CARD_HEIGHT, backgroundColor: movie.tone }]}>
                    <MediaAsset uri={movie.posterUrl} style={styles.ticketPosterImage} />
                    <View style={styles.ticketFormatBadge}>
                      <Text style={styles.ticketFormatBadgeText}>{movie.badge || "2D"}</Text>
                    </View>
                  </View>

                  <View style={styles.ticketBody}>
                    <View style={styles.ticketBodyTop}>
                      <Text style={styles.ticketTitle} numberOfLines={2}>{ticket.movie}</Text>
                      <View style={styles.ticketMetaRow}>
                        <MaterialCommunityIcons name="map-marker-radius-outline" size={14} color={palette.muted} />
                        <Text style={styles.ticketMetaText} numberOfLines={1}>{ticket.cinema}</Text>
                      </View>
                      <View style={styles.ticketMetaRow}>
                        <MaterialCommunityIcons name="clock-outline" size={14} color={palette.muted} />
                        <Text style={styles.ticketMetaText} numberOfLines={1}>{formatDateTime(ticket.time)}</Text>
                      </View>
                      <View style={styles.ticketMetaRow}>
                        <MaterialCommunityIcons name="sofa-single-outline" size={14} color={palette.muted} />
                        <Text style={styles.ticketSeatText} numberOfLines={1}>{ticket.seat}</Text>
                      </View>
                      <Text style={styles.ticketInfoCode} numberOfLines={1}>Mã vé {ticket.bookingCode}</Text>
                    </View>

                    <View style={styles.ticketBodyBottom}>
                      <View style={getTicketBadgeStyle(ticket.status)}>
                        <Text style={getTicketBadgeTextStyle(ticket.status)}>{mapBookingStatus(ticket.status)}</Text>
                      </View>

                      {loadingTicketId === ticket.id ? (
                        <View style={styles.ticketStatusLoading}>
                          <ActivityIndicator size="small" color={palette.cyan} />
                        </View>
                      ) : isPending ? (
                        <View style={styles.ticketPayBtn}>
                          <Text style={styles.ticketActionBtnPay}>Thanh toán</Text>
                        </View>
                      ) : (
                        <Text style={styles.ticketActionBtn}>Xem chi tiết</Text>
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </StaggerSection>
      ) : null}

      <StaggerSection index={3}>
        <MediaBackground uri={promoMovie.bannerUrl ?? promoMovie.posterUrl} mediaStyle={styles.bannerImage} style={[styles.bannerCard, { backgroundColor: promoMovie.tone || "#3a1515" }]}>
          <View style={styles.bannerOverlay} />
          <Text style={styles.bannerEyebrow}>GỢI Ý CHO BẠN</Text>
          <Text style={styles.bannerTitle}>{promoMovie.title}</Text>
          <Text style={styles.bannerText}>Tiếp tục luồng đặt vé với layout mới, ưu tiên ghế đẹp và thanh toán nhanh hơn.</Text>
          <View style={{ marginTop: 12, alignSelf: "flex-start" }}>
            <NeonButton label="Đặt lại phim này" onPress={() => onSeatPress(promoMovie)} loading={loadingSeatMovieId === promoMovie.id} />
          </View>
        </MediaBackground>
      </StaggerSection>
    </ScrollView>
  );
}
export function AuthScreen(props: {
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
  initialStep?: number;
  onBack?: () => void;
  helperMessage?: string | null;
}) {
  const { authMode, setAuthMode, authName, setAuthName, authEmail, setAuthEmail, authPhone, setAuthPhone, authPassword, setAuthPassword, onSubmitAuth, onGoogleAuth, authLoading, initialStep = 0, onBack, helperMessage } = props;
  const slides = [
    {
      eyebrow: "ĐẶT VÉ THÔNG MINH",
      title: "Chọn phim nhanh, giữ ghế đẹp và quay lại đúng bước đang xem.",
      body: "App ghi nhớ luồng đang mở để trải nghiệm giống sản phẩm thật, không còn cảm giác demo.",
      chips: ["Giữ ghế theo thời gian thực", "Back Android đúng luồng"],
    },
    {
      eyebrow: "VÉ VÀ NHẮC LỊCH",
      title: "Toàn bộ vé, QR và lịch nhắc được gom vào một nơi dễ quét.",
      body: "Bạn có thể mở lại vé, theo dõi trạng thái thanh toán và nhận nhắc lịch trước giờ chiếu.",
      chips: ["Vé đồng bộ", "Nhắc lịch tự động"],
    },
    {
      eyebrow: "PHIÊN CÁ NHÂN",
      title: "Đăng nhập một lần, mở lại app vẫn vào thẳng trải nghiệm của bạn.",
      body: "Phiên được lưu an toàn bằng Secure Store để dùng tốt hơn cho môi trường production.",
      chips: ["Secure Store", "Ưu đãi cá nhân"],
    },
  ] as const;
  const [onboardingStep, setOnboardingStep] = React.useState(initialStep);
  const inAuthForm = onboardingStep >= slides.length;
  const currentSlide = slides[Math.min(onboardingStep, slides.length - 1)];

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {onBack ? (
        <Pressable onPress={onBack}>
          <Text style={styles.backLink}>← Quay lại</Text>
        </Pressable>
      ) : null}
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
              <Text style={styles.authLink}>Bỏ qua</Text>
            </Pressable>
            <NeonButton label={onboardingStep === slides.length - 1 ? "Bắt đầu" : "Tiếp theo"} onPress={() => setOnboardingStep((step) => Math.min(step + 1, slides.length))} />
          </View>
        </>
      ) : (
        <>
          <View style={styles.authHero}>
            <Text style={styles.eyebrow}>SẴN SÀNG ĐĂNG NHẬP</Text>
            <Text style={styles.authTitle}>Đăng nhập để đồng bộ vé, ghế đã giữ và lịch nhắc trên thiết bị của bạn.</Text>
            <Text style={styles.authBody}>Mọi giao dịch, mã QR và ưu đãi sẽ được giữ lại khi bạn mở app lần sau.</Text>
          </View>

          <View style={styles.authCard}>
            <Text style={styles.accountTitle}>Bắt đầu</Text>
            {helperMessage ? <Text style={styles.accountDetail}>{helperMessage}</Text> : null}
            <Text style={styles.accountDetail}>Tạo tài khoản mới hoặc đăng nhập để vào trải nghiệm đặt vé đầy đủ.</Text>
            <Pressable style={styles.googleButton} onPress={onGoogleAuth}>
              <MaterialCommunityIcons name="google" size={18} color="#ffffff" />
              <Text style={styles.googleButtonText}>Tiếp tục với Google</Text>
            </Pressable>
            <Text style={styles.authDivider}>hoặc dùng email</Text>
            <View style={styles.paymentWrap}>
              {["login", "register"].map((mode) => (
                <Pressable key={mode} style={[styles.paymentMethod, authMode === mode && styles.paymentMethodActive]} onPress={() => setAuthMode(mode as "login" | "register")}>
                  <Text style={[styles.paymentMethodText, authMode === mode && styles.paymentMethodTextActive]}>{mode === "login" ? "Đăng nhập" : "Đăng ký"}</Text>
                </Pressable>
              ))}
            </View>
            {authMode === "register" ? <TextInput value={authName} onChangeText={setAuthName} placeholder="Họ và tên" placeholderTextColor={palette.muted} style={styles.input} /> : null}
            <TextInput value={authEmail} onChangeText={setAuthEmail} placeholder="Email" placeholderTextColor={palette.muted} style={styles.input} autoCapitalize="none" />
            {authMode === "register" ? <TextInput value={authPhone} onChangeText={setAuthPhone} placeholder="Số điện thoại" placeholderTextColor={palette.muted} style={styles.input} /> : null}
            <TextInput value={authPassword} onChangeText={setAuthPassword} placeholder="Mật khẩu" placeholderTextColor={palette.muted} style={styles.input} secureTextEntry />
            <NeonButton label={authMode === "login" ? "Vào ứng dụng" : "Tạo tài khoản"} onPress={onSubmitAuth} loading={authLoading} />
            <Text style={styles.accountDetail}>Tài khoản mẫu: `admin@phimbook.local / Admin@123`, `user@phimbook.local / User@123`.</Text>
          </View>

        </>
      )}
    </ScrollView>
  );
}

export function ProfileScreen(props: {
  onReload: () => void;
  profile: ProfileData | null;
  sessionUser: SessionUser | null;
  reminders: ReminderItem[];
  onLogout: () => void;
  loading?: boolean;
  logoutLoading?: boolean;
}) {
  const { onReload, profile, sessionUser, reminders, onLogout, loading = false, logoutLoading = false } = props;
  const [aiAutoBook, setAiAutoBook] = React.useState(true);
  const [aiNotifyDeal, setAiNotifyDeal] = React.useState(true);
  const [systemPush, setSystemPush] = React.useState(true);

  const displayName = profile?.fullName ?? sessionUser?.fullName ?? "Khách";
  const displayEmail = profile?.email ?? sessionUser?.email ?? "Chưa đăng nhập";
  const displayPhone = profile?.phone ?? sessionUser?.phone ?? "---";
  const favorites = profile?.stats.favorites ?? 0;
  const bookings = profile?.stats.bookings ?? 0;

  const walletItems = [
    { code: "VIP25", title: "Giảm 25% tối đa 120.000đ", note: "Áp dụng phim 2D, 3D" },
    { code: "COMBO79", title: "Combo bắp + nước 79.000đ", note: "Hiệu lực đến cuối tuần" },
    { code: "EARLY45", title: "Suất sáng giảm 45.000đ", note: "Khung 08:00 - 11:00" },
  ];

  const SettingRow = ({
    title,
    detail,
    value,
    onToggle,
    icon,
  }: {
    title: string;
    detail: string;
    value: boolean;
    onToggle: (next: boolean) => void;
    icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  }) => (
    <Pressable
      onPress={() => onToggle(!value)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderRadius: 18,
        padding: 12,
        backgroundColor: "rgba(255,255,255,0.03)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(195,13,18,0.18)" }}>
        <MaterialCommunityIcons name={icon} size={18} color="#fff2eb" />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: palette.text, fontSize: 14, fontWeight: "800" }}>{title}</Text>
        <Text style={{ color: palette.muted, fontSize: 12 }}>{detail}</Text>
      </View>
      <View
        style={{
          width: 46,
          height: 28,
          borderRadius: 999,
          padding: 3,
          justifyContent: "center",
          backgroundColor: value ? "rgba(195,13,18,0.9)" : "rgba(255,255,255,0.16)",
        }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 999,
            backgroundColor: "#fff6f1",
            transform: [{ translateX: value ? 18 : 0 }],
          }}
        />
      </View>
    </Pressable>
  );

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View
        style={{
          alignItems: "center",
          borderRadius: 28,
          padding: 20,
          gap: 10,
          backgroundColor: "rgba(195,13,18,0.08)",
          borderWidth: 1,
          borderColor: "rgba(195,13,18,0.24)",
        }}
      >
        <View style={{ position: "relative" }}>
          {profile?.avatarUrl ? <MediaAsset uri={profile.avatarUrl} style={{ width: 96, height: 96, borderRadius: 999, borderWidth: 2, borderColor: "rgba(255,255,255,0.2)" }} /> : <View style={{ width: 96, height: 96, borderRadius: 999, borderWidth: 2, borderColor: "rgba(255,255,255,0.2)", backgroundColor: "#2a1114" }} />}
          <View style={{ position: "absolute", right: -8, bottom: -4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "#cfa43f", borderWidth: 1, borderColor: "rgba(255,255,255,0.38)" }}>
            <Text style={{ color: "#2b1a04", fontSize: 10, fontWeight: "900", letterSpacing: 0.5 }}>VIP GOLD</Text>
          </View>
        </View>
        <Text style={{ color: palette.text, fontSize: 22, fontWeight: "900" }}>{displayName}</Text>
        <Text style={{ color: palette.muted }}>{displayEmail}</Text>
        <Text style={{ color: palette.muted }}>{displayPhone}</Text>

        <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
          <View style={{ flex: 1, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.03)", alignItems: "center", gap: 4 }}>
            <Text style={{ color: palette.muted, fontSize: 11, fontWeight: "700" }}>Yêu thích</Text>
            <Text style={{ color: palette.text, fontSize: 18, fontWeight: "900" }}>{favorites}</Text>
          </View>
          <View style={{ flex: 1, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.03)", alignItems: "center", gap: 4 }}>
            <Text style={{ color: palette.muted, fontSize: 11, fontWeight: "700" }}>Vé đã đặt</Text>
            <Text style={{ color: palette.text, fontSize: 18, fontWeight: "900" }}>{bookings}</Text>
          </View>
        </View>
      </View>

      <View style={styles.accountRow}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={styles.accountTitle}>Ví voucher</Text>
          <Text style={styles.sectionAction}>NanBao Club</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {walletItems.map((item, index) => (
            <LinearGradient
              key={item.code}
              colors={index % 2 === 0 ? ["#8f0f07", "#3d0a0b"] : ["#a82611", "#4d110a"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: 220, minHeight: 126, borderRadius: 18, padding: 14, gap: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" }}
            >
              <Text style={{ color: "#ffdca4", fontSize: 11, fontWeight: "900", letterSpacing: 0.8 }}>{item.code}</Text>
              <Text style={{ color: "#fff8f3", fontSize: 16, fontWeight: "900", lineHeight: 22 }}>{item.title}</Text>
              <Text style={{ color: "#f8d3c9", fontSize: 12, lineHeight: 18 }}>{item.note}</Text>
            </LinearGradient>
          ))}
        </ScrollView>
      </View>

      <View style={styles.accountRow}>
        <Text style={styles.accountTitle}>Cài đặt AI trợ lý</Text>
        <SettingRow title="AI tự gợi ý suất phù hợp" detail="Tối ưu theo ngân sách và giờ rảnh" value={aiAutoBook} onToggle={setAiAutoBook} icon="robot-outline" />
        <SettingRow title="Thông báo ưu đãi thông minh" detail="Nhắc voucher gần hết hạn" value={aiNotifyDeal} onToggle={setAiNotifyDeal} icon="bell-ring-outline" />
      </View>

      <View style={styles.accountRow}>
        <Text style={styles.accountTitle}>Hệ thống</Text>
        <SettingRow title="Nhận thông báo push" detail="Vé mới, nhắc lịch và thay đổi suất" value={systemPush} onToggle={setSystemPush} icon="cellphone-cog" />
        <Text style={styles.accountDetail}>Nhắc lịch đang bật: {reminders.length} mục.</Text>
      </View>

      <View style={styles.accountRow}>
        <Text style={styles.accountTitle}>Dữ liệu tài khoản</Text>
        <Text style={styles.accountDetail}>Tải lại để đồng bộ vé, ưu đãi và lịch nhắc mới nhất.</Text>
        <NeonButton label="Tải lại dữ liệu" onPress={onReload} loading={loading} />
      </View>

      <Pressable
        onPress={onLogout}
        disabled={logoutLoading}
        style={{
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 999,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.24)",
          paddingVertical: 14,
          backgroundColor: "rgba(255,255,255,0.03)",
        }}
      >
        {logoutLoading ? <ActivityIndicator size="small" color={palette.cyan} /> : <Text style={{ color: palette.text, fontSize: 14, fontWeight: "900" }}>Đăng xuất</Text>}
      </Pressable>
    </ScrollView>
  );
}
export function UserMovieListScreen(props: {
  title: string;
  description: string;
  emptyMessage: string;
  movies: Movie[];
  onMoviePress: (movie: Movie) => void;
}) {
  const { title, description, emptyMessage, movies, onMoviePress } = props;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.exploreHero}>
        <Text style={styles.eyebrow}>THƯ VIỆN CÁ NHÂN</Text>
        <Text style={styles.authTitle}>{title}</Text>
        <Text style={styles.accountDetail}>{description}</Text>
      </View>

      <View style={styles.accountRow}>
        <Text style={styles.accountTitle}>Danh sách phim</Text>
        <Text style={styles.accountDetail}>
          {movies.length > 0 ? `${movies.length} phim đang được lưu trong mục này.` : emptyMessage}
        </Text>
        <View style={styles.profileMovieList}>
          {movies.map((movie) => (
            <Pressable key={`${title}-${movie.id}`} onPress={() => onMoviePress(movie)} style={styles.profileMovieChip}>
              <MovieStateBadges isFavorite={title === "Yêu thích"} isInWatchlist={title === "Xem sau"} compact />
              <Text style={styles.profileMovieChipText}>{movie.title}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {movies.length > 0 ? (
        <View style={styles.homeGrid}>
          {movies.map((movie) => {
            const isFavorite = title === "Yêu thích";
            const isInWatchlist = title === "Xem sau";
            return (
            <Pressable key={`grid-${title}-${movie.id}`} style={[styles.homeGridCard, getSavedMovieCardStyle(isFavorite, isInWatchlist)]} onPress={() => onMoviePress(movie)}>
              <View style={[styles.homeGridPoster, { backgroundColor: movie.tone }]}>
                <MediaAsset uri={movie.posterUrl} style={styles.homeGridPosterImage} />
                <LinearGradient colors={["transparent", "rgba(10,10,18,0.2)", "rgba(10,10,18,0.85)"]} style={styles.posterGradient} />
                <View style={styles.posterTopRow}>
                  <View style={styles.posterBadgeWrap}>
                    <Text style={styles.posterBadge}>{movie.badge}</Text>
                  </View>
                  <MovieStateBadges isFavorite={isFavorite} isInWatchlist={isInWatchlist} compact />
                </View>
              </View>
              <View style={styles.homeGridBody}>
                <Text style={styles.homeGridTitle}>{movie.title}</Text>
                <Text style={styles.homeGridMeta}>{movie.genre} • {movie.runtime}</Text>
                <View style={styles.homeGridFooter}>
                  <Text style={styles.movieScore}>IMDb {movie.score}</Text>
                  <Text style={styles.homeGridAction}>Xem chi tiết</Text>
                </View>
              </View>
            </Pressable>
          )})}
        </View>
      ) : null}
    </ScrollView>
  );
}

export function MovieDetailScreen(props: { movie: Movie; onBack: () => void; onBook: (showtime: ShowtimeItem) => void; showtimesData: ShowtimeItem[]; isFavorite: boolean; isInWatchlist: boolean; onToggleFavorite: () => void; onToggleWatchlist: () => void; favoriteLoading?: boolean; watchlistLoading?: boolean; bookingLoadingMovieId?: number | null; bookingLoadingShowtimeId?: number | null; entrySource?: "home" | "default"; }) {
  const { movie, onBack, onBook, showtimesData, isFavorite, isInWatchlist, onToggleFavorite, onToggleWatchlist, favoriteLoading = false, watchlistLoading = false, bookingLoadingMovieId = null, bookingLoadingShowtimeId = null } = props;
  const now = useMinuteNow();
  const dateScrollRef = React.useRef<ScrollView | null>(null);
  const movieShowtimes = React.useMemo(() => showtimesData.filter((item) => item.movieId === movie.id), [movie.id, showtimesData]);
  const [selectedDateKey, setSelectedDateKey] = React.useState<string | null>(null);
  const [selectedShowtimeId, setSelectedShowtimeId] = React.useState<number | null>(null);

  const dateOptions = React.useMemo(
    () =>
      Array.from(new Set(movieShowtimes.map((item) => toDateKey(item.startTime))))
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime()),
    [movieShowtimes]
  );

  const effectiveDateKey = selectedDateKey ?? dateOptions[0] ?? null;

  const showtimeByCinema = React.useMemo(() => {
    if (!effectiveDateKey) {
      return [] as Array<{ cinemaName: string; items: ShowtimeItem[] }>;
    }

    const groups = new Map<string, ShowtimeItem[]>();
    for (const showtime of movieShowtimes) {
      if (toDateKey(showtime.startTime) !== effectiveDateKey) continue;
      const key = showtime.cinemaName;
      const current = groups.get(key) ?? [];
      current.push(showtime);
      groups.set(key, current);
    }

    return Array.from(groups.entries())
      .map(([cinemaName, items]) => ({
        cinemaName,
        items: items.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
      }))
      .sort((a, b) => a.cinemaName.localeCompare(b.cinemaName, "vi"));
  }, [effectiveDateKey, movieShowtimes]);

  const allShowtimesOfDate = React.useMemo(() => showtimeByCinema.flatMap((group) => group.items), [showtimeByCinema]);

  const primaryShowtime =
    allShowtimesOfDate.find((item) => item.id === selectedShowtimeId) ??
    allShowtimesOfDate.find((item) => new Date(item.startTime).getTime() >= now) ??
    allShowtimesOfDate[0] ??
    movieShowtimes[0] ??
    null;

  React.useEffect(() => {
    if (!effectiveDateKey && dateOptions[0]) {
      setSelectedDateKey(dateOptions[0]);
      return;
    }
    if (effectiveDateKey && !dateOptions.includes(effectiveDateKey)) {
      setSelectedDateKey(dateOptions[0] ?? null);
    }
  }, [dateOptions, effectiveDateKey]);

  React.useEffect(() => {
    if (!primaryShowtime) {
      setSelectedShowtimeId(null);
      return;
    }
    if (!allShowtimesOfDate.some((item) => item.id === selectedShowtimeId)) {
      setSelectedShowtimeId(primaryShowtime.id);
    }
  }, [allShowtimesOfDate, primaryShowtime, selectedShowtimeId]);

  React.useEffect(() => {
    if (!effectiveDateKey || dateOptions.length <= 1) return;
    const selectedIndex = dateOptions.findIndex((item) => item === effectiveDateKey);
    if (selectedIndex < 0) return;
    const estimatedCardWidth = 88;
    dateScrollRef.current?.scrollTo({
      x: Math.max(0, selectedIndex * estimatedCardWidth - 24),
      animated: true,
    });
  }, [dateOptions, effectiveDateKey]);

  const trailerUrl = normalizeTrailerUrl(movie.trailerUrl);

  return (
    <View style={styles.screenShell}>
      <ScrollView contentContainerStyle={[styles.scrollContent, styles.stickyScrollContent]} showsVerticalScrollIndicator={false}>
        <Pressable onPress={onBack}>
          <Text style={styles.backLink}>← Quay lại</Text>
        </Pressable>

        <View style={{ height: 530, borderRadius: 28, overflow: "hidden", backgroundColor: movie.tone || "#2b0f12", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          <MediaAsset uri={movie.bannerUrl ?? movie.posterUrl} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
          <LinearGradient colors={["rgba(5,5,8,0.08)", "rgba(5,5,8,0.56)", "rgba(5,5,8,0.92)"]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />

          <View style={{ position: "absolute", top: 16, left: 16, flexDirection: "row", gap: 8 }}>
            <Text style={{ color: "#fff6f0", fontSize: 11, fontWeight: "900", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.42)" }}>{movie.badge || "IMAX"}</Text>
            <Text style={{ color: "#fff6f0", fontSize: 11, fontWeight: "900", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(195,13,18,0.38)" }}>T16</Text>
          </View>

          <View style={{ marginTop: "auto", padding: 20, gap: 10 }}>
            <Text style={{ color: "#fff8f4", fontSize: 34, lineHeight: 40, fontWeight: "900", textTransform: "uppercase" }}>{movie.title}</Text>
            <Text style={{ color: "#f2d0bf", fontSize: 13, fontWeight: "700" }}>IMDb {movie.score} • {movie.genre} • {movie.runtime}</Text>
            <Pressable
              onPress={favoriteLoading ? undefined : onToggleFavorite}
              style={{
                alignSelf: "flex-start",
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.24)",
                backgroundColor: "rgba(0,0,0,0.24)",
              }}
            >
              {favoriteLoading ? <ActivityIndicator size="small" color="#fff6f0" /> : <MaterialCommunityIcons name={isFavorite ? "heart" : "heart-outline"} size={18} color="#fff6f0" />}
              <Text style={{ color: "#fff6f0", fontSize: 12, fontWeight: "900" }}>{isFavorite ? "Đã yêu thích" : "Yêu thích"}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.accountRow}>
          <Text style={styles.accountTitle}>Nội dung phim</Text>
          <Text style={styles.detailDescription}>{movie.description}</Text>
          <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginVertical: 6 }} />
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={styles.accountDetail}>Đạo diễn</Text>
              <Text style={{ color: palette.text, fontWeight: "800" }}>Đang cập nhật</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={styles.accountDetail}>Ngôn ngữ</Text>
              <Text style={{ color: palette.text, fontWeight: "800" }}>{primaryShowtime?.languageLabel ?? "Phụ đề Việt"}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={styles.accountDetail}>Ngày chiếu</Text>
              <Text style={{ color: palette.text, fontWeight: "800" }}>{primaryShowtime ? formatShowtimeDateLabel(primaryShowtime.startTime) : "Đang cập nhật"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.accountRow}>
          <Text style={styles.accountTitle}>Chọn ngày</Text>
          <ScrollView ref={dateScrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateMiniRow}>
            {dateOptions.map((dateKey) => (
              <Pressable key={dateKey} style={[styles.dateMiniCard, { width: 74, minHeight: 82, borderRadius: 16 }, effectiveDateKey === dateKey && styles.dateMiniCardActive]} onPress={() => setSelectedDateKey(dateKey)}>
                <Text style={[styles.dateMiniWeekday, effectiveDateKey === dateKey && styles.dateMiniTextActive]}>{formatShowtimeWeekday(dateKey)}</Text>
                <Text style={[styles.dateMiniDay, { fontSize: 22 }, effectiveDateKey === dateKey && styles.dateMiniTextActive]}>{formatShowtimeDayNumber(dateKey)}</Text>
                <Text style={[styles.dateMiniMonth, effectiveDateKey === dateKey && styles.dateMiniTextActive]}>{formatShowtimeDateLabel(dateKey)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={{ gap: 14 }}>
          {showtimeByCinema.map((group) => (
            <View key={group.cinemaName} style={styles.accountRow}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={styles.accountTitle}>{group.cinemaName}</Text>
                <Text style={styles.sectionAction}>{group.items.length} suất</Text>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {group.items.map((item) => {
                  const isActive = item.id === primaryShowtime?.id;
                  const disabled = new Date(item.startTime).getTime() < now;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => setSelectedShowtimeId(item.id)}
                      disabled={disabled}
                      style={{
                        minWidth: 98,
                        borderRadius: 999,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderWidth: 1,
                        borderColor: isActive ? "rgba(255,240,236,0.34)" : "rgba(255,255,255,0.1)",
                        backgroundColor: disabled ? "rgba(255,255,255,0.04)" : isActive ? "rgba(195,13,18,0.24)" : "rgba(255,255,255,0.03)",
                        opacity: disabled ? 0.52 : 1,
                      }}
                    >
                      <Text style={{ color: isActive ? "#fff6f0" : palette.text, fontSize: 14, fontWeight: "900", textAlign: "center" }}>{item.startTime.slice(11, 16)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        {showtimeByCinema.length === 0 ? (
          <View style={styles.accountRow}>
            <Text style={styles.accountDetail}>Hiện chưa có suất chiếu cho ngày đã chọn.</Text>
          </View>
        ) : null}

        <View style={[styles.accountRow, { gap: 10 }]}> 
          <Text style={styles.accountTitle}>Tùy chọn nhanh</Text>
          <Pressable style={[styles.listToggleButton, isInWatchlist ? styles.listToggleButtonWatchlistOn : styles.listToggleButtonWatchlistOff]} onPress={watchlistLoading ? undefined : onToggleWatchlist}>
            {watchlistLoading ? <ActivityIndicator size="small" color="#effff9" /> : <MaterialCommunityIcons name={isInWatchlist ? "bookmark" : "bookmark-outline"} size={18} color={isInWatchlist ? "#e2fff6" : "#7df2d9"} />}
            <Text style={[styles.listToggleButtonText, isInWatchlist ? styles.listToggleButtonTextOn : styles.listToggleButtonTextOff]}>{isInWatchlist ? "Đã lưu xem sau" : "Lưu xem sau"}</Text>
          </Pressable>
          <Pressable style={styles.detailMediaPlay} onPress={() => primaryShowtime && onBook(primaryShowtime)}>
            <MaterialCommunityIcons name="play-circle" size={20} color="#fff4ef" />
            <Text style={styles.detailMediaPlayText}>Đặt suất đang chọn</Text>
          </Pressable>
        </View>

        <View style={styles.accountRow}>
          <Text style={styles.accountTitle}>Trailer</Text>
          <TrailerPlayer url={trailerUrl} posterUrl={movie.bannerUrl ?? movie.posterUrl} title={movie.title} />
        </View>
      </ScrollView>

      {primaryShowtime ? (
        <View style={styles.stickyFooterWrap}>
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(255,255,255,0.18)", "rgba(255,255,255,0.06)", "rgba(255,255,255,0)"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.stickyFooterTopGlow}
          />
          <View style={styles.stickyFooter}>
            <View pointerEvents="none" style={styles.stickyFooterInnerHighlight} />
            <View style={styles.stickySummaryMain}>
              <Text style={styles.summaryLabel}>{primaryShowtime.cinemaName}</Text>
              <Text style={styles.stickyPrimaryValue}>{primaryShowtime.startTime.slice(11, 16)} • {primaryShowtime.roomName}</Text>
              <Text style={styles.stickySecondaryValue}>Giá từ {formatCurrency(primaryShowtime.basePrice)} • {primaryShowtime.languageLabel}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <NeonButton label="Tiếp tục" onPress={() => onBook(primaryShowtime)} loading={bookingLoadingMovieId === movie.id || bookingLoadingShowtimeId === primaryShowtime.id} />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
function LegacySeatScreen({ movie, showtime, onBack, onContinue, selectedSeats, onToggleSeat, holding, seatMapRows }: { movie: Movie; showtime: ShowtimeItem | null; onBack: () => void; onContinue: () => void; selectedSeats: SeatSelection[]; onToggleSeat: (seats: SeatSelection[]) => void; holding: boolean; seatMapRows: SeatMapRow[]; }) {
  const layout = React.useMemo(
    () => {
      const rowMap = new Map<string, SeatMapRow["seats"]>();
      const statusPriority: Record<string, number> = { AVAILABLE: 3, HELD: 2, SOLD: 1 };

      for (const row of seatMapRows) {
        const existing = rowMap.get(row.rowLabel) ?? [];
        rowMap.set(row.rowLabel, [...existing, ...row.seats]);
      }

      return [...rowMap.entries()]
        .sort((left, right) => left[0].localeCompare(right[0], "vi"))
        .map(([rowLabel, seats]) => {
          const seatMap = new Map<string, SeatMapRow["seats"][number]>();
          for (const seat of seats) {
            const key = String(seat.seatCode).trim().toUpperCase();
            const current = seatMap.get(key);
            if (!current) {
              seatMap.set(key, { ...seat, seatCode: key, rowLabel });
              continue;
            }

            const currentPriority = statusPriority[String(current.status ?? "").toUpperCase()] ?? 0;
            const nextPriority = statusPriority[String(seat.status ?? "").toUpperCase()] ?? 0;
            const currentColumn = Number(current.columnIndex ?? Number.MAX_SAFE_INTEGER);
            const nextColumn = Number(seat.columnIndex ?? Number.MAX_SAFE_INTEGER);

            if (nextPriority > currentPriority || (nextPriority === currentPriority && nextColumn < currentColumn)) {
              seatMap.set(key, { ...seat, seatCode: key, rowLabel });
            }
          }

          return {
            rowLabel,
            seats: [...seatMap.values()].sort((left, right) => Number(left.columnIndex ?? 0) - Number(right.columnIndex ?? 0)),
          };
        });
    },
    [seatMapRows]
  );
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const subtotal = selectedSeats.reduce((sum, item) => sum + item.price, 0);
  const [seatTapHint, setSeatTapHint] = React.useState<{ anchorKey: string; label: string; detail: string; price: number } | null>(null);
  const [lastSelectedAnchorKey, setLastSelectedAnchorKey] = React.useState<string | null>(null);
  const hotGlowAnim = React.useRef(new Animated.Value(0.9)).current;
  const seatPulseAnim = React.useRef(new Animated.Value(0)).current;
  const hotSeats = layout.flatMap((row) => row.seats.filter((seat) => seat.isHot && typeof seat.columnIndex === "number").map((seat) => ({ rowLabel: row.rowLabel, columnIndex: Number(seat.columnIndex) })));
  const hotBounds = React.useMemo(() => {
    if (hotSeats.length === 0) {
      return null;
    }
    return hotSeats.reduce(
      (acc, seat) => ({
        topRow: acc.topRow.localeCompare(seat.rowLabel, "vi") <= 0 ? acc.topRow : seat.rowLabel,
        bottomRow: acc.bottomRow.localeCompare(seat.rowLabel, "vi") >= 0 ? acc.bottomRow : seat.rowLabel,
        minColumn: Math.min(acc.minColumn, seat.columnIndex),
        maxColumn: Math.max(acc.maxColumn, seat.columnIndex),
      }),
      {
        topRow: hotSeats[0].rowLabel,
        bottomRow: hotSeats[0].rowLabel,
        minColumn: hotSeats[0].columnIndex,
        maxColumn: hotSeats[0].columnIndex,
      }
    );
  }, [hotSeats]);

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hotGlowAnim, { toValue: 1.05, duration: 1800, useNativeDriver: true }),
        Animated.timing(hotGlowAnim, { toValue: 0.92, duration: 1800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [hotGlowAnim]);

  React.useEffect(() => {
    if (!lastSelectedAnchorKey) {
      return;
    }
    seatPulseAnim.setValue(0);
    Animated.sequence([
      Animated.timing(seatPulseAnim, { toValue: 1, duration: 190, useNativeDriver: true }),
      Animated.timing(seatPulseAnim, { toValue: 0, duration: 240, useNativeDriver: true }),
    ]).start();
  }, [lastSelectedAnchorKey, seatPulseAnim]);
  const getSeatSelectionUnit = React.useCallback((row: SeatMapRow, seat: SeatMapRow["seats"][number]) => {
    if (seat.seatType !== "COUPLE") {
      return [{ seatCode: seat.seatCode, seatType: seat.seatType as "STANDARD" | "VIP" | "COUPLE", price: seat.price }];
    }

    const orderedCoupleSeats = [...row.seats]
      .filter((item) => item.seatType === "COUPLE")
      .sort((left, right) => Number(left.columnIndex ?? 0) - Number(right.columnIndex ?? 0));
    const column = Number(seat.columnIndex ?? 0);
    const pairStart = column % 2 === 0 ? column - 1 : column;
    const pairSeats = orderedCoupleSeats.filter((item) => {
      const itemColumn = Number(item.columnIndex ?? 0);
      return itemColumn === pairStart || itemColumn === pairStart + 1;
    });
    const targetSeats = pairSeats.length > 0 ? pairSeats : [seat];
    return targetSeats.map((item) => ({
      seatCode: item.seatCode,
      seatType: item.seatType as "STANDARD" | "VIP" | "COUPLE",
      price: item.price,
    }));
  }, []);

  const splitSeatGroups = React.useCallback((rowSeats: SeatMapRow["seats"]) => {
    const ordered = [...rowSeats].sort((left, right) => Number(left.columnIndex ?? 0) - Number(right.columnIndex ?? 0));
    if (ordered.length < 7) {
      return { left: [] as typeof ordered, center: ordered, right: [] as typeof ordered };
    }
    const totalColumns = layout.reduce((max, row) => Math.max(max, ...row.seats.map((seat) => Number(seat.columnIndex ?? 0))), 0);
    const roomName = String(showtime?.roomName ?? "").toLowerCase();
    const wideRoom = roomName.includes("imax") || roomName.includes("luxe") || roomName.includes("premium");
    const sideCount = totalColumns >= 14 ? 3 : totalColumns >= 11 || wideRoom ? 2 : 1;
    return {
      left: ordered.slice(0, sideCount),
      center: ordered.slice(sideCount, ordered.length - sideCount),
      right: ordered.slice(ordered.length - sideCount),
    };
  }, [layout, showtime?.roomName]);

  const renderSeatItem = React.useCallback((row: SeatMapRow, seat: SeatMapRow["seats"][number]) => {
    const anchorKey = `${row.rowLabel}-${seat.seatCode}-${seat.seatType}`;
    const selectionUnit = getSeatSelectionUnit(row, seat);
    const active = selectionUnit.every((item) => selectedSeats.some((selected) => selected.seatCode === item.seatCode && selected.seatType === item.seatType));
    const disabled = selectionUnit.some((item) => {
      const matchedSeat = row.seats.find((candidate) => candidate.seatCode === item.seatCode && candidate.seatType === item.seatType);
      return matchedSeat?.status !== "AVAILABLE";
    });
    const seatTone =
      seat.status === "SOLD"
        ? palette.sold
        : seat.status === "HELD"
          ? palette.held
          : seat.isHot
            ? "#7fe4c9"
            : seat.seatType === "VIP"
              ? palette.vip
              : seat.seatType === "COUPLE"
                ? palette.couple
                : palette.seat;
    const isHot = Boolean(seat.isHot);
    const isTopHotEdge = isHot && hotBounds && row.rowLabel === hotBounds.topRow;
    const isBottomHotEdge = isHot && hotBounds && row.rowLabel === hotBounds.bottomRow;
    const isLeftHotEdge = isHot && hotBounds && Number(seat.columnIndex ?? -1) === hotBounds.minColumn;
    const isRightHotEdge = isHot && hotBounds && Number(seat.columnIndex ?? -1) === hotBounds.maxColumn;
    const label = selectionUnit.length > 1 ? selectionUnit.map((item) => item.seatCode).join(" - ") : seat.seatCode;
    const detail = seat.seatType === "COUPLE" ? "Ghế đôi • chọn cả cặp" : seat.isHot ? "Ghế Hot" : seat.seatType === "VIP" ? "Ghế VIP" : "Ghế thường";
    const totalPrice = selectionUnit.reduce((sum, item) => sum + item.price, 0);

    return (
      <Pressable
        key={anchorKey}
        disabled={disabled}
        onPress={() => {
          onToggleSeat(selectionUnit);
          setSeatTapHint({ anchorKey, label, detail, price: totalPrice });
          setLastSelectedAnchorKey(anchorKey);
        }}
        style={[styles.seatCell, seat.seatType === "COUPLE" && styles.coupleSeatCell, active && styles.seatActive, disabled && styles.seatDisabled]}
      >
        {seatTapHint?.anchorKey === anchorKey ? (
          <View style={[styles.seatInlineHint, seat.seatType === "COUPLE" && styles.seatInlineHintCouple]}>
            <Text style={styles.seatInlineHintPrice}>{formatCurrency(seatTapHint.price)}</Text>
            <Text style={styles.seatInlineHintMeta}>{seatTapHint.detail}</Text>
          </View>
        ) : null}
        <Animated.View
          style={[
            active && lastSelectedAnchorKey === anchorKey
              ? {
                  transform: [
                    {
                      scale: seatPulseAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.08],
                      }),
                    },
                  ],
                }
              : null,
          ]}
        >
          {active && lastSelectedAnchorKey === anchorKey ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.seatPulseRing,
                seat.seatType === "COUPLE" && styles.seatPulseRingCouple,
                {
                  opacity: seatPulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.45],
                  }),
                  transform: [
                    {
                      scale: seatPulseAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.88, 1.24],
                      }),
                    },
                  ],
                },
              ]}
            />
          ) : null}
          <View
            style={[
              styles.seatShell,
              seat.seatType === "VIP" && styles.seatShellVip,
              seat.seatType === "COUPLE" && styles.seatShellCouple,
              isHot && styles.seatShellHot,
              isTopHotEdge && styles.seatHotEdgeTop,
              isBottomHotEdge && styles.seatHotEdgeBottom,
              isLeftHotEdge && styles.seatHotEdgeLeft,
              isRightHotEdge && styles.seatHotEdgeRight,
              active && styles.seatShellActive,
              disabled && styles.seatShellDisabled,
              { borderColor: seatTone, shadowColor: seatTone },
            ]}
          >
            <View style={[styles.seatBack, seat.seatType === "COUPLE" && styles.seatBackCouple, { backgroundColor: seatTone }]} />
            <View style={styles.seatArmRow}>
              <View style={[styles.seatArm, { backgroundColor: seatTone }]} />
              <View style={[styles.seatCushion, seat.seatType === "COUPLE" && styles.seatCushionCouple, { backgroundColor: seatTone }]} />
              <View style={[styles.seatArm, { backgroundColor: seatTone }]} />
            </View>
            <View style={[styles.seatLeg, { backgroundColor: active ? "#fff7f0" : seatTone }]} />
          </View>
        </Animated.View>
        <Text style={[styles.seatCellText, active && styles.seatCellTextActive, disabled && styles.seatCellTextDisabled]}>
          {selectionUnit.length > 1 ? label.replace(`${row.rowLabel}`, "").replace(" - ", "/") : seat.seatCode.replace(row.rowLabel, "")}
        </Text>
      </Pressable>
    );
  }, [getSeatSelectionUnit, hotBounds, lastSelectedAnchorKey, onToggleSeat, seatPulseAnim, selectedSeats]);

  const renderSeatGroup = React.useCallback((row: SeatMapRow, seats: SeatMapRow["seats"]) => (
    <View style={styles.seatGroup}>
      {seats.map((seat) => renderSeatItem(row, seat))}
    </View>
  ), [renderSeatItem]);

  const renderAisleGuide = React.useCallback((direction: "left" | "right") => (
    <View style={styles.seatOuterAisleLine}>
      <View style={[styles.seatAisleCurveTop, direction === "left" ? styles.seatAisleCurveTopLeft : styles.seatAisleCurveTopRight]} />
      <View style={styles.seatAisleCurveBottom} />
    </View>
  ), []);

  const renderSeatRow = (row: SeatMapRow) => {
    const orderedSeats = [...row.seats].sort((left, right) => Number(left.columnIndex ?? 0) - Number(right.columnIndex ?? 0));
    const isCoupleRow = orderedSeats.some((seat) => seat.seatType === "COUPLE");
    const displaySeats = isCoupleRow ? orderedSeats.filter((seat) => Number(seat.columnIndex ?? 0) % 2 === 1) : orderedSeats;
    const groups = splitSeatGroups(displaySeats);
    const centerHotSeats = hotBounds
      ? groups.center.filter((seat) => {
          const column = Number(seat.columnIndex ?? -1);
          return Boolean(seat.isHot) && column >= hotBounds.minColumn && column <= hotBounds.maxColumn;
        })
      : [];
    const hotStartColumn = centerHotSeats.length > 0 ? Number(centerHotSeats[0].columnIndex ?? -1) : null;
    const hotEndColumn = centerHotSeats.length > 0 ? Number(centerHotSeats[centerHotSeats.length - 1].columnIndex ?? -1) : null;
    const centerBeforeHot = hotStartColumn === null ? groups.center : groups.center.filter((seat) => Number(seat.columnIndex ?? -1) < hotStartColumn);
    const centerAfterHot = hotEndColumn === null ? [] : groups.center.filter((seat) => Number(seat.columnIndex ?? -1) > hotEndColumn);
    return (
      <View key={row.rowLabel} style={styles.seatRow}>
        <View style={styles.seatRowRail}>
          <Text style={[styles.seatRowLabel, isCoupleRow && styles.seatRowLabelCouple, orderedSeats.some((seat) => seat.seatType === "VIP") && styles.seatRowLabelVip]}>{row.rowLabel}</Text>
        </View>
        <View style={styles.seatRowContent}>
          {groups.left.length > 0 ? renderSeatGroup(row, groups.left) : <View style={styles.seatGroupPlaceholder} />}
          {groups.left.length > 0 ? renderAisleGuide("left") : null}
          {centerBeforeHot.length > 0 ? renderSeatGroup(row, centerBeforeHot) : null}
          {centerHotSeats.length > 0 ? (
            <View
              style={[
                styles.seatHotOutline,
                hotBounds && row.rowLabel === hotBounds.topRow && styles.seatHotOutlineTop,
                hotBounds && row.rowLabel === hotBounds.bottomRow && styles.seatHotOutlineBottom,
                hotBounds && row.rowLabel === hotBounds.topRow && row.rowLabel === hotBounds.bottomRow && styles.seatHotOutlineSingleRow,
              ]}
            >
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.seatHotGlow,
                  {
                    opacity: hotGlowAnim.interpolate({ inputRange: [0.9, 1.05], outputRange: [0.22, 0.38] }),
                    transform: [{ scale: hotGlowAnim }],
                  },
                ]}
              />
              {hotBounds && row.rowLabel === hotBounds.topRow ? (
                <View style={styles.seatHotZoneLabelWrap}>
                  <Text style={styles.seatHotZoneLabel}>HOT ZONE</Text>
                </View>
              ) : null}
              {renderSeatGroup(row, centerHotSeats)}
            </View>
          ) : hotStartColumn === null ? renderSeatGroup(row, groups.center) : null}
          {centerAfterHot.length > 0 ? renderSeatGroup(row, centerAfterHot) : null}
          {groups.right.length > 0 ? renderAisleGuide("right") : null}
          {groups.right.length > 0 ? renderSeatGroup(row, groups.right) : <View style={styles.seatGroupPlaceholder} />}
        </View>
        <View style={styles.seatRowRailMirror} />
      </View>
    );
  };

  const renderColumnHeader = React.useCallback((position: "top" | "bottom") => {
    const anchorRow = layout.find((row) => row.seats.length > 0) ?? layout[0];
    if (!anchorRow) {
      return null;
    }
    const orderedSeats = [...anchorRow.seats].sort((left, right) => Number(left.columnIndex ?? 0) - Number(right.columnIndex ?? 0));
    const isCoupleRow = orderedSeats.some((seat) => seat.seatType === "COUPLE");
    const displaySeats = isCoupleRow ? orderedSeats.filter((seat) => Number(seat.columnIndex ?? 0) % 2 === 1) : orderedSeats;
    const groups = splitSeatGroups(displaySeats);
    const centerHotSeats = hotBounds
      ? groups.center.filter((seat) => {
          const column = Number(seat.columnIndex ?? -1);
          return Boolean(seat.isHot) && column >= hotBounds.minColumn && column <= hotBounds.maxColumn;
        })
      : [];
    const hotStartColumn = centerHotSeats.length > 0 ? Number(centerHotSeats[0].columnIndex ?? -1) : null;
    const hotEndColumn = centerHotSeats.length > 0 ? Number(centerHotSeats[centerHotSeats.length - 1].columnIndex ?? -1) : null;
    const centerBeforeHot = hotStartColumn === null ? groups.center : groups.center.filter((seat) => Number(seat.columnIndex ?? -1) < hotStartColumn);
    const centerAfterHot = hotEndColumn === null ? [] : groups.center.filter((seat) => Number(seat.columnIndex ?? -1) > hotEndColumn);

    const renderColumnGroup = (seats: SeatMapRow["seats"]) => (
      <View style={styles.seatColumnGroup}>
        {seats.map((seat) => (
          <Text key={`col-${seat.seatCode}`} style={[styles.seatColumnLabel, seat.isHot && styles.seatColumnLabelHot]}>
            {Number(seat.columnIndex ?? 0)}
          </Text>
        ))}
      </View>
    );

    return (
      <View style={[styles.seatColumnRow, position === "bottom" && styles.seatColumnRowBottom]}>
        <View style={styles.seatRowRail}>
          <Text style={styles.seatColumnSideLabel}>{position === "top" ? "ROW" : "COL"}</Text>
        </View>
        <View style={styles.seatRowContent}>
          {groups.left.length > 0 ? renderColumnGroup(groups.left) : <View style={styles.seatGroupPlaceholder} />}
          {groups.left.length > 0 ? renderAisleGuide("left") : null}
          {centerBeforeHot.length > 0 ? renderColumnGroup(centerBeforeHot) : null}
          {centerHotSeats.length > 0 ? (
            <View
              style={[
                styles.seatHotOutline,
                styles.seatHotOutlineTop,
                anchorRow.rowLabel === hotBounds?.bottomRow && styles.seatHotOutlineBottom,
                anchorRow.rowLabel === hotBounds?.topRow && anchorRow.rowLabel === hotBounds?.bottomRow && styles.seatHotOutlineSingleRow,
              ]}
            >
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.seatHotGlow,
                  {
                    opacity: hotGlowAnim.interpolate({ inputRange: [0.9, 1.05], outputRange: [0.22, 0.38] }),
                    transform: [{ scale: hotGlowAnim }],
                  },
                ]}
              />
              <View style={[styles.seatHotZoneLabelWrap, position === "bottom" && styles.seatHotZoneLabelWrapBottom]}>
                <Text style={styles.seatHotZoneLabel}>HOT ZONE</Text>
              </View>
              {renderColumnGroup(centerHotSeats)}
            </View>
          ) : hotStartColumn === null ? renderColumnGroup(groups.center) : null}
          {centerAfterHot.length > 0 ? renderColumnGroup(centerAfterHot) : null}
          {groups.right.length > 0 ? renderAisleGuide("right") : null}
          {groups.right.length > 0 ? renderColumnGroup(groups.right) : <View style={styles.seatGroupPlaceholder} />}
        </View>
        <View style={styles.seatRowRailMirror} />
      </View>
    );
  }, [hotBounds, hotGlowAnim, layout, renderAisleGuide, splitSeatGroups]);

  return (
    <View style={styles.screenShell}>
      <Animated.ScrollView
        contentContainerStyle={[styles.scrollContent, styles.stickyScrollContent]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        <Pressable onPress={onBack}>
          <Text style={styles.backLink}>← Quay lại</Text>
        </Pressable>

        <View style={styles.seatHeader}>
          <Text style={styles.detailTitle}>{movie.title}</Text>
          <Text style={styles.detailMeta}>{showtime ? `${showtime.cinemaName} • ${showtime.roomName} • ${showtime.startTime.slice(11, 16)}` : "Chưa chọn suất chiếu"}</Text>
        </View>

        <View style={styles.seatPriceRow}>
          <View style={styles.seatPriceCard}>
            <Text style={styles.seatPriceLabel}>Ghế thường</Text>
            <Text style={styles.seatPriceValue}>Cơ bản</Text>
          </View>
          <View style={styles.seatPriceCard}>
            <Text style={styles.seatPriceLabel}>Ghế VIP</Text>
            <Text style={styles.seatPriceValue}>+30.000đ</Text>
          </View>
          <View style={styles.seatPriceCard}>
            <Text style={styles.seatPriceLabel}>Ghế Hot</Text>
            <Text style={styles.seatPriceValue}>+20.000đ</Text>
          </View>
          <View style={styles.seatPriceCard}>
            <Text style={styles.seatPriceLabel}>Ghế đôi</Text>
            <Text style={styles.seatPriceValue}>+90.000đ</Text>
          </View>
        </View>

        <View style={styles.screenArcWrap}>
          <View style={styles.screenArcGlow} />
          <Text style={styles.screenArcText}>MÀN HÌNH</Text>
        </View>

        <View style={styles.seatGridWrap}>
          {hotBounds ? (
            <View style={styles.seatHotBadge}>
              <MaterialCommunityIcons name="fire" size={14} color="#06251d" />
              <Text style={styles.seatHotBadgeText}>Vùng Hot: vị trí đẹp, đặt nhiều, phụ thu +20.000đ</Text>
            </View>
          ) : null}
          {renderColumnHeader("top")}
          <View style={styles.seatSection}>
            {layout.map((row) => renderSeatRow(row))}
          </View>
        </View>

        <View style={styles.legendGrid}>
          {[["Ghế thường", palette.seat], ["Ghế VIP", palette.vip], ["Ghế Hot", "#7fe4c9"], ["Ghế đôi", palette.couple], ["Đã chọn", "#ffffff"], ["Đã bán", palette.sold], ["Đang giữ", palette.held]].map(([label, color]) => (
            <View key={label} style={styles.legendItem}>
              <View style={[styles.legendDot, label === "Đã chọn" ? styles.legendDotSelected : null, { backgroundColor: color }]} />
              <Text style={styles.legendText}>{label}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.accountDetail}>Ghế đôi được hiển thị trực tiếp trong sơ đồ và đánh dấu bằng màu riêng, không tách thành khu riêng.</Text>
      </Animated.ScrollView>
      <View style={styles.stickyFooterWrap}>
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(255,255,255,0.18)", "rgba(255,255,255,0.06)", "rgba(255,255,255,0)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.stickyFooterTopGlow}
        />
<View style={styles.stickyFooter}>
          <View pointerEvents="none" style={styles.stickyFooterInnerHighlight} />
          <Animated.View
            pointerEvents="none"
            style={[styles.stickyFooterNoise, { transform: [{ translateY: scrollY.interpolate({ inputRange: [0, 320], outputRange: [0, -6], extrapolate: "clamp" }) }] }]}
          >
            {glassNoiseDots.map((dot, index) => (
              <View
                key={`seat-noise-${index}`}
                style={[
                  styles.stickyFooterNoiseDot,
                  { left: dot.left, top: dot.top, width: dot.size, height: dot.size, opacity: dot.opacity },
                ]}
              />
            ))}
            {glassNoiseDots.map((dot, index) => (
              <View
                key={`seat-noise-dark-${index}`}
                style={[
                  styles.stickyFooterNoiseDotDark,
                  { left: dot.left, top: dot.top + 8, width: dot.size + 0.4, height: dot.size + 0.4, opacity: dot.opacity * 0.55 },
                ]}
              />
            ))}
          </Animated.View>
          <View style={styles.stickySummaryMain}>
            <Text style={styles.summaryLabel}>Ghế đã chọn</Text>
            <Text style={styles.stickyPrimaryValue}>{selectedSeats.map((item) => item.seatCode).join(", ") || "Chưa chọn"}</Text>
            <Text style={styles.stickySecondaryValue}>Tạm tính {formatCurrency(subtotal)}</Text>
          </View>
          <View style={styles.stickyActionBlock}>
            <NeonButton label="Tiếp tục" onPress={onContinue} loading={holding} />
          </View>
</View>
      </View>
    </View>
  );
}

export function SeatScreen({ movie, showtime, onBack, onContinue, selectedSeats, onToggleSeat, holding, seatMapRows }: { movie: Movie; showtime: ShowtimeItem | null; onBack: () => void; onContinue: () => void; selectedSeats: SeatSelection[]; onToggleSeat: (seats: SeatSelection[]) => void; holding: boolean; seatMapRows: SeatMapRow[]; }) {
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const subtotal = selectedSeats.reduce((sum, item) => sum + item.price, 0);
  const SEAT_SIZE = 36;
  const COUPLE_SEAT_WIDTH = 74;
  const SEAT_TOP_RADIUS = 12;
  const COUPLE_TOP_RADIUS = 16;
  const SEAT_BOTTOM_RADIUS = 7;
  const SEAT_GAP = 8;
  const SIDE_AISLE_GAP = 20;
  const CENTER_AISLE_GAP = 22;

  const layout = React.useMemo(() => {
    const rowMap = new Map<string, SeatMapRow["seats"]>();
    for (const row of seatMapRows) {
      const key = String(row.rowLabel ?? "").trim().toUpperCase();
      const prev = rowMap.get(key) ?? [];
      rowMap.set(key, [...prev, ...row.seats]);
    }

    return [...rowMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "vi"))
      .map(([rowLabel, seats]) => {
        const seatMap = new Map<string, SeatMapRow["seats"][number]>();
        for (const seat of seats) {
          const seatKey = String(seat.seatCode).trim().toUpperCase();
          if (!seatMap.has(seatKey)) {
            seatMap.set(seatKey, { ...seat, rowLabel });
          }
        }
        return {
          rowLabel,
          seats: [...seatMap.values()].sort((l, r) => Number(l.columnIndex ?? 0) - Number(r.columnIndex ?? 0)),
        };
      });
  }, [seatMapRows]);

  const getSeatSelectionUnit = React.useCallback((row: SeatMapRow, seat: SeatMapRow["seats"][number]) => {
    if (seat.seatType !== "COUPLE") {
      return [{ seatCode: seat.seatCode, seatType: seat.seatType as "STANDARD" | "VIP" | "COUPLE", price: seat.price }];
    }
    const orderedCoupleSeats = [...row.seats]
      .filter((item) => item.seatType === "COUPLE")
      .sort((left, right) => Number(left.columnIndex ?? 0) - Number(right.columnIndex ?? 0));
    const column = Number(seat.columnIndex ?? 0);
    const pairStart = column % 2 === 0 ? column - 1 : column;
    const pairSeats = orderedCoupleSeats.filter((item) => {
      const itemColumn = Number(item.columnIndex ?? 0);
      return itemColumn === pairStart || itemColumn === pairStart + 1;
    });
    return (pairSeats.length > 0 ? pairSeats : [seat]).map((item) => ({
      seatCode: item.seatCode,
      seatType: item.seatType as "STANDARD" | "VIP" | "COUPLE",
      price: item.price,
    }));
  }, []);

  const getRowSeatGroups = React.useCallback((rowSeats: SeatMapRow["seats"]) => {
    if (rowSeats.length <= 8) return { left: [] as typeof rowSeats, center: rowSeats, right: [] as typeof rowSeats };
    if (rowSeats.length <= 10) return { left: rowSeats.slice(0, 2), center: rowSeats.slice(2, rowSeats.length - 2), right: rowSeats.slice(rowSeats.length - 2) };
    return { left: rowSeats.slice(0, 3), center: rowSeats.slice(3, rowSeats.length - 3), right: rowSeats.slice(rowSeats.length - 3) };
  }, []);

  const groupedRows = React.useMemo(() => {
    const standard: SeatMapRow[] = [];
    const vip: SeatMapRow[] = [];
    const couple: SeatMapRow[] = [];
    for (const row of layout) {
      const hasCouple = row.seats.some((seat) => seat.seatType === "COUPLE");
      const hasVip = row.seats.some((seat) => seat.seatType === "VIP");
      if (hasCouple) couple.push(row);
      else if (hasVip) vip.push(row);
      else standard.push(row);
    }
    return [
      { key: "standard", label: null as string | null, rows: standard, tint: "rgba(229,226,225,0.55)" },
      { key: "vip", label: "KHU VIP", rows: vip, tint: "rgba(255,215,153,0.9)" },
      { key: "couple", label: "KHU GHẾ ĐÔI", rows: couple, tint: "rgba(255,179,172,0.9)" },
    ].filter((section) => section.rows.length > 0);
  }, [layout]);

  const hasHotSeat = React.useMemo(() => layout.some((row) => row.seats.some((seat) => seat.isHot)), [layout]);

  const renderSeatCell = React.useCallback((row: SeatMapRow, seat: SeatMapRow["seats"][number]) => {
    const selectionUnit = getSeatSelectionUnit(row, seat);
    const active = selectionUnit.every((item) => selectedSeats.some((selected) => selected.seatCode === item.seatCode && selected.seatType === item.seatType));
    const disabled = selectionUnit.some((item) => {
      const match = row.seats.find((candidate) => candidate.seatCode === item.seatCode && candidate.seatType === item.seatType);
      return match?.status !== "AVAILABLE";
    });
    const isCouple = seat.seatType === "COUPLE";
    const isVip = seat.seatType === "VIP";
    const isHot = Boolean(seat.isHot);
    const isSold = seat.status === "SOLD";
    const isHeld = seat.status === "HELD";

    let backgroundColor = "rgba(255,255,255,0.06)";
    let borderColor = "rgba(255,255,255,0.12)";
    let textColor = "rgba(229,226,225,0.52)";

    if (isVip) {
      backgroundColor = "rgba(255,215,153,0.08)";
      borderColor = "rgba(255,215,153,0.5)";
      textColor = "#ffd799";
    }
    if (isCouple) {
      backgroundColor = "rgba(120,110,112,0.4)";
      borderColor = "rgba(255,179,172,0.3)";
      textColor = "#ffd7cf";
    }
    if (isHot) {
      backgroundColor = "rgba(255,179,172,0.13)";
      borderColor = "rgba(255,179,172,0.45)";
      textColor = "#ffe0da";
    }
    if (isHeld) {
      backgroundColor = "rgba(211,47,47,0.88)";
      borderColor = "rgba(255,179,172,0.72)";
      textColor = "#fff6f4";
    }
    if (isSold) {
      backgroundColor = "rgba(255,255,255,0.06)";
      borderColor = "rgba(255,255,255,0.12)";
      textColor = "rgba(255,255,255,0.26)";
    }
    if (active) {
      backgroundColor = "#d32f2f";
      borderColor = "#ffb3ac";
      textColor = "#fff8f6";
    }

    const seatLabel = seat.seatCode.replace(row.rowLabel, "");

    return (
      <Pressable
        key={`${row.rowLabel}-${seat.seatCode}-${seat.seatType}`}
        disabled={disabled}
        onPress={() => onToggleSeat(selectionUnit)}
        style={{
          width: isCouple ? COUPLE_SEAT_WIDTH : SEAT_SIZE,
          height: SEAT_SIZE,
          borderTopLeftRadius: isCouple ? COUPLE_TOP_RADIUS : SEAT_TOP_RADIUS,
          borderTopRightRadius: isCouple ? COUPLE_TOP_RADIUS : SEAT_TOP_RADIUS,
          borderBottomLeftRadius: SEAT_BOTTOM_RADIUS,
          borderBottomRightRadius: SEAT_BOTTOM_RADIUS,
          borderWidth: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor,
          borderColor,
          opacity: disabled && !active ? 0.55 : 1,
          transform: active ? [{ scale: 1.03 }] : undefined,
          shadowColor: active ? "#d32f2f" : borderColor,
          shadowOpacity: active ? 0.34 : isHot ? 0.2 : 0.05,
          shadowRadius: active ? 8 : 3,
          shadowOffset: { width: 0, height: 0 },
        }}
      >
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 2,
            left: isCouple ? 6 : 4,
            right: isCouple ? 6 : 4,
            height: isCouple ? 8 : 7,
            borderTopLeftRadius: isCouple ? 14 : 10,
            borderTopRightRadius: isCouple ? 14 : 10,
            backgroundColor: active ? "rgba(255,255,255,0.24)" : "rgba(255,255,255,0.12)",
          }}
        />
        {isSold ? (
          <MaterialCommunityIcons name="close" size={12} color={textColor} />
        ) : isCouple ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
            <MaterialCommunityIcons name="heart" size={11} color={textColor} />
            <Text style={{ color: textColor, fontSize: 8, fontWeight: "900" }}>{seatLabel}</Text>
          </View>
        ) : (
          <Text style={{ color: textColor, fontSize: 9, fontWeight: "900" }}>{seatLabel}</Text>
        )}
      </Pressable>
    );
  }, [getSeatSelectionUnit, onToggleSeat, selectedSeats]);

  const renderSeatRow = React.useCallback((row: SeatMapRow) => {
    const orderedSeats = [...row.seats].sort((l, r) => Number(l.columnIndex ?? 0) - Number(r.columnIndex ?? 0));
    const hasCouple = orderedSeats.some((seat) => seat.seatType === "COUPLE");
    const displaySeats = hasCouple ? orderedSeats.filter((seat) => Number(seat.columnIndex ?? 0) % 2 === 1) : orderedSeats;
    const groups = getRowSeatGroups(displaySeats);

    return (
      <View key={row.rowLabel} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <Text style={{ width: 14, textAlign: "center", color: "rgba(255,255,255,0.42)", fontSize: 10, fontWeight: "900" }}>{row.rowLabel}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: SEAT_GAP }}>
          {groups.left.map((seat) => renderSeatCell(row, seat))}
          {groups.left.length > 0 ? <View style={{ width: SIDE_AISLE_GAP }} /> : null}
          {groups.center.map((seat) => renderSeatCell(row, seat))}
          {groups.right.length > 0 ? <View style={{ width: CENTER_AISLE_GAP }} /> : null}
          {groups.right.map((seat) => renderSeatCell(row, seat))}
        </View>
        <Text style={{ width: 14, textAlign: "center", color: "rgba(255,255,255,0.42)", fontSize: 10, fontWeight: "900" }}>{row.rowLabel}</Text>
      </View>
    );
  }, [CENTER_AISLE_GAP, SEAT_GAP, SIDE_AISLE_GAP, getRowSeatGroups, renderSeatCell]);

  return (
    <View style={styles.screenShell}>
      <Animated.ScrollView
        contentContainerStyle={[styles.scrollContent, styles.stickyScrollContent]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        <Pressable onPress={onBack}>
          <Text style={styles.backLink}>← Quay lại</Text>
        </Pressable>

        <View style={styles.seatHeader}>
          <Text style={styles.detailTitle}>Chọn ghế</Text>
          <Text style={[styles.detailMeta, { textTransform: "uppercase", letterSpacing: 1.2 }]}>
            {showtime ? `${showtime.cinemaName} - ${showtime.roomName}` : "CHƯA CHỌN SUẤT CHIẾU"}
          </Text>
          <Text style={[styles.detailMeta, { color: "rgba(229,226,225,0.5)" }]}>{movie.title}</Text>
        </View>

        <View style={{ marginBottom: 10, borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)", padding: 12, gap: 8 }}>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <View style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "rgba(255,255,255,0.06)" }}>
              <Text style={{ color: "rgba(229,226,225,0.78)", fontSize: 11, fontWeight: "800" }}>Ghế thường: Cơ bản</Text>
            </View>
            <View style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "rgba(255,224,74,0.14)" }}>
              <Text style={{ color: "#ffe88b", fontSize: 11, fontWeight: "800" }}>VIP: +30.000đ</Text>
            </View>
            <View style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "rgba(255,68,68,0.14)" }}>
              <Text style={{ color: "#ffd5d5", fontSize: 11, fontWeight: "800" }}>Ghế đôi: +90.000đ / cặp</Text>
            </View>
            <View style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "rgba(115,246,221,0.14)" }}>
              <Text style={{ color: "#b8fff2", fontSize: 11, fontWeight: "800" }}>Khu hot: +20.000đ</Text>
            </View>
          </View>
        </View>

        <View style={[styles.screenArcWrap, { paddingTop: 22, paddingBottom: 14 }]}>
          <View style={styles.screenArcGlow} />
          <Text style={styles.screenArcText}>MÀN HÌNH</Text>
        </View>

        <View style={{ borderRadius: 22, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(28,27,27,0.76)", paddingHorizontal: 12, paddingVertical: 16, gap: 16 }}>
          {groupedRows.map((section) => (
            <View key={section.key} style={{ gap: 8 }}>
              {section.label ? (
                <Text style={{ alignSelf: "center", color: section.tint, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 }}>{section.label}</Text>
              ) : null}
              <View style={{ gap: 10 }}>
                {section.rows.map((row) => renderSeatRow(row))}
              </View>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 14, borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", backgroundColor: "rgba(255,255,255,0.03)", padding: 12, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 }}>
          {[
            ["Còn trống", "rgba(255,255,255,0.75)"],
            ["Đã chọn", "#d32f2f"],
            ["Đang giữ", "rgba(195,13,18,0.85)"],
            ["Đã bán", "rgba(171,165,176,0.56)"],
            ["VIP", "#ffe04a"],
            ["Ghế đôi", "#ff4444"],
            ["Khu hot", "#ffb3ac"],
          ].map(([label, color]) => (
            <View key={label} style={{ width: "48%", flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 11, height: 11, borderRadius: 999, backgroundColor: color }} />
              <Text style={{ color: palette.text, fontSize: 11, fontWeight: "700" }}>{label}</Text>
            </View>
          ))}
          {hasHotSeat ? (
            <View style={{ width: "100%", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: "rgba(255,179,172,0.12)", borderWidth: 1, borderColor: "rgba(255,179,172,0.3)" }}>
              <Text style={{ color: "#ffe1db", fontSize: 11, fontWeight: "800" }}>Mẹo: Chạm 1 ghế đôi để chọn cả cặp</Text>
            </View>
          ) : null}
        </View>
      </Animated.ScrollView>
      <View style={styles.stickyFooterWrap}>
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(255,255,255,0.18)", "rgba(255,255,255,0.06)", "rgba(255,255,255,0)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.stickyFooterTopGlow}
        />
        <View style={styles.stickyFooter}>
          <View pointerEvents="none" style={styles.stickyFooterInnerHighlight} />
          <Animated.View
            pointerEvents="none"
            style={[styles.stickyFooterNoise, { transform: [{ translateY: scrollY.interpolate({ inputRange: [0, 320], outputRange: [0, -6], extrapolate: "clamp" }) }] }]}
          >
            {glassNoiseDots.map((dot, index) => (
              <View key={`seat-noise-${index}`} style={[styles.stickyFooterNoiseDot, { left: dot.left, top: dot.top, width: dot.size, height: dot.size, opacity: dot.opacity }]} />
            ))}
            {glassNoiseDots.map((dot, index) => (
              <View key={`seat-noise-dark-${index}`} style={[styles.stickyFooterNoiseDotDark, { left: dot.left, top: dot.top + 8, width: dot.size + 0.4, height: dot.size + 0.4, opacity: dot.opacity * 0.55 }]} />
            ))}
          </Animated.View>
          <View style={styles.stickySummaryMain}>
            <Text style={styles.summaryLabel}>Ghế đã chọn</Text>
            <Text style={styles.stickyPrimaryValue}>{selectedSeats.map((item) => item.seatCode).join(", ") || "Chưa chọn"}</Text>
            <Text style={styles.stickySecondaryValue}>Tạm tính {formatCurrency(subtotal)}</Text>
          </View>
          <View style={styles.stickyActionBlock}>
            <NeonButton label="Tiếp tục" onPress={onContinue} loading={holding} />
          </View>
        </View>
      </View>
    </View>
  );
}

export function CheckoutScreen(props: { movie: Movie; onBack: () => void; combosData: ComboItem[]; selectedSeats: SeatSelection[]; selectedComboIds: number[]; selectedPaymentProvider: PaymentProvider; selectedPaymentGatewayMode: "SANDBOX" | "REAL"; onSelectPaymentProvider: (provider: PaymentProvider) => void; onSelectPaymentGatewayMode: (mode: "SANDBOX" | "REAL") => void; onToggleCombo: (id: number) => void; customerName: string; setCustomerName: Setter<string>; customerEmail: string; setCustomerEmail: Setter<string>; customerPhone: string; setCustomerPhone: Setter<string>; onConfirm: () => void; confirming: boolean; vouchers: Voucher[]; voucherCode: string; setVoucherCode: Setter<string>; appliedVoucherCode: string | null; estimatedDiscount: number; }) {
  const { movie, onBack, combosData, selectedSeats, selectedComboIds, selectedPaymentProvider, selectedPaymentGatewayMode, onSelectPaymentProvider, onSelectPaymentGatewayMode, onToggleCombo, customerName, setCustomerName, customerEmail, setCustomerEmail, customerPhone, setCustomerPhone, onConfirm, confirming, vouchers, voucherCode, setVoucherCode, appliedVoucherCode, estimatedDiscount } = props;
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const selectedCombos = combosData.filter((combo) => selectedComboIds.includes(combo.id));
  const subtotal = selectedSeats.reduce((sum, item) => sum + item.price, 0) + selectedCombos.reduce((sum, item) => sum + item.unitPrice, 0);
  const total = Math.max(subtotal - estimatedDiscount, 0);
  const seatLabel = selectedSeats.map((item) => item.seatCode).join(", ") || "Chưa chọn ghế";
  const paymentOptions: Array<{ id: PaymentProvider; label: string; caption: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"] }> = [
    { id: "MOMO", label: "MoMo", caption: "Ví điện tử, xác nhận nhanh", icon: "wallet-outline" },
    { id: "ZALOPAY", label: "ZaloPay", caption: "Thanh toán qua ứng dụng ZaloPay", icon: "alpha-z-circle-outline" },
    { id: "VNPAY", label: "VNPay", caption: "Quét QR hoặc chuyển qua ngân hàng", icon: "bank-outline" },
  ];

  const renderUnderlineField = (label: string, value: string, onChangeText: Setter<string>, placeholder: string, extraProps?: Partial<React.ComponentProps<typeof TextInput>>) => (
    <View style={{ gap: 8 }}>
      <Text style={{ color: palette.muted, fontSize: 11, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.26)"
        style={{ color: palette.text, fontSize: 16, fontWeight: "700", paddingHorizontal: 0, paddingVertical: 4 }}
        {...extraProps}
      />
      <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.12)" }} />
    </View>
  );

  return (
    <View style={styles.screenShell}>
      <Animated.ScrollView
        contentContainerStyle={[styles.scrollContent, styles.stickyScrollContent]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        <Pressable onPress={onBack}>
          <Text style={styles.backLink}>← Quay lại</Text>
        </Pressable>

        <View style={{ gap: 6 }}>
          <Text style={styles.eyebrow}>THANH TOÁN</Text>
          <Text style={styles.detailTitle}>Xác nhận đơn đặt vé</Text>
          <Text style={styles.detailMeta}>{movie.title} • {seatLabel}</Text>
        </View>

        <View style={{ flexDirection: "row", gap: 14, borderRadius: 24, padding: 16, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          <View style={{ width: 96, height: 132, borderRadius: 18, overflow: "hidden", backgroundColor: movie.tone || palette.panel }}>
            <MediaAsset uri={movie.posterUrl} style={{ width: "100%", height: "100%" }} />
          </View>
          <View style={{ flex: 1, gap: 8, justifyContent: "space-between" }}>
            <View style={{ gap: 6 }}>
              <Text style={{ color: palette.text, fontSize: 18, fontWeight: "900", lineHeight: 22 }}>{movie.title}</Text>
              <Text style={{ color: palette.muted, lineHeight: 19 }}>Ghế: {seatLabel}</Text>
              <Text style={{ color: palette.muted, lineHeight: 19 }}>Combo đã chọn: {selectedCombos.length}</Text>
              <Text style={{ color: palette.muted, lineHeight: 19 }}>Cổng thanh toán: {selectedPaymentProvider}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(195,13,18,0.16)" }}>
                <Text style={{ color: "#fff2ed", fontSize: 11, fontWeight: "900" }}>{selectedSeats.length} ghế</Text>
              </View>
              <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(255,207,106,0.12)" }}>
                <Text style={{ color: palette.amber, fontSize: 11, fontWeight: "900" }}>{selectedCombos.length} combo</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.accountRow, { gap: 14 }]}> 
          <Text style={styles.accountTitle}>Thông tin liên hệ</Text>
          {renderUnderlineField("Họ và tên", customerName, setCustomerName, "Nhập họ tên người nhận vé")}
          {renderUnderlineField("Email", customerEmail, setCustomerEmail, "email@domain.com", { autoCapitalize: "none", keyboardType: "email-address" })}
          {renderUnderlineField("Số điện thoại", customerPhone, setCustomerPhone, "Nhập số điện thoại", { keyboardType: "phone-pad" })}
        </View>

        <View style={{ gap: 12 }}>
          <SectionHeader title="Combo ưu đãi" action="Chọn thêm" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {combosData.map((combo, index) => {
              const active = selectedComboIds.includes(combo.id);
              return (
                <Pressable
                  key={combo.id}
                  style={{
                    width: "48%",
                    minHeight: 164,
                    borderRadius: 22,
                    padding: 14,
                    backgroundColor: active ? "rgba(195,13,18,0.16)" : "rgba(255,255,255,0.03)",
                    borderWidth: 1,
                    borderColor: active ? "rgba(255,219,214,0.22)" : "rgba(255,255,255,0.08)",
                    gap: 12,
                  }}
                  onPress={() => onToggleCombo(combo.id)}
                >
                  <LinearGradient colors={index % 2 === 0 ? ["#5b1014", "#251313"] : ["#6e4a0b", "#2a1708"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 82, borderRadius: 16, alignItems: "center", justifyContent: "center" }}>
                    <MaterialCommunityIcons name={index % 2 === 0 ? "popcorn" : "cup"} size={28} color="#fff4ea" />
                  </LinearGradient>
                  <View style={{ gap: 4, flex: 1 }}>
                    <Text style={{ color: palette.text, fontSize: 15, fontWeight: "900" }}>{combo.name}</Text>
                    <Text style={{ color: palette.muted, fontSize: 12, lineHeight: 18 }}>{combo.detail}</Text>
                  </View>
                  <Text style={{ color: palette.amber, fontSize: 14, fontWeight: "900" }}>{combo.price}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.accountRow, { gap: 12 }]}> 
          <Text style={styles.accountTitle}>Voucher</Text>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <TextInput
              value={voucherCode}
              onChangeText={setVoucherCode}
              placeholder="Nhập mã voucher"
              placeholderTextColor={palette.muted}
              style={{ flex: 1, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", color: palette.text, paddingHorizontal: 14, paddingVertical: 12 }}
              autoCapitalize="characters"
            />
            <Pressable
              onPress={() => setVoucherCode(voucherCode.trim().toUpperCase())}
              style={{ paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, backgroundColor: "rgba(195,13,18,0.9)" }}
            >
              <Text style={{ color: "#fff7f3", fontSize: 12, fontWeight: "900" }}>Đổi mã</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {vouchers.slice(0, 8).map((voucher) => (
              <Pressable key={voucher.code} style={[styles.paymentMethod, voucherCode === voucher.code && styles.paymentMethodActive]} onPress={() => setVoucherCode(voucher.code)}>
                <Text style={[styles.paymentMethodText, voucherCode === voucher.code && styles.paymentMethodTextActive]}>{voucher.code}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={styles.accountDetail}>{appliedVoucherCode ? `Đang áp dụng ${appliedVoucherCode}, giảm khoảng ${formatCurrency(estimatedDiscount)}.` : "Chọn voucher nếu bạn có ưu đãi."}</Text>
        </View>

        <View style={{ gap: 12 }}>
          <SectionHeader title="Phương thức thanh toán" action="Radio + logo" />
          <View style={{ gap: 10 }}>
            {paymentOptions.map((option) => {
              const active = selectedPaymentProvider === option.id;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => onSelectPaymentProvider(option.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 14,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: active ? "rgba(255,240,236,0.24)" : "rgba(255,255,255,0.08)",
                    backgroundColor: active ? "rgba(195,13,18,0.14)" : "rgba(255,255,255,0.03)",
                  }}
                >
                  <View style={{ width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)" }}>
                    <MaterialCommunityIcons name={option.icon} size={22} color={active ? "#fff6f0" : palette.text} />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: palette.text, fontSize: 15, fontWeight: "900" }}>{option.label}</Text>
                    <Text style={{ color: palette.muted, fontSize: 12 }}>{option.caption}</Text>
                  </View>
                  <View style={{ width: 22, height: 22, borderRadius: 999, borderWidth: 2, borderColor: active ? "#fff1ea" : "rgba(255,255,255,0.24)", alignItems: "center", justifyContent: "center" }}>
                    {active ? <View style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: "#fff1ea" }} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.accountRow, { gap: 10 }]}> 
          <Text style={styles.accountTitle}>Môi trường cổng thanh toán</Text>
          <View style={styles.paymentWrap}>
            {[ ["SANDBOX", "Thử nghiệm"], ["REAL", "Thực tế"] ].map(([id, label]) => (
              <Pressable key={id} style={[styles.paymentMethod, selectedPaymentGatewayMode === id && styles.paymentMethodActive]} onPress={() => onSelectPaymentGatewayMode(id as "SANDBOX" | "REAL")}>
                <Text style={[styles.paymentMethodText, selectedPaymentGatewayMode === id && styles.paymentMethodTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[styles.accountRow, { gap: 12 }]}> 
          <Text style={styles.accountTitle}>Chi tiết thanh toán</Text>
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.accountDetail}>Tiền ghế</Text>
              <Text style={{ color: palette.text, fontWeight: "800" }}>{formatCurrency(selectedSeats.reduce((sum, item) => sum + item.price, 0))}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.accountDetail}>Combo</Text>
              <Text style={{ color: palette.text, fontWeight: "800" }}>{formatCurrency(selectedCombos.reduce((sum, item) => sum + item.unitPrice, 0))}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.accountDetail}>Giảm giá voucher</Text>
              <Text style={{ color: estimatedDiscount > 0 ? palette.amber : palette.muted, fontWeight: "800" }}>{estimatedDiscount > 0 ? `- ${formatCurrency(estimatedDiscount)}` : formatCurrency(0)}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.08)" }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: palette.text, fontSize: 16, fontWeight: "900" }}>Tổng cộng</Text>
              <Text style={{ color: palette.text, fontSize: 24, fontWeight: "900" }}>{formatCurrency(total)}</Text>
            </View>
          </View>
        </View>
      </Animated.ScrollView>
      <View style={styles.stickyFooterWrap}>
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(255,255,255,0.18)", "rgba(255,255,255,0.06)", "rgba(255,255,255,0)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.stickyFooterTopGlow}
        />
<View style={styles.stickyFooter}>
          <View pointerEvents="none" style={styles.stickyFooterInnerHighlight} />
          <Animated.View
            pointerEvents="none"
            style={[styles.stickyFooterNoise, { transform: [{ translateY: scrollY.interpolate({ inputRange: [0, 320], outputRange: [0, -6], extrapolate: "clamp" }) }] }]}
          >
            {glassNoiseDots.map((dot, index) => (
              <View
                key={`checkout-noise-${index}`}
                style={[
                  styles.stickyFooterNoiseDot,
                  { left: dot.left, top: dot.top, width: dot.size, height: dot.size, opacity: dot.opacity },
                ]}
              />
            ))}
            {glassNoiseDots.map((dot, index) => (
              <View
                key={`checkout-noise-dark-${index}`}
                style={[
                  styles.stickyFooterNoiseDotDark,
                  { left: dot.left, top: dot.top + 8, width: dot.size + 0.4, height: dot.size + 0.4, opacity: dot.opacity * 0.55 },
                ]}
              />
            ))}
          </Animated.View>
          <View style={styles.stickySummaryMain}>
            <Text style={styles.summaryLabel}>Điều khoản</Text>
            <Text style={styles.stickyPrimaryValue}>{formatCurrency(total)}</Text>
            <Text style={styles.stickySecondaryValue}>Bằng việc thanh toán, bạn đồng ý nhận vé điện tử qua email và số điện thoại đã nhập.</Text>
          </View>
          <View style={styles.stickyActionBlock}>
            <NeonButton label={`Thanh toán với ${selectedPaymentProvider}`} onPress={onConfirm} loading={confirming} />
          </View>
</View>
      </View>
    </View>
  );
}
export function TicketDetailScreen({ ticket, onBack, onScheduleReminder, onCancelReminder, reminderLoading = null }: { ticket: TicketDetail; onBack: () => void; onScheduleReminder: () => void; onCancelReminder: () => void; reminderLoading?: "schedule" | "cancel" | null; }) {
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
          <NeonButton label="Nhắc trước 1 giờ" variant="secondary" onPress={onScheduleReminder} loading={reminderLoading === "schedule"} />
          <NeonButton label="Hủy nhắc" variant="secondary" onPress={onCancelReminder} loading={reminderLoading === "cancel"} />
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







