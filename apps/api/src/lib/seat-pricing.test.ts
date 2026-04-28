import assert from "node:assert/strict";
import test from "node:test";
import {
  COUPLE_SEAT_SURCHARGE,
  HOT_SEAT_SURCHARGE,
  VIP_SEAT_SURCHARGE,
  isHotSeatPosition,
  seatPrice,
} from "./seat-pricing";

test("tính phụ thu ghế theo loại ghế và khu hot", () => {
  const basePrice = 120000;

  assert.equal(seatPrice(basePrice, "STANDARD"), basePrice);
  assert.equal(seatPrice(basePrice, "VIP"), basePrice + VIP_SEAT_SURCHARGE);
  assert.equal(seatPrice(basePrice, "COUPLE"), basePrice + COUPLE_SEAT_SURCHARGE);
  assert.equal(seatPrice(basePrice, "VIP", true), basePrice + VIP_SEAT_SURCHARGE + HOT_SEAT_SURCHARGE);
});

test("xác định khu ghế hot ở vùng trung tâm và bỏ qua ghế đôi", () => {
  assert.equal(isHotSeatPosition("D", 5, 8, 10, "STANDARD"), true);
  assert.equal(isHotSeatPosition("A", 1, 8, 10, "STANDARD"), false);
  assert.equal(isHotSeatPosition("D", 5, 8, 10, "COUPLE"), false);
});
