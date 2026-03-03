import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PayWay } from "../src/client.ts";
import { BASE_URLS } from "../src/constants.ts";
import {
	PayWayAPIError,
	PayWayConfigError,
	PayWayError,
} from "../src/errors.ts";
import { createHash } from "../src/hash.ts";
import { toBase64 } from "../src/utils.ts";

function getFetchCall(
	spy: ReturnType<typeof vi.spyOn>,
	index = 0,
): { url: string; options: RequestInit } {
	const call = spy.mock.calls[index];
	if (!call)
		throw new Error(
			`Expected fetch call at index ${index}, but spy has ${spy.mock.calls.length} call(s)`,
		);
	return {
		url: call[0] as string,
		options: (call[1] ?? {}) as RequestInit,
	};
}

function getJsonBody(
	spy: ReturnType<typeof vi.spyOn>,
	index = 0,
): Record<string, unknown> {
	const { options } = getFetchCall(spy, index);
	return JSON.parse(options.body as string) as Record<string, unknown>;
}

describe("PayWay", () => {
	describe("constructor", () => {
		it("should create instance with valid config", () => {
			const client = new PayWay({
				merchantId: "test-merchant",
				apiKey: "test-key",
			});
			expect(client).toBeInstanceOf(PayWay);
		});

		it("should throw PayWayConfigError if merchantId is missing", () => {
			expect(() => new PayWay({ merchantId: "", apiKey: "test-key" })).toThrow(
				PayWayConfigError,
			);
		});

		it("should throw PayWayConfigError if apiKey is missing", () => {
			expect(
				() => new PayWay({ merchantId: "test-merchant", apiKey: "" }),
			).toThrow(PayWayConfigError);
		});
	});

	describe("createTransaction validation", () => {
		const client = new PayWay({ merchantId: "m", apiKey: "k" });

		it("should throw if transactionId is empty", () => {
			expect(() =>
				client.createTransaction({ transactionId: "", amount: 1 }),
			).toThrow(PayWayConfigError);
		});

		it("should throw if transactionId exceeds 20 characters", () => {
			expect(() =>
				client.createTransaction({
					transactionId: "a".repeat(21),
					amount: 1,
				}),
			).toThrow("at most 20 characters");
		});

		it("should throw if amount is zero", () => {
			expect(() =>
				client.createTransaction({ transactionId: "t1", amount: 0 }),
			).toThrow("greater than 0");
		});

		it("should throw if amount is negative", () => {
			expect(() =>
				client.createTransaction({ transactionId: "t1", amount: -5 }),
			).toThrow("greater than 0");
		});

		it("should throw if lifetime is below 3", () => {
			expect(() =>
				client.createTransaction({
					transactionId: "t1",
					amount: 1,
					lifetime: 2,
				}),
			).toThrow("between 3 and 43200");
		});

		it("should throw if lifetime exceeds 43200", () => {
			expect(() =>
				client.createTransaction({
					transactionId: "t1",
					amount: 1,
					lifetime: 43_201,
				}),
			).toThrow("between 3 and 43200");
		});

		it("should accept valid lifetime", () => {
			const params = client.createTransaction({
				transactionId: "t1",
				amount: 1,
				lifetime: 60,
			});
			expect(params.lifetime).toBe("60");
		});
	});

	describe("createTransaction", () => {
		it("should return checkout params with correct fields", () => {
			const client = new PayWay({
				merchantId: "test-merchant",
				apiKey: "test-key",
			});

			const params = client.createTransaction({
				transactionId: "order-001",
				amount: 10.0,
				firstName: "John",
				lastName: "Doe",
				email: "john@example.com",
				phone: "012345678",
				items: "Test Product",
				returnUrl: "http://localhost:3000/callback",
			});

			expect(params.tran_id).toBe("order-001");
			expect(params.amount).toBe("10.00");
			expect(params.merchant_id).toBe("test-merchant");
			expect(params.firstname).toBe("John");
			expect(params.lastname).toBe("Doe");
			expect(params.email).toBe("john@example.com");
			expect(params.phone).toBe("012345678");
			expect(params.type).toBe("purchase");
			expect(params.currency).toBe("USD");
			expect(params.hash).toBeTruthy();
			expect(params.req_time).toMatch(/^\d{14}$/);
			expect(params.action).toContain(BASE_URLS.sandbox);
			expect(params.payout).toBe("");
			expect(params.lifetime).toBe("");
			expect(params.additional_params).toBe("");
			expect(params.google_pay_token).toBe("");
			expect(params.skip_success_page).toBe("");
			expect(params.view_type).toBe("");
			expect(params.payment_gate).toBe("");
		});

		it("should base64-encode items when given as string", () => {
			const client = new PayWay({
				merchantId: "m",
				apiKey: "k",
			});

			const params = client.createTransaction({
				transactionId: "t1",
				amount: 1,
				items: "Product A",
			});

			expect(Buffer.from(params.items, "base64").toString()).toBe("Product A");
		});

		it("should base64-encode items when given as array", () => {
			const client = new PayWay({
				merchantId: "m",
				apiKey: "k",
			});

			const items = [{ name: "Ticket", quantity: "1", price: "10.00" }];
			const params = client.createTransaction({
				transactionId: "t1",
				amount: 10,
				items,
			});

			const decoded = JSON.parse(
				Buffer.from(params.items, "base64").toString(),
			);
			expect(decoded).toEqual(items);
		});

		it("should base64-encode the return URL", () => {
			const client = new PayWay({
				merchantId: "m",
				apiKey: "k",
			});

			const params = client.createTransaction({
				transactionId: "t1",
				amount: 1,
				returnUrl: "http://localhost:3000/callback",
			});

			expect(Buffer.from(params.return_url, "base64").toString()).toBe(
				"http://localhost:3000/callback",
			);
		});

		it("should format KHR amounts as integers", () => {
			const client = new PayWay({
				merchantId: "m",
				apiKey: "k",
			});

			const params = client.createTransaction({
				transactionId: "t1",
				amount: 4500.5,
				currency: "KHR",
			});

			expect(params.amount).toBe("4501");
		});

		it("should base64-encode returnDeeplink", () => {
			const client = new PayWay({
				merchantId: "m",
				apiKey: "k",
			});

			const params = client.createTransaction({
				transactionId: "t1",
				amount: 1,
				returnDeeplink: "myapp://payment/callback",
			});

			expect(Buffer.from(params.return_deeplink, "base64").toString()).toBe(
				"myapp://payment/callback",
			);
		});

		it("should base64-encode customFields", () => {
			const client = new PayWay({
				merchantId: "m",
				apiKey: "k",
			});

			const params = client.createTransaction({
				transactionId: "t1",
				amount: 1,
				customFields: '{"field1":"value1"}',
			});

			expect(Buffer.from(params.custom_fields, "base64").toString()).toBe(
				'{"field1":"value1"}',
			);
		});

		it("should base64-encode additionalParams", () => {
			const client = new PayWay({
				merchantId: "m",
				apiKey: "k",
			});

			const params = client.createTransaction({
				transactionId: "t1",
				amount: 1,
				additionalParams: '{"wechat_sub_appid":"app123"}',
			});

			expect(Buffer.from(params.additional_params, "base64").toString()).toBe(
				'{"wechat_sub_appid":"app123"}',
			);
		});

		it("should format shipping amount like the main amount", () => {
			const client = new PayWay({
				merchantId: "m",
				apiKey: "k",
			});

			const params = client.createTransaction({
				transactionId: "t1",
				amount: 10,
				shipping: 2.5,
			});

			expect(params.shipping).toBe("2.50");
		});

		it("should pass through paymentOption", () => {
			const client = new PayWay({
				merchantId: "m",
				apiKey: "k",
			});

			const params = client.createTransaction({
				transactionId: "t1",
				amount: 10,
				paymentOption: "abapay_khqr",
			});

			expect(params.payment_option).toBe("abapay_khqr");
		});

		it("should support pre-auth transaction type", () => {
			const client = new PayWay({
				merchantId: "m",
				apiKey: "k",
			});

			const params = client.createTransaction({
				transactionId: "t1",
				amount: 50,
				type: "pre-auth",
			});

			expect(params.type).toBe("pre-auth");
		});

		it("should use production URL when environment is 'production'", () => {
			const client = new PayWay({
				merchantId: "m",
				apiKey: "k",
				environment: "production",
			});

			const params = client.createTransaction({
				transactionId: "t1",
				amount: 1,
			});

			expect(params.action).toContain(BASE_URLS.production);
		});

		it("should default to sandbox when environment is omitted", () => {
			const client = new PayWay({
				merchantId: "m",
				apiKey: "k",
			});

			const params = client.createTransaction({
				transactionId: "t1",
				amount: 1,
			});

			expect(params.action).toContain(BASE_URLS.sandbox);
		});

		it("should use baseUrl override when provided", () => {
			const client = new PayWay({
				merchantId: "m",
				apiKey: "k",
				baseUrl: "https://custom.example.com",
			});

			const params = client.createTransaction({
				transactionId: "t1",
				amount: 1,
			});

			expect(params.action).toContain("https://custom.example.com");
		});

		it("should prefer baseUrl over environment", () => {
			const client = new PayWay({
				merchantId: "m",
				apiKey: "k",
				environment: "production",
				baseUrl: "https://custom.example.com",
			});

			const params = client.createTransaction({
				transactionId: "t1",
				amount: 1,
			});

			expect(params.action).toContain("https://custom.example.com");
			expect(params.action).not.toContain(BASE_URLS.production);
		});

		it("should produce hash matching documented field order (pinned vector)", () => {
			// Field order per docs/01-purchase.md hash section:
			// req_time, merchant_id, tran_id, amount, items, shipping,
			// firstname, lastname, email, phone, type, payment_option,
			// return_url, cancel_url, continue_success_url, return_deeplink,
			// currency, custom_fields, return_params, payout, lifetime,
			// additional_params, google_pay_token, skip_success_page
			const client = new PayWay({
				merchantId: "ec000002",
				apiKey: "test-api-key",
			});
			const params = client.createTransaction({
				transactionId: "TXN001",
				amount: 1,
			});
			const expected = createHash(
				[
					params.req_time,
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
				],
				"test-api-key",
			);
			expect(params.hash).toBe(expected);
		});

		it("should use base64-encoded return_url in hash, not raw URL", () => {
			// Verifies that encoded values (not raw) flow into hash computation
			const client = new PayWay({
				merchantId: "ec000002",
				apiKey: "test-api-key",
			});
			const returnUrl = "https://example.com/callback";
			const params = client.createTransaction({
				transactionId: "TXN001",
				amount: 1,
				returnUrl,
			});
			const encodedUrl = toBase64(returnUrl);
			expect(params.return_url).toBe(encodedUrl);
			const expected = createHash(
				[
					params.req_time,
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
					encodedUrl,
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
				],
				"test-api-key",
			);
			expect(params.hash).toBe(expected);
		});

		it("should exclude view_type and payment_gate from hash", () => {
			// Per docs/01-purchase.md: view_type and payment_gate are NOT in hash
			const client = new PayWay({
				merchantId: "ec000002",
				apiKey: "test-api-key",
			});
			const params = client.createTransaction({
				transactionId: "TXN001",
				amount: 1,
				viewType: "checkout",
				paymentGate: 1,
			});
			// view_type and payment_gate appear in output params
			expect(params.view_type).toBe("checkout");
			expect(params.payment_gate).toBe("1");
			// But hash is computed without them
			const expected = createHash(
				[
					params.req_time,
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
				],
				"test-api-key",
			);
			expect(params.hash).toBe(expected);
		});
	});

	describe("API calls", () => {
		let client: PayWay;
		let fetchSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			client = new PayWay({
				merchantId: "test-merchant",
				apiKey: "test-key",
			});
			fetchSpy = vi.spyOn(globalThis, "fetch");
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		describe("checkTransaction", () => {
			it("should throw if transactionId is empty", async () => {
				await expect(client.checkTransaction("")).rejects.toThrow(
					"transactionId is required",
				);
			});

			it("should compute hash over req_time, merchant_id, and tran_id", async () => {
				// Field order per docs/02-check-transaction.md: req_time, merchant_id, tran_id
				fetchSpy.mockResolvedValueOnce(
					new Response(JSON.stringify({ status: { code: "00" }, data: {} }), {
						status: 200,
					}),
				);
				await client.checkTransaction("order-001");
				const body = getJsonBody(fetchSpy);
				const expected = createHash(
					[body.req_time as string, "test-merchant", "order-001"],
					"test-key",
				);
				expect(body.hash).toBe(expected);
			});

			it("should send POST to check-transaction-2 endpoint", async () => {
				const mockResponse = {
					data: {
						payment_status_code: 0,
						total_amount: 10.0,
						original_amount: 10.0,
						refund_amount: 0,
						discount_amount: 0,
						payment_amount: 10.0,
						payment_currency: "USD",
						apv: "123456",
						payment_status: "APPROVED",
						transaction_date: "2026-01-15 10:30:00",
					},
					status: {
						code: "00",
						message: "Success!",
						tran_id: "order-001",
					},
				};

				fetchSpy.mockResolvedValueOnce(
					new Response(JSON.stringify(mockResponse), { status: 200 }),
				);

				const result = await client.checkTransaction("order-001");

				const { url, options } = getFetchCall(fetchSpy);
				expect(url).toContain(
					"/api/payment-gateway/v1/payments/check-transaction-2",
				);

				const headers = options.headers as Record<string, string>;
				expect(headers["Content-Type"]).toBe("application/json");

				const body = getJsonBody(fetchSpy);
				expect(body.tran_id).toBe("order-001");
				expect(body.merchant_id).toBe("test-merchant");
				expect(body.hash).toBeTruthy();

				expect(result.data?.payment_status_code).toBe(0);
				expect(result.data?.payment_status).toBe("APPROVED");
				expect(result.status.code).toBe("00");
			});
		});

		describe("listTransactions", () => {
			it("should send numeric filters as strings", async () => {
				fetchSpy.mockResolvedValueOnce(
					new Response(
						JSON.stringify({
							data: [],
							page: "1",
							pagination: "20",
							status: { code: "00" },
						}),
						{ status: 200 },
					),
				);

				await client.listTransactions({
					fromAmount: 10,
					toAmount: 100,
					page: 2,
					pagination: 50,
				});

				const body = getJsonBody(fetchSpy);
				expect(body.from_amount).toBe("10");
				expect(body.to_amount).toBe("100");
				expect(body.page).toBe("2");
				expect(body.pagination).toBe("50");
			});

			it("should send POST to transaction-list-2 endpoint", async () => {
				const mockResponse = {
					data: [],
					page: "1",
					pagination: "20",
					status: {
						code: "00",
						message: "Success!",
					},
				};

				fetchSpy.mockResolvedValueOnce(
					new Response(JSON.stringify(mockResponse), { status: 200 }),
				);

				// Dates must use YYYY-MM-DD HH:mm:ss format per docs/04-get-transaction-list.md
				const result = await client.listTransactions({
					fromDate: "2026-01-01 00:00:00",
					toDate: "2026-12-31 23:59:59",
					status: "APPROVED",
				});

				const { url, options } = getFetchCall(fetchSpy);
				expect(url).toContain(
					"/api/payment-gateway/v1/payments/transaction-list-2",
				);

				const headers = options.headers as Record<string, string>;
				expect(headers["Content-Type"]).toBe("application/json");

				const body = getJsonBody(fetchSpy);
				expect(body.from_date).toBe("2026-01-01 00:00:00");
				expect(body.to_date).toBe("2026-12-31 23:59:59");
				expect(body.status).toBe("APPROVED");

				expect(result.page).toBe("1");
				expect(result.pagination).toBe("20");
				expect(result.status.code).toBe("00");
			});

			it("should work with no options", async () => {
				fetchSpy.mockResolvedValueOnce(
					new Response(
						JSON.stringify({
							data: [],
							page: "1",
							pagination: "20",
							status: { code: "00" },
						}),
						{ status: 200 },
					),
				);

				await client.listTransactions();
				expect(fetchSpy).toHaveBeenCalledOnce();
			});
		});

		describe("getTransactionDetails", () => {
			it("should send JSON POST to transaction-detail endpoint", async () => {
				const mockResponse = {
					data: {
						transaction_id: "order-001",
						payment_status_code: 0,
						payment_status: "APPROVED",
						original_amount: 10.0,
						original_currency: "USD",
						payment_amount: 10.0,
						payment_currency: "USD",
						total_amount: 10.0,
						refund_amount: 0,
						discount_amount: 0,
						apv: "123456",
						transaction_date: "2026-01-15 10:30:00",
						first_name: "John",
						last_name: "Doe",
						email: "john@example.com",
						phone: "012345678",
						bank_ref: "REF123",
						payment_type: "ABA Pay",
						payer_account: "***1234",
						bank_name: "ABA Bank",
						card_source: "",
						transaction_operations: [
							{
								status: "Completed",
								amount: 10.0,
								transaction_date: "2026-01-15 10:30:00",
								bank_ref: "REF123",
							},
						],
					},
					status: { code: "00", message: "Success" },
				};

				fetchSpy.mockResolvedValueOnce(
					new Response(JSON.stringify(mockResponse), { status: 200 }),
				);

				const result = await client.getTransactionDetails("order-001");

				const { url, options } = getFetchCall(fetchSpy);
				expect(url).toContain(
					"/api/payment-gateway/v1/payments/transaction-detail",
				);

				// Verify JSON content type
				const headers = options.headers as Record<string, string>;
				expect(headers["Content-Type"]).toBe("application/json");

				// Verify JSON body
				const body = getJsonBody(fetchSpy);
				expect(body.tran_id).toBe("order-001");
				expect(body.merchant_id).toBe("test-merchant");
				expect(body.hash).toBeTruthy();
				expect(body.req_time).toBeTruthy();

				expect(result.data?.transaction_id).toBe("order-001");
				expect(result.data?.payment_status).toBe("APPROVED");
				expect(result.data?.transaction_operations).toHaveLength(1);
			});

			it("should throw if transactionId is empty", async () => {
				await expect(client.getTransactionDetails("")).rejects.toThrow(
					"transactionId is required",
				);
			});
		});

		describe("closeTransaction", () => {
			it("should send JSON POST to close-transaction endpoint", async () => {
				const mockResponse = {
					status: {
						code: "00",
						message: "Success",
						tran_id: "order-001",
					},
				};

				fetchSpy.mockResolvedValueOnce(
					new Response(JSON.stringify(mockResponse), { status: 200 }),
				);

				const result = await client.closeTransaction("order-001");

				const { url, options } = getFetchCall(fetchSpy);
				expect(url).toContain(
					"/api/payment-gateway/v1/payments/close-transaction",
				);

				const headers = options.headers as Record<string, string>;
				expect(headers["Content-Type"]).toBe("application/json");

				const body = getJsonBody(fetchSpy);
				expect(body.tran_id).toBe("order-001");
				expect(body.merchant_id).toBe("test-merchant");
				expect(body.hash).toBeTruthy();

				expect(result.status.code).toBe("00");
				expect(result.status.tran_id).toBe("order-001");
			});

			it("should throw if transactionId is empty", async () => {
				await expect(client.closeTransaction("")).rejects.toThrow(
					"transactionId is required",
				);
			});
		});

		describe("getExchangeRate", () => {
			it("should send JSON POST to exchange-rate endpoint", async () => {
				const mockResponse = {
					status: { code: "00", message: "Success" },
					exchange_rates: {
						aud: { sell: "2700", buy: "2600" },
						eur: { sell: "4500", buy: "4400" },
					},
				};

				fetchSpy.mockResolvedValueOnce(
					new Response(JSON.stringify(mockResponse), { status: 200 }),
				);

				const result = await client.getExchangeRate();

				const { url, options } = getFetchCall(fetchSpy);
				expect(url).toContain("/api/payment-gateway/v1/exchange-rate");

				const headers = options.headers as Record<string, string>;
				expect(headers["Content-Type"]).toBe("application/json");

				const body = getJsonBody(fetchSpy);
				expect(body.merchant_id).toBe("test-merchant");
				expect(body.hash).toBeTruthy();
				expect(body.req_time).toBeTruthy();

				expect(result.status.code).toBe("00");
				expect(result.exchange_rates.aud?.sell).toBe("2700");
			});
		});

		describe("generateQR", () => {
			it("should send JSON POST to generate-qr endpoint", async () => {
				const mockResponse = {
					status: { code: "0", message: "Success", trace_id: "abc123" },
					amount: 10,
					currency: "USD",
					qrString: "QR_CONTENT",
					qrImage: "base64image",
					abapay_deeplink: "aba://pay",
					app_store: "https://apps.apple.com/...",
					play_store: "https://play.google.com/...",
				};

				fetchSpy.mockResolvedValueOnce(
					new Response(JSON.stringify(mockResponse), { status: 200 }),
				);

				const result = await client.generateQR({
					transactionId: "qr-001",
					amount: 10,
					paymentOption: "abapay_khqr",
					qrImageTemplate: "template1",
					lifetime: 30,
				});

				const { url, options } = getFetchCall(fetchSpy);
				expect(url).toContain("/api/payment-gateway/v1/payments/generate-qr");

				const headers = options.headers as Record<string, string>;
				expect(headers["Content-Type"]).toBe("application/json");

				const body = getJsonBody(fetchSpy);
				expect(body.tran_id).toBe("qr-001");
				expect(body.amount).toBe("10.00");
				expect(body.payment_option).toBe("abapay_khqr");
				expect(body.qr_image_template).toBe("template1");
				expect(body.lifetime).toBe(30);
				expect(body.merchant_id).toBe("test-merchant");
				expect(body.hash).toBeTruthy();

				expect(result.qrString).toBe("QR_CONTENT");
				expect(result.status.trace_id).toBe("abc123");
			});

			it("should compute hash with correct field order (pinned vector)", async () => {
				// Field order per docs/14-qr-api.md:
				// req_time, merchant_id, tran_id, amount, items, first_name, last_name,
				// email, phone, purchase_type, payment_option, callback_url, return_deeplink,
				// currency, custom_fields, return_params, payout, lifetime, qr_image_template
				fetchSpy.mockResolvedValueOnce(
					new Response(
						JSON.stringify({
							status: { code: "0" },
							amount: 10,
							currency: "USD",
							qrString: "",
							qrImage: "",
							abapay_deeplink: "",
							app_store: "",
							play_store: "",
						}),
						{ status: 200 },
					),
				);
				await client.generateQR({
					transactionId: "qr-001",
					amount: 10,
					paymentOption: "abapay_khqr",
					qrImageTemplate: "template1",
					lifetime: 30,
				});
				const body = getJsonBody(fetchSpy);
				const expected = createHash(
					[
						body.req_time as string,
						"test-merchant",
						"qr-001",
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
					],
					"test-key",
				);
				expect(body.hash).toBe(expected);
			});

			it("should send amount as formatted decimal string, not raw number", async () => {
				// Regression: whole numbers like 1 must be sent as "1.00" not 1,
				// because the API hashes the exact string it receives — "1" ≠ "1.00"
				fetchSpy.mockResolvedValueOnce(
					new Response(
						JSON.stringify({
							status: { code: "0" },
							amount: 1,
							currency: "USD",
							qrString: "",
							qrImage: "",
							abapay_deeplink: "",
							app_store: "",
							play_store: "",
						}),
						{ status: 200 },
					),
				);

				await client.generateQR({
					transactionId: "qr-001",
					amount: 1,
					paymentOption: "abapay_khqr",
					qrImageTemplate: "template1",
					lifetime: 30,
				});

				const body = getJsonBody(fetchSpy);
				expect(body.amount).toBe("1.00");
				expect(typeof body.amount).toBe("string");
			});

			it("should throw if transactionId is empty", async () => {
				await expect(
					client.generateQR({
						transactionId: "",
						amount: 10,
						paymentOption: "abapay_khqr",
						qrImageTemplate: "template1",
						lifetime: 30,
					}),
				).rejects.toThrow("transactionId is required");
			});

			it("should throw if amount is zero or negative", async () => {
				await expect(
					client.generateQR({
						transactionId: "qr-001",
						amount: 0,
						paymentOption: "abapay_khqr",
						qrImageTemplate: "template1",
						lifetime: 30,
					}),
				).rejects.toThrow("amount must be greater than 0");
			});

			it("should throw if paymentOption is empty", async () => {
				await expect(
					client.generateQR({
						transactionId: "qr-001",
						amount: 10,
						// @ts-expect-error testing empty string validation
						paymentOption: "",
						qrImageTemplate: "template1",
						lifetime: 30,
					}),
				).rejects.toThrow("paymentOption is required");
			});

			it("should throw if qrImageTemplate is empty", async () => {
				await expect(
					client.generateQR({
						transactionId: "qr-001",
						amount: 10,
						paymentOption: "abapay_khqr",
						qrImageTemplate: "",
						lifetime: 30,
					}),
				).rejects.toThrow("qrImageTemplate is required");
			});

			it("should throw if lifetime is out of range", async () => {
				await expect(
					client.generateQR({
						transactionId: "qr-001",
						amount: 10,
						paymentOption: "abapay_khqr",
						qrImageTemplate: "template1",
						lifetime: 2,
					}),
				).rejects.toThrow("lifetime must be between 3 and 43200");

				await expect(
					client.generateQR({
						transactionId: "qr-001",
						amount: 10,
						paymentOption: "abapay_khqr",
						qrImageTemplate: "template1",
						lifetime: 43_201,
					}),
				).rejects.toThrow("lifetime must be between 3 and 43200");
			});

			it("should base64-encode items, callbackUrl, returnDeeplink, customFields, and payout", async () => {
				fetchSpy.mockResolvedValueOnce(
					new Response(
						JSON.stringify({
							status: { code: "0" },
							amount: 10,
							currency: "USD",
							qrString: "",
							qrImage: "",
							abapay_deeplink: "",
							app_store: "",
							play_store: "",
						}),
						{ status: 200 },
					),
				);

				await client.generateQR({
					transactionId: "qr-001",
					amount: 10,
					paymentOption: "abapay_khqr",
					qrImageTemplate: "template1",
					lifetime: 30,
					items: "Test Item",
					callbackUrl: "https://example.com/callback",
					returnDeeplink: "myapp://callback",
					customFields: "custom-data",
					payout: '{"account":"123"}',
				});

				const body = getJsonBody(fetchSpy);

				expect(Buffer.from(body.items as string, "base64").toString()).toBe(
					"Test Item",
				);
				expect(
					Buffer.from(body.callback_url as string, "base64").toString(),
				).toBe("https://example.com/callback");
				expect(
					Buffer.from(body.return_deeplink as string, "base64").toString(),
				).toBe("myapp://callback");
				expect(
					Buffer.from(body.custom_fields as string, "base64").toString(),
				).toBe("custom-data");
				expect(Buffer.from(body.payout as string, "base64").toString()).toBe(
					'{"account":"123"}',
				);
			});
		});

		describe("getTransactionsByRef", () => {
			it("should send JSON POST to get-transactions-by-mc-ref endpoint", async () => {
				const mockResponse = {
					data: [
						{
							transaction_id: "t1",
							transaction_date: "2026-01-15",
							apv: "123456",
							payment_status: "APPROVED",
							payment_status_code: 0,
							original_amount: 10,
							original_currency: "USD",
							total_amount: 10,
							discount_amount: 0,
							refund_amount: 0,
							payment_amount: 10,
							payment_currency: "USD",
							bank_ref: "REF1",
							payer_account: "***1234",
							bank_name: "ABA Bank",
							payment_type: "ABA Pay",
							merchant_ref: "REF-001",
						},
					],
					status: { code: "00", message: "Success" },
				};

				fetchSpy.mockResolvedValueOnce(
					new Response(JSON.stringify(mockResponse), { status: 200 }),
				);

				const result = await client.getTransactionsByRef("REF-001");

				const { url, options } = getFetchCall(fetchSpy);
				expect(url).toContain(
					"/api/payment-gateway/v1/payments/get-transactions-by-mc-ref",
				);

				const headers = options.headers as Record<string, string>;
				expect(headers["Content-Type"]).toBe("application/json");

				const body = getJsonBody(fetchSpy);
				expect(body.merchant_ref).toBe("REF-001");
				expect(body.merchant_id).toBe("test-merchant");
				expect(body.hash).toBeTruthy();

				expect(result.data).toHaveLength(1);
				expect(result.data[0]?.merchant_ref).toBe("REF-001");
				expect(result.status.code).toBe("00");
			});

			it("should throw if merchantRef is empty", async () => {
				await expect(client.getTransactionsByRef("")).rejects.toThrow(
					"merchantRef is required",
				);
			});
		});

		describe("network errors", () => {
			it("should wrap fetch errors in PayWayError", async () => {
				fetchSpy.mockRejectedValueOnce(new TypeError("fetch failed"));

				try {
					await client.checkTransaction("order-001");
					expect.unreachable("Should have thrown");
				} catch (error) {
					if (!(error instanceof PayWayError))
						expect.unreachable("Expected PayWayError");
					expect(error.message).toBe("fetch failed");
					expect(error.cause).toBeInstanceOf(TypeError);
				}
			});

			it("should use configurable timeout", async () => {
				const customClient = new PayWay({
					merchantId: "m",
					apiKey: "k",
					timeout: 5000,
				});

				fetchSpy.mockResolvedValueOnce(
					new Response(
						JSON.stringify({
							status: { code: "00" },
							data: {},
						}),
						{ status: 200 },
					),
				);

				await customClient.checkTransaction("t1");

				const { options } = getFetchCall(fetchSpy);
				expect(options.signal).toBeTruthy();
			});
		});

		describe("error handling", () => {
			it("should throw PayWayAPIError on non-OK response", async () => {
				fetchSpy.mockResolvedValueOnce(
					new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
					}),
				);

				await expect(client.checkTransaction("order-001")).rejects.toThrow(
					PayWayAPIError,
				);
			});

			it("should parse JSON error response body", async () => {
				const errorBody = { error: "Invalid merchant" };
				fetchSpy.mockResolvedValueOnce(
					new Response(JSON.stringify(errorBody), { status: 401 }),
				);

				try {
					await client.checkTransaction("order-001");
					expect.unreachable("Should have thrown");
				} catch (error) {
					if (!(error instanceof PayWayAPIError))
						expect.unreachable("Expected PayWayAPIError");
					expect(error.responseBody).toEqual(errorBody);
				}
			});

			it("should keep plain text response body when not JSON", async () => {
				fetchSpy.mockResolvedValueOnce(
					new Response("Gateway Timeout", { status: 504 }),
				);

				try {
					await client.checkTransaction("order-001");
					expect.unreachable("Should have thrown");
				} catch (error) {
					if (!(error instanceof PayWayAPIError))
						expect.unreachable("Expected PayWayAPIError");
					expect(error.responseBody).toBe("Gateway Timeout");
				}
			});

			it("should include status code in PayWayAPIError", async () => {
				fetchSpy.mockResolvedValueOnce(
					new Response("Server Error", { status: 500 }),
				);

				try {
					await client.checkTransaction("order-001");
					expect.unreachable("Should have thrown");
				} catch (error) {
					if (!(error instanceof PayWayAPIError))
						expect.unreachable("Expected PayWayAPIError");
					expect(error.statusCode).toBe(500);
				}
			});
		});
	});
});
