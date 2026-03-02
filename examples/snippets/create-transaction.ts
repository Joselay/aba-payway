/**
 * Create Transaction
 *
 * Generate checkout parameters for a payment.
 * This is synchronous — no API call is made. The returned params
 * are submitted from the browser via ABA's checkout JS SDK.
 *
 * Usage: npx tsx examples/snippets/create-transaction.ts
 */

import { PayWay } from "aba-payway";

const merchantId = process.env.ABA_PAYWAY_MERCHANT_ID;
const apiKey = process.env.ABA_PAYWAY_API_KEY;

if (!merchantId || !apiKey) {
	throw new Error("Set ABA_PAYWAY_MERCHANT_ID and ABA_PAYWAY_API_KEY");
}

const payway = new PayWay({ merchantId, apiKey });

const params = payway.createTransaction({
	transactionId: `order-${Date.now()}`,
	amount: 10.0,
	firstName: "John",
	lastName: "Doe",
	email: "john@example.com",
	phone: "012345678",
	items: "T-Shirt",
	returnUrl: "https://yoursite.com/payment/callback",
});

console.log("Checkout params:", params);
console.log();
console.log(
	"Submit these params in a hidden form and call AbaPayway.checkout()",
);
