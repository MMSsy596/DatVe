import assert from "node:assert/strict";
import test from "node:test";
import { calculateVoucherDiscount } from "./vouchers";

const activePercentVoucher = {
  discount_type: "PERCENT" as const,
  discount_value: 20,
  min_order_value: 100000,
  max_discount_value: 50000,
  is_active: 1,
  expires_at: null,
};

test("giảm giá phần trăm có áp trần giảm tối đa", () => {
  assert.equal(calculateVoucherDiscount(activePercentVoucher, 400000), 50000);
  assert.equal(calculateVoucherDiscount(activePercentVoucher, 200000), 40000);
});

test("voucher không hợp lệ hoặc chưa đạt đơn tối thiểu không được giảm", () => {
  assert.equal(calculateVoucherDiscount({ ...activePercentVoucher, is_active: 0 }, 400000), 0);
  assert.equal(calculateVoucherDiscount(activePercentVoucher, 90000), 0);
  assert.equal(calculateVoucherDiscount({ ...activePercentVoucher, expires_at: "2000-01-01T00:00:00.000Z" }, 400000), 0);
});

test("voucher giảm số tiền cố định không tạo giá trị âm", () => {
  const fixedVoucher = {
    ...activePercentVoucher,
    discount_type: "FIXED" as const,
    discount_value: 75000,
    max_discount_value: null,
  };

  assert.equal(calculateVoucherDiscount(fixedVoucher, 200000), 75000);
  assert.equal(calculateVoucherDiscount({ ...fixedVoucher, discount_value: -10000 }, 200000), 0);
});
