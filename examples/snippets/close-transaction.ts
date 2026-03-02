/**
 * Close Transaction
 *
 * Cancel a pending transaction. The payment status becomes CANCELLED.
 * Only works on transactions that haven't been completed yet.
 *
 * Usage: npx tsx examples/snippets/close-transaction.ts [transactionId]
 */

import { PayWay } from "aba-payway";

const merchantId = process.env.ABA_PAYWAY_MERCHANT_ID;
const apiKey = process.env.ABA_PAYWAY_API_KEY;

if (!merchantId || !apiKey) {
	throw new Error("Set ABA_PAYWAY_MERCHANT_ID and ABA_PAYWAY_API_KEY");
}

const payway = new PayWay({ merchantId, apiKey });

const transactionId = process.argv[2] || "order-001";

const result = await payway.closeTransaction(transactionId);

console.log("Status code:", result.status.code); // '00' = success
console.log("Message:", result.status.message);
