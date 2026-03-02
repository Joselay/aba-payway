/**
 * Transactions by Merchant Reference
 *
 * Look up transactions using your merchant reference number.
 * Returns up to the last 50 matching transactions.
 *
 * Usage: npx tsx examples/snippets/transactions-by-ref.ts [merchantRef]
 */

import { PayWay } from "aba-payway";

const merchantId = process.env.ABA_PAYWAY_MERCHANT_ID;
const apiKey = process.env.ABA_PAYWAY_API_KEY;

if (!merchantId || !apiKey) {
	throw new Error("Set ABA_PAYWAY_MERCHANT_ID and ABA_PAYWAY_API_KEY");
}

const payway = new PayWay({ merchantId, apiKey });

const merchantRef = process.argv[2] || "REF-001";

const result = await payway.getTransactionsByRef(merchantRef);

console.log(`Found ${result.data.length} transactions for ref: ${merchantRef}`);

for (const txn of result.data) {
	console.log(
		`  ${txn.transaction_id} | ${txn.payment_status} | ${txn.total_amount} ${txn.payment_currency}`,
	);
}
