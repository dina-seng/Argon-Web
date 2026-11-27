import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { env } from '../../config/env.js';

export function paymentError(statusCode: number, message: string) {
  return Object.assign(new Error(message), { statusCode });
}

export function payWayConfigured() {
  return Boolean(env.PAYWAY_MERCHANT_ID && env.PAYMENT_GATEWAY_SECRET && env.PAYWAY_CALLBACK_URL);
}

function sign(input: string) {
  const secret = env.PAYMENT_GATEWAY_SECRET;
  if (!secret || !payWayConfigured()) throw paymentError(503, 'PayWay payments are unavailable');
  return createHmac('sha512', secret).update(input).digest('base64');
}

export function verifyCallback(body: Record<string, unknown>, signature: string) {
  const input = Object.keys(body).sort().map((key) => {
    const value = body[key];
    if (value == null || value === false) return '';
    if (value === true) return '1';
    if (typeof value === 'object') return JSON.stringify(value).replace(/\//g, '\\/');
    return String(value);
  }).join('');
  const expected = Buffer.from(sign(input));
  const received = Buffer.from(signature);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

async function request(path: string, fields: Record<string, string | number>, hashInput: string) {
  const hash = sign(hashInput);
  try {
    const response = await fetch(
      new URL(`/api/payment-gateway/v1/payments/${path}`, env.PAYMENT_GATEWAY_BASE_URL),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, hash }),
        signal: AbortSignal.timeout(8000),
        redirect: 'error',
      },
    );
    if (response.ok) return await response.json() as unknown;
  } catch {
    // Treat upstream timeouts and invalid responses as retryable failures.
  }
  throw paymentError(502, 'Could not reach the payment gateway. Try again.');
}

function transactionFields(reference: string) {
  return {
    req_time: new Date().toISOString().slice(0, 19).replace(/\D/g, ''),
    merchant_id: env.PAYWAY_MERCHANT_ID ?? '',
    tran_id: reference,
  };
}

export function createCardForm(bookingId: string, reference: string, amount: number, lifetime: number) {
  const returnUrl = new URL(`/payment/${encodeURIComponent(bookingId)}`, env.CLIENT_URL).href;
  const fields = {
    ...transactionFields(reference),
    type: 'purchase',
    payment_option: 'cards',
    amount: amount.toFixed(2),
    currency: 'USD',
    return_url: Buffer.from(env.PAYWAY_CALLBACK_URL ?? '').toString('base64'),
    cancel_url: returnUrl,
    continue_success_url: returnUrl,
    view_type: 'hosted_view',
    payment_gate: '0',
    lifetime: String(lifetime),
  };
  const hash = sign([
    fields.req_time, fields.merchant_id, fields.tran_id, fields.amount, fields.type,
    fields.payment_option, fields.return_url, fields.cancel_url, fields.continue_success_url,
    fields.currency, fields.lifetime,
  ].join(''));
  return {
    action: new URL('/api/payment-gateway/v1/payments/purchase', env.PAYMENT_GATEWAY_BASE_URL).href,
    fields: { ...fields, hash },
  };
}

const qrResponse = z.object({
  status: z.object({ code: z.union([z.literal('0'), z.literal(0)]) }),
  qrImage: z.string().max(1_000_000).regex(/^data:image\/png;base64,[a-zA-Z0-9+/]+=*$/),
  amount: z.number(),
  currency: z.literal('USD'),
});

export async function generateQr(reference: string, amount: number, lifetime: number) {
  const fields = {
    ...transactionFields(reference),
    amount,
    purchase_type: 'purchase',
    payment_option: 'abapay_khqr',
    callback_url: Buffer.from(env.PAYWAY_CALLBACK_URL ?? '').toString('base64'),
    currency: 'USD',
    lifetime,
    qr_image_template: 'template3_color',
  };
  const hashInput = [
    fields.req_time, fields.merchant_id, fields.tran_id, fields.amount,
    fields.purchase_type, fields.payment_option, fields.callback_url,
    fields.currency, fields.lifetime, fields.qr_image_template,
  ].join('');
  const result = qrResponse.safeParse(await request('generate-qr', fields, hashInput));
  if (!result.success || result.data.amount !== amount) {
    throw paymentError(502, 'The payment gateway could not create this KHQR code');
  }
  return result.data.qrImage;
}

const transactionResponse = z.object({
  status: z.object({ code: z.union([z.string(), z.number()]), tran_id: z.string() }),
  data: z.object({
    payment_status_code: z.number(),
    payment_status: z.string(),
    original_amount: z.number().optional(),
    payment_amount: z.number().optional(),
    payment_currency: z.string().optional(),
  }).optional(),
});

export async function checkTransaction(reference: string) {
  const fields = transactionFields(reference);
  const result = transactionResponse.safeParse(await request(
    'check-transaction-2', fields, [fields.req_time, fields.merchant_id, fields.tran_id].join(''),
  ));
  if (result.success && result.data.status.tran_id === reference && Number(result.data.status.code) === 6) return null;
  if (!result.success || result.data.status.tran_id !== reference || result.data.status.code !== '00' || !result.data.data) {
    throw paymentError(502, 'Could not verify the payment status. Try again.');
  }
  const payment = result.data.data;
  if (payment.payment_status !== 'APPROVED' || payment.payment_status_code !== 0) return null;
  return payment;
}
