import { describe, expect, it } from "vitest";
import { createHash } from "../src/hash.ts";

describe("createHash", () => {
	it("should generate a consistent HMAC-SHA512 base64 hash", () => {
		const values = ["20260101120000", "merchant123", "order-001", "10.00"];
		const apiKey = "test-api-key";

		const hash1 = createHash(values, apiKey);
		const hash2 = createHash(values, apiKey);

		expect(hash1).toBe(hash2);
		expect(hash1).toBeTypeOf("string");
		expect(hash1.length).toBeGreaterThan(0);
	});

	it("should produce different hashes for different values", () => {
		const apiKey = "test-api-key";
		const hash1 = createHash(["value1"], apiKey);
		const hash2 = createHash(["value2"], apiKey);

		expect(hash1).not.toBe(hash2);
	});

	it("should produce different hashes for different api keys", () => {
		const values = ["same-value"];
		const hash1 = createHash(values, "key1");
		const hash2 = createHash(values, "key2");

		expect(hash1).not.toBe(hash2);
	});

	it("should handle empty values array", () => {
		const hash = createHash([], "test-key");
		expect(hash).toBeTypeOf("string");
		expect(hash.length).toBeGreaterThan(0);
	});

	it("should produce valid base64 output", () => {
		const hash = createHash(["test"], "key");
		const base64Regex = /^[A-Za-z0-9+/]+=*$/;
		expect(hash).toMatch(base64Regex);
	});

	it("should concatenate values before hashing", () => {
		const apiKey = "test-key";
		const hashSeparate = createHash(["abc", "def"], apiKey);
		const hashCombined = createHash(["abcdef"], apiKey);

		expect(hashSeparate).toBe(hashCombined);
	});

	// Pinned hash vectors — these catch any regression in field concatenation order.
	// Each expected value was independently computed via Node crypto and must never change
	// unless ABA explicitly changes their hash specification.

	it("should produce the correct hash for a known createTransaction field order", () => {
		// Field order per docs/01-purchase.md:
		// req_time, merchant_id, tran_id, amount, items, shipping,
		// firstname, lastname, email, phone, type, payment_option,
		// return_url, cancel_url, continue_success_url, return_deeplink,
		// currency, custom_fields, return_params, payout, lifetime,
		// additional_params, google_pay_token, skip_success_page
		const fields = [
			"20260101000000",
			"ec000002",
			"TXN001",
			"1.00",
			"",
			"",
			"",
			"",
			"",
			"",
			"purchase",
			"",
			"",
			"",
			"",
			"",
			"USD",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
		];
		const hash = createHash(fields, "test-api-key");
		expect(hash).toBe(
			"ynFd/I3hcDAPCmVpbCbR1+TV5wdWWgjbJ9hmin4C9KrsIx0ZvPBiqkDGoAH3kcpM5KlppzAzIHDaeShcH6vYlA==",
		);
	});

	it("should produce the correct hash for a known checkTransaction field order", () => {
		// Field order per docs/02-check-transaction.md: req_time, merchant_id, tran_id
		const fields = ["20260101000000", "ec000002", "order-001"];
		const hash = createHash(fields, "test-api-key");
		expect(hash).toBe(
			"YYeZbqKuLcZrqBs3lpGi+KDCUVLNEqj8zvCNstGUDXiBPceHdxE8S85hZEYOzoned+dJ6eCCKIwaLwPwX5tFsg==",
		);
	});

	it("should produce the correct hash for a known generateQR field order", () => {
		// Field order per docs/14-qr-api.md:
		// req_time, merchant_id, tran_id, amount, items, first_name, last_name,
		// email, phone, purchase_type, payment_option, callback_url, return_deeplink,
		// currency, custom_fields, return_params, payout, lifetime, qr_image_template
		const fields = [
			"20260101000000",
			"ec000002",
			"QR001",
			"10.00",
			"",
			"",
			"",
			"",
			"",
			"",
			"abapay_khqr",
			"",
			"",
			"USD",
			"",
			"",
			"",
			"30",
			"template1",
		];
		const hash = createHash(fields, "test-api-key");
		expect(hash).toBe(
			"IV+Yw8MEjRXyY1VI9gTKmEKJt9VPOk8hCF/fYoUsI6KygyNR4tIV/islLVxHHj0I7I0OD/SNjINcgEEjyVhlkg==",
		);
	});
});
