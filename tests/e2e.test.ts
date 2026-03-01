/**
 * End-to-end tests against the ABA PayWay sandbox.
 * Requires ABA_PAYWAY_MERCHANT_ID and ABA_PAYWAY_API_KEY in .env
 *
 * Run: bunx vitest run tests/e2e.test.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PayWay } from "../src/client.ts";

// Load .env manually since vitest v4 doesn't auto-load it
function loadEnvFile() {
	try {
		const content = readFileSync(
			resolve(import.meta.dirname ?? ".", "../.env"),
			"utf-8",
		);
		for (const line of content.split("\n")) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#")) continue;
			const eqIdx = trimmed.indexOf("=");
			if (eqIdx === -1) continue;
			const key = trimmed.slice(0, eqIdx);
			const value = trimmed.slice(eqIdx + 1);
			if (!process.env[key]) {
				process.env[key] = value;
			}
		}
	} catch {
		// .env file not found — tests will be skipped
	}
}
loadEnvFile();

const merchantId = process.env.ABA_PAYWAY_MERCHANT_ID ?? "";
const apiKey = process.env.ABA_PAYWAY_API_KEY ?? "";
const hasCredentials = merchantId !== "" && apiKey !== "";

const EXISTING_TRAN_ID = "PW1772384314949";

describe.skipIf(!hasCredentials)("E2E: Sandbox", () => {
	function createClient() {
		return new PayWay({ merchantId, apiKey });
	}

	describe("createTransaction", () => {
		it("generates checkout params and sandbox accepts the hash", async () => {
			const client = createClient();
			const tranId = `ct-${Date.now()}`;
			const params = client.createTransaction({
				transactionId: tranId,
				amount: 1.0,
				currency: "USD",
				firstName: "Test",
				lastName: "User",
				email: "test@example.com",
				phone: "012345678",
				items: [{ name: "Test Item", quantity: "1", price: "1.00" }],
			});

			// Verify local param generation
			expect(params.hash).toBeTruthy();
			expect(params.tran_id).toBe(tranId);
			expect(params.amount).toBe("1.00");
			expect(params.currency).toBe("USD");
			expect(params.merchant_id).toBe(merchantId);
			expect(params.action).toContain("checkout-sandbox.payway.com.kh");

			// POST to sandbox to verify hash is accepted
			const formData = new FormData();
			for (const [key, value] of Object.entries(params)) {
				if (key === "action") continue;
				if (value !== undefined && value !== "")
					formData.append(key, String(value));
			}
			const resp = await fetch(params.action, {
				method: "POST",
				body: formData,
			});
			expect(resp.status).toBe(200);

			const body = await resp.json();
			expect(body.status.code).toBe("00");
			expect(body.status.message).toBe("Success!");
			expect(body.status.tran_id).toBe(tranId);
			expect(body.qrString).toBeTruthy();
			expect(body.abapay_deeplink).toBeTruthy();
		});
	});

	describe("checkTransaction", () => {
		it("returns transaction status with full data", async () => {
			const client = createClient();
			const result = await client.checkTransaction(EXISTING_TRAN_ID);

			expect(result.status.code).toBe("00");
			expect(result.status.message).toBe("Success!");
			expect(result.status.tran_id).toBe(EXISTING_TRAN_ID);

			expect(result.data).toBeDefined();
			const data = result.data!;
			expect(data.payment_status).toBe("PENDING");
			expect(data.payment_status_code).toBe(2);
			expect(data.original_amount).toBe(1);
			expect(data.total_amount).toBe(1);
			expect(data.transaction_date).toBeTruthy();
		});
	});

	describe("getTransactionDetails", () => {
		it("returns full transaction details", async () => {
			const client = createClient();
			const result = await client.getTransactionDetails(EXISTING_TRAN_ID);

			expect(result.status.code).toBe("00");
			expect(result.status.message).toBe("Success!");

			expect(result.data).toBeDefined();
			const data = result.data!;
			expect(data.transaction_id).toBe(EXISTING_TRAN_ID);
			expect(data.payment_status).toBe("PENDING");
			expect(data.payment_status_code).toBe(2);
			expect(data.original_amount).toBe(1);
			expect(data.original_currency).toBe("KHR");
			expect(data.first_name).toBe("John");
			expect(data.last_name).toBe("Doe");
			expect(data.email).toBe("john@example.com");
			expect(data.phone).toBe("012345678");
			expect(data.transaction_date).toBeTruthy();
			expect(data.transaction_operations).toBeInstanceOf(Array);
		});
	});

	describe("listTransactions", () => {
		it("returns paginated transaction list", async () => {
			const client = createClient();
			const result = await client.listTransactions();

			expect(result.status.code).toBe("00");
			expect(result.data).toBeInstanceOf(Array);
			expect(result.data.length).toBeGreaterThan(0);
			expect(result.page).toBeDefined();
			expect(result.pagination).toBeDefined();

			// Verify transaction object shape
			const txn = result.data[0]!;
			expect(txn.transaction_id).toBeTruthy();
			expect(txn.transaction_date).toBeTruthy();
			expect(txn.payment_status).toBeTruthy();
			expect(typeof txn.payment_status_code).toBe("number");
			expect(typeof txn.original_amount).toBe("number");
		});

		it("filters by date range", async () => {
			const client = createClient();
			const now = new Date();
			const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
			const fmt = (d: Date) =>
				`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} 00:00:00`;

			const result = await client.listTransactions({
				fromDate: fmt(yesterday),
				toDate: fmt(now),
			});

			expect(result.status.code).toBe("00");
			expect(result.data).toBeInstanceOf(Array);
		});
	});

	describe("getExchangeRate", () => {
		it("returns exchange rates with buy/sell values", async () => {
			const client = createClient();
			const result = await client.getExchangeRate();

			expect(result.status.code).toBe("00");
			expect(result.exchange_rates).toBeDefined();
		});
	});

	describe("generateQR", () => {
		it("generates QR with qrString, qrImage, and deeplink", async () => {
			const client = createClient();
			const tranId = `qr-${Date.now()}`;
			const result = await client.generateQR({
				transactionId: tranId,
				amount: 0.01,
				currency: "USD",
				paymentOption: "abapay_khqr",
				qrImageTemplate: "template1",
				lifetime: 5,
				firstName: "Test",
				lastName: "User",
				email: "test@example.com",
				phone: "012345678",
			});

			expect(result.status.code).toBe("0");
			expect(result.status.message).toBe("Success.");
			expect(result.status.tran_id).toBe(tranId);
			expect(result.status.trace_id).toBeTruthy();

			expect(result.amount).toBe(0.01);
			expect(result.currency).toBe("USD");
			expect(result.qrString).toBeTruthy();
			expect(result.qrImage).toMatch(/^data:image\/png;base64,/);
			expect(result.abapay_deeplink).toContain("abamobilebank://");
			expect(result.app_store).toContain("itunes.apple.com");
			expect(result.play_store).toContain("play.google.com");
		});
	});
});
