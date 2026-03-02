/**
 * Transaction Details
 *
 * Get full details for a transaction, including its operation history
 * (e.g. purchase, refund, close events).
 *
 * Usage: npx tsx examples/snippets/transaction-details.ts [transactionId]
 */

import { PayWay } from "aba-payway";

const merchantId = process.env.ABA_PAYWAY_MERCHANT_ID;
const apiKey = process.env.ABA_PAYWAY_API_KEY;

if (!merchantId || !apiKey) {
	throw new Error("Set ABA_PAYWAY_MERCHANT_ID and ABA_PAYWAY_API_KEY");
}

const payway = new PayWay({ merchantId, apiKey });

const transactionId = process.argv[2] || "order-001";

const result = await payway.getTransactionDetails(transactionId);

if (result.data) {
	const d = result.data;
	console.log("Transaction:", d.transaction_id);
	console.log("Status:", d.payment_status);
	console.log("Amount:", d.original_amount, d.original_currency);
	console.log("Payer:", d.first_name, d.last_name);
	console.log("Date:", d.transaction_date);
	console.log();
	console.log("Operations:");
	for (const op of d.transaction_operations) {
		console.log(`  ${op.status} | ${op.amount} | ${op.transaction_date}`);
	}
}
