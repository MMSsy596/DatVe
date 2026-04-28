import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

function getDatabaseUrl() {
  const envPath = path.join(process.cwd(), ".env.local");
  const envContent = fs.readFileSync(envPath, "utf8");
  const line = envContent.split(/\r?\n/).find((item) => item.startsWith("DATABASE_URL="));

  if (!line) {
    throw new Error("Không tìm thấy DATABASE_URL trong .env.local");
  }

  return line.replace("DATABASE_URL=", "").trim();
}

function slugify(input) {
  return String(input)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toMysqlDateTime(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function toMysqlDate(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function setTime(date, hour, minute = 0) {
  const next = new Date(date);
  next.setHours(hour, minute, 0, 0);
  return next;
}

function randomPick(list, index) {
  return list[index % list.length];
}

function buildSeatLayout(rows, cols) {
  return Array.from({ length: rows }, (_, rowIndex) => {
    const rowLabel = String.fromCharCode(65 + rowIndex);
    return Array.from({ length: cols }, (_, colIndex) => `${rowLabel}${colIndex + 1}`);
  });
}

function inferSeatType(seatCode) {
  const rowLabel = String(seatCode).charAt(0).toUpperCase();
  const column = Number(String(seatCode).replace(/[^0-9]/g, ""));
  if ((rowLabel === "E" || rowLabel === "F") && column >= 5) {
    return "COUPLE";
  }
  if ((rowLabel === "C" || rowLabel === "D") && column >= 8) {
    return "VIP";
  }
  if (column >= 10) {
    return "VIP";
  }
  return "STANDARD";
}

function seatPrice(basePrice, seatType) {
  if (seatType === "VIP") return basePrice + 30000;
  if (seatType === "COUPLE") return basePrice + 90000;
  return basePrice;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

async function bulkInsert(table, columns, rows, chunkSize = 200) {
  if (!rows.length) return;
  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize);
    const placeholders = chunk.map(() => `(${columns.map(() => "?").join(", ")})`).join(", ");
    const values = chunk.flat();
    await connection.query(`INSERT INTO ${table} (${columns.join(", ")}) VALUES ${placeholders}`, values);
  }
}

const connection = await mysql.createConnection({
  uri: getDatabaseUrl(),
  multipleStatements: true,
});

await connection.query("SET FOREIGN_KEY_CHECKS = 0");
for (const table of [
  "user_push_tokens",
  "booking_reminders",
  "voucher_usages",
  "vouchers",
  "payments",
  "booking_items",
  "booking_seats",
  "bookings",
  "favorites",
  "watchlist",
  "user_sessions",
  "room_seats",
  "showtimes",
  "rooms",
  "foods",
  "banners",
  "movies",
  "cinemas",
  "users",
]) {
  await connection.query(`DROP TABLE IF EXISTS ${table}`);
}
await connection.query("SET FOREIGN_KEY_CHECKS = 1");

await connection.query(`
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NULL,
  phone VARCHAR(30) NULL,
  role ENUM('USER','ADMIN','STAFF') NOT NULL DEFAULT 'USER',
  avatar_url TEXT NULL,
  password_updated_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  device_name VARCHAR(120) NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS banners (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(150) NOT NULL,
  eyebrow VARCHAR(120) NULL,
  subtitle VARCHAR(255) NOT NULL,
  accent_color VARCHAR(20) NULL,
  image_url TEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS movies (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  slug VARCHAR(150) NOT NULL UNIQUE,
  title VARCHAR(180) NOT NULL,
  subtitle VARCHAR(255) NULL,
  synopsis TEXT NULL,
  genre VARCHAR(120) NOT NULL,
  duration_minutes INT NOT NULL,
  release_date DATE NULL,
  status ENUM('COMING_SOON','NOW_SHOWING','TRENDING') NOT NULL DEFAULT 'NOW_SHOWING',
  rating DECIMAL(3,1) NOT NULL DEFAULT 0,
  badge VARCHAR(80) NULL,
  poster_url TEXT NULL,
  banner_url TEXT NULL,
  trailer_url TEXT NULL,
  highlight_color VARCHAR(20) NULL,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  box_office_rank INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cinemas (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  city VARCHAR(120) NOT NULL,
  address VARCHAR(255) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  cinema_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(80) NOT NULL,
  format_label VARCHAR(80) NOT NULL,
  seat_layout_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rooms_cinema FOREIGN KEY (cinema_id) REFERENCES cinemas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS room_seats (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  room_id BIGINT UNSIGNED NOT NULL,
  seat_code VARCHAR(20) NOT NULL,
  seat_type ENUM('STANDARD','VIP','COUPLE') NOT NULL DEFAULT 'STANDARD',
  row_label VARCHAR(10) NOT NULL,
  column_index INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_room_seat_code (room_id, seat_code),
  CONSTRAINT fk_room_seats_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS showtimes (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  movie_id BIGINT UNSIGNED NOT NULL,
  cinema_id BIGINT UNSIGNED NOT NULL,
  room_id BIGINT UNSIGNED NOT NULL,
  start_time DATETIME NOT NULL,
  language_label VARCHAR(60) NOT NULL DEFAULT 'Phụ đề',
  format_label VARCHAR(80) NOT NULL DEFAULT '2D',
  base_price INT NOT NULL DEFAULT 90000,
  status ENUM('SCHEDULED','SELLING','SOLD_OUT') NOT NULL DEFAULT 'SELLING',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_showtimes_movie_start (movie_id, start_time),
  KEY idx_showtimes_room_start (room_id, start_time),
  CONSTRAINT fk_showtimes_movie FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
  CONSTRAINT fk_showtimes_cinema FOREIGN KEY (cinema_id) REFERENCES cinemas(id) ON DELETE CASCADE,
  CONSTRAINT fk_showtimes_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS foods (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(255) NULL,
  price INT NOT NULL,
  category ENUM('FOOD','DRINK','COMBO') NOT NULL DEFAULT 'COMBO',
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS bookings (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  showtime_id BIGINT UNSIGNED NOT NULL,
  booking_code VARCHAR(30) NOT NULL UNIQUE,
  status ENUM('PENDING','HELD','PAID','CANCELLED','EXPIRED') NOT NULL DEFAULT 'PENDING',
  total_amount INT NOT NULL DEFAULT 0,
  discount_amount INT NOT NULL DEFAULT 0,
  voucher_code VARCHAR(50) NULL,
  expires_at DATETIME NULL,
  payment_method VARCHAR(50) NULL,
  customer_name VARCHAR(120) NULL,
  customer_email VARCHAR(190) NULL,
  customer_phone VARCHAR(30) NULL,
  qr_payload TEXT NULL,
  check_in_status ENUM('NOT_CHECKED_IN','CHECKED_IN') NOT NULL DEFAULT 'NOT_CHECKED_IN',
  checked_in_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_bookings_showtime_status_expiry (showtime_id, status, expires_at),
  CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_bookings_showtime FOREIGN KEY (showtime_id) REFERENCES showtimes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS booking_seats (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  seat_code VARCHAR(20) NOT NULL,
  seat_type ENUM('STANDARD','VIP','COUPLE') NOT NULL DEFAULT 'STANDARD',
  price INT NOT NULL,
  KEY idx_booking_seats_booking_code (booking_id, seat_code),
  CONSTRAINT fk_booking_seats_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS booking_items (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  food_id BIGINT UNSIGNED NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  price INT NOT NULL,
  CONSTRAINT fk_booking_items_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_items_food FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  provider ENUM('MOMO','ZALOPAY','VNPAY') NOT NULL,
  mode ENUM('MOCK','REAL') NOT NULL DEFAULT 'MOCK',
  gateway_mode ENUM('SANDBOX','REAL') NOT NULL DEFAULT 'SANDBOX',
  provider_txn_ref VARCHAR(80) NOT NULL UNIQUE,
  provider_order_id VARCHAR(120) NULL,
  amount INT NOT NULL,
  status ENUM('INITIATED','PENDING','SUCCESS','FAILED','CANCELLED') NOT NULL DEFAULT 'INITIATED',
  checkout_url TEXT NULL,
  return_url TEXT NULL,
  request_payload JSON NULL,
  response_payload JSON NULL,
  provider_response_code VARCHAR(50) NULL,
  review_status ENUM('AUTO','PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'AUTO',
  review_note TEXT NULL,
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  paid_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_payments_provider_order_id (provider_order_id),
  CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS vouchers (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(40) NOT NULL UNIQUE,
  title VARCHAR(160) NOT NULL,
  description VARCHAR(255) NULL,
  discount_type ENUM('PERCENT','FIXED') NOT NULL,
  discount_value INT NOT NULL,
  min_order_value INT NOT NULL DEFAULT 0,
  max_discount_value INT NULL,
  assigned_user_id BIGINT UNSIGNED NULL,
  expires_at DATETIME NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_vouchers_user FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS voucher_usages (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  voucher_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  code VARCHAR(40) NOT NULL,
  discount_amount INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_voucher_usage_booking (booking_id),
  CONSTRAINT fk_voucher_usage_voucher FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE CASCADE,
  CONSTRAINT fk_voucher_usage_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_voucher_usage_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS booking_reminders (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL UNIQUE,
  user_id BIGINT UNSIGNED NOT NULL,
  remind_at DATETIME NOT NULL,
  status ENUM('SCHEDULED','SENT','CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_reminders_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_reminders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_push_tokens (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  expo_push_token VARCHAR(255) NOT NULL,
  device_id VARCHAR(120) NULL,
  platform ENUM('ios','android','web','unknown') NOT NULL DEFAULT 'unknown',
  app_version VARCHAR(40) NULL,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_push_token (expo_push_token),
  KEY idx_user_push_tokens_user (user_id),
  CONSTRAINT fk_user_push_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS favorites (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  movie_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_favorites_user_movie (user_id, movie_id),
  CONSTRAINT fk_favorites_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_favorites_movie FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS watchlist (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  movie_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_watchlist_user_movie (user_id, movie_id),
  CONSTRAINT fk_watchlist_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_watchlist_movie FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
);
`);

await connection.query("SET FOREIGN_KEY_CHECKS = 0");
for (const table of [
  "user_push_tokens",
  "booking_reminders",
  "voucher_usages",
  "vouchers",
  "payments",
  "booking_items",
  "booking_seats",
  "bookings",
  "favorites",
  "watchlist",
  "user_sessions",
  "room_seats",
  "showtimes",
  "rooms",
  "foods",
  "banners",
  "movies",
  "cinemas",
  "users",
]) {
  await connection.query(`TRUNCATE TABLE ${table}`);
}
await connection.query("SET FOREIGN_KEY_CHECKS = 1");

const users = [
  { id: 1, fullName: "Admin PhimBook", email: "admin@phimbook.local", phone: "0900000001", role: "ADMIN", avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Admin%20PhimBook", password: "Admin@123" },
  { id: 2, fullName: "Nguyễn Văn A", email: "user@phimbook.local", phone: "0900000002", role: "USER", avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Nguyen%20Van%20A", password: "User@123" },
  { id: 3, fullName: "Trần Minh Anh", email: "minh.anh@phimbook.local", phone: "0900000003", role: "USER", avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Tran%20Minh%20Anh", password: "User@123" },
  { id: 4, fullName: "Lê Hoàng Nam", email: "hoang.nam@phimbook.local", phone: "0900000004", role: "USER", avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Le%20Hoang%20Nam", password: "User@123" },
  { id: 5, fullName: "Phạm Gia Huy", email: "gia.huy@phimbook.local", phone: "0900000005", role: "USER", avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Pham%20Gia%20Huy", password: "User@123" },
  { id: 6, fullName: "Võ Thu Trang", email: "thu.trang@phimbook.local", phone: "0900000006", role: "USER", avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Vo%20Thu%20Trang", password: "User@123" },
  { id: 7, fullName: "Bùi Khánh Linh", email: "khanh.linh@phimbook.local", phone: "0900000007", role: "USER", avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Bui%20Khanh%20Linh", password: "User@123" },
  { id: 8, fullName: "Đỗ Quốc Bảo", email: "quoc.bao@phimbook.local", phone: "0900000008", role: "USER", avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Do%20Quoc%20Bao", password: "User@123" },
  { id: 9, fullName: "Đặng Thanh Trúc", email: "thanh.truc@phimbook.local", phone: "0900000009", role: "USER", avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Dang%20Thanh%20Truc", password: "User@123" },
  { id: 10, fullName: "Phạm Đức Khoa", email: "duc.khoa@phimbook.local", phone: "0900000010", role: "USER", avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Pham%20Duc%20Khoa", password: "User@123" },
  { id: 11, fullName: "Phan Nhật Vy", email: "nhat.vy@phimbook.local", phone: "0900000011", role: "USER", avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Phan%20Nhat%20Vy", password: "User@123" },
  { id: 12, fullName: "Cinema Ops 01", email: "ops01@phimbook.local", phone: "0900000012", role: "STAFF", avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Cinema%20Ops%2001", password: "Staff@123" },
];

const vouchers = [
  { code: "WELCOME50", title: "Chào mừng thành viên mới", description: "Giảm 50% tối đa 50.000đ cho đơn từ 120.000đ", discountType: "PERCENT", discountValue: 50, minOrderValue: 120000, maxDiscountValue: 50000, assignedUserId: null, expiresAt: toMysqlDateTime(addDays(new Date(), 30)), isActive: true },
  { code: "MIDNIGHT20", title: "Suất đêm giảm 20%", description: "Dành cho các suất sau 20h, tối đa 40.000đ", discountType: "PERCENT", discountValue: 20, minOrderValue: 160000, maxDiscountValue: 40000, assignedUserId: null, expiresAt: toMysqlDateTime(addDays(new Date(), 20)), isActive: true },
  { code: "AONLY30K", title: "Quà cho Nguyễn Văn A", description: "Voucher cá nhân cho tài khoản demo", discountType: "FIXED", discountValue: 30000, minOrderValue: 100000, maxDiscountValue: null, assignedUserId: 2, expiresAt: toMysqlDateTime(addDays(new Date(), 14)), isActive: true },
  { code: "FAMILY80K", title: "Ưu đãi gia đình", description: "Giảm 80.000đ cho đơn lớn hơn 300.000đ", discountType: "FIXED", discountValue: 80000, minOrderValue: 300000, maxDiscountValue: null, assignedUserId: null, expiresAt: toMysqlDateTime(addDays(new Date(), 25)), isActive: true },
  { code: "ARCHIVE10", title: "Voucher đã tắt", description: "Dữ liệu demo cho admin", discountType: "PERCENT", discountValue: 10, minOrderValue: 0, maxDiscountValue: 20000, assignedUserId: null, expiresAt: null, isActive: false },
];

const banners = [
  { id: 1, title: "Galaxy Week", subtitle: "Mua 2 vé tặng 1 combo mini cho suất sau 20h.", accentColor: "#1f2f73", imageUrl: "/demo-media/promos/banner-1.svg", sortOrder: 1, isActive: true },
  { id: 2, title: "Premiere Night", subtitle: "Đặt sớm phim hot và nhận ưu đãi hội viên mới.", accentColor: "#5a1826", imageUrl: "/demo-media/promos/banner-2.svg", sortOrder: 2, isActive: true },
  { id: 3, title: "Tuesday Date", subtitle: "Ghế đôi giảm 15% vào tối thứ 3 tại rạp liên kết.", accentColor: "#713b16", imageUrl: "/demo-media/promos/banner-3.svg", sortOrder: 3, isActive: true },
  { id: 4, title: "Sinh viên xem đêm", subtitle: "Xuất trình thẻ sinh viên để nhận combo nước giá mềm.", accentColor: "#0f766e", imageUrl: "/demo-media/promos/banner-4.svg", sortOrder: 4, isActive: true },
  { id: 5, title: "Marathon cuối tuần", subtitle: "Đặt 3 suất liên tiếp để mở voucher cho tháng sau.", accentColor: "#48257a", imageUrl: "/demo-media/promos/banner-5.svg", sortOrder: 5, isActive: true },
];

const movieSeedSource = [
  ["Người Nhện Đa Vũ Trụ", "Ari Levin", "Hành động, Viễn tưởng", 142, 8.7, "Peter và các đồng đội phải vá lại vết nứt đa vũ trụ trước khi mọi thực tại sụp đổ."],
  ["Lật Mặt 8", "Lê Nhật Minh", "Tình cảm, Hài", 118, 7.6, "Chuyện gia đình với nhiều tình huống bất ngờ, hài hước và cảm xúc."],
  ["Bóng Tối Biến Mất", "Khang Trịnh", "Kinh dị, Bí ẩn", 110, 7.1, "Những hiện tượng kỳ lạ liên tục xuất hiện tại bệnh viện bỏ hoang ở ngoại ô."],
  ["Đại Chiến Ngân Hà", "Marcus Trần", "Viễn tưởng, Phiêu lưu", 130, 0, "Bom tấn khoa học viễn tưởng khởi chiếu trong tháng tới."],
  ["Conan: Vụ Án Cuối Cùng", "Aoyama Studio", "Hoạt hình, Trinh thám", 104, 0, "Vụ án nguy hiểm nhất của Conan tại vùng băng giá."],
  ["Mật Mã Biển Đêm", "Ngô Thiên Bảo", "Hành động, Tội phạm", 123, 8.2, "Đội điều tra truy đuổi đường dây rửa tiền xuyên quốc gia."],
  ["Thợ Săn Mặt Trăng", "Phạm Gia Linh", "Phiêu lưu, Viễn tưởng", 127, 8.0, "Nhóm du hành tìm kiếm kho báu trên vệ tinh mất tích."],
  ["Ngày Mai Có Mưa Sao Băng", "Hoàng Thiên", "Tình cảm, Giả tưởng", 112, 7.8, "Một chuyện tình kéo dài qua nhiều mốc thời gian song song."],
  ["Hồ Sơ Số 13", "Dương Khải", "Trinh thám, Tâm lý", 109, 8.1, "Thanh tra trẻ mở lại hồ sơ lạnh đã bị chôn vùi 15 năm."],
  ["Tốc Độ Thành Phố", "Jules Park", "Hành động, Đua xe", 116, 7.9, "Cuộc đua đường phố cuối cùng để cứu lấy gara gia đình."],
  ["Đêm Cuối Ở Sài Gòn", "Trần Mộc An", "Tâm lý, Chính kịch", 121, 8.4, "Năm con người, một đêm, và những lựa chọn không thể quay đầu."],
  ["Hắc Ảnh Trỗi Dậy", "Lý Quốc Tín", "Kinh dị, Siêu nhiên", 107, 7.5, "Một nghi thức cổ vô tình đánh thức thực thể bị phong ấn."],
  ["Chiến Tuyến Đỏ", "Vũ Quang Duy", "Chiến tranh, Chính kịch", 133, 0, "Tiểu đội đặc nhiệm nhận nhiệm vụ không tưởng ở biên giới."],
  ["Vua Bếp Học Đường", "Mai Lam Chi", "Hài, Gia đình", 101, 0, "Cuộc thi nấu ăn liên trường làm đảo lộn cả khu phố."],
  ["Trái Tim Cơ Khí", "Elena Vũ", "Khoa học, Lãng mạn", 119, 0, "Kỹ sư trẻ đem lòng yêu một AI mang ký ức người thật."],
  ["Siêu Điệp Vụ A9", "Nguyễn Ái Vân", "Hành động, Gián điệp", 125, 0, "Nữ điệp viên A9 thâm nhập mạng lưới vũ khí ngầm."],
  ["Thần Đồng Cờ Vây", "Kim Joon Lee", "Thể thao, Truyền cảm hứng", 106, 0, "Cậu bé tỉnh lẻ bước vào giải cờ vây quốc tế."],
  ["Mùa Hè Của Chúng Ta", "An Nhiên", "Thanh xuân, Tình cảm", 113, 0, "Nhóm bạn cũ gặp lại sau 10 năm trong chuyến đi cuối hè."],
  ["Bản Đồ Thành Phố Ngầm", "Lâm Trí Đức", "Phiêu lưu, Tội phạm", 122, 0, "Hai anh em vô tình mở khóa bản đồ kho báu dưới lòng đô thị."],
  ["Mật Ước Trên Mây", "Trịnh Lam Vy", "Tình cảm, Chính kịch", 115, 0, "Hai phi công trẻ giữ bí mật về thảm họa suýt xảy ra trên không."],
  ["Biên Bản Sao Hỏa", "Kenji Dương", "Khoa học, Sinh tồn", 129, 0, "Tổ nghiên cứu đầu tiên trên Sao Hỏa đối mặt sự cố mất liên lạc Trái Đất."],
  ["Ván Cược Cuối Ca", "Phúc Hạo", "Trinh thám, Hình sự", 111, 0, "Nữ bác sĩ pháp y truy tìm hung thủ trong chính bệnh viện mình làm việc."],
  ["Đảo Gió Đỏ", "Dương Hải Nam", "Kinh dị, Sinh tồn", 108, 0, "Nhóm du khách kẹt lại trên đảo biệt lập đúng ngày lễ hiến tế cổ."],
  ["Nhịp Đập 42", "Quỳnh An", "Âm nhạc, Truyền cảm hứng", 117, 0, "Ban nhạc indie tái hợp để cứu trung tâm nghệ thuật sắp bị giải tỏa."],
  ["Bão Trắng Bắc Cực", "Hà Minh Trường", "Sinh tồn, Phiêu lưu", 124, 8.3, "Đội cứu hộ lao vào vùng băng tan để giải cứu con tàu nghiên cứu mắc kẹt."],
  ["Hẹn Gặp Ở Đêm Thứ Bảy", "Lưu Gia Hân", "Tình cảm, Hài", 114, 7.7, "Hai người xa lạ liên tục gặp nhau trong những tối cuối tuần kỳ lạ."],
  ["Lệnh Truy Sát 0 Giờ", "Thái Vũ", "Hành động, Giật gân", 119, 8.0, "Cựu đặc vụ bị truy sát suốt một đêm để ngăn tài liệu mật bị công bố."],
  ["Phòng Thu Số 7", "Bùi Khả Uyên", "Âm nhạc, Bí ẩn", 109, 7.9, "Ca sĩ trẻ phát hiện bản thu ma quái có thể thay đổi ký ức người nghe."],
  ["Thành Phố Không Ngủ", "Nguyễn Phong", "Chính kịch, Tội phạm", 128, 8.5, "Một đêm tuần tra biến thành cuộc đụng độ với cả bộ máy ngầm của thành phố."],
  ["Hành Tinh Thứ Chín", "Đỗ Hân", "Viễn tưởng, Khoa học", 131, 8.1, "Chuyến bay thăm dò xa nhất loài người mở ra bí mật ngoài Hệ Mặt Trời."],
  ["Khúc Sóng Lặng", "Việt Đông", "Gia đình, Chính kịch", 116, 0, "Ba chị em trở về quê giải quyết di chúc của người cha mất tích nhiều năm."],
  ["Tín Hiệu 404", "Nhã Thu", "Công nghệ, Giật gân", 112, 0, "Nhóm lập trình viên phát hiện nền tảng mạng xã hội đang thao túng hành vi cử tri."],
  ["Đoạn Băng Màu Xanh", "Trà Giang", "Bí ẩn, Tâm lý", 105, 0, "Một cuốn phim VHS hé lộ ký ức không thuộc về người xem."],
  ["Mùa Săn Sao", "Phan Nhật Dương", "Thanh xuân, Phiêu lưu", 118, 0, "Nhóm bạn trẻ rong ruổi khắp miền Trung để săn trận mưa sao băng trăm năm."],
  ["Vũ Điệu Đường Biên", "Lâm Phúc Hưng", "Hành động, Võ thuật", 121, 0, "Vũ công đường phố trở thành mắt xích quan trọng trong chuyên án xuyên biên giới."],
  ["Nhà Ga Cuối Cùng", "Phương Linh", "Giả tưởng, Chính kịch", 123, 0, "Những hành khách lỡ chuyến tàu đêm bước vào nhà ga không tồn tại trên bản đồ."],
  ["Bão Mùa Neon", "NanBao Studio", "Hành động, Công nghệ", 126, 0, "Một thành phố thông minh mất kiểm soát khi hệ thống giao thông tự học quay sang săn lùng người tạo ra nó."],
  ["Mật Lệnh Hoa Phượng", "Tạ Minh Kha", "Thanh xuân, Trinh thám", 114, 0, "Nhóm học sinh cuối cấp giải mã chuỗi thư bí ẩn dẫn tới vụ mất tích nhiều năm trước trong sân trường."],
  ["Dòng Sông Không Tên", "Võ Gia Huy", "Chính kịch, Bí ẩn", 120, 0, "Người lái đò già giữ một bí mật liên quan đến những hành khách chỉ xuất hiện vào đêm trăng non."],
  ["Ranh Giới Ký Ức", "Hà Yên Chi", "Tâm lý, Khoa học", 117, 0, "Bác sĩ thần kinh thử nghiệm công nghệ ghép ký ức và vô tình đánh thức một vụ án đã bị xóa khỏi hồ sơ."],
  ["Trạm Cuối Sao Kim", "Lục Thiên Ân", "Viễn tưởng, Sinh tồn", 134, 0, "Tổ đội sửa chữa tỉnh dậy giữa trạm nghiên cứu bỏ hoang trên Sao Kim với lượng oxy chỉ đủ cho 12 giờ."],
  ["Kẻ Gọi Mưa", "Ngô Nhật Tân", "Kinh dị, Dân gian", 108, 0, "Một miền biển hạn kéo dài đón cơn mưa đầu mùa cùng chuỗi hiện tượng hiến tế khó lý giải."],
  ["Số Ghế 27", "Trần Bảo Ý", "Giật gân, Bí ẩn", 102, 0, "Mỗi khán giả ngồi đúng ghế số 27 trong rạp cũ đều nhìn thấy một đoạn kết khác nhau của cùng một bộ phim."],
  ["Bản Giao Hưởng Tro Tàn", "Lê Vân Khôi", "Âm nhạc, Chính kịch", 119, 0, "Nhạc trưởng sa sút tập hợp dàn nhạc cuối cùng để biểu diễn giữa thành phố vừa trải qua đại hỏa hoạn."],
];

const palette = ["#6d28d9", "#0f766e", "#9333ea", "#c41010", "#0f4c81", "#8a1f3d", "#18534f", "#7c3aed"];
const badgesNow = ["Nổi bật", "Top doanh thu", "Hot", "Rạp đầy"];
const badgesSoon = ["Sắp chiếu", "Đặt trước", "Sneak show"];
const trailerCatalog = [
  "https://www.youtube.com/embed/EXeTwQWrcwY?playsinline=1",
  "https://www.youtube.com/embed/TcMBFSGVi1c?playsinline=1",
  "https://www.youtube.com/embed/8ugaeA-nMTc?playsinline=1",
  "https://www.youtube.com/embed/hA6hldpSTF8?playsinline=1",
  "https://www.youtube.com/embed/qSqVVswa420?playsinline=1",
  "https://www.youtube.com/embed/6ZfuNTqbHE8?playsinline=1",
];
const movies = movieSeedSource.map(([title, author, genre, duration, rating, shortDesc], index) => {
  const status = index < 18 ? (index % 5 === 0 ? "TRENDING" : "NOW_SHOWING") : "COMING_SOON";
  const releaseBase = addDays(new Date(), status === "COMING_SOON" ? 3 + (index - 18) : -(index % 20) - 1);
  const slug = slugify(title);
  return {
    id: index + 1,
    slug,
    title,
    subtitle: `${author} | ${shortDesc}`,
    synopsis: `${shortDesc} Phiên bản seed này được đồng bộ lại từ catalog cũ của dự án DatVeXemPhim và bổ sung thêm ngữ cảnh booking để giống hệ thống đang vận hành.`,
    genre,
    durationMinutes: duration,
    releaseDate: toMysqlDate(releaseBase),
    status,
    rating: rating > 0 ? rating : 7.2 + ((index % 8) * 0.2),
    badge: status === "COMING_SOON" ? randomPick(badgesSoon, index) : randomPick(badgesNow, index),
    posterUrl: `/demo-media/posters/${slug}.svg`,
    bannerUrl: `/demo-media/banners/${slug}.svg`,
    trailerUrl: trailerCatalog[index % trailerCatalog.length],
    highlightColor: randomPick(palette, index),
    isFeatured: index < 12,
    boxOfficeRank: status === "COMING_SOON" ? null : index + 1,
  };
});

const cinemas = [
  { id: 1, name: "CGV Nguyễn Du", city: "TP.HCM", address: "116 Nguyễn Du, Quận 1, TP.HCM", description: "Rạp trung tâm với lượng đặt online cao và suất tối đông đều." },
  { id: 2, name: "CGV Landmark 81", city: "TP.HCM", address: "Vincom Landmark 81, Bình Thạnh, TP.HCM", description: "Cụm rạp flagship, thích hợp phim premium và IMAX." },
  { id: 3, name: "CGV Vạn Hạnh Mall", city: "TP.HCM", address: "11 Sư Vạn Hạnh, Quận 10, TP.HCM", description: "Tập trung người xem trẻ, lưu lượng combo cao." },
  { id: 4, name: "CGV Aeon Tân Phú", city: "TP.HCM", address: "30 Bờ Bao Tân Thắng, Tân Phú, TP.HCM", description: "Rạp gia đình, đặt vé sớm vào cuối tuần." },
  { id: 5, name: "CGV Thủ Đức", city: "TP.HCM", address: "216 Võ Văn Ngân, Thủ Đức, TP.HCM", description: "Rạp liên kết cho khu vực Đông Sài Gòn." },
];

const roomFormats = ["IMAX", "Dolby Atmos", "2D LUXE"];
const roomTemplates = [buildSeatLayout(6, 10), buildSeatLayout(6, 12), buildSeatLayout(7, 10)];

const rooms = [];
let roomId = 1;
for (const cinema of cinemas) {
  for (let i = 0; i < 3; i += 1) {
    rooms.push({
      id: roomId,
      cinemaId: cinema.id,
      name: `Phòng ${i + 1}`,
      formatLabel: roomFormats[i],
      seatLayout: roomTemplates[i],
    });
    roomId += 1;
  }
}

const foods = [
  { id: 1, name: "Combo Cặp đôi", description: "2 nước lớn + 1 bắp phô mai", price: 159000, category: "COMBO", isActive: true },
  { id: 2, name: "Combo Gia đình", description: "4 nước + 2 bắp caramel", price: 289000, category: "COMBO", isActive: true },
  { id: 3, name: "Combo Đêm", description: "1 hotdog + 1 nước + 1 bắp caramel", price: 119000, category: "COMBO", isActive: true },
  { id: 4, name: "Bắp phô mai lớn", description: "Bắp rang vị phô mai cỡ lớn", price: 79000, category: "FOOD", isActive: true },
  { id: 5, name: "Nachos phô mai", description: "Nachos kèm sốt phô mai cay nhẹ", price: 69000, category: "FOOD", isActive: true },
  { id: 6, name: "Coca-Cola", description: "Nước ngọt có ga cỡ M", price: 35000, category: "DRINK", isActive: true },
  { id: 7, name: "Trà đào", description: "Trà đào mát lạnh tại quầy F&B", price: 42000, category: "DRINK", isActive: true },
  { id: 8, name: "Combo Sinh viên", description: "1 bắp vừa + 1 nước + 1 hotdog mini", price: 99000, category: "COMBO", isActive: true },
  { id: 9, name: "Combo Midnight", description: "2 nước + 2 bắp mix caramel và bơ", price: 189000, category: "COMBO", isActive: true },
  { id: 10, name: "Nước suối", description: "Chai 500ml", price: 20000, category: "DRINK", isActive: true },
];

const today = new Date();
today.setHours(0, 0, 0, 0);
const sellingMovies = movies.filter((movie) => movie.status !== "COMING_SOON");
const comingSoonMovies = movies.filter((movie) => movie.status === "COMING_SOON");
const showtimeSlots = [
  { hour: 9, minute: 0 },
  { hour: 11, minute: 45 },
  { hour: 14, minute: 30 },
  { hour: 17, minute: 15 },
  { hour: 20, minute: 0 },
  { hour: 22, minute: 15 },
];

const showtimes = [];
let showtimeId = 1;

for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
  const date = addDays(today, dayOffset);
  sellingMovies.forEach((movie, movieIndex) => {
    const primaryCinema = cinemas[(movieIndex + dayOffset) % cinemas.length];
    const secondaryCinema = cinemas[(movieIndex + dayOffset + 2) % cinemas.length];
    for (const [cinemaOffset, cinema] of [primaryCinema, secondaryCinema].entries()) {
      const room = rooms.find(
        (item) =>
          item.cinemaId === cinema.id &&
          item.name === `Phòng ${((movieIndex + cinemaOffset) % 3) + 1}`
      );
      const selectedSlotIndexes = movieIndex % 2 === 0 ? [0, 2, 4] : [1, 3, 5];
      for (const slotIndex of selectedSlotIndexes) {
        const slot = showtimeSlots[slotIndex];
        const startTime = setTime(date, slot.hour, slot.minute);
        const basePrice = slot.hour >= 20 ? 125000 : slot.hour >= 17 ? 110000 : 90000;
        const weekendSurcharge = date.getDay() === 0 || date.getDay() === 6 ? 10000 : 0;
        showtimes.push({
          id: showtimeId,
          movieId: movie.id,
          cinemaId: cinema.id,
          roomId: room.id,
          startTime: toMysqlDateTime(startTime),
          languageLabel: (movieIndex + slotIndex) % 3 === 0 ? "Lồng tiếng" : "Phụ đề",
          formatLabel: room.formatLabel,
          basePrice: basePrice + weekendSurcharge,
          status: dayOffset === 0 && slot.hour < 12 ? "SOLD_OUT" : "SELLING",
        });
        showtimeId += 1;
      }
    }
  });
}

for (let dayOffset = 3; dayOffset < 10; dayOffset += 1) {
  const date = addDays(today, dayOffset);
  comingSoonMovies.forEach((movie, movieIndex) => {
    const cinema = cinemas[(movieIndex + dayOffset) % cinemas.length];
    const room = rooms.find((item) => item.cinemaId === cinema.id && item.name === "Phòng 2");
    const slot = showtimeSlots[(movieIndex + dayOffset) % showtimeSlots.length];
    showtimes.push({
      id: showtimeId,
      movieId: movie.id,
      cinemaId: cinema.id,
      roomId: room.id,
      startTime: toMysqlDateTime(setTime(date, slot.hour, slot.minute)),
      languageLabel: "Phụ đề",
      formatLabel: room.formatLabel,
      basePrice: 100000 + ((movieIndex % 3) * 10000),
      status: "SCHEDULED",
    });
    showtimeId += 1;
  });
}

await bulkInsert(
  "users",
  ["id", "full_name", "email", "password_hash", "phone", "role", "avatar_url"],
  users.map((user) => [user.id, user.fullName, user.email, hashPassword(user.password), user.phone, user.role, user.avatarUrl])
);

await bulkInsert(
  "banners",
  ["id", "title", "eyebrow", "subtitle", "accent_color", "image_url", "sort_order", "is_active"],
  banners.map((banner) => [banner.id, banner.title, "Khuyến mãi Đặt Vé", banner.subtitle, banner.accentColor, banner.imageUrl ?? null, banner.sortOrder, banner.isActive ? 1 : 0])
);

await bulkInsert(
  "movies",
  ["id", "slug", "title", "subtitle", "synopsis", "genre", "duration_minutes", "release_date", "status", "rating", "badge", "poster_url", "banner_url", "trailer_url", "highlight_color", "is_featured", "box_office_rank"],
  movies.map((movie) => [
    movie.id,
    movie.slug,
    movie.title,
    movie.subtitle,
    movie.synopsis,
    movie.genre,
    movie.durationMinutes,
    movie.releaseDate,
    movie.status,
    movie.rating,
    movie.badge,
    movie.posterUrl,
    movie.bannerUrl,
    movie.trailerUrl,
    movie.highlightColor,
    movie.isFeatured ? 1 : 0,
    movie.boxOfficeRank,
  ]),
  100
);

await bulkInsert(
  "cinemas",
  ["id", "name", "city", "address", "description"],
  cinemas.map((cinema) => [cinema.id, cinema.name, cinema.city, cinema.address, cinema.description])
);

await bulkInsert(
  "rooms",
  ["id", "cinema_id", "name", "format_label", "seat_layout_json"],
  rooms.map((room) => [room.id, room.cinemaId, room.name, room.formatLabel, JSON.stringify(room.seatLayout)])
);

const roomSeatRows = rooms.flatMap((room) =>
  room.seatLayout.flat().map((seatCode) => [
    room.id,
    seatCode,
    inferSeatType(seatCode),
    String(seatCode).charAt(0).toUpperCase(),
    Number(String(seatCode).replace(/[^0-9]/g, "")),
    1,
  ])
);
await bulkInsert(
  "room_seats",
  ["room_id", "seat_code", "seat_type", "row_label", "column_index", "is_active"],
  roomSeatRows,
  250
);

await bulkInsert(
  "showtimes",
  ["id", "movie_id", "cinema_id", "room_id", "start_time", "language_label", "format_label", "base_price", "status"],
  showtimes.map((showtime) => [
    showtime.id,
    showtime.movieId,
    showtime.cinemaId,
    showtime.roomId,
    showtime.startTime,
    showtime.languageLabel,
    showtime.formatLabel,
    showtime.basePrice,
    showtime.status,
  ]),
  150
);

await bulkInsert(
  "foods",
  ["id", "name", "description", "price", "category", "is_active"],
  foods.map((food) => [food.id, food.name, food.description, food.price, food.category, food.isActive ? 1 : 0])
);

const favoritePairs = [];
const watchlistPairs = [];
for (const user of users.filter((item) => item.role === "USER")) {
  const userBase = user.id * 2;
  for (let i = 0; i < 3; i += 1) favoritePairs.push([user.id, ((userBase + i) % 12) + 1]);
  for (let i = 0; i < 2; i += 1) watchlistPairs.push([user.id, 19 + ((userBase + i) % 10)]);
}

await bulkInsert("favorites", ["user_id", "movie_id"], favoritePairs);
await bulkInsert("watchlist", ["user_id", "movie_id"], watchlistPairs);

await bulkInsert(
  "vouchers",
  ["code", "title", "description", "discount_type", "discount_value", "min_order_value", "max_discount_value", "assigned_user_id", "expires_at", "is_active"],
  vouchers.map((voucher) => [
    voucher.code,
    voucher.title,
    voucher.description,
    voucher.discountType,
    voucher.discountValue,
    voucher.minOrderValue,
    voucher.maxDiscountValue,
    voucher.assignedUserId,
    voucher.expiresAt,
    voucher.isActive ? 1 : 0,
  ])
);

const roomSeatIndex = new Map(
  rooms.map((room) => [
    room.id,
    room.seatLayout.flat().map((seatCode) => ({
      seatCode,
      seatType: inferSeatType(seatCode),
    })),
  ])
);

const usedSeatsByShowtime = new Map();

function takeSeats(showtime, count) {
  const catalog = roomSeatIndex.get(showtime.roomId) ?? [];
  const used = usedSeatsByShowtime.get(showtime.id) ?? new Set();
  const picked = [];

  for (const seat of catalog) {
    if (used.has(seat.seatCode)) continue;
    picked.push(seat);
    used.add(seat.seatCode);
    if (picked.length >= count) break;
  }

  usedSeatsByShowtime.set(showtime.id, used);
  return picked;
}

const bookingStatuses = ["PAID", "PAID", "PAID", "PENDING", "PAID", "HELD", "EXPIRED"];
const paymentProviders = ["MOMO", "ZALOPAY", "VNPAY"];
const activeShowtimes = showtimes.filter((showtime) => showtime.status !== "SCHEDULED");
let bookingCodeIndex = 1;
const bookings = [];
const bookingSeats = [];
const bookingItems = [];
const payments = [];
const reminders = [];

for (let index = 0; index < activeShowtimes.length; index += 5) {
  const showtime = activeShowtimes[index];
  const status = bookingStatuses[index % bookingStatuses.length];
  const user = users[1 + (index % (users.length - 2))];
  const seatCount = status === "PAID" && index % 4 === 0 ? 3 : 2;
  const seats = takeSeats(showtime, seatCount);
  if (seats.length === 0) continue;

  const items =
    index % 3 === 0 ? [foods[index % foods.length]] : index % 4 === 0 ? [foods[0], foods[5]] : [];
  const totalSeat = seats.reduce((sum, seat) => sum + seatPrice(showtime.basePrice, seat.seatType), 0);
  const totalItems = items.reduce((sum, item) => sum + item.price, 0);
  const voucher = index % 9 === 0 ? vouchers[index % vouchers.length] : null;
  const rawOrder = totalSeat + totalItems;
  const voucherDiscount = voucher
    ? voucher.discountType === "PERCENT"
      ? Math.min(Math.floor((rawOrder * voucher.discountValue) / 100), voucher.maxDiscountValue ?? Number.MAX_SAFE_INTEGER)
      : voucher.discountValue
    : 0;
  const effectiveDiscount = rawOrder >= (voucher?.minOrderValue ?? Number.MAX_SAFE_INTEGER) ? voucherDiscount : 0;
  const startAt = new Date(showtime.startTime.replace(" ", "T"));
  const createdSeedDay = addDays(today, -(index % 7));
  const createdSeedTime = setTime(createdSeedDay, 9 + (index % 10), (index % 6) * 10);
  const createdAt = new Date(Math.min(createdSeedTime.getTime(), startAt.getTime() - 2 * 3600_000, Date.now()));
  const expiresAt =
    status === "HELD"
      ? new Date(Date.now() + 8 * 60_000)
      : status === "EXPIRED"
        ? new Date(Date.now() - 20 * 60_000)
        : null;

  bookings.push({
    id: bookingCodeIndex,
    userId: user.id,
    showtimeId: showtime.id,
    bookingCode: `DV${String(bookingCodeIndex).padStart(5, "0")}`,
    status,
    totalAmount: Math.max(rawOrder - effectiveDiscount, 0),
    discountAmount: effectiveDiscount,
    voucherCode: effectiveDiscount > 0 ? voucher?.code ?? null : null,
    expiresAt: expiresAt ? toMysqlDateTime(expiresAt) : null,
    paymentMethod: randomPick(paymentProviders, index),
    customerName: user.fullName,
    customerEmail: user.email,
    customerPhone: user.phone,
    qrPayload: `DATVE|DV${String(bookingCodeIndex).padStart(5, "0")}|${showtime.id}|${user.id}`,
    checkInStatus: status === "PAID" && index % 13 === 0 ? "CHECKED_IN" : "NOT_CHECKED_IN",
    checkedInAt: status === "PAID" && index % 13 === 0 ? toMysqlDateTime(new Date(createdAt.getTime() + 3 * 3600_000)) : null,
    createdAt: toMysqlDateTime(createdAt),
  });

  for (const seat of seats) {
    bookingSeats.push({
      bookingId: bookingCodeIndex,
      seatCode: seat.seatCode,
      seatType: seat.seatType,
      price: seatPrice(showtime.basePrice, seat.seatType),
    });
  }

  for (const item of items) {
    bookingItems.push({
      bookingId: bookingCodeIndex,
      foodId: item.id,
      quantity: 1,
      price: item.price,
    });
  }

  payments.push({
    bookingId: bookingCodeIndex,
    provider: randomPick(paymentProviders, index),
    mode: "MOCK",
    providerTxnRef: `TXN${String(bookingCodeIndex).padStart(6, "0")}`,
    amount: Math.max(rawOrder - effectiveDiscount, 0),
    status: status === "PAID" ? "SUCCESS" : status === "PENDING" ? "PENDING" : status === "HELD" ? "INITIATED" : "FAILED",
    checkoutUrl: `http://localhost:3001/pay/TXN${String(bookingCodeIndex).padStart(6, "0")}`,
    returnUrl: "phimbook://payment-result",
    reviewStatus: status === "PENDING" ? "PENDING" : "AUTO",
    reviewNote: status === "FAILED" ? "Gateway mock trả về thất bại." : null,
    reviewedBy: status === "PENDING" && index % 2 === 0 ? 1 : null,
    reviewedAt: status === "PENDING" && index % 2 === 0 ? toMysqlDateTime(new Date(createdAt.getTime() + 10 * 60_000)) : null,
    paidAt: status === "PAID" ? toMysqlDateTime(new Date(createdAt.getTime() + 5 * 60_000)) : null,
  });

  if ((status === "PAID" || status === "PENDING") && startAt.getTime() > Date.now()) {
    reminders.push({
      bookingId: bookingCodeIndex,
      userId: user.id,
      remindAt: toMysqlDateTime(new Date(startAt.getTime() - 60 * 60_000)),
      status: index % 11 === 0 ? "SENT" : "SCHEDULED",
    });
  }

  bookingCodeIndex += 1;
}

await bulkInsert(
  "bookings",
  ["id", "user_id", "showtime_id", "booking_code", "status", "total_amount", "discount_amount", "voucher_code", "expires_at", "payment_method", "customer_name", "customer_email", "customer_phone", "qr_payload", "check_in_status", "checked_in_at", "created_at", "updated_at"],
  bookings.map((booking) => [
    booking.id,
    booking.userId,
    booking.showtimeId,
    booking.bookingCode,
    booking.status,
    booking.totalAmount,
    booking.discountAmount,
    booking.voucherCode,
    booking.expiresAt,
    booking.paymentMethod,
    booking.customerName,
    booking.customerEmail,
    booking.customerPhone,
    booking.qrPayload,
    booking.checkInStatus,
    booking.checkedInAt,
    booking.createdAt,
    booking.createdAt,
  ]),
  150
);

await bulkInsert(
  "booking_seats",
  ["booking_id", "seat_code", "seat_type", "price"],
  bookingSeats.map((seat) => [seat.bookingId, seat.seatCode, seat.seatType, seat.price]),
  300
);

await bulkInsert(
  "booking_items",
  ["booking_id", "food_id", "quantity", "price"],
  bookingItems.map((item) => [item.bookingId, item.foodId, item.quantity, item.price]),
  300
);

await bulkInsert(
  "payments",
  ["booking_id", "provider", "mode", "gateway_mode", "provider_txn_ref", "provider_order_id", "amount", "status", "checkout_url", "return_url", "review_status", "review_note", "reviewed_by", "reviewed_at", "paid_at"],
  payments.map((payment) => [
    payment.bookingId,
    payment.provider,
    payment.mode,
    "SANDBOX",
    payment.providerTxnRef,
    payment.providerTxnRef,
    payment.amount,
    payment.status,
    payment.checkoutUrl,
    payment.returnUrl,
    payment.reviewStatus,
    payment.reviewNote,
    payment.reviewedBy,
    payment.reviewedAt,
    payment.paidAt,
  ]),
  150
);

await bulkInsert(
  "booking_reminders",
  ["booking_id", "user_id", "remind_at", "status"],
  reminders.map((reminder) => [reminder.bookingId, reminder.userId, reminder.remindAt, reminder.status]),
  150
);

const [[movieCount]] = await connection.query("SELECT COUNT(*) AS total FROM movies");
const [[cinemaCount]] = await connection.query("SELECT COUNT(*) AS total FROM cinemas");
const [[roomCount]] = await connection.query("SELECT COUNT(*) AS total FROM rooms");
const [[showtimeCount]] = await connection.query("SELECT COUNT(*) AS total FROM showtimes");
const [[bookingCount]] = await connection.query("SELECT COUNT(*) AS total FROM bookings");
const [[paymentCount]] = await connection.query("SELECT COUNT(*) AS total FROM payments");
const [[favoriteCount]] = await connection.query("SELECT COUNT(*) AS total FROM favorites");

await connection.end();

console.log(
  [
    "Đã reseed thành công dữ liệu Đặt Vé.",
    `movies=${movieCount.total}`,
    `cinemas=${cinemaCount.total}`,
    `rooms=${roomCount.total}`,
    `showtimes=${showtimeCount.total}`,
    `bookings=${bookingCount.total}`,
    `payments=${paymentCount.total}`,
    `favorites=${favoriteCount.total}`,
  ].join(" | ")
);
