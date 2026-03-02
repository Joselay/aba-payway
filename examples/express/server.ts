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
app.post("/api/callback", async (req, res) => {
	const transactionId = req.body.tran_id;

	if (typeof transactionId !== "string" || !transactionId) {
		res.status(400).json({ error: "Missing tran_id" });
		return;
	}

	// Always verify the transaction server-side
	try {
		const result = await payway.checkTransaction(transactionId);
		console.log("Payment verified:", result.data?.payment_status);

		// Update your order in the database
		// await db.orders.update({ transactionId, status: result.data?.payment_status })

		res.json({ received: true, status: result.data?.payment_status });
	} catch (err) {
		if (err instanceof PayWayAPIError) {
			console.error("Verification failed:", err.statusCode, err.responseBody);
		}
		res.status(500).json({ error: "Verification failed" });
	}
});

// Check transaction status
app.get("/api/status/:id", async (req, res) => {
	try {
		const result = await payway.checkTransaction(req.params.id);
		res.json(result);
	} catch (err) {
		if (err instanceof PayWayAPIError) {
			console.error(`API error (${err.statusCode}):`, err.responseBody);
			res.status(502).json({ error: err.message });
		} else {
			const message = err instanceof Error ? err.message : "Unknown error";
			res.status(500).json({ error: message });
		}
	}
});

app.listen(3000, () => {
	console.log("Express server running at http://localhost:3000");
});
