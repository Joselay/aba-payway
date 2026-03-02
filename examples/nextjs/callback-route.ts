/**
 * Next.js App Router — Callback Route
 *
 * Place this file at: app/api/callback/route.ts
 * ABA sends a POST here after payment completes.
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

export async function POST(request: Request) {
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
