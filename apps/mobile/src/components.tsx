import React from "react";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import { ActivityIndicator, Animated, Easing, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SvgUri } from "react-native-svg";
import { WebView } from "react-native-webview";
import { palette, styles } from "./theme";
import { AssistantMessage, Banner, ComboItem, Movie, PaymentProvider, ProfileData, ReminderItem, SeatMapRow, SeatSelection, Setter, SessionUser, ShowtimeItem, TicketDetail, TicketItem, ToastKind, ToastTone, Voucher } from "./types";

const formatCurrency = (value: number) => `${value.toLocaleString("vi-VN")}Ä‘`;

function isSvgAsset(uri?: string | null) {
  return Boolean(uri && /\.svg(?:\?|#|$)/i.test(uri));
}

function MediaAsset({ uri, style, resizeMode = "cover" }: { uri?: string | null; style: any; resizeMode?: "cover" | "contain" | "stretch" | "center" }) {
  if (!uri) return null;
  if (isSvgAsset(uri)) {
    return (
      <SvgUri
        uri={uri}
        width="100%"
        height="100%"
        preserveAspectRatio={resizeMode === "contain" ? "xMidYMid meet" : "xMidYMid slice"}
        style={style}
      />
    );
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
  return `${date.toLocaleDateString("vi-VN")} â€¢ ${date.toLocaleTimeString("vi-VN", {
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
    return "NgÃ y";
  }
  return date.toLocaleDateString("vi-VN", { weekday: "short" });
};

const formatRelativeShowtimeLabel = (value: string, now: number) => {
  const date = new Date(value);
  const today = new Date(now);
  if (Number.isNaN(date.getTime()) || Number.isNaN(today.getTime())) {
    return "Lá»‹ch chiáº¿u";
  }

  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const diffDays = Math.round((startOfDate - startOfToday) / 86400000);

  if (diffDays === 0) return "HÃ´m nay";
  if (diffDays === 1) return "NgÃ y mai";
  return "Lá»‹ch chiáº¿u";
};

const showtimeBucketLabel = (startTime: string) => {
  const hour = Number(String(startTime).slice(11, 13));
  if (hour < 12) return "SÃ¡ng";
  if (hour < 18) return "Chiá»u";
  return "Tá»‘i";
};

const getSeatAvailabilityMeta = (availableSeats: number, totalSeats: number) => {
  if (totalSeats <= 0 || availableSeats <= 0) {
    return { label: "Gáº§n kÃ­n", tone: "critical" as const };
  }

  const ratio = availableSeats / totalSeats;
  if (ratio <= 0.2) {
    return { label: "Gáº§n kÃ­n", tone: "critical" as const };
  }
  if (ratio <= 0.45) {
    return { label: "Sáº¯p háº¿t", tone: "warning" as const };
  }
  return { label: "CÃ²n nhiá»u", tone: "good" as const };
};

const mapBookingStatus = (status: string) => {
  switch (status) {
    case "PAID":
      return "ÄÃ£ thanh toÃ¡n";
    case "PENDING":
      return "Chá» thanh toÃ¡n";
    case "CANCELLED":
      return "ÄÃ£ há»§y";
    default:
      return status;
  }
};

const mapCheckinStatus = (status?: string | null) => {
  switch (status) {
    case "CHECKED_IN":
      return "ÄÃ£ check-in";
    case "NOT_CHECKED_IN":
      return "ChÆ°a check-in";
    default:
      return status ?? "ChÆ°a check-in";
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
    return "Háº¿t giá»";
  }
  if (diffMs < 60000) {
    return "Äang vÃ o ráº¡p";
  }
  const minutes = Math.max(1, Math.ceil(diffMs / 60000));
  if (minutes <= 3) {
    return "Sáº¯p báº¯t Ä‘áº§u";
  }
  return `Báº¯t Ä‘áº§u sau ${minutes} phÃºt`;
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
        <Text style={styles.accountTitle}>ChÆ°a cÃ³ trailer</Text>
        <Text style={styles.accountDetail}>Phim nÃ y hiá»‡n chÆ°a cÃ³ link trailer Ä‘á»ƒ phÃ¡t trong app.</Text>
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
          <Text style={styles.trailerPosterHint}>Báº¥m Ä‘á»ƒ phÃ¡t trailer</Text>
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
            <Text style={styles.trailerLoadingText}>{loadProgress > 0 ? `Äang táº£i ${loadProgress}%` : "Äang táº£i trailer"}</Text>
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
          <Text style={styles.trailerLoadingText}>{`Äang táº£i ${Math.max(loadProgress, 12)}%`}</Text>
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

const toastToneLabel = (tone: ToastTone) => (tone === "success" ? "HoÃ n táº¥t" : tone === "error" ? "Lá»—i" : "ThÃ´ng bÃ¡o");

const toastKindMeta: Record<ToastKind, { label: string; outlineIcon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; filledIcon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; color: string; bg: string }> = {
  ticket: { label: "VÃ©", outlineIcon: "ticket-confirmation-outline", filledIcon: "ticket-confirmation", color: palette.amber, bg: "rgba(255,207,106,0.14)" },
  favorite: { label: "YÃªu thÃ­ch", outlineIcon: "heart-outline", filledIcon: "heart", color: "#ff88a4", bg: "rgba(201,63,98,0.16)" },
  seat: { label: "Gháº¿", outlineIcon: "sofa-single-outline", filledIcon: "sofa-single", color: palette.cyan, bg: "rgba(115,246,221,0.14)" },
  payment: { label: "Thanh toÃ¡n", outlineIcon: "credit-card-outline", filledIcon: "credit-card", color: "#9cc7ff", bg: "rgba(98,141,235,0.16)" },
  reminder: { label: "Nháº¯c lá»‹ch", outlineIcon: "bell-outline", filledIcon: "bell", color: "#ffd88d", bg: "rgba(255,184,72,0.16)" },
  auth: { label: "TÃ i khoáº£n", outlineIcon: "account-circle-outline", filledIcon: "account-circle", color: "#d7b8ff", bg: "rgba(147,51,234,0.18)" },
  system: { label: "Há»‡ thá»‘ng", outlineIcon: "information-outline", filledIcon: "information", color: palette.text, bg: "rgba(255,255,255,0.08)" },
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
          {!compact ? <Text style={styles.movieStateBadgeText}>YÃªu thÃ­ch</Text> : null}
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
      <StaggerSection index={0}>
        <View style={[styles.heroCard, { backgroundColor: heroMovie.tone }]}>
        <MediaAsset uri={heroMovie.bannerUrl} style={styles.heroImage} />
        <View style={styles.heroOverlay} />
        <View style={styles.heroTopLine}>
          <Text style={styles.eyebrow}>Äáº¶T VÃ‰ ÄIá»†N áº¢NH</Text>
          <Text style={styles.heroTag}>Äang má»Ÿ bÃ¡n</Text>
        </View>
        <MovieStateBadges isFavorite={favoriteMovieIds.includes(heroMovie.id)} isInWatchlist={watchlistMovieIds.includes(heroMovie.id)} />
        <View style={styles.heroContent}>
          <Text style={styles.heroKicker}>{heroMovie.badge}</Text>
          <Text style={styles.heroTitle}>{heroMovie.title}</Text>
          <Text style={styles.heroSubline}>{heroMovie.genre} â€¢ {heroMovie.runtime} â€¢ IMDb {heroMovie.score}</Text>
          <Text style={styles.heroBody}>{heroMovie.description}</Text>
        </View>
        <View style={styles.heroMetrics}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Suáº¥t ná»•i báº­t</Text>
            <Text style={styles.metricValue}>20:45</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Äá»‹nh dáº¡ng</Text>
            <Text style={styles.metricValue}>IMAX</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>GiÃ¡ tá»«</Text>
            <Text style={styles.metricValue}>90.000Ä‘</Text>
          </View>
        </View>
        <View style={styles.heroActions}>
          <NeonButton label="Äáº·t vÃ© ngay" onPress={() => onSeatPress(heroMovie)} loading={loadingSeatMovieId === heroMovie.id} />
          <NeonButton label="Xem chi tiáº¿t" variant="secondary" onPress={() => openMovieFromHome(heroMovie)} />
        </View>
        </View>
      </StaggerSection>

      <StaggerSection index={1}>
        <View style={styles.quickStrip}>
          <BlurView intensity={30} tint="dark" style={styles.quickStripItemWrap}>
            <View style={styles.quickStripItem}>
              <Text style={styles.quickStripLabel}>Äang chiáº¿u</Text>
              <Text style={styles.quickStripValue}>{moviesData.filter((movie) => movie.status !== "COMING_SOON").length}</Text>
            </View>
          </BlurView>
          <BlurView intensity={30} tint="dark" style={styles.quickStripItemWrap}>
            <View style={styles.quickStripItem}>
              <Text style={styles.quickStripLabel}>Sáº¯p chiáº¿u</Text>
              <Text style={styles.quickStripValue}>{moviesData.filter((movie) => movie.status === "COMING_SOON").length}</Text>
            </View>
          </BlurView>
          <BlurView intensity={30} tint="dark" style={styles.quickStripItemWrap}>
            <View style={styles.quickStripItem}>
              <Text style={styles.quickStripLabel}>Thanh toÃ¡n</Text>
              <Text style={styles.quickStripValue}>MoMo â€¢ ZaloPay</Text>
            </View>
          </BlurView>
        </View>
      </StaggerSection>

      {featuredBanner ? (
        <StaggerSection index={2}>
          <MediaBackground uri={featuredBanner.imageUrl} mediaStyle={styles.bannerImage} style={[styles.bannerCard, { backgroundColor: featuredBanner.accent }]}>
            <View style={styles.bannerOverlay} />
            <Text style={styles.bannerEyebrow}>{featuredBanner.eyebrow}</Text>
            <Text style={styles.bannerTitle}>{featuredBanner.title}</Text>
            <Text style={styles.bannerText}>{featuredBanner.text}</Text>
          </MediaBackground>
        </StaggerSection>
      ) : null}

      <StaggerSection index={3}>
        <SectionHeader title="Äang chiáº¿u" action="Chá»n phim" />
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
                <BlurView intensity={25} tint="dark" style={styles.posterBadgeWrap}>
                  <Text style={styles.posterBadge}>{movie.badge}</Text>
                </BlurView>
                <MovieStateBadges isFavorite={isFavorite} isInWatchlist={isInWatchlist} compact />
              </View>
            </MediaBackground>
            <Text style={styles.movieTitle}>{movie.title}</Text>
            <Text style={styles.movieMeta}>{movie.genre} â€¢ {movie.runtime}</Text>
            <View style={styles.movieFooter}>
              <Text style={styles.movieScore}>IMDb {movie.score}</Text>
              <Text style={styles.movieAction}>Chi tiáº¿t</Text>
            </View>
          </Pressable>
        )})}
        </ScrollView>
      </StaggerSection>

      {nowShowingExtended.length > 0 ? (
        <StaggerSection index={4}>
          <SectionHeader title="LÆ°á»›t thÃªm" action={`${nowShowing.length} phim`} />
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
                  <Text style={styles.rankRevenue}>{movie.genre} â€¢ {movie.runtime} â€¢ IMDb {movie.score}</Text>
                </View>
                <Text style={styles.rankActionText}>Má»Ÿ</Text>
              </Pressable>
            )})}
          </View>
        </StaggerSection>
      ) : null}

      {hotToday.length > 0 ? (
        <StaggerSection index={5}>
          <SectionHeader title="Top Ä‘áº·t nhiá»u hÃ´m nay" action="Æ¯u tiÃªn gháº¿ Ä‘áº¹p" />
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
                  <Text style={styles.rankRevenue}>{movie.genre} â€¢ {movie.runtime} â€¢ IMDb {movie.score}</Text>
                </View>
                {loadingSeatMovieId === movie.id ? <ActivityIndicator size="small" color={palette.cyan} /> : <Text style={styles.rankActionText}>Äáº·t</Text>}
              </Pressable>
            )})}
          </View>
        </StaggerSection>
      ) : null}

      {genrePicks.length > 0 ? (
        <StaggerSection index={6}>
          <SectionHeader title="Phim theo gu" action="Grid 2 cá»™t" />
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
                    <BlurView intensity={25} tint="dark" style={styles.posterBadgeWrap}>
                      <Text style={styles.posterBadge}>{movie.badge}</Text>
                    </BlurView>
                    <MovieStateBadges isFavorite={isFavorite} isInWatchlist={isInWatchlist} compact />
                  </View>
                </MediaBackground>
                <View style={styles.homeGridBody}>
                  <Text style={styles.homeGridTitle}>{movie.title}</Text>
                  <Text style={styles.homeGridMeta}>{movie.genre}</Text>
                  <Text style={styles.homeGridMeta}>{movie.runtime} â€¢ IMDb {movie.score}</Text>
                  <View style={styles.homeGridFooter}>
                    <Text style={styles.movieScore}>Hot</Text>
                    <Text style={styles.homeGridAction}>Xem nhanh</Text>
                  </View>
                </View>
              </Pressable>
            )})}
          </View>
        </StaggerSection>
      ) : null}

      {comingSoon.length > 0 ? (
        <StaggerSection index={7}>
          <SectionHeader title="Sáº¯p chiáº¿u" action="Theo dÃµi" />
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
                  <Text style={styles.rankRevenue}>{movie.genre} â€¢ {movie.runtime}</Text>
                </View>
                <Text style={styles.rankActionText}>Xem</Text>
              </Pressable>
            )})}
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
      <StaggerSection index={0}>
        <View style={styles.exploreHero}>
          <Text style={styles.eyebrow}>KHÃM PHÃ</Text>
          <Text style={styles.sectionTitle}>TÃ¬m phim theo ráº¡p, thá»ƒ loáº¡i vÃ  khung giá».</Text>
          <Text style={styles.accountDetail}>Bá»™ lá»c ngáº¯n gá»n hÆ¡n Ä‘á»ƒ giá»‘ng tráº£i nghiá»‡m sáº£n pháº©m tháº­t.</Text>
        </View>
      </StaggerSection>

      <StaggerSection index={1}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {[["ALL", "Táº¥t cáº£"], ["NOW_SHOWING", "Äang chiáº¿u"], ["COMING_SOON", "Sáº¯p chiáº¿u"]].map(([id, label]) => (
          <Pressable key={id} style={[styles.paymentMethod, statusFilter === id && styles.paymentMethodActive]} onPress={() => setStatusFilter(id)}>
            <Text style={[styles.paymentMethodText, statusFilter === id && styles.paymentMethodTextActive]}>{label}</Text>
          </Pressable>
        ))}
        </ScrollView>
      </StaggerSection>

      <StaggerSection index={2}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {["ALL", ...cinemaOptions].map((cinema) => (
          <Pressable key={cinema} style={[styles.paymentMethod, cinemaFilter === cinema && styles.paymentMethodActive]} onPress={() => setCinemaFilter(cinema)}>
            <Text style={[styles.paymentMethodText, cinemaFilter === cinema && styles.paymentMethodTextActive]}>{cinema === "ALL" ? "Táº¥t cáº£ ráº¡p" : cinema}</Text>
          </Pressable>
        ))}
        </ScrollView>
      </StaggerSection>

      <StaggerSection index={3}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {["ALL", ...genreOptions].map((genre) => (
          <Pressable key={genre} style={[styles.paymentMethod, genreFilter === genre && styles.paymentMethodActive]} onPress={() => setGenreFilter(genre)}>
            <Text style={[styles.paymentMethodText, genreFilter === genre && styles.paymentMethodTextActive]}>{genre === "ALL" ? "Táº¥t cáº£ thá»ƒ loáº¡i" : genre}</Text>
          </Pressable>
        ))}
        </ScrollView>
      </StaggerSection>

      <StaggerSection index={4}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {[["ALL", "Má»i giá»"], ["MORNING", "TrÆ°á»›c 12h"], ["AFTERNOON", "12h - 18h"], ["EVENING", "Sau 18h"]].map(([id, label]) => (
          <Pressable key={id} style={[styles.paymentMethod, hourFilter === id && styles.paymentMethodActive]} onPress={() => setHourFilter(id)}>
            <Text style={[styles.paymentMethodText, hourFilter === id && styles.paymentMethodTextActive]}>{label}</Text>
          </Pressable>
        ))}
        </ScrollView>
      </StaggerSection>

      <StaggerSection index={5}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {[["ALL", "Táº¥t cáº£ phim"], ["ONLY", "ÄÃ£ yÃªu thÃ­ch"]].map(([id, label]) => (
          <Pressable key={`favorite-${id}`} style={[styles.paymentMethod, favoriteFilter === id && styles.paymentMethodActive]} onPress={() => setFavoriteFilter(id as "ALL" | "ONLY")}>
            <Text style={[styles.paymentMethodText, favoriteFilter === id && styles.paymentMethodTextActive]}>{label}</Text>
          </Pressable>
        ))}
        {[["ALL", "Táº¥t cáº£ lÆ°u"], ["ONLY", "ÄÃ£ lÆ°u xem sau"]].map(([id, label]) => (
          <Pressable key={`watchlist-${id}`} style={[styles.paymentMethod, watchlistFilter === id && styles.paymentMethodActive]} onPress={() => setWatchlistFilter(id as "ALL" | "ONLY")}>
            <Text style={[styles.paymentMethodText, watchlistFilter === id && styles.paymentMethodTextActive]}>{label}</Text>
          </Pressable>
        ))}
        </ScrollView>
      </StaggerSection>

      {moviesData.length === 0 ? (
        <StaggerSection index={6}>
          <View style={styles.accountRow}>
            <Text style={styles.accountTitle}>KhÃ´ng cÃ³ phim phÃ¹ há»£p</Text>
            <Text style={styles.accountDetail}>HÃ£y Ä‘á»•i bá»™ lá»c Ä‘á»ƒ xem thÃªm lá»‹ch chiáº¿u.</Text>
          </View>
        </StaggerSection>
      ) : null}

      <StaggerSection index={7}>
        {moviesData.map((movie) => {
          const isFavorite = favoriteMovieIds.includes(movie.id);
          const isInWatchlist = watchlistMovieIds.includes(movie.id);
          return (
          <Pressable key={`explore-${movie.id}`} style={[styles.exploreCard, getSavedMovieCardStyle(isFavorite, isInWatchlist)]} onPress={() => onMoviePress(movie)}>
            <View style={[styles.explorePoster, { backgroundColor: movie.tone }]}>
              <MediaAsset uri={movie.posterUrl} style={styles.explorePosterImage} />
              <View style={styles.explorePosterOverlay}>
                <MovieStateBadges isFavorite={isFavorite} isInWatchlist={isInWatchlist} compact />
              </View>
            </View>
            <View style={styles.exploreBody}>
              <Text style={styles.exploreBadge}>{movie.badge}</Text>
              <Text style={styles.exploreTitle}>{movie.title}</Text>
              <Text style={styles.exploreMeta}>{movie.genre} â€¢ {movie.runtime} â€¢ IMDb {movie.score}</Text>
              <Text style={styles.exploreDescription}>{movie.description}</Text>
            </View>
          </Pressable>
        )})}
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
                <Pressable key={ticket.id} style={getTicketShellStyle(ticket.status)} onPress={() => onTicketPress(ticket)}>
                  <View style={[styles.ticketPosterWrap, { backgroundColor: movie.tone }]}> 
                    <MediaAsset uri={movie.posterUrl} style={styles.ticketPosterImage} />
                    <View style={styles.ticketFormatBadge}>
                      <Text style={styles.ticketFormatBadgeText}>{movie.badge || "2D"}</Text>
                    </View>
                  </View>

                  <View style={styles.ticketBody}>
                    <View style={styles.ticketBodyTop}>
                      <Text style={styles.ticketTitle}>{ticket.movie}</Text>
                      <View style={styles.ticketMetaRow}>
                        <MaterialCommunityIcons name="map-marker-radius-outline" size={14} color={palette.muted} />
                        <Text style={styles.ticketMetaText}>{ticket.cinema}</Text>
                      </View>
                      <View style={styles.ticketMetaRow}>
                        <MaterialCommunityIcons name="clock-outline" size={14} color={palette.muted} />
                        <Text style={styles.ticketMetaText}>{formatDateTime(ticket.time)}</Text>
                      </View>
                      <View style={styles.ticketMetaRow}>
                        <MaterialCommunityIcons name="sofa-single-outline" size={14} color={palette.muted} />
                        <Text style={styles.ticketSeatText}>{ticket.seat}</Text>
                      </View>
                      <Text style={styles.ticketInfoCode}>Mã vé {ticket.bookingCode}</Text>
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
      eyebrow: "Äáº¶T VÃ‰ THÃ”NG MINH",
      title: "Chá»n phim nhanh, giá»¯ gháº¿ Ä‘áº¹p vÃ  quay láº¡i Ä‘Ãºng bÆ°á»›c Ä‘ang xem.",
      body: "App ghi nhá»› luá»“ng Ä‘ang má»Ÿ Ä‘á»ƒ tráº£i nghiá»‡m giá»‘ng sáº£n pháº©m tháº­t, khÃ´ng cÃ²n cáº£m giÃ¡c demo.",
      chips: ["Giá»¯ gháº¿ theo thá»i gian thá»±c", "Back Android Ä‘Ãºng luá»“ng"],
    },
    {
      eyebrow: "VÃ‰ VÃ€ NHáº®C Lá»ŠCH",
      title: "ToÃ n bá»™ vÃ©, QR vÃ  lá»‹ch nháº¯c Ä‘Æ°á»£c gom vÃ o má»™t nÆ¡i dá»… quÃ©t.",
      body: "Báº¡n cÃ³ thá»ƒ má»Ÿ láº¡i vÃ©, theo dÃµi tráº¡ng thÃ¡i thanh toÃ¡n vÃ  nháº­n nháº¯c lá»‹ch trÆ°á»›c giá» chiáº¿u.",
      chips: ["VÃ© Ä‘á»“ng bá»™", "Nháº¯c lá»‹ch tá»± Ä‘á»™ng"],
    },
    {
      eyebrow: "PHIÃŠN CÃ NHÃ‚N",
      title: "ÄÄƒng nháº­p má»™t láº§n, má»Ÿ láº¡i app váº«n vÃ o tháº³ng tráº£i nghiá»‡m cá»§a báº¡n.",
      body: "PhiÃªn Ä‘Æ°á»£c lÆ°u an toÃ n báº±ng Secure Store Ä‘á»ƒ dÃ¹ng tá»‘t hÆ¡n cho mÃ´i trÆ°á»ng production.",
      chips: ["Secure Store", "Æ¯u Ä‘Ã£i cÃ¡ nhÃ¢n"],
    },
  ] as const;
  const [onboardingStep, setOnboardingStep] = React.useState(initialStep);
  const inAuthForm = onboardingStep >= slides.length;
  const currentSlide = slides[Math.min(onboardingStep, slides.length - 1)];

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {onBack ? (
        <Pressable onPress={onBack}>
          <Text style={styles.backLink}>â† Quay láº¡i</Text>
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
              <Text style={styles.authLink}>Bá» qua</Text>
            </Pressable>
            <NeonButton label={onboardingStep === slides.length - 1 ? "Báº¯t Ä‘áº§u" : "Tiáº¿p theo"} onPress={() => setOnboardingStep((step) => Math.min(step + 1, slides.length))} />
          </View>
        </>
      ) : (
        <>
          <View style={styles.authHero}>
            <Text style={styles.eyebrow}>Sáº´N SÃ€NG ÄÄ‚NG NHáº¬P</Text>
            <Text style={styles.authTitle}>ÄÄƒng nháº­p Ä‘á»ƒ Ä‘á»“ng bá»™ vÃ©, gháº¿ Ä‘Ã£ giá»¯ vÃ  lá»‹ch nháº¯c trÃªn thiáº¿t bá»‹ cá»§a báº¡n.</Text>
            <Text style={styles.authBody}>Má»i giao dá»‹ch, mÃ£ QR vÃ  Æ°u Ä‘Ã£i sáº½ Ä‘Æ°á»£c giá»¯ láº¡i khi báº¡n má»Ÿ app láº§n sau.</Text>
          </View>

          <View style={styles.authCard}>
            <Text style={styles.accountTitle}>Báº¯t Ä‘áº§u</Text>
            {helperMessage ? <Text style={styles.accountDetail}>{helperMessage}</Text> : null}
            <Text style={styles.accountDetail}>Táº¡o tÃ i khoáº£n má»›i hoáº·c Ä‘Äƒng nháº­p Ä‘á»ƒ vÃ o tráº£i nghiá»‡m Ä‘áº·t vÃ© Ä‘áº§y Ä‘á»§.</Text>
            <Pressable style={styles.googleButton} onPress={onGoogleAuth}>
              <MaterialCommunityIcons name="google" size={18} color="#ffffff" />
              <Text style={styles.googleButtonText}>Tiáº¿p tá»¥c vá»›i Google</Text>
            </Pressable>
            <Text style={styles.authDivider}>hoáº·c dÃ¹ng email</Text>
            <View style={styles.paymentWrap}>
              {["login", "register"].map((mode) => (
                <Pressable key={mode} style={[styles.paymentMethod, authMode === mode && styles.paymentMethodActive]} onPress={() => setAuthMode(mode as "login" | "register")}>
                  <Text style={[styles.paymentMethodText, authMode === mode && styles.paymentMethodTextActive]}>{mode === "login" ? "ÄÄƒng nháº­p" : "ÄÄƒng kÃ½"}</Text>
                </Pressable>
              ))}
            </View>
            {authMode === "register" ? <TextInput value={authName} onChangeText={setAuthName} placeholder="Há» vÃ  tÃªn" placeholderTextColor={palette.muted} style={styles.input} /> : null}
            <TextInput value={authEmail} onChangeText={setAuthEmail} placeholder="Email" placeholderTextColor={palette.muted} style={styles.input} autoCapitalize="none" />
            {authMode === "register" ? <TextInput value={authPhone} onChangeText={setAuthPhone} placeholder="Sá»‘ Ä‘iá»‡n thoáº¡i" placeholderTextColor={palette.muted} style={styles.input} /> : null}
            <TextInput value={authPassword} onChangeText={setAuthPassword} placeholder="Máº­t kháº©u" placeholderTextColor={palette.muted} style={styles.input} secureTextEntry />
            <NeonButton label={authMode === "login" ? "VÃ o á»©ng dá»¥ng" : "Táº¡o tÃ i khoáº£n"} onPress={onSubmitAuth} loading={authLoading} />
            <Text style={styles.accountDetail}>TÃ i khoáº£n máº«u: `admin@phimbook.local / Admin@123`, `user@phimbook.local / User@123`.</Text>
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

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.profileHero}>
        {profile?.avatarUrl ? <MediaAsset uri={profile.avatarUrl} style={styles.avatar} /> : <View style={styles.avatar} />}
        <View style={styles.profileMetaBlock}>
          <Text style={styles.profileName}>{profile?.fullName ?? sessionUser?.fullName ?? "KhÃ¡ch"}</Text>
          <Text style={styles.profileMail}>{profile?.email ?? sessionUser?.email ?? "ChÆ°a Ä‘Äƒng nháº­p"}</Text>
          <Text style={styles.accountDetail}>{profile?.phone ?? sessionUser?.phone ?? "ÄÄƒng nháº­p Ä‘á»ƒ Ä‘á»“ng bá»™ vÃ©, Æ°u Ä‘Ã£i vÃ  nháº¯c lá»‹ch."}</Text>
        </View>
      </View>

      <View style={styles.accountRow}>
        <Text style={styles.accountTitle}>TÃ i khoáº£n</Text>
        <Text style={styles.accountDetail}>{sessionUser ? `Äang Ä‘Äƒng nháº­p vá»›i vai trÃ² ${sessionUser.role}.` : "ÄÄƒng nháº­p hoáº·c Ä‘Äƒng kÃ½ Ä‘á»ƒ dÃ¹ng dá»¯ liá»‡u cÃ¡ nhÃ¢n vÃ  voucher."}</Text>
        <NeonButton label="ÄÄƒng xuáº¥t" variant="secondary" onPress={onLogout} loading={logoutLoading} />
      </View>

      {profile ? (
        <View style={styles.checkoutSummaryGrid}>
          <View style={styles.checkoutSummaryCell}>
            <Text style={styles.summaryLabel}>YÃªu thÃ­ch</Text>
            <Text style={styles.summaryValue}>{profile.stats.favorites}</Text>
          </View>
          <View style={styles.checkoutSummaryCell}>
            <Text style={styles.summaryLabel}>Xem sau</Text>
            <Text style={styles.summaryValue}>{profile.stats.watchlist}</Text>
          </View>
          <View style={styles.checkoutSummaryCell}>
            <Text style={styles.summaryLabel}>VÃ© Ä‘Ã£ Ä‘áº·t</Text>
            <Text style={styles.summaryValue}>{profile.stats.bookings}</Text>
          </View>
        </View>
      ) : null}

      {profile ? (
        <View style={styles.accountRow}>
          <Text style={styles.accountTitle}>Chi tiÃªu tÃ­ch lÅ©y</Text>
          <Text style={styles.summaryValue}>{formatCurrency(profile.stats.spending)}</Text>
          <Text style={styles.accountDetail}>Theo dÃµi tá»•ng chi tiÃªu Ä‘á»ƒ tá»‘i Æ°u voucher vÃ  lá»‹ch xem phim.</Text>
        </View>
      ) : null}

      <View style={styles.accountRow}>
        <Text style={styles.accountTitle}>Nháº¯c lá»‹ch vÃ©</Text>
        {reminders.length === 0 ? <Text style={styles.accountDetail}>ChÆ°a cÃ³ lá»‹ch nháº¯c nÃ o.</Text> : null}
        {reminders.slice(0, 4).map((item, idx) => (
          <View key={`reminder-${item.id}`} style={[styles.activityRow, idx % 2 === 1 && styles.activityRowAlt]}>
            <Text style={styles.activityTitle}>{item.movie_title}</Text>
            <Text style={styles.activityMeta}>{item.cinema_name} â€¢ {formatDateTime(item.start_time)}</Text>
            <Text style={styles.activityTime}>Nháº¯c lÃºc {formatDateTime(item.remind_at)} â€¢ {item.status}</Text>
          </View>
        ))}
      </View>

      <View style={styles.accountRow}>
        <Text style={styles.accountTitle}>Dá»¯ liá»‡u tÃ i khoáº£n</Text>
        <Text style={styles.accountDetail}>Táº£i láº¡i Ä‘á»ƒ Ä‘á»“ng bá»™ vÃ©, Æ°u Ä‘Ã£i vÃ  nháº¯c lá»‹ch má»›i nháº¥t.</Text>
        <NeonButton label="Táº£i láº¡i dá»¯ liá»‡u" onPress={onReload} loading={loading} />
      </View>
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
        <Text style={styles.eyebrow}>THÆ¯ VIá»†N CÃ NHÃ‚N</Text>
        <Text style={styles.authTitle}>{title}</Text>
        <Text style={styles.accountDetail}>{description}</Text>
      </View>

      <View style={styles.accountRow}>
        <Text style={styles.accountTitle}>Danh sÃ¡ch phim</Text>
        <Text style={styles.accountDetail}>
          {movies.length > 0 ? `${movies.length} phim Ä‘ang Ä‘Æ°á»£c lÆ°u trong má»¥c nÃ y.` : emptyMessage}
        </Text>
        <View style={styles.profileMovieList}>
          {movies.map((movie) => (
            <Pressable key={`${title}-${movie.id}`} onPress={() => onMoviePress(movie)} style={styles.profileMovieChip}>
              <MovieStateBadges isFavorite={title === "YÃªu thÃ­ch"} isInWatchlist={title === "Xem sau"} compact />
              <Text style={styles.profileMovieChipText}>{movie.title}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {movies.length > 0 ? (
        <View style={styles.homeGrid}>
          {movies.map((movie) => {
            const isFavorite = title === "YÃªu thÃ­ch";
            const isInWatchlist = title === "Xem sau";
            return (
            <Pressable key={`grid-${title}-${movie.id}`} style={[styles.homeGridCard, getSavedMovieCardStyle(isFavorite, isInWatchlist)]} onPress={() => onMoviePress(movie)}>
              <View style={[styles.homeGridPoster, { backgroundColor: movie.tone }]}>
                <MediaAsset uri={movie.posterUrl} style={styles.homeGridPosterImage} />
                <LinearGradient colors={["transparent", "rgba(10,10,18,0.2)", "rgba(10,10,18,0.85)"]} style={styles.posterGradient} />
                <View style={styles.posterTopRow}>
                  <BlurView intensity={25} tint="dark" style={styles.posterBadgeWrap}>
                    <Text style={styles.posterBadge}>{movie.badge}</Text>
                  </BlurView>
                  <MovieStateBadges isFavorite={isFavorite} isInWatchlist={isInWatchlist} compact />
                </View>
              </View>
              <View style={styles.homeGridBody}>
                <Text style={styles.homeGridTitle}>{movie.title}</Text>
                <Text style={styles.homeGridMeta}>{movie.genre} â€¢ {movie.runtime}</Text>
                <View style={styles.homeGridFooter}>
                  <Text style={styles.movieScore}>IMDb {movie.score}</Text>
                  <Text style={styles.homeGridAction}>Xem chi tiáº¿t</Text>
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
  const { movie, onBack, onBook, showtimesData, isFavorite, isInWatchlist, onToggleFavorite, onToggleWatchlist, favoriteLoading = false, watchlistLoading = false, bookingLoadingMovieId = null, bookingLoadingShowtimeId = null, entrySource = "default" } = props;
  const now = useMinuteNow();
  const headerOpacity = React.useRef(new Animated.Value(0)).current;
  const thumbScale = React.useRef(new Animated.Value(entrySource === "home" ? 0.84 : 0.94)).current;
  const thumbTranslateY = React.useRef(new Animated.Value(entrySource === "home" ? 24 : 12)).current;
  const [trailerVisible, setTrailerVisible] = React.useState(false);
  const dateScrollRef = React.useRef<ScrollView | null>(null);
  const movieShowtimes = showtimesData.filter((item) => item.movieId === movie.id);
  const cinemaOptions = React.useMemo(
    () => Array.from(new Set(movieShowtimes.map((item) => item.cinemaName))).sort((a, b) => a.localeCompare(b, "vi")),
    [movieShowtimes]
  );
  const [selectedCinema, setSelectedCinema] = React.useState<string | null>(null);
  const [selectedDateKey, setSelectedDateKey] = React.useState<string | null>(null);
  const [selectedShowtimeId, setSelectedShowtimeId] = React.useState<number | null>(null);
  const activeShowtimeId = movieShowtimes
    .filter((item) => new Date(item.startTime).getTime() >= now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0]?.id ?? null;
  const featuredShowtime = movieShowtimes.find((item) => item.id === activeShowtimeId) ?? movieShowtimes[0];
  const effectiveCinema = selectedCinema ?? featuredShowtime?.cinemaName ?? cinemaOptions[0] ?? null;
  const cinemaShowtimes = React.useMemo(
    () => movieShowtimes.filter((item) => item.cinemaName === effectiveCinema),
    [effectiveCinema, movieShowtimes]
  );
  const dateOptions = React.useMemo(
    () =>
      Array.from(new Set(cinemaShowtimes.map((item) => toDateKey(item.startTime))))
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime()),
    [cinemaShowtimes]
  );
  const effectiveDateKey = selectedDateKey ?? dateOptions[0] ?? null;
  const filteredShowtimes = React.useMemo(
    () =>
      cinemaShowtimes
        .filter((item) => toDateKey(item.startTime) === effectiveDateKey)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [cinemaShowtimes, effectiveDateKey]
  );
  const groupedShowtimes = React.useMemo(() => {
    const groups: Array<{ label: "SÃ¡ng" | "Chiá»u" | "Tá»‘i"; items: ShowtimeItem[] }> = [
      { label: "SÃ¡ng", items: [] },
      { label: "Chiá»u", items: [] },
      { label: "Tá»‘i", items: [] },
    ];
    for (const item of filteredShowtimes) {
      const label = showtimeBucketLabel(item.startTime) as "SÃ¡ng" | "Chiá»u" | "Tá»‘i";
      groups.find((group) => group.label === label)?.items.push(item);
    }
    return groups.filter((group) => group.items.length > 0);
  }, [filteredShowtimes]);
  const primaryShowtime =
    filteredShowtimes.find((item) => item.id === selectedShowtimeId) ??
    filteredShowtimes.find((item) => new Date(item.startTime).getTime() >= now) ??
    filteredShowtimes[0] ??
    featuredShowtime;
  const trailerUrl = normalizeTrailerUrl(movie.trailerUrl);

  React.useEffect(() => {
    if (!effectiveCinema && cinemaOptions[0]) {
      setSelectedCinema(cinemaOptions[0]);
      return;
    }
    if (effectiveCinema && !cinemaOptions.includes(effectiveCinema)) {
      setSelectedCinema(cinemaOptions[0] ?? null);
    }
  }, [cinemaOptions, effectiveCinema]);

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
    headerOpacity.setValue(0);
    thumbScale.setValue(entrySource === "home" ? 0.84 : 0.94);
    thumbTranslateY.setValue(entrySource === "home" ? 24 : 12);
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: entrySource === "home" ? 260 : 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(thumbScale, {
        toValue: 1,
        tension: entrySource === "home" ? 108 : 90,
        friction: entrySource === "home" ? 13 : 14,
        useNativeDriver: true,
      }),
      Animated.spring(thumbTranslateY, {
        toValue: 0,
        tension: entrySource === "home" ? 108 : 92,
        friction: entrySource === "home" ? 14 : 15,
        useNativeDriver: true,
      }),
    ]).start();
  }, [entrySource, headerOpacity, movie.id, thumbScale, thumbTranslateY]);

  React.useEffect(() => {
    if (!primaryShowtime) {
      setSelectedShowtimeId(null);
      return;
    }
    if (!filteredShowtimes.some((item) => item.id === selectedShowtimeId)) {
      setSelectedShowtimeId(primaryShowtime.id);
    }
  }, [filteredShowtimes, primaryShowtime, selectedShowtimeId]);

  React.useEffect(() => {
    if (!effectiveDateKey || dateOptions.length <= 1) {
      return;
    }
    const selectedIndex = dateOptions.findIndex((item) => item === effectiveDateKey);
    if (selectedIndex < 0) {
      return;
    }
    const estimatedCardWidth = 94;
    dateScrollRef.current?.scrollTo({
      x: Math.max(0, selectedIndex * estimatedCardWidth - 20),
      animated: true,
    });
  }, [dateOptions, effectiveDateKey]);

  return (
    <>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Pressable onPress={onBack}>
          <Text style={styles.backLink}>â† Quay láº¡i</Text>
        </Pressable>

      <Animated.View style={[styles.detailHeaderRow, { opacity: headerOpacity }]}>
        <Animated.View style={[styles.detailThumbWrap, { transform: [{ scale: thumbScale }, { translateY: thumbTranslateY }] }]}>
          {movie.posterUrl ? <MediaAsset uri={movie.posterUrl} style={styles.detailThumbImage} /> : <View style={[styles.detailThumbImage, { backgroundColor: movie.tone }]} />}
        </Animated.View>
        <View style={styles.detailHeaderMeta}>
          <Text style={styles.detailHeaderTitle}>{movie.title}</Text>
          <View style={styles.detailHeaderChips}>
            <Text style={styles.detailHeaderChip}>{movie.status === "COMING_SOON" ? "Sáº¯p chiáº¿u" : "Äang chiáº¿u"}</Text>
            <Text style={styles.detailHeaderChipSecondary}>IMDb {movie.score}</Text>
          </View>
          <Text style={styles.detailHeaderSubline}>{movie.genre} â€¢ {movie.runtime}</Text>
        </View>
      </Animated.View>

      <View style={[styles.detailPoster, { backgroundColor: movie.tone }]}>
        <MediaAsset uri={movie.bannerUrl} style={styles.detailPosterImage} />
        <View style={styles.detailPosterScrim} />
        <BlurView intensity={25} tint="dark" style={styles.posterBadgeWrap}>
          <Text style={styles.posterBadge}>{movie.badge}</Text>
        </BlurView>
        <View style={styles.detailOverlayMeta}>
          <Text style={styles.detailOverlayText}>IMDb {movie.score}</Text>
          <Text style={styles.detailOverlayText}>{movie.status === "COMING_SOON" ? "Sáº¯p chiáº¿u" : "Äang chiáº¿u"}</Text>
        </View>
        <View style={styles.detailMediaBottom}>
          <Pressable style={styles.detailMediaPlay} onPress={() => setTrailerVisible(true)}>
            <MaterialCommunityIcons name="play-circle" size={20} color="#fff4ef" />
            <Text style={styles.detailMediaPlayText}>Trailer</Text>
          </Pressable>
          <View style={styles.detailMediaFacts}>
            <Text style={styles.detailMediaFactText}>{primaryShowtime ? primaryShowtime.startTime.slice(11, 16) : "Cáº­p nháº­t sá»›m"}</Text>
            <Text style={styles.detailMediaFactDivider}>â€¢</Text>
            <Text style={styles.detailMediaFactText}>{primaryShowtime ? primaryShowtime.formatLabel : movie.runtime}</Text>
            <Text style={styles.detailMediaFactDivider}>â€¢</Text>
            <Text style={styles.detailMediaFactText}>{primaryShowtime ? primaryShowtime.languageLabel : movie.genre}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.detailTitle}>{movie.title}</Text>
      <Text style={styles.detailMeta}>{movie.genre} â€¢ {movie.runtime}</Text>
      <Text style={styles.detailDescription}>{movie.description}</Text>

      <View style={styles.detailActionsRow}>
        <Pressable style={[styles.listToggleButton, isFavorite ? styles.listToggleButtonFavoriteOn : styles.listToggleButtonFavoriteOff]} onPress={favoriteLoading ? undefined : onToggleFavorite}>
          {favoriteLoading ? <ActivityIndicator size="small" color="#fff4ef" /> : <MaterialCommunityIcons name={isFavorite ? "heart" : "heart-outline"} size={18} color={isFavorite ? "#ffe8ee" : "#ff9ab3"} />}
          <Text style={[styles.listToggleButtonText, isFavorite ? styles.listToggleButtonTextOn : styles.listToggleButtonTextOff]}>{isFavorite ? "ÄÃ£ yÃªu thÃ­ch" : "ThÃªm yÃªu thÃ­ch"}</Text>
        </Pressable>
        <Pressable style={[styles.listToggleButton, isInWatchlist ? styles.listToggleButtonWatchlistOn : styles.listToggleButtonWatchlistOff]} onPress={watchlistLoading ? undefined : onToggleWatchlist}>
          {watchlistLoading ? <ActivityIndicator size="small" color="#effff9" /> : <MaterialCommunityIcons name={isInWatchlist ? "bookmark" : "bookmark-outline"} size={18} color={isInWatchlist ? "#e2fff6" : "#7df2d9"} />}
          <Text style={[styles.listToggleButtonText, isInWatchlist ? styles.listToggleButtonTextOn : styles.listToggleButtonTextOff]}>{isInWatchlist ? "ÄÃ£ lÆ°u xem sau" : "LÆ°u xem sau"}</Text>
        </Pressable>
      </View>

      <View style={styles.detailStatsRow}>
        <View style={styles.detailStat}>
          <Text style={styles.detailStatLabel}>Tráº¡ng thÃ¡i</Text>
          <Text style={styles.detailStatValue}>{movie.status === "COMING_SOON" ? "Sáº¯p chiáº¿u" : "Äang chiáº¿u"}</Text>
        </View>
        <View style={styles.detailStat}>
          <Text style={styles.detailStatLabel}>ÄÃ¡nh giÃ¡</Text>
          <Text style={styles.detailStatValue}>{movie.score}/10</Text>
        </View>
        <View style={styles.detailStat}>
          <Text style={styles.detailStatLabel}>Thá»i lÆ°á»£ng</Text>
          <Text style={styles.detailStatValue}>{movie.runtime}</Text>
        </View>
      </View>

      <SectionHeader title="Chá»n lá»‹ch chiáº¿u" action={`${movieShowtimes.length} suáº¥t`} />

      <View style={styles.accountRow}>
        <Text style={styles.accountTitle}>1. Chá»n ráº¡p</Text>
        <View style={styles.paymentWrap}>
          {cinemaOptions.map((cinema) => (
            <Pressable key={cinema} style={[styles.paymentMethod, effectiveCinema === cinema && styles.paymentMethodActive]} onPress={() => setSelectedCinema(cinema)}>
              <Text style={[styles.paymentMethodText, effectiveCinema === cinema && styles.paymentMethodTextActive]}>{cinema}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.accountRow}>
        <Text style={styles.accountTitle}>2. Chá»n ngÃ y</Text>
        <ScrollView ref={dateScrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateMiniRow}>
          {dateOptions.map((dateKey) => (
            <Pressable key={dateKey} style={[styles.dateMiniCard, effectiveDateKey === dateKey && styles.dateMiniCardActive]} onPress={() => setSelectedDateKey(dateKey)}>
              <Text style={[styles.dateMiniLabel, effectiveDateKey === dateKey && styles.dateMiniLabelActive]}>{formatRelativeShowtimeLabel(dateKey, now)}</Text>
              <Text style={[styles.dateMiniWeekday, effectiveDateKey === dateKey && styles.dateMiniTextActive]}>{formatShowtimeWeekday(dateKey)}</Text>
              <Text style={[styles.dateMiniDay, effectiveDateKey === dateKey && styles.dateMiniTextActive]}>{formatShowtimeDayNumber(dateKey)}</Text>
              <Text style={[styles.dateMiniMonth, effectiveDateKey === dateKey && styles.dateMiniTextActive]}>{formatShowtimeDateLabel(dateKey)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.accountRow}>
        <Text style={styles.accountTitle}>3. Chá»n khung giá»</Text>
        <Text style={styles.accountDetail}>
          {effectiveCinema && effectiveDateKey ? `${effectiveCinema} â€¢ ${formatShowtimeDateLabel(effectiveDateKey)}` : "Chá»n ráº¡p vÃ  ngÃ y Ä‘á»ƒ xem suáº¥t chiáº¿u."}
        </Text>
      </View>

      {groupedShowtimes.map((group) => (
        <View key={group.label} style={styles.showtimeGroupSection}>
          <View style={styles.showtimeGroupHeader}>
            <Text style={styles.showtimeGroupTitle}>{group.label}</Text>
            <Text style={styles.showtimeGroupMeta}>{group.items.length} suáº¥t</Text>
          </View>
          <View style={styles.showtimeGrid}>
            {group.items.map((item) => {
              const showtimeTimestamp = new Date(item.startTime).getTime();
              const isDisabled = showtimeTimestamp < now;
              const isActive = item.id === (primaryShowtime?.id ?? activeShowtimeId);
              const countdownLevel = getCountdownLevel(item.startTime, now);
              const availableSeats = Number(item.availableSeats ?? 0);
              const totalSeats = Number(item.totalSeats ?? item.seatLayout.flat().length ?? 0);
              const availabilityMeta = getSeatAvailabilityMeta(availableSeats, totalSeats);
              return (
                <Pressable
                  key={`${item.id}-${item.roomName}`}
                  disabled={isDisabled}
                  style={[styles.showtimeCard, isActive && styles.showtimeCardActive, isDisabled && styles.showtimeCardDisabled]}
                  onPress={() => setSelectedShowtimeId(item.id)}
                >
                  <View style={styles.showtimePillRow}>
                    <Text style={[styles.showtimePill, isActive && styles.showtimePillActive, isDisabled && styles.showtimePillDisabled]}>{item.formatLabel}</Text>
                    <Text style={[styles.showtimePillSecondary, isDisabled && styles.showtimePillSecondaryDisabled]}>{item.languageLabel}</Text>
                  </View>
                  <Text style={[styles.showtimeTime, isDisabled && styles.showtimeTimeDisabled]}>{item.startTime.slice(11, 16)}</Text>
                  <Text style={[styles.showtimeCinema, isDisabled && styles.showtimeCinemaDisabled]}>{item.cinemaName}</Text>
                  <Text style={styles.showtimeInfo}>{item.roomName}</Text>
                  <View style={styles.showtimeMetaStack}>
                    <Text style={[styles.showtimePrice, isDisabled && styles.showtimePriceDisabled]}>Tá»« {formatCurrency(item.basePrice)}</Text>
                    <View style={styles.showtimeSeatsMetaRow}>
                      <Text
                        style={[
                          styles.showtimeSeatLevel,
                          availabilityMeta.tone === "good" && styles.showtimeSeatLevelGood,
                          availabilityMeta.tone === "warning" && styles.showtimeSeatLevelWarning,
                          availabilityMeta.tone === "critical" && styles.showtimeSeatLevelCritical,
                          isDisabled && styles.showtimeSeatLevelDisabled,
                        ]}
                      >
                        {availabilityMeta.label}
                      </Text>
                      <Text style={[styles.showtimeSeatsLeft, isDisabled && styles.showtimeSeatsLeftDisabled]}>
                        {availableSeats > 0 ? `CÃ²n ${availableSeats}/${totalSeats} gháº¿` : "ÄÃ£ kÃ­n chá»—"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.showtimeFooterRow}>
                    {bookingLoadingShowtimeId === item.id ? (
                      <View style={styles.showtimeLoadingWrap}>
                        <ActivityIndicator size="small" color={palette.cyan} />
                      </View>
                    ) : (
                      <Text
                        style={[
                          styles.showtimeState,
                          isActive && styles.showtimeStateActive,
                          isActive && countdownLevel === "soon" && styles.showtimeStateSoon,
                          isActive && countdownLevel === "boarding" && styles.showtimeStateBoarding,
                          isDisabled && styles.showtimeStateDisabled,
                        ]}
                      >
                        {isDisabled ? "Háº¿t giá»" : isActive ? formatCountdownLabel(item.startTime, now) : "Má»Ÿ bÃ¡n"}
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      {filteredShowtimes.length === 0 ? (
        <View style={styles.accountRow}>
          <Text style={styles.accountDetail}>Hiá»‡n chÆ°a cÃ³ suáº¥t chiáº¿u phÃ¹ há»£p cho lá»±a chá»n nÃ y.</Text>
        </View>
      ) : null}

      {primaryShowtime ? <NeonButton label="Chá»n gháº¿" onPress={() => onBook(primaryShowtime)} loading={bookingLoadingMovieId === movie.id} /> : null}
      </ScrollView>

      <Modal visible={trailerVisible} animationType="slide" transparent onRequestClose={() => setTrailerVisible(false)}>
        <View style={styles.trailerModalBackdrop}>
          <View style={styles.trailerModalShell}>
            <LinearGradient colors={["rgba(255,255,255,0.18)", "rgba(255,255,255,0.02)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.trailerModalStroke} />
            <View style={styles.trailerModalHeader}>
              <View>
                <Text style={styles.accountTitle}>Trailer</Text>
                <Text style={styles.accountDetail}>{movie.title}</Text>
              </View>
              <Pressable style={styles.trailerCloseButton} onPress={() => setTrailerVisible(false)}>
                <MaterialCommunityIcons name="close" size={20} color={palette.text} />
              </Pressable>
            </View>
            <TrailerPlayer url={trailerUrl} posterUrl={movie.bannerUrl ?? movie.posterUrl} title={movie.title} />
          </View>
        </View>
      </Modal>
    </>
  );
}

export function SeatScreen({ movie, showtime, onBack, onContinue, selectedSeats, onToggleSeat, holding, seatMapRows }: { movie: Movie; showtime: ShowtimeItem | null; onBack: () => void; onContinue: () => void; selectedSeats: SeatSelection[]; onToggleSeat: (seats: SeatSelection[]) => void; holding: boolean; seatMapRows: SeatMapRow[]; }) {
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
    const detail = seat.seatType === "COUPLE" ? "Gháº¿ Ä‘Ã´i â€¢ chá»n cáº£ cáº·p" : seat.isHot ? "Gháº¿ Hot" : seat.seatType === "VIP" ? "Gháº¿ VIP" : "Gháº¿ thÆ°á»ng";
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
          <Text style={styles.backLink}>â† Quay láº¡i</Text>
        </Pressable>

        <View style={styles.seatHeader}>
          <Text style={styles.detailTitle}>{movie.title}</Text>
          <Text style={styles.detailMeta}>{showtime ? `${showtime.cinemaName} â€¢ ${showtime.roomName} â€¢ ${showtime.startTime.slice(11, 16)}` : "ChÆ°a chá»n suáº¥t chiáº¿u"}</Text>
        </View>

        <View style={styles.seatPriceRow}>
          <View style={styles.seatPriceCard}>
            <Text style={styles.seatPriceLabel}>Gháº¿ thÆ°á»ng</Text>
            <Text style={styles.seatPriceValue}>CÆ¡ báº£n</Text>
          </View>
          <View style={styles.seatPriceCard}>
            <Text style={styles.seatPriceLabel}>Gháº¿ VIP</Text>
            <Text style={styles.seatPriceValue}>+30.000Ä‘</Text>
          </View>
          <View style={styles.seatPriceCard}>
            <Text style={styles.seatPriceLabel}>Gháº¿ Hot</Text>
            <Text style={styles.seatPriceValue}>+20.000Ä‘</Text>
          </View>
          <View style={styles.seatPriceCard}>
            <Text style={styles.seatPriceLabel}>Gháº¿ Ä‘Ã´i</Text>
            <Text style={styles.seatPriceValue}>+90.000Ä‘</Text>
          </View>
        </View>

        <View style={styles.screenArcWrap}>
          <View style={styles.screenArcGlow} />
          <Text style={styles.screenArcText}>MÃ€N HÃŒNH</Text>
        </View>

        <View style={styles.seatGridWrap}>
          {hotBounds ? (
            <View style={styles.seatHotBadge}>
              <MaterialCommunityIcons name="fire" size={14} color="#06251d" />
              <Text style={styles.seatHotBadgeText}>VÃ¹ng Hot: vá»‹ trÃ­ Ä‘áº¹p, Ä‘áº·t nhiá»u, phá»¥ thu +20.000Ä‘</Text>
            </View>
          ) : null}
          {renderColumnHeader("top")}
          <View style={styles.seatSection}>
            {layout.map((row) => renderSeatRow(row))}
          </View>
        </View>

        <View style={styles.legendGrid}>
          {[["Gháº¿ thÆ°á»ng", palette.seat], ["Gháº¿ VIP", palette.vip], ["Gháº¿ Hot", "#7fe4c9"], ["Gháº¿ Ä‘Ã´i", palette.couple], ["ÄÃ£ chá»n", "#ffffff"], ["ÄÃ£ bÃ¡n", palette.sold], ["Äang giá»¯", palette.held]].map(([label, color]) => (
            <View key={label} style={styles.legendItem}>
              <View style={[styles.legendDot, label === "ÄÃ£ chá»n" ? styles.legendDotSelected : null, { backgroundColor: color }]} />
              <Text style={styles.legendText}>{label}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.accountDetail}>Gháº¿ Ä‘Ã´i Ä‘Æ°á»£c hiá»ƒn thá»‹ trá»±c tiáº¿p trong sÆ¡ Ä‘á»“ vÃ  Ä‘Ã¡nh dáº¥u báº±ng mÃ u riÃªng, khÃ´ng tÃ¡ch thÃ nh khu riÃªng.</Text>
      </Animated.ScrollView>
      <View style={styles.stickyFooterWrap}>
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(255,255,255,0.18)", "rgba(255,255,255,0.06)", "rgba(255,255,255,0)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.stickyFooterTopGlow}
        />
        <BlurView intensity={34} tint="dark" style={styles.stickyFooter}>
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
            <Text style={styles.summaryLabel}>Gháº¿ Ä‘Ã£ chá»n</Text>
            <Text style={styles.stickyPrimaryValue}>{selectedSeats.map((item) => item.seatCode).join(", ") || "ChÆ°a chá»n"}</Text>
            <Text style={styles.stickySecondaryValue}>Táº¡m tÃ­nh {formatCurrency(subtotal)}</Text>
          </View>
          <View style={styles.stickyActionBlock}>
            <NeonButton label="Tiáº¿p tá»¥c" onPress={onContinue} loading={holding} />
          </View>
        </BlurView>
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
        <BlurView intensity={34} tint="dark" style={styles.stickyFooter}>
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
        </BlurView>
      </View>
    </View>
  );
}
export function TicketDetailScreen({ ticket, onBack, onScheduleReminder, onCancelReminder, reminderLoading = null }: { ticket: TicketDetail; onBack: () => void; onScheduleReminder: () => void; onCancelReminder: () => void; reminderLoading?: "schedule" | "cancel" | null; }) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Pressable onPress={onBack}>
        <Text style={styles.backLink}>â† Quay láº¡i</Text>
      </Pressable>

      <View style={styles.ticketDetailHero}>
        <Text style={styles.eyebrow}>CHI TIáº¾T VÃ‰</Text>
        <Text style={styles.detailTitle}>{ticket.showtime.movieTitle}</Text>
        <Text style={styles.detailMeta}>{ticket.showtime.cinemaName} â€¢ {ticket.showtime.roomName}</Text>
      </View>

      <View style={styles.ticketDetailGrid}>
        <View style={styles.checkoutSummaryCell}>
          <Text style={styles.summaryLabel}>MÃ£ vÃ©</Text>
          <Text style={styles.summaryValue}>{ticket.bookingCode}</Text>
        </View>
        <View style={styles.checkoutSummaryCell}>
          <Text style={styles.summaryLabel}>Tráº¡ng thÃ¡i</Text>
          <Text style={styles.summaryValue}>{mapBookingStatus(ticket.status)}</Text>
        </View>
      </View>

      <View style={styles.accountRow}>
        <Text style={styles.accountTitle}>Suáº¥t chiáº¿u</Text>
        <Text style={styles.accountDetail}>{formatDateTime(ticket.showtime.startTime)} â€¢ {ticket.showtime.formatLabel} â€¢ {ticket.showtime.languageLabel}</Text>
        <Text style={styles.accountDetail}>Gháº¿: {ticket.seats.map((item) => item.seatCode).join(", ")}</Text>
        <Text style={styles.accountDetail}>Check-in: {mapCheckinStatus(ticket.checkInStatus)}{ticket.checkedInAt ? ` â€¢ ${formatDateTime(ticket.checkedInAt)}` : ""}</Text>
      </View>

      <View style={styles.accountRow}>
        <Text style={styles.accountTitle}>Combo Ä‘i kÃ¨m</Text>
        {ticket.items.length === 0 ? <Text style={styles.accountDetail}>KhÃ´ng cÃ³ combo Ä‘i kÃ¨m.</Text> : null}
        {ticket.items.map((item) => (
          <Text key={`${item.foodId}-${item.name}`} style={styles.accountDetail}>{item.name} x{item.quantity} â€¢ {formatCurrency(item.price * item.quantity)}</Text>
        ))}
      </View>

      <View style={styles.accountRow}>
        <Text style={styles.accountTitle}>Voucher vÃ  nháº¯c lá»‹ch</Text>
        <Text style={styles.accountDetail}>Voucher: {ticket.voucherCode ?? "KhÃ´ng Ã¡p dá»¥ng"} â€¢ Giáº£m {formatCurrency(ticket.discountAmount ?? 0)}</Text>
        <Text style={styles.accountDetail}>MÃ£ QR: {ticket.qrPayload ?? "ChÆ°a táº¡o"}</Text>
        <View style={styles.paymentWrap}>
          <NeonButton label="Nháº¯c trÆ°á»›c 1 giá»" variant="secondary" onPress={onScheduleReminder} loading={reminderLoading === "schedule"} />
          <NeonButton label="Há»§y nháº¯c" variant="secondary" onPress={onCancelReminder} loading={reminderLoading === "cancel"} />
        </View>
        <Text style={styles.accountDetail}>Lá»‹ch nháº¯c: {ticket.reminder ? `${formatDateTime(ticket.reminder.remindAt)} â€¢ ${ticket.reminder.status}` : "ChÆ°a Ä‘áº·t lá»‹ch nháº¯c"}</Text>
      </View>

      <View style={styles.accountRow}>
        <Text style={styles.accountTitle}>ThÃ´ng tin khÃ¡ch hÃ ng</Text>
        <Text style={styles.accountDetail}>{ticket.customerName}</Text>
        <Text style={styles.accountDetail}>{ticket.customerEmail}</Text>
        <Text style={styles.accountDetail}>{ticket.customerPhone}</Text>
      </View>

      <View style={styles.checkoutCard}>
        <Text style={styles.summaryLabel}>Tá»•ng thanh toÃ¡n</Text>
        <Text style={styles.checkoutPrice}>{formatCurrency(ticket.totalAmount)}</Text>
      </View>
    </ScrollView>
  );
}



