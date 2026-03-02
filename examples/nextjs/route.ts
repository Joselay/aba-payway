/**
 * Next.js App Router — Checkout Route
 *
 * Place this file at: app/api/checkout/route.ts
 * For the callback route, see callback-route.ts
 *
 * Setup:
 *   npm install aba-payway
 *
 * Environment variables (.env.local):
 *   ABA_PAYWAY_MERCHANT_ID=your_merchant_id
 *   ABA_PAYWAY_API_KEY=your_api_key
 *   NEXT_PUBLIC_URL=http://localhost:3000
 */

import { PayWay } from "aba-payway";

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
