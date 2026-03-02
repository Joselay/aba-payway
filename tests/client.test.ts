import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PayWay } from "../src/client.ts";
import { PRODUCTION_BASE_URL, SANDBOX_BASE_URL } from "../src/constants.ts";
import {
	PayWayAPIError,
	PayWayConfigError,
	PayWayError,
} from "../src/errors.ts";

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

function getFormBody(spy: ReturnType<typeof vi.spyOn>, index = 0): FormData {
	const { options } = getFetchCall(spy, index);
	return options.body as FormData;
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
			expect(params.action).toContain(SANDBOX_BASE_URL);
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

		it("should use production URL when production is true", () => {
			const client = new PayWay({
				merchantId: "m",
				apiKey: "k",
				production: true,
			});

			const params = client.createTransaction({
				transactionId: "t1",
				amount: 1,
			});

			expect(params.action).toContain(PRODUCTION_BASE_URL);
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

				const { url } = getFetchCall(fetchSpy);
				expect(url).toContain(
					"/api/payment-gateway/v1/payments/check-transaction-2",
				);

				const body = getFormBody(fetchSpy);
				expect(body.get("tran_id")).toBe("order-001");
				expect(body.get("merchant_id")).toBe("test-merchant");
				expect(body.get("hash")).toBeTruthy();

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

				const body = getFormBody(fetchSpy);
				expect(body.get("from_amount")).toBe("10");
				expect(body.get("to_amount")).toBe("100");
				expect(body.get("page")).toBe("2");
				expect(body.get("pagination")).toBe("50");
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

				const result = await client.listTransactions({
					fromDate: "2026-01-01",
					toDate: "2026-12-31",
					status: "APPROVED",
				});

				const { url } = getFetchCall(fetchSpy);
				expect(url).toContain(
					"/api/payment-gateway/v1/payments/transaction-list-2",
				);

				const body = getFormBody(fetchSpy);
				expect(body.get("from_date")).toBe("2026-01-01");
				expect(body.get("to_date")).toBe("2026-12-31");
				expect(body.get("status")).toBe("APPROVED");

				expect(result.page).toBe("1");
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
				expect(body.amount).toBe(10);
				expect(body.payment_option).toBe("abapay_khqr");
				expect(body.qr_image_template).toBe("template1");
				expect(body.lifetime).toBe(30);
				expect(body.merchant_id).toBe("test-merchant");
				expect(body.hash).toBeTruthy();

				expect(result.qrString).toBe("QR_CONTENT");
				expect(result.status.trace_id).toBe("abc123");
			});

			it("should throw if transactionId is empty", async () => {
				await expect(
					client.generateQR({
						transactionId: "",
						amount: 10,
						paymentOption: "abapay_khqr",
						qrImageTemplate: "template1",
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
