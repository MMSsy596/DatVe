# DatVe Roadmap

## Muc tieu phase 0
- Dung APK vo ngoai de mo app Android som nhat.
- Chot monorepo gom mobile, admin va api ngay trong repo nay.
- Dung mock data de khoa UI va luong dieu huong truoc khi noi nghiep vu that.

## Kien truc de xuat
- `apps/mobile`: React Native + Expo cho app Android.
- `apps/admin`: Next.js dashboard quan tri.
- `apps/api`: Next.js backend API.
- Database muc tieu: MySQL + Prisma.
- Firebase chi dung bo tro cho push notification, analytics hoac crash reporting.

## Thu tu trien khai
1. Hoan thien shell mobile voi home, phim, dat ve, combo, tai khoan.
2. Dung admin dashboard va cac trang quan ly co ban.
3. Dung API health, auth, movie catalog, cinema, booking.
4. Thiet ke schema MySQL va migration Prisma.
5. Lam seat locking, booking flow, payment sandbox.
6. Hoan thien thong bao, ticket management va bao cao doanh thu.

## Module user
- Dang ky, dang nhap.
- Trang chu co banner, phim noi bat, top doanh thu, phim xu huong.
- Danh sach phim dang chieu, sap chieu.
- Chon rap, suat chieu, ghe, combo.
- Thanh toan MoMo, ZaloPay, VNPay.
- Quan ly ve, yeu thich, xem sau, thong tin ca nhan.

## Module admin
- Dashboard doanh thu, phim xu huong, top doanh thu, phim moi.
- Quan ly nguoi dung.
- Quan ly rap, phong chieu, so do ghe.
- Quan ly phim, suat chieu.
- Quan ly banner, combo do an va nuoc uong.

## Luu y ky thuat
- Bai toan kho nhat la giu ghe tam thoi va tranh dat trung.
- Khong nen dung Firebase lam core booking database.
- Phase dau uu tien mo app duoc truoc, chua can payment that.
