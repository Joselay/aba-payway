/**
 * Hono Integration
 *
 * Minimal Hono server with checkout and callback endpoints.
 * Works with Node.js, Bun, Deno, and Cloudflare Workers.
 *
 * Setup:
 *   npm install hono @hono/node-server aba-payway
 *   npx tsx examples/hono/server.ts
 *
 * Endpoints:
 *   POST /api/checkout    — Create transaction, return checkout params
 *   POST /api/callback    — Receive payment callback from ABA
 *   GET  /api/status/:id  — Check transaction status
 */

import { serve } from "@hono/node-server";
import { PayWay, PayWayAPIError } from "aba-payway";
import { Hono } from "hono";

const app = new Hono();

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

// Create checkout params for the frontend
app.post("/api/checkout", async (c) => {
	try {
		const body = await c.req.json();

		const params = payway.createTransaction({
			transactionId: body.orderId,
			amount: body.amount,
			firstName: body.firstName,
			lastName: body.lastName,
			email: body.email,
			phone: body.phone,
			items: body.items ?? "Order payment",
			returnUrl: new URL("/api/callback", c.req.url).toString(),
		});

		return c.json(params);
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error";
		return c.json({ error: message }, 400);
	}
});

// ABA sends a POST here after payment completes
app.post("/api/callback", async (c) => {
	const body = await c.req.parseBody();
	console.log("Payment callback:", body);
	return c.json({ received: true });
});

// Check transaction status
app.get("/api/status/:id", async (c) => {
	try {
		const result = await payway.checkTransaction(c.req.param("id"));
		return c.json(result);
	} catch (err) {
		if (err instanceof PayWayAPIError) {
			return c.json(
				{ error: err.message, body: err.responseBody },
				err.statusCode as 500,
			);
		}
		const message = err instanceof Error ? err.message : "Unknown error";
		return c.json({ error: message }, 500);
	}
});

serve({ fetch: app.fetch, port: 3000 }, () => {
	console.log("Hono server running at http://localhost:3000");
});
