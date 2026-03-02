/**
 * Structured Items
 *
 * Pass items as an array of { name, quantity, price } objects.
 * The SDK automatically JSON-stringifies and base64-encodes them.
 *
 * Usage: npx tsx examples/snippets/items-array.ts
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
	amount: 35.0,
	firstName: "Jane",
	lastName: "Doe",
	email: "jane@example.com",
	items: [
		{ name: "T-Shirt (L)", quantity: "2", price: "12.50" },
		{ name: "Cap", quantity: "1", price: "10.00" },
	],
	shipping: 5.0,
	returnUrl: "https://yoursite.com/payment/callback",
});

console.log("Transaction ID:", params.tran_id);
console.log("Amount:", params.amount, params.currency);
console.log("Shipping:", params.shipping);
console.log("Items (base64):", params.items);
