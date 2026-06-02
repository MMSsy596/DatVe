// Shared types for CinePlus Admin Dashboard

export type ActiveSection =
  | "dashboard"
  | "movies"
  | "cinemas"
  | "showtimes"
  | "food"
  | "vouchers"
  | "payments"
  | "checkin"
  | "banners"
  | "users"
  | "feedbacks";

export type FeedbackItem = {
  id: number;
  userId: number;
  type: "SERVICE" | "CINEMA" | "TICKET" | "OTHER";
  cinemaId: number | null;
  bookingId: number | null;
  title: string;
  content: string;
  imageUrl: string | null;
  status: "PENDING" | "PROCESSING" | "RESOLVED" | "REJECTED";
  responseContent: string | null;
  responderId: number | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  customerEmail: string;
  cinemaName: string | null;
  bookingCode: string | null;
};

export type Item = Record<string, unknown>;

export type Stats = {
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

export type AdminUser = {
  fullName: string;
  role: string;
  email?: string;
};

export type MovieForm = {
  slug: string;
  title: string;
  genre: string;
  durationMinutes: string;
  status: string;
  rating: string;
  posterUrl: string;
  bannerUrl: string;
};

export type CinemaForm = {
  name: string;
  city: string;
  address: string;
  description: string;
};

export type RoomForm = {
  cinemaId: string;
  name: string;
  formatLabel: string;
};

export type ShowtimeForm = {
  movieId: string;
  cinemaId: string;
  roomId: string;
  startTime: string;
  languageLabel: string;
  formatLabel: string;
  basePrice: string;
  status: string;
};

export type FoodForm = {
  name: string;
  description: string;
  price: string;
  category: string;
  isActive: boolean;
};

export type VoucherForm = {
  code: string;
  title: string;
  description: string;
  discountType: string;
  discountValue: string;
  minOrderValue: string;
  maxDiscountValue: string;
  assignedUserId: string;
  expiresAt: string;
  isActive: boolean;
};

export type BannerForm = {
  eyebrow: string;
  title: string;
  subtitle: string;
  accentColor: string;
  imageUrl: string;
  sortOrder: string;
};
