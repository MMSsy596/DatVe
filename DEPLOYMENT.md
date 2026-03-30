# DatVe Deployment Guide

## Muc tieu
- App mobile phai cai duoc tren may nguoi dung ma khong can Expo Go.
- Backend phai co domain public de app truy cap duoc o moi noi.
- Database phai dat tren dich vu online on dinh.

## Hien trang repo
- `apps/mobile` da build native Android duoc.
- `apps/api` da co API va dang ket noi MySQL Railway.
- App mobile dang dung `EXPO_PUBLIC_API_BASE_URL` de tro toi backend public.

## Kien truc de xuat kha thi nhat
1. Deploy `apps/api` len Vercel hoac Railway.
2. Dung MySQL online, hien tai Railway da co san trong `apps/api/.env.local`.
3. Gan domain API cong khai, vi du `https://api.nanbao-datve.com`.
4. Build Android release tu `apps/mobile` bang EAS Build.
5. Phat hanh:
   - APK cho test noi bo va gui truc tiep.
   - AAB cho Google Play.

## Viec bat buoc de app chay o bat cu dau
- Khong de mobile goi IP LAN nhu `10.x.x.x`.
- Tat ca callback thanh toan phai dung domain HTTPS cong khai.
- API phai bat CORS dung domain neu sau nay them web/admin tach rieng.
- Neu dung push notification that, can cau hinh EAS project va Firebase FCM.

## Cach build mobile doc lap
### 1. Chuan bi
```bash
cd apps/mobile
npm install
```

### 2. Tao file moi truong
```bash
copy .env.example .env
copy android\\keystore.properties.example android\\keystore.properties
```

Sua:
```env
EXPO_PUBLIC_API_BASE_URL=https://api.nanbao-datve.com/api/v1
```

Sua tiep `android/keystore.properties`:
```properties
storeFile=nanbao-upload-key.jks
storePassword=<mat-khau-kho-keystore>
keyAlias=nanbao-upload
keyPassword=<mat-khau-khoa>
```

### 3. Tao Android keystore release
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore android/app/nanbao-upload-key.jks -alias nanbao-upload -keyalg RSA -keysize 2048 -validity 10000
```

### 4. Chay thu local voi backend public
```bash
npx expo start
```

### 5. Build APK de gui cho nguoi dung test
```bash
npm run build:preview
```

### 6. Build AAB de dua len CH Play
```bash
npm run build:production
```

### 7. Neu build local bang Gradle
```bash
npm run android:release
npm run android:bundle
```

## Deploy backend
### Lua chon nhanh nhat
- `apps/api` deploy len Vercel.
- Gan bien moi truong `DATABASE_URL`.
- Neu co upload anh, can luu file len cloud storage thay vi local disk.

### Lua chon kha thi ngay tren may nay
- Dung Railway CLI vi may da co `railway`.
- Trong `apps/api` da co:
  - `railway.json`
  - `output: "standalone"` cho Next.js
  - `npm run start` tu dong doc `PORT`
  - `PUBLIC_API_ORIGIN` de callback thanh toan khong lech domain

### Lenh can test truoc khi deploy
```bash
cd apps/api
npm install
npm run build
```

### Trinh tu deploy Railway
```bash
railway login
cd apps/api
railway init
railway up
```

Sau do set env tren Railway:
```bash
railway variables set DATABASE_URL=...
railway variables set PUBLIC_API_ORIGIN=https://<ten-app>.up.railway.app
```

Neu can sandbox thanh toan:
```bash
railway variables set MOMO_PARTNER_CODE_SANDBOX=...
railway variables set MOMO_ACCESS_KEY_SANDBOX=...
railway variables set MOMO_SECRET_KEY_SANDBOX=...
railway variables set ZALOPAY_APP_ID_SANDBOX=...
railway variables set ZALOPAY_KEY1_SANDBOX=...
railway variables set VNPAY_TMN_CODE_SANDBOX=...
railway variables set VNPAY_HASH_SECRET_SANDBOX=...
```

Sau khi co domain that, sua lai `apps/mobile/.env`:
```env
EXPO_PUBLIC_API_BASE_URL=https://<ten-app>.up.railway.app/api/v1
```

## Cac blocker hien tai
- `apps/mobile` chua co API public that, moi chi co placeholder domain trong file mau.
- Railway CLI tren may nay chua dang nhap, nen chua deploy that ngay duoc.
- Chua thay cau hinh production secrets cho MoMo, ZaloPay, VNPay.
- Upload anh tren `apps/api` dang luu local disk, khong ben vung tren hosting serverless/ephemeral.

## Viec nen lam tiep theo
1. Dang nhap Railway va deploy `apps/api`.
2. Lay domain public that va gan vao `EXPO_PUBLIC_API_BASE_URL`.
3. Tao keystore release bang `keytool`.
4. Build APK preview va test tren 4G/Wi-Fi ngoai mang noi bo.
5. Sau khi on dinh thi build AAB va dua len Google Play.
