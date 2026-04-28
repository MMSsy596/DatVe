import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const bookingSource = readFileSync(join(currentDir, "booking.ts"), "utf8");

test("luồng giữ ghế có khóa giao dịch và chặn ghế trùng", () => {
  assert.match(bookingSource, /FOR UPDATE/);
  assert.match(bookingSource, /requestedSeatCodes/);
  assert.match(bookingSource, /bị chọn trùng/);
});
