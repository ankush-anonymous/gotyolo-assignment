const paymentService = require('../services/paymentService');

// Payment provider calls this to notify success/failure. We always return 200 + { received: true }
// so they stop retrying. Same idempotency_key applied only once (first webhook updates state; duplicates no-op).
async function webhook(req, res) {
  const { booking_id, status, idempotency_key, payment_reference } = req.body || {};

  const bookingId = booking_id || null;
  const statusNorm = status === 'success' || status === 'failed' ? status : null;

  if (!bookingId || !statusNorm) {
    return res.status(200).json({ received: true });
  }

  const result = await paymentService.processWebhook(
    bookingId,
    statusNorm,
    idempotency_key ?? null,
    payment_reference ?? null
  );

  if (result.invalid) {
    console.warn('[payment webhook] Invalid or missing booking:', bookingId);
  }
  if (result.error) {
    console.error('[payment webhook] Error:', result.error);
  }

  // Always 200: acknowledge receipt so provider does not retry. We do not indicate processed vs duplicate.
  return res.status(200).json({ received: true });
}

module.exports = {
  webhook,
};
