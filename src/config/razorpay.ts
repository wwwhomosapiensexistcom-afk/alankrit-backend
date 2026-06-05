// eslint-disable-next-line @typescript-eslint/no-require-imports
const Razorpay = require('razorpay');

/**
 * Returns a Razorpay instance using env vars.
 * Called lazily so the env config is always loaded first.
 */
export function getRazorpay() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}
