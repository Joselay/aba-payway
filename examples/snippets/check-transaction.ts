/**
 * Check Transaction
 *
 * Check the payment status of a transaction by its ID.
 * Returns status, amounts, currency, and approval code.
 *
 * Usage: npx tsx examples/snippets/check-transaction.ts
 */

import { PayWay } from "aba-payway";

const merchantId = process.env.ABA_PAYWAY_MERCHANT_ID;
const apiKey = process.env.ABA_PAYWAY_API_KEY;

if (!merchantId || !apiKey) {
	throw new Error("Set ABA_PAYWAY_MERCHANT_ID and ABA_PAYWAY_API_KEY");
}

const payway = new PayWay({ merchantId, apiKey });

const transactionId = process.argv[2] || "order-001";

const result = await payway.checkTransaction(transactionId);

console.log("Status code:", result.status.code); // '00' = success
console.log("Payment status:", result.data?.payment_status); // APPROVED, DECLINED, PENDING, ...
console.log(
	"Amount:",
	result.data?.total_amount,
	result.data?.payment_currency,
);
