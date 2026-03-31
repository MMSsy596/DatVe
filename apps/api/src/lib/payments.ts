import { ResultSetHeader, RowDataPacket } from "mysql2";
import { ensureRuntimeSchema, getPool } from "./db";
import { consumeVoucherIfNeeded } from "./vouchers";
import { prepareGatewayPayment, type GatewayMode, type PaymentProvider, verifyVnpayReturn as verifyVnpayReturnWithMode } from "./payment-gateways";
import { sendPushToUser } from "./notifications";

export type PaymentStatus = "INITIATED" | "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";

type CreatePaymentPayload = {
  bookingId: number;
  provider: PaymentProvider;
  origin: string;
  returnUrl: string;
  ipAddr?: string;
  gatewayMode?: string | null;
};

function makeProviderTxnRef(provider: PaymentProvider) {
  return `${provider}-${Date.now()}`;
}

export async function createPaymentLink(payload: CreatePaymentPayload) {
  await ensureRuntimeSchema();
  const pool = getPool();
  const [[booking]] = await pool.query<RowDataPacket[]>(
    `SELECT id, booking_code, total_amount, status, user_id
     FROM bookings
     WHERE id = ?
     LIMIT 1`,
    [payload.bookingId]
  );

  if (!booking) {
    throw new Error("Không tìm thấy đơn để thanh toán.");
  }

  if (booking.status === "PAID") {
    throw new Error("Đơn này đã thanh toán.");
  }

  const providerTxnRef = makeProviderTxnRef(payload.provider);
  const mockCheckoutUrl = `${payload.origin}/pay/${providerTxnRef}`;
  const prepared = await prepareGatewayPayment({
    provider: payload.provider,
    amount: Number(booking.total_amount),
    bookingCode: booking.booking_code,
    providerTxnRef,
    origin: payload.origin,
    returnUrl: payload.returnUrl,
    ipAddr: payload.ipAddr ?? "127.0.0.1",
    requestedGatewayMode: payload.gatewayMode ?? null,
  });

  const mode = prepared?.mode ?? "MOCK";
  const checkoutUrl = prepared?.checkoutUrl ?? mockCheckoutUrl;
  const reviewStatus = mode === "MOCK" ? "PENDING" : "AUTO";
  const gatewayMode = prepared?.gatewayMode ?? "SANDBOX";

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO payments
      (booking_id, provider, mode, gateway_mode, provider_txn_ref, provider_order_id, amount, status, checkout_url, return_url, request_payload, review_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?)`,
    [
      payload.bookingId,
      payload.provider,
      mode,
      gatewayMode,
      providerTxnRef,
      prepared?.providerOrderId ?? providerTxnRef,
      Number(booking.total_amount),
      checkoutUrl,
      payload.returnUrl,
      JSON.stringify({
        bookingId: payload.bookingId,
        provider: payload.provider,
        origin: payload.origin,
        returnUrl: payload.returnUrl,
        gatewayMode,
      }),
      reviewStatus,
    ]
  );

  return {
    id: result.insertId,
    provider: payload.provider,
    mode,
    gatewayMode,
    reviewStatus,
    checkoutUrl,
    bookingId: payload.bookingId,
    amount: Number(booking.total_amount),
    providerTxnRef,
    userId: booking.user_id ? Number(booking.user_id) : null,
  };
}

export async function findPaymentByTxnRef(providerTxnRef: string) {
  await ensureRuntimeSchema();
  const pool = getPool();
  const [[payment]] = await pool.query<RowDataPacket[]>(
    `SELECT p.*, b.booking_code
     FROM payments p
     INNER JOIN bookings b ON b.id = p.booking_id
     WHERE p.provider_txn_ref = ?
     LIMIT 1`,
    [providerTxnRef]
  );
  return payment ?? null;
}

export async function findPaymentByProviderOrderId(providerOrderId: string) {
  await ensureRuntimeSchema();
  const pool = getPool();
  const [[payment]] = await pool.query<RowDataPacket[]>(
    `SELECT p.*, b.booking_code
     FROM payments p
     INNER JOIN bookings b ON b.id = p.booking_id
     WHERE p.provider_order_id = ?
     LIMIT 1`,
    [providerOrderId]
  );
  return payment ?? null;
}

export async function getPaymentDetail(providerTxnRef: string) {
  await ensureRuntimeSchema();
  const pool = getPool();
  const [[payment]] = await pool.query<RowDataPacket[]>(
    `SELECT p.id, p.booking_id, p.provider, p.mode, p.gateway_mode, p.provider_txn_ref, p.provider_order_id, p.amount, p.status, p.checkout_url, p.return_url,
            b.booking_code, m.title AS movie_title, c.name AS cinema_name, s.start_time
     FROM payments p
     INNER JOIN bookings b ON b.id = p.booking_id
     INNER JOIN showtimes s ON s.id = b.showtime_id
     INNER JOIN movies m ON m.id = s.movie_id
     INNER JOIN cinemas c ON c.id = s.cinema_id
     WHERE p.provider_txn_ref = ?
     LIMIT 1`,
    [providerTxnRef]
  );

  if (!payment) {
    return null;
  }

  return {
    id: payment.id,
    bookingId: payment.booking_id,
    provider: payment.provider,
    mode: payment.mode,
    gatewayMode: payment.gateway_mode,
    providerTxnRef: payment.provider_txn_ref,
    providerOrderId: payment.provider_order_id,
    amount: payment.amount,
    status: payment.status,
    checkoutUrl: payment.checkout_url,
    returnUrl: payment.return_url,
    bookingCode: payment.booking_code,
    movieTitle: payment.movie_title,
    cinemaName: payment.cinema_name,
    startTime: payment.start_time,
  };
}

export async function updatePaymentStatus(
  providerTxnRef: string,
  status: Extract<PaymentStatus, "SUCCESS" | "FAILED" | "CANCELLED">,
  responsePayload: Record<string, unknown>
) {
  await ensureRuntimeSchema();
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[payment]] = await connection.query<RowDataPacket[]>(
      `SELECT p.id, p.booking_id, p.status, b.user_id, b.booking_code,
              m.title AS movie_title, c.name AS cinema_name, s.start_time
       FROM payments p
       INNER JOIN bookings b ON b.id = p.booking_id
       INNER JOIN showtimes s ON s.id = b.showtime_id
       INNER JOIN movies m ON m.id = s.movie_id
       INNER JOIN cinemas c ON c.id = s.cinema_id
       WHERE p.provider_txn_ref = ?
       LIMIT 1`,
      [providerTxnRef]
    );

    if (!payment) {
      throw new Error("Không tìm thấy giao dịch.");
    }

    await connection.execute(
      `UPDATE payments
       SET status = ?, response_payload = ?, provider_response_code = ?, paid_at = CASE WHEN ? = 'SUCCESS' THEN NOW() ELSE paid_at END
       WHERE provider_txn_ref = ?`,
      [
        status,
        JSON.stringify(responsePayload),
        typeof responsePayload.code === "string" ? responsePayload.code : null,
        status,
        providerTxnRef,
      ]
    );

    if (status === "SUCCESS") {
      await connection.execute(`UPDATE bookings SET status = 'PAID' WHERE id = ?`, [payment.booking_id]);
      await consumeVoucherIfNeeded(Number(payment.booking_id));
    }

    await connection.commit();

    if (status === "SUCCESS" && payment.user_id) {
      await sendPushToUser(Number(payment.user_id), {
        title: "Thanh toán thành công",
        body: `${payment.movie_title} đã xác nhận cho mã vé ${payment.booking_code}.`,
        data: {
          bookingId: Number(payment.booking_id),
          bookingCode: payment.booking_code,
          cinemaName: payment.cinema_name,
          startTime: payment.start_time,
          type: "payment-success",
        },
      }).catch(() => null);
    }
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export function verifyVnpayReturn(params: URLSearchParams, gatewayMode: GatewayMode) {
  return verifyVnpayReturnWithMode(params, gatewayMode);
}
