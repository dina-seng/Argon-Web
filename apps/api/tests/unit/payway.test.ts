import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createHmac } from 'node:crypto';
import { checkTransaction, createCardForm, generateQr, verifyCallback } from '../../src/modules/payments/payway.js';
import { reconcilePayment } from '../../src/modules/payments/service.js';
import { mintTickets } from '../../src/modules/tickets/service.js';

vi.mock('../../src/config/env.js', () => ({
  env: {
    PAYWAY_MERCHANT_ID: 'test-merchant',
    PAYMENT_GATEWAY_SECRET: 'test-key',
    PAYMENT_GATEWAY_BASE_URL: 'https://checkout-sandbox.payway.com.kh',
    PAYWAY_CALLBACK_URL: 'https://argon.example/payments/webhook',
    CLIENT_URL: 'https://tickets.argon.example',
  },
}));
vi.mock('../../src/modules/tickets/service.js', () => ({ mintTickets: vi.fn() }));

const reference = '0123456789abcdefabcd';
const qrImage = 'data:image/png;base64,YWJj';

function gatewayResponse(amount: number, status = 'APPROVED', currency = 'USD') {
  return Response.json({
    status: { code: '00', tran_id: reference },
    data: {
      payment_status: status,
      payment_status_code: status === 'APPROVED' ? 0 : 2,
      original_amount: 12,
      payment_amount: amount,
      payment_currency: currency,
    },
  });
}

function bookingFixture() {
  const booking = {
    id: 'booking', tierId: 'tier', quantity: 2, status: 'PENDING',
    paymentAmount: 12, paymentExpiresAt: new Date(),
  };
  const updateMany = vi.fn(async () => {
    if (booking.status !== 'PENDING') return { count: 0 };
    booking.status = 'PAID';
    return { count: 1 };
  });
  const updateTier = vi.fn();
  const tx = { booking: { updateMany, findUnique: vi.fn(async () => booking) }, ticketTier: { update: updateTier } };
  const app = {
    prisma: { booking: tx.booking, $transaction: vi.fn(async (run) => run(tx)) },
    redis: { del: vi.fn(async () => 1) },
    log: { error: vi.fn() },
  } as unknown as FastifyInstance;

  return { app, updateTier };
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('PayWay KHQR checkout', () => {
  it('builds a signed hosted card form for the booking amount', () => {
    const { action, fields } = createCardForm('booking-id', reference, 12, 5);
    expect(action).toBe('https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/purchase');
    expect(fields).toMatchObject({
      tran_id: reference, amount: '12.00', payment_option: 'cards', currency: 'USD',
      continue_success_url: 'https://tickets.argon.example/payment/booking-id',
      view_type: 'hosted_view', payment_gate: '0', lifetime: '5',
    });
    expect(fields.hash).toBe(createHmac('sha512', 'test-key').update([
      fields.req_time, 'test-merchant', reference, '12.00', 'purchase', 'cards',
      fields.return_url, fields.cancel_url, fields.continue_success_url, 'USD', '5',
    ].join('')).digest('base64'));
  });

  it('rejects a signed callback with a modified amount', () => {
    const body = { tran_id: reference, status: '0', amount: 12 };
    const signature = createHmac('sha512', 'test-key').update(`120${reference}`).digest('base64');
    expect(verifyCallback(body, signature)).toBe(true);
    expect(verifyCallback({ ...body, amount: 11 }, signature)).toBe(false);
  });

  it('treats a card transaction that has not been submitted as unconfirmed', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ status: { code: 6, tran_id: reference } })));
    await expect(checkTransaction(reference)).resolves.toBeNull();
  });
  it('signs the provider request with the server total and returns the provider QR', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json({
      status: { code: '0' }, amount: 12, currency: 'USD', qrImage,
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(generateQr(reference, 12, 5)).resolves.toBe(qrImage);
    const [url, request] = fetchMock.mock.calls[0]!;
    const data = JSON.parse(String(request?.body));
    const callbackUrl = Buffer.from('https://argon.example/payments/webhook').toString('base64');
    expect(String(url)).toMatch(/\/payments\/generate-qr$/);
    expect(data).toMatchObject({ tran_id: reference, amount: 12, currency: 'USD', lifetime: 5, callback_url: callbackUrl });
    expect(data.hash).toBe(createHmac('sha512', 'test-key').update(
      [data.req_time, 'test-merchant', reference, 12, 'purchase', 'abapay_khqr', callbackUrl, 'USD', 5, 'template3_color'].join(''),
    ).digest('base64'));
  });

  it('leaves a pending transaction unconfirmed', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => gatewayResponse(0, 'PENDING', '')));
    await expect(checkTransaction(reference)).resolves.toBeNull();
  });

  it.each([[11, 'USD'], [12, 'KHR']])('does not issue tickets for a payment of %s %s', async (amount, currency) => {
    const { app, updateTier } = bookingFixture();
    vi.stubGlobal('fetch', vi.fn(async () => gatewayResponse(amount, 'APPROVED', currency)));

    await expect(reconcilePayment(app, reference)).rejects.toMatchObject({ statusCode: 409 });
    expect(updateTier).not.toHaveBeenCalled();
    expect(mintTickets).not.toHaveBeenCalled();
  });

  it('issues tickets once when payment confirmation is processed concurrently', async () => {
    const { app, updateTier } = bookingFixture();
    vi.stubGlobal('fetch', vi.fn(async () => gatewayResponse(12)));

    await Promise.all([reconcilePayment(app, reference), reconcilePayment(app, reference)]);

    expect(updateTier).toHaveBeenCalledTimes(1);
    expect(updateTier).toHaveBeenCalledWith({
      where: { id: 'tier' },
      data: { soldCount: { increment: 2 }, reservedCount: { decrement: 2 } },
    });
    expect(mintTickets).toHaveBeenCalledTimes(1);
    expect(mintTickets).toHaveBeenCalledWith(expect.anything(), 'booking', 2);
    expect(app.redis.del).toHaveBeenCalledTimes(1);
    expect(app.redis.del).toHaveBeenCalledWith('hold:booking');
  });
});
