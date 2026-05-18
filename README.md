# DatVe - Hệ thống đặt vé xem phim

DatVe là monorepo gồm ứng dụng mobile cho khách hàng, trang quản trị và backend API cho nghiệp vụ đặt vé xem phim.

## Thành phần

- `apps/mobile`: ứng dụng React Native/Expo cho khách hàng.
- `apps/admin`: dashboard quản trị bằng Next.js.
- `apps/api`: backend Next.js API, MySQL, thanh toán sandbox, thông báo và AI assistant.

## Yêu cầu môi trường

- Node.js `22.x`. Repo đã có script dùng Node 22 cục bộ:

```powershell
. .\scripts\use-node22.ps1
```

- MySQL hoặc `DATABASE_URL` trỏ tới MySQL online.
- Nếu build Android release local, cần JDK và biến môi trường `JAVA_HOME`.

## Cài đặt

```powershell
. .\scripts\use-node22.ps1
npm install
```

Tạo môi trường API:

```powershell
Copy-Item apps\api\.env.example apps\api\.env.local
```

Sau đó sửa `DATABASE_URL` để trỏ MySQL online và giữ `PUBLIC_API_ORIGIN=http://localhost:3001` khi chạy local.

Khởi tạo dữ liệu mẫu:

```powershell
npm run db:setup --workspace api
```

## Chạy dự án

```powershell
npm run dev
```

Mặc định:

- API: `http://localhost:3001`
- Admin: `http://localhost:3000`
- User web: Expo mở theo terminal, thường là `http://localhost:8081`.
- Android emulator gọi API qua `http://10.0.2.2:3001/api/v1`.

Nếu chỉ muốn chạy API và admin web:

```powershell
npm run dev:web
```

Nếu chạy trên điện thoại thật, đổi `EXPO_PUBLIC_API_BASE_URL` trong `apps/mobile/.env` sang IP LAN của máy, ví dụ `http://192.168.1.10:3001/api/v1`.

## Kiểm tra chất lượng

```powershell
npm run verify
```

Lệnh này chạy lint admin/API, test nghiệp vụ API, typecheck mobile và build admin/API.

Build Android release local:

```powershell
npm run android:release --workspace mobile
```

Lệnh này cần JDK hợp lệ trong `JAVA_HOME`. Nếu chưa có Java, Gradle sẽ dừng trước khi build.

Kiểm tra bảo mật dependency:

```powershell
npm audit
```

Hiện còn cảnh báo `moderate` liên quan `postcss` trong cây phụ thuộc của Next.js. Không chạy `npm audit fix --force` vì npm đề xuất hướng phá vỡ phiên bản Next.js. Theo dõi bản vá Next.js/PostCSS mới và nâng có kiểm thử.

## Tài liệu báo cáo

Xem [docs/BAO_CAO_TOT_NGHIEP.md](docs/BAO_CAO_TOT_NGHIEP.md) để có phần mô tả kiến trúc, chức năng, ERD, luồng nghiệp vụ, kiểm thử và các hạng mục cải tiến.
