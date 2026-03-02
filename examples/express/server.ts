/**
 * Express Integration
 *
 * Minimal Express server with checkout and callback endpoints.
 *
 * Setup:
 *   npm install express aba-payway
 *   npx tsx examples/express/server.ts
 *
 * Endpoints:
 *   POST /api/checkout    — Create transaction, return checkout params
 *   POST /api/callback    — Receive payment callback from ABA
 *   GET  /api/status/:id  — Check transaction status
 */

import { PayWay, PayWayAPIError } from "aba-payway";
import express from "express";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.post("/api/checkout", (req, res) => {
	try {
		const params = payway.createTransaction({
			transactionId: req.body.orderId,
			amount: req.body.amount,
			firstName: req.body.firstName,
			lastName: req.body.lastName,
			email: req.body.email,
			phone: req.body.phone,
			items: req.body.items ?? "Order payment",
			returnUrl: `${req.protocol}://${req.get("host")}/api/callback`,
		});

		res.json(params);
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error";
		res.status(400).json({ error: message });
	}
});

// ABA sends a POST here after payment completes
app.post("/api/callback", (req, res) => {
	console.log("Payment callback:", req.body);
	// Verify the transaction status server-side
	// await payway.checkTransaction(req.body.tran_id)
	res.json({ received: true });
});

// Check transaction status
app.get("/api/status/:id", async (req, res) => {
	try {
		const result = await payway.checkTransaction(req.params.id);
		res.json(result);
	} catch (err) {
		if (err instanceof PayWayAPIError) {
			res
				.status(err.statusCode)
				.json({ error: err.message, body: err.responseBody });
		} else {
			const message = err instanceof Error ? err.message : "Unknown error";
			res.status(500).json({ error: message });
		}
	}
});

app.listen(3000, () => {
	console.log("Express server running at http://localhost:3000");
});
