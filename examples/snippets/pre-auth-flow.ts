/**
 * Pre-Authorization Flow
 *
 * Create a pre-auth transaction that reserves funds without capturing.
 * Useful for hotel bookings, car rentals, etc. where the final amount
 * may differ from the initial hold.
 *
 * Flow: pre-auth → check status → (later) complete or cancel
 *
 * Usage: npx tsx examples/snippets/pre-auth-flow.ts
 */

import { PayWay } from "aba-payway";

const merchantId = process.env.ABA_PAYWAY_MERCHANT_ID;
const apiKey = process.env.ABA_PAYWAY_API_KEY;

if (!merchantId || !apiKey) {
	throw new Error("Set ABA_PAYWAY_MERCHANT_ID and ABA_PAYWAY_API_KEY");
}

const payway = new PayWay({ merchantId, apiKey });

// Step 1: Create a pre-auth transaction
const transactionId = `preauth-${Date.now()}`;

const params = payway.createTransaction({
	transactionId,
	amount: 100.0,
	type: "pre-auth", // Reserve funds, don't capture yet
	firstName: "John",
	lastName: "Doe",
	items: "Hotel Room - 2 nights",
	returnUrl: "https://yoursite.com/payment/callback",
});

console.log("Pre-auth params created for:", transactionId);
console.log("Type:", params.type); // "pre-auth"
console.log();

// Step 2: After the customer completes payment, check the status
console.log("After customer pays, check status:");
console.log(
	`  const status = await payway.checkTransaction("${transactionId}")`,
);
console.log('  // status.data?.payment_status === "PRE-AUTH"');
console.log();

// Step 3: Later, complete or cancel the pre-auth
console.log("To capture the funds (complete pre-auth):");
console.log("  Use ABA PayWay's complete-pre-auth API");
console.log();
console.log("To release the hold (cancel):");
console.log(`  await payway.closeTransaction("${transactionId}")`);
