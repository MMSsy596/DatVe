# Tính năng Phân loại độ tuổi và Xác nhận độ tuổi

## Tổng quan
Đã thêm đầy đủ tính năng phân loại phim theo độ tuổi và pop-up xác nhận độ tuổi trước khi đặt vé theo yêu cầu của khách hàng.

## Các phân loại độ tuổi được hỗ trợ

1. **P** - Phù hợp cho mọi lứa tuổi
2. **K** - Dành cho trẻ em dưới 13 tuổi (bắt buộc xem cùng cha mẹ hoặc người giám hộ)
3. **T13 (13+)** - Cấm khán giả dưới 13 tuổi
4. **T16 (16+)** - Cấm khán giả dưới 16 tuổi
5. **T18 (18+)** - Cấm khán giả dưới 18 tuổi

## Các thay đổi trong Database

### Schema Changes
- **Bảng `movies`**: Thêm cột `age_rating ENUM('P','K','T13','T16','T18') NOT NULL DEFAULT 'T16'`
- **Migration**: Tự động thêm cột nếu chưa tồn tại trong `apps/api/src/lib/db.ts`

### Seed Data
- Phim mẫu được phân bổ đều các mức độ tuổi (P, K, T13, T16, T18)
- Mỗi phim được assign age_rating theo pattern: `ageRatings[index % ageRatings.length]`

## Các thay đổi trong Backend API

### 1. Types (`apps/api/src/lib/crud.ts`)
```typescript
export type MoviePayload = {
  // ... existing fields
  ageRating?: "P" | "K" | "T13" | "T16" | "T18";
}
```

### 2. CRUD Operations
- `createMovie()`: Thêm support cho age_rating (default: "T16")
- `updateMovie()`: Thêm support cho age_rating
- `listMovies()`: Include age_rating trong SELECT query

### 3. Catalog API (`apps/api/src/lib/catalog.ts`)
- `MovieRow` type: Thêm field `age_rating`
- `getCatalogData()`: Return age_rating cho mỗi phim
- Query SELECT đã được cập nhật để include age_rating

## Các thay đổi trong Mobile App

### 1. Types (`apps/mobile/src/types.ts`)
```typescript
export type Movie = {
  // ... existing fields
  ageRating?: "P" | "K" | "T13" | "T16" | "T18";
}
```

### 2. UI Components (`apps/mobile/src/components.tsx`)
- **Badge hiển thị**: Age rating badge hiển thị bên cạnh badge phim
- **Format hiển thị**: 
  - T13 → "13+"
  - T16 → "16+"
  - T18 → "18+"
  - P → "P"
  - K → "K"

### 3. State Management (`apps/mobile/App.tsx`)
- Thêm state: `ageConfirmVisible` - control visibility của modal
- Thêm state: `ageConfirmAccepted` - tracking xem user đã accept chưa
- Load age_rating từ API response

### 4. Age Confirmation Modal
**Location**: `apps/mobile/App.tsx` (cuối JSX, trước `</SafeAreaView>`)

**Chức năng**:
- Hiển thị trước khi proceed thanh toán nếu:
  - User chưa accept
  - Phim không phải P rating
- Nội dung động theo age_rating của phim
- 2 buttons: "Hủy" và "Tôi đồng ý"

**Text mẫu** (age_rating = T16):
```
Tôi xác nhận mua vé cho người xem từ đủ 16 tuổi trở lên và đồng ý 
cung cấp giấy tờ tùy thân để xác thực độ tuổi người xem. CinePlus 
sẽ không hoàn tiền nếu người xem không đáp ứng đủ điều kiện. 
Theo quy định của Bộ Văn hóa, Thể thao và Du lịch.
```

### 5. Booking Flow
**Logic mới trong `confirmBooking()`**:
```typescript
// Check age rating and show confirmation if needed
const ageRating = selectedMovie.ageRating || "T16";
if (!ageConfirmAccepted && ageRating !== "P") {
  setAgeConfirmVisible(true);
  return;
}
```

**Khi user click "Tôi đồng ý"**:
1. Set `ageConfirmAccepted = true`
2. Close modal
3. Retry `confirmBooking()` sau 100ms
4. Booking tiếp tục như bình thường

## Testing

### Test Database Setup
```powershell
npm run db:setup --workspace api
```

### Kiểm tra dữ liệu
- Phim với index 0, 5, 10, 15... sẽ có age_rating "P"
- Phim với index 1, 6, 11, 16... sẽ có age_rating "K"  
- Phim với index 2, 7, 12, 17... sẽ có age_rating "T13"
- Phim với index 3, 8, 13, 18... sẽ có age_rating "T16"
- Phim với index 4, 9, 14, 19... sẽ có age_rating "T18"

### Test Cases
1. ✅ Badge age rating hiển thị đúng trên movie card
2. ✅ Pop-up xuất hiện khi click "Thanh toán" (với phim không phải P)
3. ✅ Không xuất hiện pop-up với phim P rating
4. ✅ Click "Hủy" → modal đóng, không proceed
5. ✅ Click "Tôi đồng ý" → modal đóng, proceed thanh toán
6. ✅ Sau khi accept 1 lần, không hiển thị lại trong session

## Files đã thay đổi

### Backend
- ✅ `apps/api/scripts/setup-db.mjs` - Schema + seed data
- ✅ `apps/api/src/lib/db.ts` - Migration
- ✅ `apps/api/src/lib/crud.ts` - CRUD operations
- ✅ `apps/api/src/lib/catalog.ts` - Catalog API

### Frontend Mobile
- ✅ `apps/mobile/src/types.ts` - Type definitions
- ✅ `apps/mobile/src/components.tsx` - UI badge
- ✅ `apps/mobile/App.tsx` - State, modal, logic

## Compliance
Theo quy định của Bộ Văn hóa, Thể thao và Du lịch về phân loại phim.

## Notes
- Age confirmation được lưu trong state, reset khi app restart
- Có thể extend để lưu vào AsyncStorage nếu cần persist
- Modal style sử dụng lại `aiConfirmBackdrop` và `aiConfirmCard` styles
