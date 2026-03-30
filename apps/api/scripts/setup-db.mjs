import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

function getDatabaseUrl() {
  const envPath = path.join(process.cwd(), ".env.local");
  const envContent = fs.readFileSync(envPath, "utf8");
  const line = envContent.split(/\r?\n/).find((item) => item.startsWith("DATABASE_URL="));

  if (!line) {
    throw new Error("Khong tim thay DATABASE_URL trong .env.local");
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
  language_label VARCHAR(60) NOT NULL DEFAULT 'Phu de',
  format_label VARCHAR(80) NOT NULL DEFAULT '2D',
  base_price INT NOT NULL DEFAULT 90000,
  status ENUM('SCHEDULED','SELLING','SOLD_OUT') NOT NULL DEFAULT 'SELLING',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
  CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_bookings_showtime FOREIGN KEY (showtime_id) REFERENCES showtimes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS booking_seats (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  seat_code VARCHAR(20) NOT NULL,
  seat_type ENUM('STANDARD','VIP','COUPLE') NOT NULL DEFAULT 'STANDARD',
  price INT NOT NULL,
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
  { id: 1, fullName: "Admin DatVe", email: "admin@datve.local", phone: "0900000001", role: "ADMIN", avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Admin%20DatVe", password: "Admin@123" },
  { id: 2, fullName: "Nguyen Van A", email: "user@datve.local", phone: "0900000002", role: "USER", avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Nguyen%20Van%20A", password: "User@123" },
  { id: 3, fullName: "Tran Minh Anh", email: "minh.anh@datve.local", phone: "0900000003", role: "USER", avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Tran%20Minh%20Anh", password: "User@123" },
  { id: 4, fullName: "Le Hoang Nam", email: "hoang.nam@datve.local", phone: "0900000004", role: "USER", avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Le%20Hoang%20Nam", password: "User@123" },
  { id: 5, fullName: "Pham Gia Huy", email: "gia.huy@datve.local", phone: "0900000005", role: "USER", avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Pham%20Gia%20Huy", password: "User@123" },
  { id: 6, fullName: "Vo Thu Trang", email: "thu.trang@datve.local", phone: "0900000006", role: "USER", avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Vo%20Thu%20Trang", password: "User@123" },
  { id: 7, fullName: "Bui Khanh Linh", email: "khanh.linh@datve.local", phone: "0900000007", role: "USER", avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Bui%20Khanh%20Linh", password: "User@123" },
  { id: 8, fullName: "Do Quoc Bao", email: "quoc.bao@datve.local", phone: "0900000008", role: "USER", avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Do%20Quoc%20Bao", password: "User@123" },
  { id: 9, fullName: "Dang Thanh Truc", email: "thanh.truc@datve.local", phone: "0900000009", role: "USER", avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Dang%20Thanh%20Truc", password: "User@123" },
  { id: 10, fullName: "Pham Duc Khoa", email: "duc.khoa@datve.local", phone: "0900000010", role: "USER", avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Pham%20Duc%20Khoa", password: "User@123" },
  { id: 11, fullName: "Phan Nhat Vy", email: "nhat.vy@datve.local", phone: "0900000011", role: "USER", avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Phan%20Nhat%20Vy", password: "User@123" },
  { id: 12, fullName: "Cinema Ops 01", email: "ops01@datve.local", phone: "0900000012", role: "STAFF", avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Cinema%20Ops%2001", password: "Staff@123" },
];

const vouchers = [
  { code: "WELCOME50", title: "Chao mung thanh vien moi", description: "Giam 50% toi da 50.000d cho don tu 120.000d", discountType: "PERCENT", discountValue: 50, minOrderValue: 120000, maxDiscountValue: 50000, assignedUserId: null, expiresAt: toMysqlDateTime(addDays(new Date(), 30)), isActive: true },
  { code: "MIDNIGHT20", title: "Suat dem giam 20%", description: "Danh cho cac suat sau 20h, toi da 40.000d", discountType: "PERCENT", discountValue: 20, minOrderValue: 160000, maxDiscountValue: 40000, assignedUserId: null, expiresAt: toMysqlDateTime(addDays(new Date(), 20)), isActive: true },
  { code: "AONLY30K", title: "Qua cho Nguyen Van A", description: "Voucher ca nhan cho user demo", discountType: "FIXED", discountValue: 30000, minOrderValue: 100000, maxDiscountValue: null, assignedUserId: 2, expiresAt: toMysqlDateTime(addDays(new Date(), 14)), isActive: true },
  { code: "FAMILY80K", title: "Family combo gift", description: "Giam 80.000d cho don lon hon 300.000d", discountType: "FIXED", discountValue: 80000, minOrderValue: 300000, maxDiscountValue: null, assignedUserId: null, expiresAt: toMysqlDateTime(addDays(new Date(), 25)), isActive: true },
  { code: "ARCHIVE10", title: "Voucher da tat", description: "Du lieu demo cho admin", discountType: "PERCENT", discountValue: 10, minOrderValue: 0, maxDiscountValue: 20000, assignedUserId: null, expiresAt: null, isActive: false },
];

const banners = [
  { id: 1, title: "Galaxy Week", subtitle: "Mua 2 ve tang 1 combo mini cho suat sau 20h.", accentColor: "#1f2f73", sortOrder: 1, isActive: true },
  { id: 2, title: "Premiere Night", subtitle: "Dat som phim hot va nhan uu dai hoi vien moi.", accentColor: "#5a1826", sortOrder: 2, isActive: true },
  { id: 3, title: "Tuesday Date", subtitle: "Ghe doi giam 15% vao toi thu 3 tai rap lien ket.", accentColor: "#713b16", sortOrder: 3, isActive: true },
  { id: 4, title: "Sinh vien xem dem", subtitle: "Xuat trinh the sinh vien de nhan combo nuoc gia mem.", accentColor: "#0f766e", sortOrder: 4, isActive: true },
  { id: 5, title: "Marathon cuoi tuan", subtitle: "Dat 3 suat lien tiep de mo voucher cho thang sau.", accentColor: "#48257a", sortOrder: 5, isActive: true },
];

const movieSeedSource = [
  ["Nguoi Nhen Da Vu Tru", "Ari Levin", "Hanh dong, Vien tuong", 142, 8.7, "Peter va cac dong doi phai va lai vet nut da vu tru truoc khi moi thuc tai sup do."],
  ["Lat Mat 8", "Le Nhat Minh", "Tinh cam, Hai", 118, 7.6, "Chuyen gia dinh voi nhieu tinh huong bat ngo, hai huoc va cam xuc."],
  ["Bong Toi Bien Mat", "Khang Trinh", "Kinh di, Bi an", 110, 7.1, "Nhung hien tuong ky la lien tuc xuat hien tai benh vien bo hoang o ngoai o."],
  ["Dai Chien Ngan Ha", "Marcus Tran", "Vien tuong, Phieu luu", 130, 0, "Bom tan khoa hoc vien tuong khoi chieu trong thang toi."],
  ["Conan: Vu An Cuoi Cung", "Aoyama Studio", "Hoat hinh, Trinh tham", 104, 0, "Vu an nguy hiem nhat cua Conan tai vung bang gia."],
  ["Mat Ma Bien Dem", "Ngo Thien Bao", "Hanh dong, Toi pham", 123, 8.2, "Doi dieu tra truy duoi duong day rua tien xuyen quoc gia."],
  ["Tho San Mat Trang", "Pham Gia Linh", "Phieu luu, Vien tuong", 127, 8.0, "Nhom du hanh tim kiem kho bau tren ve tinh mat tich."],
  ["Ngay Mai Co Mua Sao Bang", "Hoang Thien", "Tinh cam, Gia tuong", 112, 7.8, "Mot chuyen tinh keo dai qua nhieu moc thoi gian song song."],
  ["Ho So So 13", "Duong Khai", "Trinh tham, Tam ly", 109, 8.1, "Thanh tra tre mo lai ho so lanh da bi chon vui 15 nam."],
  ["Toc Do Thanh Pho", "Jules Park", "Hanh dong, Dua xe", 116, 7.9, "Cuoc dua duong pho cuoi cung de cuu lay gara gia dinh."],
  ["Dem Cuoi O Sai Gon", "Tran Moc An", "Tam ly, Chinh kich", 121, 8.4, "Nam con nguoi, mot dem, va nhung lua chon khong the quay dau."],
  ["Hac Anh Troi Day", "Ly Quoc Tin", "Kinh di, Sieu nhien", 107, 7.5, "Mot nghi thuc co vo tinh danh thuc thuc the bi phong an."],
  ["Chien Tuyen Do", "Vu Quang Duy", "Chien tranh, Chinh kich", 133, 0, "Tieu doi dac nhiem nhan nhiem vu khong tuong o bien gioi."],
  ["Vua Bep Hoc Duong", "Mai Lam Chi", "Hai, Gia dinh", 101, 0, "Cuoc thi nau an lien truong lam dao lon ca khu pho."],
  ["Trai Tim Co Khi", "Elena Vu", "Khoa hoc, Lang man", 119, 0, "Ky su tre dem long yeu mot AI mang ky uc nguoi that."],
  ["Sieu Diep Vu A9", "Nguyen Ai Van", "Hanh dong, Gian diep", 125, 0, "Nu diep vien A9 tham nhap mang luoi vu khi ngam."],
  ["Than Dong Co Vay", "Kim Joon Lee", "The thao, Truyen cam hung", 106, 0, "Cau be tinh le buoc vao giai co vay quoc te."],
  ["Mua He Cua Chung Ta", "An Nhien", "Thanh xuan, Tinh cam", 113, 0, "Nhom ban cu gap lai sau 10 nam trong chuyen di cuoi he."],
  ["Ban Do Thanh Pho Ngam", "Lam Tri Duc", "Phieu luu, Toi pham", 122, 0, "Hai anh em vo tinh mo khoa ban do kho bau duoi long do thi."],
  ["Mat Uoc Tren May", "Trinh Lam Vy", "Tinh cam, Chinh kich", 115, 0, "Hai phi cong tre giu bi mat ve tham hoa suyt xay ra tren khong."],
  ["Bien Ban Sao Hoa", "Kenji Duong", "Khoa hoc, Sinh ton", 129, 0, "To nghien cuu dau tien tren Sao Hoa doi mat su co mat lien lac Trai Dat."],
  ["Van Cuoc Cuoi Ca", "Phuc Hao", "Trinh tham, Hinh su", 111, 0, "Nu bac si phap y truy tim hung thu trong chinh benh vien minh lam viec."],
  ["Dao Gio Do", "Duong Hai Nam", "Kinh di, Sinh ton", 108, 0, "Nhom du khach ket lai tren dao biet lap dung ngay le hien te co."],
  ["Nhip Dap 42", "Quynh An", "Am nhac, Truyen cam hung", 117, 0, "Ban nhac indie tai hop de cuu trung tam nghe thuat sap bi giai toa."],
  ["Bao Trang Bac Cuc", "Ha Minh Truong", "Sinh ton, Phieu luu", 124, 8.3, "Doi cuu ho lao vao vung bang tan de giai cuu con tau nghien cuu mac ket."],
  ["Hen Gap O Dem Thu Bay", "Luu Gia Han", "Tinh cam, Hai", 114, 7.7, "Hai nguoi xa la lien tuc gap nhau trong nhung toi cuoi tuan ky la."],
  ["Lenh Truy Sat 0 Gio", "Thai Vu", "Hanh dong, Giat gan", 119, 8.0, "Cuu dac vu bi truy sat suot mot dem de ngan tai lieu mat bi cong bo."],
  ["Phong Thu So 7", "Bui Kha Uyen", "Am nhac, Bi an", 109, 7.9, "Ca si tre phat hien ban thu ma quai co the thay doi ky uc nguoi nghe."],
  ["Thanh Pho Khong Ngu", "Nguyen Phong", "Chinh kich, Toi pham", 128, 8.5, "Mot dem tuan tra bien thanh cuoc dung do voi ca bo may ngam cua thanh pho."],
  ["Hanh Tinh Thu Chin", "Do Han", "Vien tuong, Khoa hoc", 131, 8.1, "Chuyen bay tham do xa nhat loai nguoi mo ra bi mat ngoai He Mat Troi."],
  ["Khuc Song Lang", "Viet Dong", "Gia dinh, Chinh kich", 116, 0, "Ba chi em tro ve que giai quyet di chuc cua nguoi cha mat tich nhieu nam."],
  ["Tin Hieu 404", "Nha Thu", "Cong nghe, Giat gan", 112, 0, "Nhom lap trinh vien phat hien nen tang mang xa hoi dang thao tung hanh vi cu tri."],
  ["Doan Bang Mau Xanh", "Tra Giang", "Bi an, Tam ly", 105, 0, "Mot cuon phim VHS he lo ky uc khong thuoc ve nguoi xem."],
  ["Mua San Sao", "Phan Nhat Duong", "Thanh xuan, Phieu luu", 118, 0, "Nhom ban tre rong ruoi khap mien Trung de san tran mua sao bang tram nam."],
  ["Vu Dieu Duong Bien", "Lam Phuc Hung", "Hanh dong, Vo thuat", 121, 0, "Vu cong duong pho tro thanh mat xich quan trong trong chuyen an xuyen bien gioi."],
  ["Nha Ga Cuoi Cung", "Phuong Linh", "Gia tuong, Chinh kich", 123, 0, "Nhung hanh khach lo chuyen tau dem buoc vao nha ga khong ton tai tren ban do."],
];

const palette = ["#6d28d9", "#0f766e", "#9333ea", "#c41010", "#0f4c81", "#8a1f3d", "#18534f", "#7c3aed"];
const badgesNow = ["Noi bat", "Top doanh thu", "Hot", "Rap day"];
const badgesSoon = ["Sap chieu", "Dat truoc", "Sneak show"];
const movies = movieSeedSource.map(([title, author, genre, duration, rating, shortDesc], index) => {
  const status = index < 18 ? (index % 5 === 0 ? "TRENDING" : "NOW_SHOWING") : "COMING_SOON";
  const releaseBase = addDays(new Date(), status === "COMING_SOON" ? 3 + (index - 18) : -(index % 20) - 1);
  return {
    id: index + 1,
    slug: slugify(title),
    title,
    subtitle: `${author} | ${shortDesc}`,
    synopsis: `${shortDesc} Phien ban seed nay duoc dong bo lai tu catalog cu cua du an DatVeXemPhim va bo sung them ngu canh booking de giong he thong dang van hanh.`,
    genre,
    durationMinutes: duration,
    releaseDate: toMysqlDate(releaseBase),
    status,
    rating: rating > 0 ? rating : 7.2 + ((index % 8) * 0.2),
    badge: status === "COMING_SOON" ? randomPick(badgesSoon, index) : randomPick(badgesNow, index),
    posterUrl: null,
    bannerUrl: null,
    highlightColor: randomPick(palette, index),
    isFeatured: index < 12,
    boxOfficeRank: status === "COMING_SOON" ? null : index + 1,
  };
});

const cinemas = [
  { id: 1, name: "CGV Nguyen Du", city: "TP.HCM", address: "116 Nguyen Du, Quan 1, TP.HCM", description: "Rap trung tam voi luong dat online cao va suat toi dong deu." },
  { id: 2, name: "CGV Landmark 81", city: "TP.HCM", address: "Vincom Landmark 81, Binh Thanh, TP.HCM", description: "Cum rap flagship, thich hop phim premium va IMAX." },
  { id: 3, name: "CGV Van Hanh Mall", city: "TP.HCM", address: "11 Su Van Hanh, Quan 10, TP.HCM", description: "Tap trung nguoi xem tre, luu luong combo cao." },
  { id: 4, name: "CGV Aeon Tan Phu", city: "TP.HCM", address: "30 Bo Bao Tan Thang, Tan Phu, TP.HCM", description: "Rap gia dinh, dat ve som vao cuoi tuan." },
  { id: 5, name: "CGV Thu Duc", city: "TP.HCM", address: "216 Vo Van Ngan, Thu Duc, TP.HCM", description: "Rap lien ket cho khu vuc Dong Sai Gon." },
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
      name: `Phong ${i + 1}`,
      formatLabel: roomFormats[i],
      seatLayout: roomTemplates[i],
    });
    roomId += 1;
  }
}

const foods = [
  { id: 1, name: "Combo Couple", description: "2 nuoc lon + 1 bap pho mai", price: 159000, category: "COMBO", isActive: true },
  { id: 2, name: "Combo Family", description: "4 nuoc + 2 bap caramel", price: 289000, category: "COMBO", isActive: true },
  { id: 3, name: "Combo Night", description: "1 hotdog + 1 nuoc + 1 bap caramel", price: 119000, category: "COMBO", isActive: true },
  { id: 4, name: "Bap pho mai lon", description: "Bap rang vi pho mai size large", price: 79000, category: "FOOD", isActive: true },
  { id: 5, name: "Nachos phomai", description: "Nachos kem sot phomai cay nhe", price: 69000, category: "FOOD", isActive: true },
  { id: 6, name: "Coca Cola", description: "Nuoc ngot co ga size M", price: 35000, category: "DRINK", isActive: true },
  { id: 7, name: "Tra dao", description: "Tra dao mat lanh tai quay F&B", price: 42000, category: "DRINK", isActive: true },
  { id: 8, name: "Combo Sinh Vien", description: "1 bap vua + 1 nuoc + 1 hotdog mini", price: 99000, category: "COMBO", isActive: true },
  { id: 9, name: "Combo Midnight", description: "2 nuoc + 2 bap mix caramel va bo", price: 189000, category: "COMBO", isActive: true },
  { id: 10, name: "Nuoc suoi", description: "Chai 500ml", price: 20000, category: "DRINK", isActive: true },
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
          item.name === `Phong ${((movieIndex + cinemaOffset) % 3) + 1}`
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
          languageLabel: (movieIndex + slotIndex) % 3 === 0 ? "Long tieng" : "Phu de",
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
    const room = rooms.find((item) => item.cinemaId === cinema.id && item.name === "Phong 2");
    const slot = showtimeSlots[(movieIndex + dayOffset) % showtimeSlots.length];
    showtimes.push({
      id: showtimeId,
      movieId: movie.id,
      cinemaId: cinema.id,
      roomId: room.id,
      startTime: toMysqlDateTime(setTime(date, slot.hour, slot.minute)),
      languageLabel: "Phu de",
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
  banners.map((banner) => [banner.id, banner.title, "Khuyen mai DatVe", banner.subtitle, banner.accentColor, null, banner.sortOrder, banner.isActive ? 1 : 0])
);

await bulkInsert(
  "movies",
  ["id", "slug", "title", "subtitle", "synopsis", "genre", "duration_minutes", "release_date", "status", "rating", "badge", "poster_url", "banner_url", "highlight_color", "is_featured", "box_office_rank"],
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
    returnUrl: "datve://payment-result",
    reviewStatus: status === "PENDING" ? "PENDING" : "AUTO",
    reviewNote: status === "FAILED" ? "Gateway mock tra ve that bai." : null,
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
    "Da reseed thanh cong du lieu DatVe.",
    `movies=${movieCount.total}`,
    `cinemas=${cinemaCount.total}`,
    `rooms=${roomCount.total}`,
    `showtimes=${showtimeCount.total}`,
    `bookings=${bookingCount.total}`,
    `payments=${paymentCount.total}`,
    `favorites=${favoriteCount.total}`,
  ].join(" | ")
);
