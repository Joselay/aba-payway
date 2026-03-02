/**
 * Error Handling
 *
 * Demonstrates how to handle all error types thrown by the SDK:
 * - PayWayConfigError: invalid config or missing params
 * - PayWayAPIError: ABA API returned a non-2xx response
 * - PayWayError: network failures or unexpected errors
 *
 * Usage: npx tsx examples/snippets/error-handling.ts
 */

import {
	PayWay,
	PayWayAPIError,
	PayWayConfigError,
	PayWayError,
} from "aba-payway";

// --- Config errors (thrown immediately) ---

try {
	new PayWay({ merchantId: "", apiKey: "key" });
} catch (err) {
	if (err instanceof PayWayConfigError) {
		console.log("[ConfigError]", err.message); // "merchantId is required"
	}
}

// --- API errors (thrown on network calls) ---

const merchantId = process.env.ABA_PAYWAY_MERCHANT_ID;
const apiKey = process.env.ABA_PAYWAY_API_KEY;

if (!merchantId || !apiKey) {
	throw new Error("Set ABA_PAYWAY_MERCHANT_ID and ABA_PAYWAY_API_KEY");
}

const payway = new PayWay({ merchantId, apiKey });

try {
	await payway.checkTransaction("nonexistent-txn");
} catch (err) {
	if (err instanceof PayWayAPIError) {
		console.log("[APIError]", err.message);
		console.log("  HTTP status:", err.statusCode);
		console.log("  Response body:", err.responseBody);
	} else if (err instanceof PayWayError) {
		// Network failure, timeout, etc.
		console.log("[NetworkError]", err.message);
	}
}

// --- Recommended pattern: catch specific errors first ---

async function _processPayment(transactionId: string) {
	try {
		const result = await payway.checkTransaction(transactionId);
		return result;
	} catch (err) {
		if (err instanceof PayWayAPIError) {
			// API returned an error response — log and handle
			console.error(`API error (${err.statusCode}):`, err.responseBody);
		} else if (err instanceof PayWayError) {
			// Network/timeout — maybe retry
			console.error("Network error:", err.message);
		}
		throw err;
	}
}
