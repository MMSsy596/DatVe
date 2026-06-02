# Báo cáo Kiểm tra Tính năng Giữ chỗ (Seat Holding)

## ✅ Các phần đã hoạt động

### 1. Backend API
**Endpoint**: `POST /api/v1/bookings/hold`

**File**: `apps/api/src/lib/booking.ts`

**Chức năng hoạt động**:
- ✅ Validate showtimeId và seats
- ✅ Kiểm tra ghế trùng lặp
- ✅ Kiểm tra ghế đã được giữ hoặc đã bán
- ✅ Tạo booking với status `HELD`
- ✅ **Thời gian giữ: 5 phút** (`expires_at = DATE_ADD(NOW(), INTERVAL 5 MINUTE)`)
- ✅ Transaction an toàn với rollback
- ✅ Tính giá ghế dựa trên loại ghế (STANDARD/VIP/COUPLE) và vị trí hot seat
- ✅ Cleanup expired holds tự động

**Response**:
```json
{
  "id": 123,
  "bookingCode": "DV12345678ABCD",
  "status": "HELD",
  "totalAmount": 250000,
  "expiresAt": "2026-06-02T15:30:00.000Z"
}
```

### 2. Mobile App Integration

**File**: `apps/mobile/App.tsx`

**Luồng hoạt động**:
1. ✅ User chọn ghế trong `SeatScreen`
2. ✅ Click nút "Tiếp tục" → Gọi `holdSelectedSeats()`
3. ✅ API call đến `/bookings/hold` với `showtimeId` và `seats`
4. ✅ Nhận `bookingId` và lưu vào state `heldBookingId`
5. ✅ Navigate sang `CheckoutScreen`
6. ✅ Khi thanh toán, sử dụng `heldBookingId` để finalize booking

**State Management**:
```typescript
const [heldBookingId, setHeldBookingId] = React.useState<number | null>(null);
const [holding, setHolding] = React.useState(false);
```

**Error Handling**:
- ✅ Hiển thị toast nếu API fails
- ✅ Refresh seat map sau khi error
- ✅ Loading state cho nút "Tiếp tục"

### 3. Validation Logic

**Kiểm tra ghế conflict**:
```sql
SELECT bs.id
FROM booking_seats bs
INNER JOIN bookings b ON b.id = bs.booking_id
WHERE b.showtime_id = ?
  AND bs.seat_code = ?
  AND (
    b.status = 'PAID' OR
    b.status = 'PENDING' OR
    (b.status = 'HELD' AND b.expires_at IS NOT NULL AND b.expires_at >= NOW())
  )
```

✅ Chỉ cho phép giữ ghế nếu:
- Ghế chưa được PAID
- Ghế chưa được PENDING
- Ghế chưa được HELD (hoặc đã HELD nhưng đã hết hạn)

### 4. Cleanup Expired Holds

**Function**: `cleanupExpiredHolds()`

✅ Tự động chạy trước mỗi operation:
- `holdSeats()`
- `finalizeBooking()`
- `listBookings()`

```sql
UPDATE bookings
SET status = 'EXPIRED'
WHERE status = 'HELD' 
  AND expires_at IS NOT NULL 
  AND expires_at < NOW()
```

---

## ⚠️ Các phần CHƯA có / Cần cải thiện

### 1. ❌ Countdown Timer UI
**Vấn đề**: Không có hiển thị thời gian còn lại trên UI

**Cần thêm**:
- Countdown timer trên `CheckoutScreen`
- Hiển thị "Còn X phút Y giây để hoàn tất đặt vé"
- Warning khi còn < 1 phút
- Auto redirect về seat selection khi hết thời gian

**Đề xuất vị trí**:
```tsx
// Trong CheckoutScreen
<View style={styles.holdTimerBar}>
  <MaterialCommunityIcons name="clock-outline" size={16} />
  <Text>Giữ ghế còn: 04:32</Text>
</View>
```

### 2. ❌ Real-time Seat Locking
**Vấn đề**: Seat map không refresh real-time khi người khác giữ ghế

**Cần thêm**:
- Polling mechanism để refresh seat map mỗi 10-15 giây
- Hoặc WebSocket/SSE để update real-time
- Visual feedback khi ghế vừa được giữ bởi người khác

### 3. ❌ Expire Notification
**Vấn đề**: Khi booking hết hạn, user không được thông báo

**Cần thêm**:
- Toast notification khi booking sắp hết hạn (30s trước)
- Toast khi booking đã hết hạn
- Auto navigate về seat selection

### 4. ⚠️ Race Condition Protection
**Vấn đề tiềm ẩn**: 2 user có thể hold cùng ghế trong cùng 1 thời điểm

**Hiện tại**: Có `FOR UPDATE` lock trong transaction ✅
**Nhưng**: Cần test kỹ với concurrent requests

### 5. ❌ Hold Extension
**Vấn đề**: User không thể extend thời gian giữ ghế

**Cần thêm**:
- API endpoint `POST /bookings/{id}/extend`
- Nút "Gia hạn thời gian" trên UI
- Giới hạn số lần extend (max 1-2 lần)

### 6. ❌ Hold Cancellation
**Vấn đề**: User không thể cancel hold để về chọn lại ghế

**Cần thêm**:
- Nút "Chọn lại ghế" trên CheckoutScreen
- API endpoint `DELETE /bookings/{id}/hold`
- Clear `heldBookingId` state

---

## 📋 Test Checklist

### Manual Testing

#### Test Case 1: Hold Seats Successfully
- [ ] Chọn ghế
- [ ] Click "Tiếp tục"
- [ ] Verify loading state
- [ ] Verify navigate to checkout
- [ ] Verify `heldBookingId` được set

#### Test Case 2: Hold Conflict
- [ ] User A hold ghế A1
- [ ] User B cố hold ghế A1
- [ ] Verify error: "Ghế A1 đã được giữ hoặc thanh toán"
- [ ] Verify seat map refresh

#### Test Case 3: Hold Expiration
- [ ] Hold ghế
- [ ] Đợi 5 phút
- [ ] Verify booking status = 'EXPIRED'
- [ ] Verify ghế available lại cho user khác

#### Test Case 4: Multiple Seats
- [ ] Chọn nhiều ghế (A1, A2, A3)
- [ ] Hold thành công
- [ ] Verify tất cả ghế đều locked

#### Test Case 5: Invalid Seat
- [ ] Gửi API với seat code không tồn tại
- [ ] Verify error: "Ghế XXX không hợp lệ"

#### Test Case 6: Duplicate Seats
- [ ] Gửi API với seats trùng lặp [A1, A1]
- [ ] Verify error: "Ghế A1 bị chọn trùng"

---

## 🔧 Recommendations

### Priority 1 (Critical)
1. **Thêm Countdown Timer** - UX rất quan trọng
2. **Expire Notification** - Tránh user bị surprise

### Priority 2 (High)
3. **Auto Seat Map Refresh** - Update 10-15s/lần
4. **Hold Cancellation** - Cho phép chọn lại ghế

### Priority 3 (Nice to have)
5. **Hold Extension** - 1 lần extend thêm 5 phút
6. **WebSocket Real-time** - Thay polling

---

## 📊 Summary

| Chức năng | Status | Notes |
|-----------|--------|-------|
| Backend Hold API | ✅ Hoạt động | 5 phút expire |
| Mobile Hold Flow | ✅ Hoạt động | Basic flow OK |
| Conflict Detection | ✅ Hoạt động | Transaction safe |
| Auto Cleanup | ✅ Hoạt động | Runs before operations |
| Countdown Timer | ❌ Chưa có | Critical missing |
| Expire Notification | ❌ Chưa có | Important |
| Real-time Update | ❌ Chưa có | Nice to have |
| Hold Cancellation | ❌ Chưa có | UX improvement |
| Hold Extension | ❌ Chưa có | Optional |

**Kết luận**: Tính năng giữ chỗ **đã hoạt động ở mức cơ bản**, nhưng **thiếu UI feedback** quan trọng (countdown timer, expiration alert).
