import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PayWay } from "../src/client.ts";
import { PRODUCTION_BASE_URL, SANDBOX_BASE_URL } from "../src/constants.ts";
import { PayWayAPIError, PayWayConfigError } from "../src/errors.ts";

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
			it("should send POST to check-transaction-2 endpoint", async () => {
				const mockResponse = {
					payment_status_code: 0,
					total_amount: 10.0,
					original_amount: 10.0,
					refund_amount: 0,
					discount_amount: 0,
					payment_amount: 10.0,
					payment_currency: "USD",
					apv: "123456",
					payment_status: "APPROVED",
					transaction_date: "2024-01-15 10:30:00",
				};

				fetchSpy.mockResolvedValueOnce(
					new Response(JSON.stringify(mockResponse), { status: 200 }),
				);

				const result = await client.checkTransaction("order-001");

				const call = fetchSpy.mock.calls[0];
				const [url] = call ?? [];
				expect(url).toContain(
					"/api/payment-gateway/v1/payments/check-transaction-2",
				);

				const body = call?.[1]?.body as FormData;
				expect(body.get("tran_id")).toBe("order-001");
				expect(body.get("merchant_id")).toBe("test-merchant");
				expect(body.get("hash")).toBeTruthy();

				expect(result.payment_status_code).toBe(0);
				expect(result.payment_status).toBe("APPROVED");
			});
		});

		describe("listTransactions", () => {
			it("should send POST to transaction-list-2 endpoint", async () => {
				const mockResponse = {
					status: { code: 0 },
					data: { data: [], page: "1", pagination: "20" },
				};

				fetchSpy.mockResolvedValueOnce(
					new Response(JSON.stringify(mockResponse), { status: 200 }),
				);

				const result = await client.listTransactions({
					fromDate: "2024-01-01",
					toDate: "2024-12-31",
					status: "APPROVED",
				});

				const call = fetchSpy.mock.calls[0];
				const [url] = call ?? [];
				expect(url).toContain(
					"/api/payment-gateway/v1/payments/transaction-list-2",
				);

				const body = call?.[1]?.body as FormData;
				expect(body.get("from_date")).toBe("2024-01-01");
				expect(body.get("to_date")).toBe("2024-12-31");
				expect(body.get("status")).toBe("APPROVED");

				expect(result.data?.page).toBe("1");
			});

			it("should work with no options", async () => {
				fetchSpy.mockResolvedValueOnce(
					new Response(
						JSON.stringify({
							status: { code: 0 },
							data: { data: [], page: "1", pagination: "20" },
						}),
						{ status: 200 },
					),
				);

				await client.listTransactions();
				expect(fetchSpy).toHaveBeenCalledOnce();
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

			it("should include status code in PayWayAPIError", async () => {
				fetchSpy.mockResolvedValueOnce(
					new Response("Server Error", { status: 500 }),
				);

				try {
					await client.checkTransaction("order-001");
					expect.unreachable("Should have thrown");
				} catch (error) {
					expect(error).toBeInstanceOf(PayWayAPIError);
					expect((error as PayWayAPIError).statusCode).toBe(500);
				}
			});
		});
	});
});
