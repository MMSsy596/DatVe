import React from "react";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import { ActivityIndicator, Animated, Easing, Image, ImageBackground, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
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

const showtimeBucketLabel = (startTime: string) => {
  const hour = Number(String(startTime).slice(11, 13));
  if (hour < 12) return "Sáng";
  if (hour < 18) return "Chiều";
  return "Tối";
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
        {posterUrl ? <Image source={{ uri: posterUrl }} style={styles.trailerPosterImage} resizeMode="cover" /> : null}
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

export function Toast({ toastId, message, tone = "info", kind = "system", closing = false, visibleMs = 2400 }: { toastId: number; message: string; tone?: ToastTone; kind?: ToastKind; closing?: boolean; visibleMs?: number }) {
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

export function HomeScreen(props: {
  onMoviePress: (movie: Movie) => void;
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
  const heroMovie = moviesData[0] ?? fallbackMovie;
  const nowShowing = moviesData.filter((movie) => movie.status !== "COMING_SOON");
  const nowShowingFeatured = nowShowing.slice(0, 12);
  const nowShowingExtended = nowShowing.slice(12);
  const comingSoon = moviesData.filter((movie) => movie.status === "COMING_SOON").slice(0, 10);
  const hotToday = nowShowing.slice(0, 5);
  const genrePicks = moviesData.reduce<Movie[]>((acc, movie) => {
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
      <View style={[styles.heroCard, { backgroundColor: heroMovie.tone }]}>
        {heroMovie.bannerUrl ? <Image source={{ uri: heroMovie.bannerUrl }} style={styles.heroImage} resizeMode="cover" /> : null}
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
        {nowShowingFeatured.map((movie) => (
          <Pressable key={movie.id} style={styles.movieCard} onPress={() => onMoviePress(movie)}>
            <ImageBackground source={movie.posterUrl ? { uri: movie.posterUrl } : undefined} imageStyle={styles.posterImage} style={[styles.poster, { backgroundColor: movie.tone }]}>
              <View style={styles.posterScrim} />
              <View style={styles.posterTopRow}>
                <Text style={styles.posterBadge}>{movie.badge}</Text>
                <MovieStateBadges isFavorite={favoriteMovieIds.includes(movie.id)} isInWatchlist={watchlistMovieIds.includes(movie.id)} compact />
              </View>
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

      {nowShowingExtended.length > 0 ? (
        <>
          <SectionHeader title="Lướt thêm" action={`${nowShowing.length} phim`} />
          <View style={styles.rankingWrap}>
            {nowShowingExtended.map((movie) => (
              <Pressable key={`extended-${movie.id}`} style={styles.rankingRow} onPress={() => onMoviePress(movie)}>
                <View style={[styles.rankPoster, { backgroundColor: movie.tone, overflow: "hidden" }]}>
                  {movie.posterUrl ? <Image source={{ uri: movie.posterUrl }} style={styles.explorePosterImage} resizeMode="cover" /> : null}
                </View>
                <View style={styles.rankMain}>
                  <Text style={styles.rankMovie}>{movie.title}</Text>
                  <MovieStateBadges isFavorite={favoriteMovieIds.includes(movie.id)} isInWatchlist={watchlistMovieIds.includes(movie.id)} compact />
                  <Text style={styles.rankRevenue}>{movie.genre} • {movie.runtime} • IMDb {movie.score}</Text>
                </View>
                <Text style={styles.rankActionText}>Mở</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {hotToday.length > 0 ? (
        <>
          <SectionHeader title="Top đặt nhiều hôm nay" action="Ưu tiên ghế đẹp" />
          <View style={styles.rankingWrap}>
            {hotToday.map((movie, index) => (
              <Pressable key={`hot-${movie.id}`} style={styles.rankingRow} onPress={() => onSeatPress(movie)} disabled={loadingSeatMovieId === movie.id}>
                <View style={[styles.rankPoster, { backgroundColor: movie.tone, overflow: "hidden" }]}>
                  {movie.posterUrl ? <Image source={{ uri: movie.posterUrl }} style={styles.explorePosterImage} resizeMode="cover" /> : null}
                </View>
                <View style={styles.rankMain}>
                  <Text style={styles.rankMovie}>{`#${index + 1} ${movie.title}`}</Text>
                  <MovieStateBadges isFavorite={favoriteMovieIds.includes(movie.id)} isInWatchlist={watchlistMovieIds.includes(movie.id)} compact />
                  <Text style={styles.rankRevenue}>{movie.genre} • {movie.runtime} • IMDb {movie.score}</Text>
                </View>
                {loadingSeatMovieId === movie.id ? <ActivityIndicator size="small" color={palette.cyan} /> : <Text style={styles.rankActionText}>Đặt</Text>}
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {genrePicks.length > 0 ? (
        <>
          <SectionHeader title="Phim theo gu" action="Grid 2 cột" />
          <View style={styles.homeGrid}>
            {genrePicks.map((movie) => (
              <Pressable key={`genre-${movie.id}`} style={styles.homeGridCard} onPress={() => onMoviePress(movie)}>
                <ImageBackground
                  source={movie.posterUrl ? { uri: movie.posterUrl } : undefined}
                  imageStyle={styles.posterImage}
                  style={[styles.homeGridPoster, { backgroundColor: movie.tone }]}
                >
                  <View style={styles.posterScrim} />
                  <View style={styles.posterTopRow}>
                    <Text style={styles.posterBadge}>{movie.badge}</Text>
                    <MovieStateBadges isFavorite={favoriteMovieIds.includes(movie.id)} isInWatchlist={watchlistMovieIds.includes(movie.id)} compact />
                  </View>
                </ImageBackground>
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
            ))}
          </View>
        </>
      ) : null}

      {comingSoon.length > 0 ? (
        <>
          <SectionHeader title="Sắp chiếu" action="Theo dõi" />
          <View style={styles.rankingWrap}>
            {comingSoon.map((movie) => (
              <Pressable key={`coming-${movie.id}`} style={styles.rankingRow} onPress={() => onMoviePress(movie)}>
                <View style={[styles.rankPoster, { backgroundColor: movie.tone, overflow: "hidden" }]}>
                  {movie.posterUrl ? <Image source={{ uri: movie.posterUrl }} style={styles.explorePosterImage} resizeMode="cover" /> : null}
                </View>
                <View style={styles.rankMain}>
                  <Text style={styles.rankMovie}>{movie.title}</Text>
                  <MovieStateBadges isFavorite={favoriteMovieIds.includes(movie.id)} isInWatchlist={watchlistMovieIds.includes(movie.id)} compact />
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
  favoriteMovieIds?: number[];
  watchlistMovieIds?: number[];
}) {
  const { onMoviePress, moviesData, loading, statusFilter, setStatusFilter, cinemaFilter, setCinemaFilter, genreFilter, setGenreFilter, hourFilter, setHourFilter, cinemaOptions, genreOptions, favoriteMovieIds = [], watchlistMovieIds = [] } = props;

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
            <View style={styles.explorePosterOverlay}>
              <MovieStateBadges isFavorite={favoriteMovieIds.includes(movie.id)} isInWatchlist={watchlistMovieIds.includes(movie.id)} compact />
            </View>
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

export function TicketsScreen({ onSeatPress, onTicketPress, tickets, moviesData, loading, fallbackMovie, loadingTicketId = null, loadingSeatMovieId = null, favoriteMovieIds = [], watchlistMovieIds = [] }: { onSeatPress: (movie: Movie) => void; onTicketPress: (ticket: TicketItem) => void; tickets: TicketItem[]; moviesData: Movie[]; loading: boolean; fallbackMovie: Movie; loadingTicketId?: number | null; loadingSeatMovieId?: number | null; favoriteMovieIds?: number[]; watchlistMovieIds?: number[]; }) {
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
          <NeonButton label="Đặt vé ngay" onPress={() => onSeatPress(moviesData[0] ?? fallbackMovie)} loading={loadingSeatMovieId === (moviesData[0] ?? fallbackMovie).id} />
        </View>
      ) : null}

      {tickets.map((ticket, index) => (
        <Pressable key={`${ticket.movie}-${ticket.time}`} style={styles.ticketCard} onPress={() => onTicketPress(ticket)} disabled={loadingTicketId === ticket.bookingId}>
          {(() => {
            const ticketMovie = moviesData.find((movie) => movie.title === ticket.movie) ?? moviesData[index % moviesData.length] ?? fallbackMovie;
            return (
              <>
          <View style={styles.ticketStripe} />
          <View style={styles.ticketContent}>
            <View style={styles.ticketHead}>
              <View style={styles.ticketMovieHead}>
                <Text style={styles.ticketMovie}>{ticket.movie}</Text>
                <MovieStateBadges
                  isFavorite={favoriteMovieIds.includes(ticketMovie.id)}
                  isInWatchlist={watchlistMovieIds.includes(ticketMovie.id)}
                  compact
                />
              </View>
              {loadingTicketId === ticket.bookingId ? (
                <View style={styles.ticketStatusLoading}>
                  <ActivityIndicator size="small" color={palette.cyan} />
                </View>
              ) : (
                <Text style={[styles.ticketStatus, ticket.status === "PAID" && styles.ticketStatusPaid]}>{mapBookingStatus(ticket.status)}</Text>
              )}
            </View>
            <Text style={styles.ticketInfo}>{ticket.cinema}</Text>
            <Text style={styles.ticketInfo}>{ticket.time.replace("T", " • ")} • Ghế {ticket.seat}</Text>
            <Text style={styles.ticketInfo}>Mã vé {ticket.bookingCode}</Text>
          </View>
          <NeonButton label={index === 0 ? "Mở vé" : "Đặt lại"} variant="secondary" onPress={() => onSeatPress(ticketMovie)} loading={loadingSeatMovieId === ticketMovie.id} />
              </>
            );
          })()}
        </Pressable>
      ))}
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
            <Text style={styles.accountDetail}>Tài khoản mẫu: `admin@datve.local / Admin@123`, `user@datve.local / User@123`.</Text>
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
        {profile?.avatarUrl ? <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} /> : <View style={styles.avatar} />}
        <View style={styles.profileMetaBlock}>
          <Text style={styles.profileName}>{profile?.fullName ?? sessionUser?.fullName ?? "Khách"}</Text>
          <Text style={styles.profileMail}>{profile?.email ?? sessionUser?.email ?? "Chưa đăng nhập"}</Text>
          <Text style={styles.accountDetail}>{profile?.phone ?? sessionUser?.phone ?? "Đăng nhập để đồng bộ vé, ưu đãi và nhắc lịch."}</Text>
        </View>
      </View>

      <View style={styles.accountRow}>
        <Text style={styles.accountTitle}>Tài khoản</Text>
        <Text style={styles.accountDetail}>{sessionUser ? `Đang đăng nhập với vai trò ${sessionUser.role}.` : "Đăng nhập hoặc đăng ký để dùng dữ liệu cá nhân và voucher."}</Text>
        <NeonButton label="Đăng xuất" variant="secondary" onPress={onLogout} loading={logoutLoading} />
      </View>

      {profile ? (
        <View style={styles.checkoutSummaryGrid}>
          <View style={styles.checkoutSummaryCell}>
            <Text style={styles.summaryLabel}>Yêu thích</Text>
            <Text style={styles.summaryValue}>{profile.stats.favorites}</Text>
          </View>
          <View style={styles.checkoutSummaryCell}>
            <Text style={styles.summaryLabel}>Xem sau</Text>
            <Text style={styles.summaryValue}>{profile.stats.watchlist}</Text>
          </View>
          <View style={styles.checkoutSummaryCell}>
            <Text style={styles.summaryLabel}>Vé đã đặt</Text>
            <Text style={styles.summaryValue}>{profile.stats.bookings}</Text>
          </View>
        </View>
      ) : null}

      {profile ? (
        <View style={styles.accountRow}>
          <Text style={styles.accountTitle}>Chi tiêu tích lũy</Text>
          <Text style={styles.summaryValue}>{formatCurrency(profile.stats.spending)}</Text>
          <Text style={styles.accountDetail}>Theo dõi tổng chi tiêu để tối ưu voucher và lịch xem phim.</Text>
        </View>
      ) : null}

      <View style={styles.accountRow}>
        <Text style={styles.accountTitle}>Nhắc lịch vé</Text>
        {reminders.length === 0 ? <Text style={styles.accountDetail}>Chưa có lịch nhắc nào.</Text> : null}
        {reminders.slice(0, 4).map((item) => (
          <View key={`reminder-${item.id}`} style={styles.activityRow}>
            <Text style={styles.activityTitle}>{item.movie_title}</Text>
            <Text style={styles.activityMeta}>{item.cinema_name} • {formatDateTime(item.start_time)}</Text>
            <Text style={styles.activityTime}>Nhắc lúc {formatDateTime(item.remind_at)} • {item.status}</Text>
          </View>
        ))}
      </View>

      <View style={styles.accountRow}>
        <Text style={styles.accountTitle}>Dữ liệu tài khoản</Text>
        <Text style={styles.accountDetail}>Tải lại để đồng bộ vé, ưu đãi và nhắc lịch mới nhất.</Text>
        <NeonButton label="Tải lại dữ liệu" onPress={onReload} loading={loading} />
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
          {movies.map((movie) => (
            <Pressable key={`grid-${title}-${movie.id}`} style={styles.homeGridCard} onPress={() => onMoviePress(movie)}>
              <View style={[styles.homeGridPoster, { backgroundColor: movie.tone }]}>
                {movie.posterUrl ? <Image source={{ uri: movie.posterUrl }} style={styles.homeGridPosterImage} resizeMode="cover" /> : null}
                <View style={styles.posterTopRow}>
                  <Text style={styles.posterBadge}>{movie.badge}</Text>
                  <MovieStateBadges isFavorite={title === "Yêu thích"} isInWatchlist={title === "Xem sau"} compact />
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
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

export function MovieDetailScreen(props: { movie: Movie; onBack: () => void; onBook: (showtime: ShowtimeItem) => void; showtimesData: ShowtimeItem[]; isFavorite: boolean; isInWatchlist: boolean; onToggleFavorite: () => void; onToggleWatchlist: () => void; favoriteLoading?: boolean; watchlistLoading?: boolean; bookingLoadingMovieId?: number | null; bookingLoadingShowtimeId?: number | null; }) {
  const { movie, onBack, onBook, showtimesData, isFavorite, isInWatchlist, onToggleFavorite, onToggleWatchlist, favoriteLoading = false, watchlistLoading = false, bookingLoadingMovieId = null, bookingLoadingShowtimeId = null } = props;
  const now = useMinuteNow();
  const [trailerVisible, setTrailerVisible] = React.useState(false);
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
    const groups: Array<{ label: "Sáng" | "Chiều" | "Tối"; items: ShowtimeItem[] }> = [
      { label: "Sáng", items: [] },
      { label: "Chiều", items: [] },
      { label: "Tối", items: [] },
    ];
    for (const item of filteredShowtimes) {
      const label = showtimeBucketLabel(item.startTime) as "Sáng" | "Chiều" | "Tối";
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
    if (!primaryShowtime) {
      setSelectedShowtimeId(null);
      return;
    }
    if (!filteredShowtimes.some((item) => item.id === selectedShowtimeId)) {
      setSelectedShowtimeId(primaryShowtime.id);
    }
  }, [filteredShowtimes, primaryShowtime, selectedShowtimeId]);

  return (
    <>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Pressable onPress={onBack}>
          <Text style={styles.backLink}>← Quay lại</Text>
        </Pressable>

      <View style={styles.detailHeaderRow}>
        <View style={styles.detailThumbWrap}>
          {movie.posterUrl ? <Image source={{ uri: movie.posterUrl }} style={styles.detailThumbImage} resizeMode="cover" /> : <View style={[styles.detailThumbImage, { backgroundColor: movie.tone }]} />}
        </View>
        <View style={styles.detailHeaderMeta}>
          <Text style={styles.detailHeaderTitle}>{movie.title}</Text>
          <View style={styles.detailHeaderChips}>
            <Text style={styles.detailHeaderChip}>{movie.status === "COMING_SOON" ? "Sắp chiếu" : "Đang chiếu"}</Text>
            <Text style={styles.detailHeaderChipSecondary}>IMDb {movie.score}</Text>
          </View>
          <Text style={styles.detailHeaderSubline}>{movie.genre} • {movie.runtime}</Text>
        </View>
      </View>

      <View style={[styles.detailPoster, { backgroundColor: movie.tone }]}>
        {movie.bannerUrl ? <Image source={{ uri: movie.bannerUrl }} style={styles.detailPosterImage} resizeMode="cover" /> : null}
        <View style={styles.detailPosterScrim} />
        <Text style={styles.posterBadge}>{movie.badge}</Text>
        <View style={styles.detailOverlayMeta}>
          <Text style={styles.detailOverlayText}>IMDb {movie.score}</Text>
          <Text style={styles.detailOverlayText}>{movie.status === "COMING_SOON" ? "Sắp chiếu" : "Đang chiếu"}</Text>
        </View>
        <View style={styles.detailMediaBottom}>
          <Pressable style={styles.detailMediaPlay} onPress={() => setTrailerVisible(true)}>
            <MaterialCommunityIcons name="play-circle" size={20} color="#fff4ef" />
            <Text style={styles.detailMediaPlayText}>Trailer</Text>
          </Pressable>
          <View style={styles.detailMediaFacts}>
            <Text style={styles.detailMediaFactText}>{primaryShowtime ? primaryShowtime.startTime.slice(11, 16) : "Cập nhật sớm"}</Text>
            <Text style={styles.detailMediaFactDivider}>•</Text>
            <Text style={styles.detailMediaFactText}>{primaryShowtime ? primaryShowtime.formatLabel : movie.runtime}</Text>
            <Text style={styles.detailMediaFactDivider}>•</Text>
            <Text style={styles.detailMediaFactText}>{primaryShowtime ? primaryShowtime.languageLabel : movie.genre}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.detailTitle}>{movie.title}</Text>
      <Text style={styles.detailMeta}>{movie.genre} • {movie.runtime}</Text>
      <Text style={styles.detailDescription}>{movie.description}</Text>

      <View style={styles.detailActionsRow}>
        <Pressable style={[styles.listToggleButton, isFavorite ? styles.listToggleButtonFavoriteOn : styles.listToggleButtonFavoriteOff]} onPress={favoriteLoading ? undefined : onToggleFavorite}>
          {favoriteLoading ? <ActivityIndicator size="small" color="#fff4ef" /> : <MaterialCommunityIcons name={isFavorite ? "heart" : "heart-outline"} size={18} color={isFavorite ? "#ffe8ee" : "#ff9ab3"} />}
          <Text style={[styles.listToggleButtonText, isFavorite ? styles.listToggleButtonTextOn : styles.listToggleButtonTextOff]}>{isFavorite ? "Đã yêu thích" : "Thêm yêu thích"}</Text>
        </Pressable>
        <Pressable style={[styles.listToggleButton, isInWatchlist ? styles.listToggleButtonWatchlistOn : styles.listToggleButtonWatchlistOff]} onPress={watchlistLoading ? undefined : onToggleWatchlist}>
          {watchlistLoading ? <ActivityIndicator size="small" color="#effff9" /> : <MaterialCommunityIcons name={isInWatchlist ? "bookmark" : "bookmark-outline"} size={18} color={isInWatchlist ? "#e2fff6" : "#7df2d9"} />}
          <Text style={[styles.listToggleButtonText, isInWatchlist ? styles.listToggleButtonTextOn : styles.listToggleButtonTextOff]}>{isInWatchlist ? "Đã lưu xem sau" : "Lưu xem sau"}</Text>
        </Pressable>
      </View>

      <View style={styles.detailStatsRow}>
        <View style={styles.detailStat}>
          <Text style={styles.detailStatLabel}>Trạng thái</Text>
          <Text style={styles.detailStatValue}>{movie.status === "COMING_SOON" ? "Sắp chiếu" : "Đang chiếu"}</Text>
        </View>
        <View style={styles.detailStat}>
          <Text style={styles.detailStatLabel}>Đánh giá</Text>
          <Text style={styles.detailStatValue}>{movie.score}/10</Text>
        </View>
        <View style={styles.detailStat}>
          <Text style={styles.detailStatLabel}>Thời lượng</Text>
          <Text style={styles.detailStatValue}>{movie.runtime}</Text>
        </View>
      </View>

      <SectionHeader title="Chọn lịch chiếu" action={`${movieShowtimes.length} suất`} />

      <View style={styles.accountRow}>
        <Text style={styles.accountTitle}>1. Chọn rạp</Text>
        <View style={styles.paymentWrap}>
          {cinemaOptions.map((cinema) => (
            <Pressable key={cinema} style={[styles.paymentMethod, effectiveCinema === cinema && styles.paymentMethodActive]} onPress={() => setSelectedCinema(cinema)}>
              <Text style={[styles.paymentMethodText, effectiveCinema === cinema && styles.paymentMethodTextActive]}>{cinema}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.accountRow}>
        <Text style={styles.accountTitle}>2. Chọn ngày</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {dateOptions.map((dateKey) => (
            <Pressable key={dateKey} style={[styles.dateMiniCard, effectiveDateKey === dateKey && styles.dateMiniCardActive]} onPress={() => setSelectedDateKey(dateKey)}>
              <Text style={[styles.dateMiniWeekday, effectiveDateKey === dateKey && styles.dateMiniTextActive]}>{formatShowtimeWeekday(dateKey)}</Text>
              <Text style={[styles.dateMiniDay, effectiveDateKey === dateKey && styles.dateMiniTextActive]}>{formatShowtimeDayNumber(dateKey)}</Text>
              <Text style={[styles.dateMiniMonth, effectiveDateKey === dateKey && styles.dateMiniTextActive]}>{formatShowtimeDateLabel(dateKey)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.accountRow}>
        <Text style={styles.accountTitle}>3. Chọn khung giờ</Text>
        <Text style={styles.accountDetail}>
          {effectiveCinema && effectiveDateKey ? `${effectiveCinema} • ${formatShowtimeDateLabel(effectiveDateKey)}` : "Chọn rạp và ngày để xem suất chiếu."}
        </Text>
      </View>

      {groupedShowtimes.map((group) => (
        <View key={group.label} style={styles.showtimeGroupSection}>
          <View style={styles.showtimeGroupHeader}>
            <Text style={styles.showtimeGroupTitle}>{group.label}</Text>
            <Text style={styles.showtimeGroupMeta}>{group.items.length} suất</Text>
          </View>
          <View style={styles.showtimeGrid}>
            {group.items.map((item) => {
              const showtimeTimestamp = new Date(item.startTime).getTime();
              const isDisabled = showtimeTimestamp < now;
              const isActive = item.id === (primaryShowtime?.id ?? activeShowtimeId);
              const countdownLevel = getCountdownLevel(item.startTime, now);
              const availableSeats = Number(item.availableSeats ?? 0);
              const totalSeats = Number(item.totalSeats ?? item.seatLayout.flat().length ?? 0);
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
                    <Text style={[styles.showtimePrice, isDisabled && styles.showtimePriceDisabled]}>Từ {formatCurrency(item.basePrice)}</Text>
                    <Text style={styles.showtimeSeatsLeft}>{availableSeats > 0 ? `Còn ${availableSeats}/${totalSeats} ghế` : "Đã kín chỗ"}</Text>
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
                        {isDisabled ? "Hết giờ" : isActive ? formatCountdownLabel(item.startTime, now) : "Mở bán"}
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
          <Text style={styles.accountDetail}>Hiện chưa có suất chiếu phù hợp cho lựa chọn này.</Text>
        </View>
      ) : null}

      {primaryShowtime ? <NeonButton label="Chọn ghế" onPress={() => onBook(primaryShowtime)} loading={bookingLoadingMovieId === movie.id} /> : null}
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

export function SeatScreen({ movie, showtime, onBack, onContinue, selectedSeats, onToggleSeat, holding, seatMapRows }: { movie: Movie; showtime: ShowtimeItem | null; onBack: () => void; onContinue: () => void; selectedSeats: SeatSelection[]; onToggleSeat: (seat: SeatSelection) => void; holding: boolean; seatMapRows: SeatMapRow[]; }) {
  const layout = seatMapRows;
  const scrollY = React.useRef(new Animated.Value(0)).current;
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
            <Text style={styles.seatPriceLabel}>Ghế đôi</Text>
            <Text style={styles.seatPriceValue}>+90.000đ</Text>
          </View>
        </View>

        <View style={styles.screenArcWrap}>
          <View style={styles.screenArcGlow} />
          <Text style={styles.screenArcText}>MÀN HÌNH</Text>
        </View>

        <View style={styles.seatGridWrap}>
          {standardRows.length > 0 ? (
            <View style={styles.seatSection}>
              <Text style={styles.seatSectionLabel}>KHU THƯỜNG</Text>
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
              <Text style={styles.seatSectionLabelCouple}>SWEETBOX / GHẾ ĐÔI</Text>
              {coupleRows.map((row) => renderSeatRow(row, "couple"))}
            </View>
          ) : null}
        </View>

        <View style={styles.legendGrid}>
          {[["Ghế thường", palette.seat], ["Ghế VIP", palette.vip], ["Ghế đôi", palette.couple], ["Đã bán", palette.sold], ["Đang giữ", palette.held]].map(([label, color]) => (
            <View key={label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendText}>{label}</Text>
            </View>
          ))}
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

        <Text style={styles.detailTitle}>Thanh toán</Text>
        <Text style={styles.detailMeta}>{movie.title} • {selectedSeats.map((item) => item.seatCode).join(", ") || "Chưa chọn ghế"}</Text>

        <View style={styles.checkoutSummaryGrid}>
          <View style={styles.checkoutSummaryCell}>
            <Text style={styles.summaryLabel}>Số ghế</Text>
            <Text style={styles.summaryValue}>{selectedSeats.length}</Text>
          </View>
          <View style={styles.checkoutSummaryCell}>
            <Text style={styles.summaryLabel}>Combo</Text>
            <Text style={styles.summaryValue}>{selectedCombos.length}</Text>
          </View>
          <View style={styles.checkoutSummaryCell}>
            <Text style={styles.summaryLabel}>Cổng</Text>
            <Text style={styles.summaryValue}>{selectedPaymentProvider}</Text>
          </View>
        </View>

        <SectionHeader title="Combo" action="Tùy chọn" />
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
          <TextInput value={voucherCode} onChangeText={setVoucherCode} placeholder="Nhập mã voucher" placeholderTextColor={palette.muted} style={styles.input} autoCapitalize="characters" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {vouchers.slice(0, 8).map((voucher) => (
              <Pressable key={voucher.code} style={[styles.paymentMethod, voucherCode === voucher.code && styles.paymentMethodActive]} onPress={() => setVoucherCode(voucher.code)}>
                <Text style={[styles.paymentMethodText, voucherCode === voucher.code && styles.paymentMethodTextActive]}>{voucher.code}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={styles.accountDetail}>{appliedVoucherCode ? `Đang áp dụng ${appliedVoucherCode}, giảm khoảng ${formatCurrency(estimatedDiscount)}.` : "Chọn voucher nếu bạn có ưu đãi."}</Text>
        </View>

        <SectionHeader title="Phương thức thanh toán" action="MoMo • ZaloPay • VNPay" />
        <View style={styles.paymentWrap}>
          {[["MOMO", "MoMo"], ["ZALOPAY", "ZaloPay"], ["VNPAY", "VNPay"]].map(([id, label]) => (
            <Pressable key={id} style={[styles.paymentMethod, selectedPaymentProvider === id && styles.paymentMethodActive]} onPress={() => onSelectPaymentProvider(id as PaymentProvider)}>
              <Text style={[styles.paymentMethodText, selectedPaymentProvider === id && styles.paymentMethodTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.paymentWrap}>
          {[["SANDBOX", "Thử nghiệm"], ["REAL", "Thực tế"]].map(([id, label]) => (
            <Pressable key={id} style={[styles.paymentMethod, selectedPaymentGatewayMode === id && styles.paymentMethodActive]} onPress={() => onSelectPaymentGatewayMode(id as "SANDBOX" | "REAL")}>
              <Text style={[styles.paymentMethodText, selectedPaymentGatewayMode === id && styles.paymentMethodTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.checkoutCard}>
          <Text style={styles.summaryLabel}>Tổng thanh toán</Text>
          <Text style={styles.checkoutPrice}>{formatCurrency(total)}</Text>
          <Text style={styles.checkoutHint}>Tạm tính {formatCurrency(subtotal)} • Giảm giá {formatCurrency(estimatedDiscount)}.</Text>
        </View>

        <View style={styles.accountRow}>
          <Text style={styles.accountTitle}>Thông tin nhận vé</Text>
          <TextInput value={customerName} onChangeText={setCustomerName} placeholder="Họ tên" placeholderTextColor={palette.muted} style={styles.input} />
          <TextInput value={customerEmail} onChangeText={setCustomerEmail} placeholder="Email" placeholderTextColor={palette.muted} style={styles.input} autoCapitalize="none" />
          <TextInput value={customerPhone} onChangeText={setCustomerPhone} placeholder="Số điện thoại" placeholderTextColor={palette.muted} style={styles.input} />
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
            <Text style={styles.summaryLabel}>Thanh toán</Text>
            <Text style={styles.stickyPrimaryValue}>{formatCurrency(total)}</Text>
            <Text style={styles.stickySecondaryValue}>Tạm tính {formatCurrency(subtotal)} • Giảm {formatCurrency(estimatedDiscount)}</Text>
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
