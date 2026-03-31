export const VIP_SEAT_SURCHARGE = 30000;
export const COUPLE_SEAT_SURCHARGE = 90000;
export const HOT_SEAT_SURCHARGE = 20000;

function seatRowIndex(rowLabel: string) {
  return Math.max(0, rowLabel.toUpperCase().charCodeAt(0) - 65);
}

export function isHotSeatPosition(rowLabel: string, columnIndex: number, totalRows: number, totalColumns: number, seatType: string) {
  if (seatType === "COUPLE" || totalRows <= 0 || totalColumns <= 0) {
    return false;
  }

  const rowIndex = seatRowIndex(rowLabel);
  const rowStart = Math.max(1, Math.floor(totalRows * 0.3));
  const rowEnd = Math.min(totalRows - 2, Math.ceil(totalRows * 0.7));
  const columnStart = Math.max(2, Math.floor(totalColumns * 0.28));
  const columnEnd = Math.min(totalColumns - 1, Math.ceil(totalColumns * 0.72));

  return rowIndex >= rowStart && rowIndex <= rowEnd && columnIndex >= columnStart && columnIndex <= columnEnd;
}

export function seatPrice(basePrice: number, seatType: string, isHotSeat = false) {
  let total = basePrice;
  if (seatType === "VIP") {
    total += VIP_SEAT_SURCHARGE;
  } else if (seatType === "COUPLE") {
    total += COUPLE_SEAT_SURCHARGE;
  }

  if (isHotSeat) {
    total += HOT_SEAT_SURCHARGE;
  }

  return total;
}
