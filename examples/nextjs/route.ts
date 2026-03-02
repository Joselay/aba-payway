/**
 * Next.js App Router Integration
 *
 * API route handlers for checkout and callback.
 * Place these in your Next.js project:
 *   app/api/checkout/route.ts  — Create transaction
 *   app/api/callback/route.ts  — Receive payment callback
 *
 * Setup:
 *   npm install aba-payway
 *
 * Environment variables (.env.local):
 *   ABA_PAYWAY_MERCHANT_ID=your_merchant_id
 *   ABA_PAYWAY_API_KEY=your_api_key
 */

import { PayWay, PayWayAPIError } from "aba-payway";

const merchantId = process.env.ABA_PAYWAY_MERCHANT_ID;
const apiKey = process.env.ABA_PAYWAY_API_KEY;

if (!merchantId || !apiKey) {
	throw new Error("Set ABA_PAYWAY_MERCHANT_ID and ABA_PAYWAY_API_KEY");
}

const payway = new PayWay({
	merchantId,
	apiKey,
	environment: process.env.NODE_ENV === "production" ? "production" : "sandbox",
});

// --- app/api/checkout/route.ts ---

export async function POST(request: Request) {
	try {
		const { orderId, amount, firstName, lastName, email, phone } =
			await request.json();

		const params = payway.createTransaction({
			transactionId: orderId,
			amount,
			firstName,
			lastName,
			email,
			phone,
			items: "Order payment",
			returnUrl: `${process.env.NEXT_PUBLIC_URL}/api/callback`,
		});

		return Response.json(params);
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error";
		return Response.json({ error: message }, { status: 400 });
	}
}

// --- app/api/callback/route.ts ---

export async function POST_callback(request: Request) {
	const formData = await request.formData();
	const data = Object.fromEntries(formData.entries());
	const transactionId = data.tran_id as string;

	// Verify the transaction server-side
	try {
		const result = await payway.checkTransaction(transactionId);
		console.log("Payment verified:", result.data?.payment_status);

		// Update your order in the database
		// await db.orders.update({ transactionId, status: result.data?.payment_status })

		return Response.json({
			received: true,
			status: result.data?.payment_status,
		});
	} catch (err) {
		if (err instanceof PayWayAPIError) {
			console.error("Verification failed:", err.statusCode, err.responseBody);
		}
		return Response.json({ error: "Verification failed" }, { status: 500 });
	}
}
