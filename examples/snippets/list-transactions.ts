/**
 * List Transactions
 *
 * List transactions with optional date range, amount, and status filters.
 * Date range is limited to 3 days max.
 *
 * Usage: npx tsx examples/snippets/list-transactions.ts
 */

import { PayWay } from "aba-payway";

const merchantId = process.env.ABA_PAYWAY_MERCHANT_ID;
const apiKey = process.env.ABA_PAYWAY_API_KEY;

if (!merchantId || !apiKey) {
	throw new Error("Set ABA_PAYWAY_MERCHANT_ID and ABA_PAYWAY_API_KEY");
}

const payway = new PayWay({ merchantId, apiKey });

const result = await payway.listTransactions({
	fromDate: "2025-01-01 00:00:00",
	toDate: "2025-01-03 23:59:59",
	status: "APPROVED",
	page: 1,
	pagination: 20,
});

console.log(`Found ${result.data.length} transactions (page ${result.page})`);

for (const txn of result.data) {
	console.log(
		`  ${txn.transaction_id} | ${txn.payment_status} | ${txn.total_amount} ${txn.payment_currency}`,
	);
}
