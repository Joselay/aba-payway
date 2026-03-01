import {
	ENDPOINTS,
	PRODUCTION_BASE_URL,
	SANDBOX_BASE_URL,
} from "./constants.ts";
import { PayWayAPIError, PayWayConfigError } from "./errors.ts";
import { createHash } from "./hash.ts";
import type {
	CheckTransactionData,
	CheckoutParams,
	CreateTransactionOptions,
	ListTransactionsData,
	ListTransactionsOptions,
	PayWayConfig,
	PayWayResponse,
} from "./types.ts";
import { buildFormData, formatAmount, formatRequestTime, toBase64 } from "./utils.ts";

export class PayWay {
	private readonly merchantId: string;
	private readonly apiKey: string;
	private readonly baseUrl: string;

	constructor(config: PayWayConfig) {
		if (!config.merchantId) {
			throw new PayWayConfigError("merchantId is required");
		}
		if (!config.apiKey) {
			throw new PayWayConfigError("apiKey is required");
		}

		this.merchantId = config.merchantId;
		this.apiKey = config.apiKey;
		this.baseUrl = config.production ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL;
	}

	/**
	 * Generate checkout parameters for a transaction.
	 * Returns form params to be submitted from the browser via ABA's checkout JS SDK.
	 */
	createTransaction(options: CreateTransactionOptions): CheckoutParams {
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

		// Return URL must be base64-encoded per ABA docs
		const returnUrl = options.returnUrl ? toBase64(options.returnUrl) : "";

		const shipping =
			options.shipping !== undefined
				? formatAmount(options.shipping, currency)
				: "";

		// Hash field order must match ABA's expected order exactly
		const hashValues = [
			reqTime,
			this.merchantId,
			options.transactionId,
			amount,
			items,
			"", // gdt
			shipping,
			options.ctid ?? "",
			options.pwt ?? "",
			options.firstName ?? "",
			options.lastName ?? "",
			options.email ?? "",
			options.phone ?? "",
			type,
			options.paymentOption ?? "",
			returnUrl,
			options.cancelUrl ?? "",
			options.continueSuccessUrl ?? "",
			options.returnDeeplink ?? "",
			options.topupChannel ?? "",
			currency,
			options.customFields ?? "",
			options.returnParams ?? "",
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
			return_deeplink: options.returnDeeplink ?? "",
			return_params: options.returnParams ?? "",
			shipping,
			ctid: options.ctid ?? "",
			pwt: options.pwt ?? "",
			merchant_id: this.merchantId,
			req_time: reqTime,
			custom_fields: options.customFields ?? "",
			topup_channel: options.topupChannel ?? "",
		};
	}

	async checkTransaction(
		transactionId: string,
	): Promise<CheckTransactionData> {
		const reqTime = formatRequestTime();

		const hashValues = [reqTime, this.merchantId, transactionId];
		const hash = createHash(hashValues, this.apiKey);

		const params: Record<string, string | undefined> = {
			hash,
			tran_id: transactionId,
			req_time: reqTime,
			merchant_id: this.merchantId,
		};

		return this.request<CheckTransactionData>(
			ENDPOINTS.checkTransaction,
			params,
		);
	}

	async listTransactions(
		options: ListTransactionsOptions = {},
	): Promise<PayWayResponse<ListTransactionsData>> {
		const reqTime = formatRequestTime();

		const hashValues = [
			reqTime,
			this.merchantId,
			options.transactionId ?? "",
			options.fromDate ?? "",
			options.toDate ?? "",
			options.status ?? "",
			options.page?.toString() ?? "",
			options.limit?.toString() ?? "",
		];
		const hash = createHash(hashValues, this.apiKey);

		const params: Record<string, string | undefined> = {
			hash,
			tran_id: options.transactionId,
			from_date: options.fromDate,
			to_date: options.toDate,
			status: options.status,
			page: options.page?.toString(),
			limit: options.limit?.toString(),
			req_time: reqTime,
			merchant_id: this.merchantId,
		};

		return this.request<PayWayResponse<ListTransactionsData>>(
			ENDPOINTS.transactionList,
			params,
		);
	}

	private async request<T>(
		endpoint: string,
		params: Record<string, string | undefined>,
	): Promise<T> {
		const url = `${this.baseUrl}${endpoint}`;
		const formData = buildFormData(params);

		const response = await fetch(url, {
			method: "POST",
			body: formData,
		});

		if (!response.ok) {
			const text = await response.text();
			let body: unknown = text;
			try {
				body = JSON.parse(text);
			} catch {
				// keep as text
			}
			throw new PayWayAPIError(
				`PayWay API error: ${response.status} ${response.statusText}`,
				response.status,
				body,
			);
		}

		return (await response.json()) as T;
	}
}
