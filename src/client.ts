import { BASE_URLS, ENDPOINTS } from "./constants.ts";
import { PayWayAPIError, PayWayConfigError, PayWayError } from "./errors.ts";
import { createHash } from "./hash.ts";
import type {
	CheckoutParams,
	CheckTransactionData,
	CloseTransactionResponse,
	CreateTransactionOptions,
	ExchangeRateParams,
	ExchangeRateResponse,
	GenerateQROptions,
	GenerateQRParams,
	GenerateQRResponse,
	GetTransactionsByRefParams,
	GetTransactionsByRefResponse,
	ListTransactionsOptions,
	ListTransactionsParams,
	ListTransactionsResponse,
	PayWayConfig,
	PayWayResponse,
	RequestParams,
	TransactionDetailData,
	TransactionParams,
} from "./types.ts";
import {
	filterParams,
	formatAmount,
	formatRequestTime,
	toBase64,
} from "./utils.ts";

/**
 * Main SDK client for ABA PayWay.
 * Provides methods for creating transactions, checking status, and listing transactions.
 */
export class PayWay {
	private readonly merchantId: string;
	private readonly apiKey: string;
	private readonly baseUrl: string;
	private readonly timeout: number;

	/**
	 * @param config - Merchant credentials and environment selection.
	 * @throws {PayWayConfigError} If `merchantId` or `apiKey` is empty.
	 */
	constructor(config: PayWayConfig) {
		if (!config.merchantId) {
			throw new PayWayConfigError("merchantId is required");
		}
		if (!config.apiKey) {
			throw new PayWayConfigError("apiKey is required");
		}

		this.merchantId = config.merchantId;
		this.apiKey = config.apiKey;
		this.baseUrl = config.baseUrl ?? BASE_URLS[config.environment ?? "sandbox"];
		this.timeout = config.timeout ?? 30_000;
	}

	/**
	 * Generate checkout parameters for a transaction.
	 * Returns form params to be submitted from the browser via ABA's checkout JS SDK.
	 */
	createTransaction(options: CreateTransactionOptions): CheckoutParams {
		if (!options.transactionId) {
			throw new PayWayConfigError("transactionId is required");
		}
		if (options.transactionId.length > 20) {
			throw new PayWayConfigError(
				"transactionId must be at most 20 characters",
			);
		}
		if (options.amount <= 0) {
			throw new PayWayConfigError("amount must be greater than 0");
		}
		if (
			options.lifetime !== undefined &&
			(options.lifetime < 3 || options.lifetime > 43_200)
		) {
			throw new PayWayConfigError("lifetime must be between 3 and 43200");
		}

		const reqTime = formatRequestTime();
		const currency = options.currency ?? "USD";
		const amount = formatAmount(options.amount, currency);
		const type = options.type ?? "purchase";

		// Items: if array, JSON-stringify and base64-encode; if string, base64-encode as-is
		let items: string;
		if (Array.isArray(options.items)) {
			items = toBase64(JSON.stringify(options.items));
		} else if (options.items) {
			items = toBase64(options.items);
		} else {
			items = "";
		}

		// Return URL and return deeplink must be base64-encoded per ABA docs
		const returnUrl = options.returnUrl ? toBase64(options.returnUrl) : "";
		const returnDeeplink = options.returnDeeplink
			? toBase64(options.returnDeeplink)
			: "";

		// Payout must be base64-encoded JSON string per ABA docs
		const payout = options.payout ? toBase64(options.payout) : "";

		const shipping =
			options.shipping !== undefined
				? formatAmount(options.shipping, currency)
				: "";

		// Hash field order from remote docs (view_type and payment_gate are NOT in hash)
		const hashValues = [
			reqTime,
			this.merchantId,
			options.transactionId,
			amount,
			items,
			shipping,
			options.firstName ?? "",
			options.lastName ?? "",
			options.email ?? "",
			options.phone ?? "",
			type,
			options.paymentOption ?? "",
			returnUrl,
			options.cancelUrl ?? "",
			options.continueSuccessUrl ?? "",
			returnDeeplink,
			currency,
			options.customFields ?? "",
			options.returnParams ?? "",
			payout,
			options.lifetime?.toString() ?? "",
			options.additionalParams ?? "",
			options.googlePayToken ?? "",
			options.skipSuccessPage?.toString() ?? "",
		];

		const hash = createHash(hashValues, this.apiKey);

		return {
			action: `${this.baseUrl}${ENDPOINTS.purchase}`,
			hash,
			tran_id: options.transactionId,
			amount,
			items,
			currency,
			firstname: options.firstName ?? "",
			lastname: options.lastName ?? "",
			email: options.email ?? "",
			phone: options.phone ?? "",
			type,
			payment_option: options.paymentOption ?? "",
			return_url: returnUrl,
			cancel_url: options.cancelUrl ?? "",
			continue_success_url: options.continueSuccessUrl ?? "",
			return_deeplink: returnDeeplink,
			return_params: options.returnParams ?? "",
			shipping,
			merchant_id: this.merchantId,
			req_time: reqTime,
			custom_fields: options.customFields ?? "",
			payout,
			lifetime: options.lifetime?.toString() ?? "",
			additional_params: options.additionalParams ?? "",
			google_pay_token: options.googlePayToken ?? "",
			skip_success_page: options.skipSuccessPage?.toString() ?? "",
			view_type: options.viewType ?? "",
			payment_gate: options.paymentGate?.toString() ?? "",
		};
	}

	/**
	 * Check the status of a transaction.
	 * @param transactionId - The unique transaction ID to look up.
	 * @throws {PayWayAPIError} If the API returns a non-2xx response.
	 */
	async checkTransaction(
		transactionId: string,
	): Promise<PayWayResponse<CheckTransactionData>> {
		if (!transactionId) {
			throw new PayWayConfigError("transactionId is required");
		}

		const reqTime = formatRequestTime();

		const hashValues = [reqTime, this.merchantId, transactionId];
		const hash = createHash(hashValues, this.apiKey);

		const params: TransactionParams = {
			hash,
			tran_id: transactionId,
			req_time: reqTime,
			merchant_id: this.merchantId,
		};

		return this.request<PayWayResponse<CheckTransactionData>>(
			ENDPOINTS.checkTransaction,
			params,
		);
	}

	/**
	 * List transactions with optional filters. Max 3-day date range.
	 * @param options - Filter and pagination options.
	 * @throws {PayWayAPIError} If the API returns a non-2xx response.
	 */
	async listTransactions(
		options: ListTransactionsOptions = {},
	): Promise<ListTransactionsResponse> {
		const reqTime = formatRequestTime();

		const hashValues = [
			reqTime,
			this.merchantId,
			options.fromDate ?? "",
			options.toDate ?? "",
			options.fromAmount?.toString() ?? "",
			options.toAmount?.toString() ?? "",
			options.status ?? "",
			options.page?.toString() ?? "",
			options.pagination?.toString() ?? "",
		];
		const hash = createHash(hashValues, this.apiKey);

		const params: ListTransactionsParams = {
			hash,
			from_date: options.fromDate,
			to_date: options.toDate,
			from_amount: options.fromAmount?.toString(),
			to_amount: options.toAmount?.toString(),
			status: options.status,
			page: options.page?.toString(),
			pagination: options.pagination?.toString(),
			req_time: reqTime,
			merchant_id: this.merchantId,
		};

		return this.request<ListTransactionsResponse>(
			ENDPOINTS.transactionList,
			params,
		);
	}

	/**
	 * Get detailed information about a transaction, including its operation history.
	 * @param transactionId - The unique transaction ID to look up.
	 * @throws {PayWayAPIError} If the API returns a non-2xx response.
	 */
	async getTransactionDetails(
		transactionId: string,
	): Promise<PayWayResponse<TransactionDetailData>> {
		if (!transactionId) {
			throw new PayWayConfigError("transactionId is required");
		}

		const reqTime = formatRequestTime();
		const hashValues = [reqTime, this.merchantId, transactionId];
		const hash = createHash(hashValues, this.apiKey);

		const params: TransactionParams = {
			hash,
			tran_id: transactionId,
			req_time: reqTime,
			merchant_id: this.merchantId,
		};

		return this.request<PayWayResponse<TransactionDetailData>>(
			ENDPOINTS.transactionDetail,
			params,
		);
	}

	/**
	 * Close (cancel) a pending transaction.
	 * @param transactionId - The transaction ID to close.
	 * @throws {PayWayAPIError} If the API returns a non-2xx response.
	 */
	async closeTransaction(
		transactionId: string,
	): Promise<CloseTransactionResponse> {
		if (!transactionId) {
			throw new PayWayConfigError("transactionId is required");
		}

		const reqTime = formatRequestTime();
		const hashValues = [reqTime, this.merchantId, transactionId];
		const hash = createHash(hashValues, this.apiKey);

		const params: TransactionParams = {
			hash,
			tran_id: transactionId,
			req_time: reqTime,
			merchant_id: this.merchantId,
		};

		return this.request<CloseTransactionResponse>(
			ENDPOINTS.closeTransaction,
			params,
		);
	}

	/**
	 * Fetch the latest exchange rates from ABA Bank.
	 * @throws {PayWayAPIError} If the API returns a non-2xx response.
	 */
	async getExchangeRate(): Promise<ExchangeRateResponse> {
		const reqTime = formatRequestTime();
		const hashValues = [reqTime, this.merchantId];
		const hash = createHash(hashValues, this.apiKey);

		const params: ExchangeRateParams = {
			hash,
			req_time: reqTime,
			merchant_id: this.merchantId,
		};

		return this.request<ExchangeRateResponse>(ENDPOINTS.exchangeRate, params);
	}

	/**
	 * Generate a QR code for payment via ABA KHQR, WeChat Pay, or Alipay.
	 * @param options - QR generation options.
	 * @throws {PayWayConfigError} If required options are missing or invalid.
	 * @throws {PayWayAPIError} If the API returns a non-2xx response.
	 */
	async generateQR(options: GenerateQROptions): Promise<GenerateQRResponse> {
		if (!options.transactionId) {
			throw new PayWayConfigError("transactionId is required");
		}
		if (options.amount <= 0) {
			throw new PayWayConfigError("amount must be greater than 0");
		}
		if (!options.paymentOption) {
			throw new PayWayConfigError("paymentOption is required");
		}
		if (!options.qrImageTemplate) {
			throw new PayWayConfigError("qrImageTemplate is required");
		}
		if (
			options.lifetime !== undefined &&
			(options.lifetime < 3 || options.lifetime > 43_200)
		) {
			throw new PayWayConfigError("lifetime must be between 3 and 43200");
		}

		const reqTime = formatRequestTime();
		const currency = options.currency ?? "USD";
		const amount = formatAmount(options.amount, currency);

		// Base64-encode fields per ABA docs
		const items = options.items ? toBase64(options.items) : "";
		const callbackUrl = options.callbackUrl
			? toBase64(options.callbackUrl)
			: "";
		const returnDeeplink = options.returnDeeplink
			? toBase64(options.returnDeeplink)
			: "";
		const customFields = options.customFields
			? toBase64(options.customFields)
			: "";
		const payout = options.payout ? toBase64(options.payout) : "";

		// Hash field order from remote docs (differs from parameter table order)
		const hashValues = [
			reqTime,
			this.merchantId,
			options.transactionId,
			amount,
			items,
			options.firstName ?? "",
			options.lastName ?? "",
			options.email ?? "",
			options.phone ?? "",
			options.purchaseType ?? "",
			options.paymentOption,
			callbackUrl,
			returnDeeplink,
			currency,
			customFields,
			options.returnParams ?? "",
			payout,
			options.lifetime?.toString() ?? "",
			options.qrImageTemplate,
		];
		const hash = createHash(hashValues, this.apiKey);

		const params: GenerateQRParams = {
			hash,
			req_time: reqTime,
			merchant_id: this.merchantId,
			tran_id: options.transactionId,
			amount: options.amount,
			currency,
			payment_option: options.paymentOption,
			lifetime: options.lifetime,
			qr_image_template: options.qrImageTemplate,
			first_name: options.firstName,
			last_name: options.lastName,
			email: options.email,
			phone: options.phone,
			purchase_type: options.purchaseType,
			items: items || undefined,
			callback_url: callbackUrl || undefined,
			return_deeplink: returnDeeplink || undefined,
			custom_fields: customFields || undefined,
			return_params: options.returnParams,
			payout: payout || undefined,
		};

		return this.request<GenerateQRResponse>(ENDPOINTS.generateQR, params);
	}

	/**
	 * Get transactions by merchant reference. Returns up to the last 50 transactions.
	 * @param merchantRef - Your merchant reference number.
	 * @throws {PayWayAPIError} If the API returns a non-2xx response.
	 */
	async getTransactionsByRef(
		merchantRef: string,
	): Promise<GetTransactionsByRefResponse> {
		if (!merchantRef) {
			throw new PayWayConfigError("merchantRef is required");
		}

		const reqTime = formatRequestTime();
		const hashValues = [reqTime, this.merchantId, merchantRef];
		const hash = createHash(hashValues, this.apiKey);

		const params: GetTransactionsByRefParams = {
			hash,
			merchant_ref: merchantRef,
			req_time: reqTime,
			merchant_id: this.merchantId,
		};

		return this.request<GetTransactionsByRefResponse>(
			ENDPOINTS.getTransactionsByRef,
			params,
		);
	}

	private async request<T>(
		endpoint: (typeof ENDPOINTS)[keyof typeof ENDPOINTS],
		params: RequestParams,
	): Promise<T> {
		const url = `${this.baseUrl}${endpoint}`;
		const body = JSON.stringify(filterParams(params));

		let response: Response;
		try {
			response = await fetch(url, {
				method: "POST",
				body,
				headers: { "Content-Type": "application/json" },
				signal: AbortSignal.timeout(this.timeout),
			});
		} catch (error) {
			throw new PayWayError(
				error instanceof Error ? error.message : "Network request failed",
				{ cause: error },
			);
		}

		if (!response.ok) {
			const text = await response.text();
			let responseBody: unknown = text;
			try {
				responseBody = JSON.parse(text);
			} catch {
				// keep as text
			}
			throw new PayWayAPIError(
				`PayWay API error: ${response.status} ${response.statusText}`,
				response.status,
				responseBody,
			);
		}

		return (await response.json()) as T;
	}
}
