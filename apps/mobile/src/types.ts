import React from "react";

export type TabId = "home" | "explore" | "tickets" | "profile";
export type ScreenId = "tabs" | "movie" | "seats" | "checkout" | "ticket" | "auth";
export type PaymentProvider = "MOMO" | "ZALOPAY" | "VNPAY";
export type ToastTone = "info" | "success" | "error";
export type ToastKind = "ticket" | "favorite" | "seat" | "payment" | "reminder" | "auth" | "system";
export type ToastPayload = {
  id: number;
  message: string;
  tone: ToastTone;
  kind: ToastKind;
  closing: boolean;
};

export type Movie = {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  genre: string;
  runtime: string;
  score: string;
  badge: string;
  tone: string;
  description: string;
  status?: string;
  posterUrl?: string | null;
  bannerUrl?: string | null;
  trailerUrl?: string | null;
};

export type Banner = {
  id: number;
  eyebrow: string;
  title: string;
  text: string;
  accent: string;
  imageUrl?: string | null;
};

export type ShowtimeItem = {
  id: number;
  movieId: number;
  cinemaId: number;
  roomId: number;
  cinemaName: string;
  roomName: string;
  startTime: string;
  formatLabel: string;
  languageLabel: string;
  basePrice: number;
  seatLayout: string[][];
};

export type SeatMapRow = {
  rowLabel: string;
  seats: Array<{
    seatCode: string;
    seatType: string;
    price: number;
    status: string;
  }>;
};

export type ComboItem = {
  id: number;
  name: string;
  detail: string;
  price: string;
  unitPrice: number;
};

export type TicketItem = {
  id: number;
  bookingId: number;
  bookingCode: string;
  movie: string;
  cinema: string;
  seat: string;
  time: string;
  status: string;
};

export type SeatSelection = {
  seatCode: string;
  seatType: "STANDARD" | "VIP" | "COUPLE";
  price: number;
};

export type TicketDetail = {
  id: number;
  userId?: number;
  bookingCode: string;
  status: string;
  totalAmount: number;
  discountAmount?: number;
  voucherCode?: string | null;
  paymentMethod: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  qrPayload?: string | null;
  checkInStatus?: string;
  checkedInAt?: string | null;
  showtime: {
    startTime: string;
    formatLabel: string;
    languageLabel: string;
    movieTitle: string;
    cinemaName: string;
    roomName: string;
  };
  seats: Array<{ seatCode: string; seatType: string; price: number }>;
  items: Array<{ foodId: number; quantity: number; price: number; name: string }>;
  reminder?: { remindAt: string; status: string } | null;
};

export type ProfileData = {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  avatarUrl?: string | null;
  createdAt: string;
  stats: {
    favorites: number;
    watchlist: number;
    bookings: number;
    spending: number;
  };
  activity: Array<{
    type: string;
    title: string;
    meta: string;
    time: string;
  }>;
};

export type SessionUser = {
  id: number;
  fullName: string;
  email: string;
  phone?: string | null;
  role: string;
  avatarUrl?: string | null;
};

export type Voucher = {
  id: number;
  code: string;
  title: string;
  description?: string | null;
  discount_type: "PERCENT" | "FIXED";
  discount_value: number;
  min_order_value: number;
  max_discount_value?: number | null;
  expires_at?: string | null;
  is_active?: number | boolean;
};

export type ReminderItem = {
  id: number;
  booking_id: number;
  booking_code: string;
  movie_title: string;
  cinema_name: string;
  remind_at: string;
  status: string;
  start_time: string;
};

export type Setter<T> = React.Dispatch<React.SetStateAction<T>>;
