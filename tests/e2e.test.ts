/**
 * End-to-end tests against the ABA PayWay sandbox.
 *
 * These simulate real user journeys — each flow creates a transaction,
 * then progresses through the lifecycle (check → list → details → close),
 * verifying the state at every step.
 *
 * Note: The sandbox has a ~3s propagation delay before new transactions
 * are visible via checkTransaction. The sandbox also does not actually
 * change transaction status after close — it acks the close but keeps
 * the status as PENDING.
 *
 * Requires ABA_PAYWAY_MERCHANT_ID and ABA_PAYWAY_API_KEY in .env
 * Run: bunx vitest run tests/e2e.test.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { PayWay } from "../src/client.ts";

function toFormData(params: object): FormData {
	const formData = new FormData();
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== null && value !== "") {
			formData.append(key, String(value));
		}
	}
	return formData;
}

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Sandbox needs ~3s before new transactions appear in checkTransaction
const PROPAGATION_DELAY = 3000;

describe.skipIf(!hasCredentials)("E2E: Sandbox", () => {
	let client: PayWay;
	beforeAll(() => {
		client = new PayWay({ merchantId, apiKey });
	});

	// ---------------------------------------------------------------
	// Flow 1: Purchase lifecycle
	//   create → (wait) → check (PENDING) → details → list → close
	// ---------------------------------------------------------------
	describe("Purchase lifecycle", () => {
		const tranId = `e2e-${Date.now()}`;

		it("Step 1: create a transaction and sandbox accepts the hash", async () => {
			const params = client.createTransaction({
				transactionId: tranId,
				amount: 1.0,
				currency: "USD",
				firstName: "John",
				lastName: "Doe",
				email: "john@example.com",
				phone: "012345678",
				items: [{ name: "Widget", quantity: "1", price: "1.00" }],
			});

			expect(params.hash).toBeTruthy();
			expect(params.tran_id).toBe(tranId);
			expect(params.amount).toBe("1.00");
			expect(params.currency).toBe("USD");
			expect(params.merchant_id).toBe(merchantId);

			// POST to sandbox — proves the hash is correct
			const { action, ...formFields } = params;
			const resp = await fetch(action, {
				method: "POST",
				body: toFormData(formFields),
			});
			const body = await resp.json();

			expect(resp.status).toBe(200);
			expect(body.status.code).toBe("00");
			expect(body.status.tran_id).toBe(tranId);

			// Wait for sandbox propagation
			await sleep(PROPAGATION_DELAY);
		});

		it("Step 2: check transaction — should be PENDING", async () => {
			const result = await client.checkTransaction(tranId);

			expect(result.status.code).toBe("00");
			expect(result.data).toBeDefined();
			expect(result.data?.payment_status).toBe("PENDING");
			expect(result.data?.payment_status_code).toBe(2);
			expect(result.data?.original_amount).toBe(1);
			expect(result.data?.total_amount).toBe(1);
		});

		it("Step 3: get transaction details — verify all fields", async () => {
			const result = await client.getTransactionDetails(tranId);

			expect(result.status.code).toBe("00");
			expect(result.data).toBeDefined();

			// biome-ignore lint/style/noNonNullAssertion: asserted defined above
			const data = result.data!;
			expect(data.transaction_id).toBe(tranId);
			expect(data.payment_status).toBe("PENDING");
			expect(data.original_amount).toBe(1);
			expect(data.first_name).toBe("John");
			expect(data.last_name).toBe("Doe");
			expect(data.email).toBe("john@example.com");
			expect(data.phone).toBe("012345678");
			expect(data.transaction_date).toBeTruthy();
			expect(data.transaction_operations).toBeInstanceOf(Array);
		});

		it("Step 4: list transactions — our transaction should appear", async () => {
			const result = await client.listTransactions();

			expect(result.status.code).toBe("00");
			expect(result.data).toBeInstanceOf(Array);
			expect(result.data.length).toBeGreaterThan(0);

			const found = result.data.find((t) => t.transaction_id === tranId);
			expect(found).toBeDefined();
			expect(found?.payment_status).toBe("PENDING");
			expect(found?.original_amount).toBe(1);
		});

		it("Step 5: close transaction — sandbox accepts the request", async () => {
			const result = await client.closeTransaction(tranId);

			expect(result.status.code).toBe("00");
			// Note: sandbox acks the close but doesn't actually change
			// the transaction status to CANCELLED
		});
	});

	// ---------------------------------------------------------------
	// Flow 2: QR payment lifecycle
	//   generate QR → (wait) → check (PENDING) → details → close
	// ---------------------------------------------------------------
	describe("QR payment lifecycle", () => {
		const tranId = `qr-${Date.now()}`;

		it("Step 1: generate QR code (whole number amount — regression for hash mismatch bug)", async () => {
			const result = await client.generateQR({
				transactionId: tranId,
				amount: 1,
				currency: "USD",
				paymentOption: "abapay_khqr",
				qrImageTemplate: "template1",
				lifetime: 5,
				firstName: "Jane",
				lastName: "Smith",
				email: "jane@example.com",
				phone: "098765432",
			});

			expect(result.status.code).toBe("0");
			expect(result.status.tran_id).toBe(tranId);
			expect(result.amount).toBe(1);
			expect(result.currency).toBe("USD");
			expect(result.qrString).toBeTruthy();
			expect(result.qrImage).toMatch(/^data:image\/png;base64,/);
			expect(result.abapay_deeplink).toContain("abamobilebank://");

			// Wait for sandbox propagation
			await sleep(PROPAGATION_DELAY);
		});

		it("Step 2: check transaction — should be PENDING", async () => {
			const result = await client.checkTransaction(tranId);

			expect(result.status.code).toBe("00");
			expect(result.data?.payment_status).toBe("PENDING");
			expect(result.data?.payment_status_code).toBe(2);
		});

		it("Step 3: get transaction details", async () => {
			const result = await client.getTransactionDetails(tranId);

			expect(result.status.code).toBe("00");
			expect(result.data?.transaction_id).toBe(tranId);
			expect(result.data?.payment_status).toBe("PENDING");
			expect(result.data?.first_name).toBe("Jane");
			expect(result.data?.last_name).toBe("Smith");
		});

		it("Step 4: close transaction — sandbox accepts the request", async () => {
			const result = await client.closeTransaction(tranId);

			expect(result.status.code).toBe("00");
		});
	});

	// ---------------------------------------------------------------
	// Flow 3: Exchange rate (standalone)
	// ---------------------------------------------------------------
	describe("Exchange rate", () => {
		it("fetches rates successfully", async () => {
			const result = await client.getExchangeRate();

			expect(result.status.code).toBe("00");
			expect(result.exchange_rates).toBeDefined();
		});
	});

	// ---------------------------------------------------------------
	// Flow 4: List transactions with date filter
	// ---------------------------------------------------------------
	describe("List transactions with filters", () => {
		it("filters by date range", async () => {
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
});
