export type Environment = "sandbox" | "production";

export interface PayWayConfig {
	readonly merchantId: string;
	readonly apiKey: string;
	/** Target environment. Default: `"sandbox"`. */
	readonly environment?: Environment;
	/** Override the base URL directly. Takes priority over `environment`. */
	readonly baseUrl?: string;
	/** Request timeout in milliseconds. Default: 30000 (30s). */
	readonly timeout?: number;
}

export type PaymentOption =
	| "cards"
	| "abapay_khqr"
	| "abapay_khqr_deeplink"
	| "alipay"
	| "wechat"
	| "google_pay";

export type Currency = "USD" | "KHR";

export type TransactionType = "purchase" | "pre-auth";

export type TransactionStatus =
	| "APPROVED"
	| "DECLINED"
	| "PENDING"
	| "PRE-AUTH"
	| "CANCELLED"
	| "REFUNDED";

export interface CreateTransactionOptions {
	transactionId: string;
	amount: number;
	currency?: Currency;
	paymentOption?: PaymentOption;
	firstName?: string;
	lastName?: string;
	email?: string;
	phone?: string;
	/** Items as a string, or an array of objects (will be JSON-stringified and base64-encoded) */
	items?: string | ItemEntry[];
	returnUrl?: string;
	cancelUrl?: string;
	continueSuccessUrl?: string;
	returnDeeplink?: string;
	returnParams?: string;
	shipping?: number;
	type?: TransactionType;
	customFields?: string;
	payout?: string;
	lifetime?: number;
	additionalParams?: string;
	googlePayToken?: string;
	skipSuccessPage?: number;
	viewType?: string;
	paymentGate?: number;
}

export interface ItemEntry {
	name: string;
	quantity: string;
	price: string;
}

/** Form parameters returned by createTransaction, to be submitted from the browser */
export interface CheckoutParams {
	action: string;
	hash: string;
	tran_id: string;
	amount: string;
	items: string;
	currency: Currency;
	firstname: string;
	lastname: string;
	email: string;
	phone: string;
	type: TransactionType;
	payment_option: PaymentOption | "";
	return_url: string;
	cancel_url: string;
	continue_success_url: string;
	return_deeplink: string;
	return_params: string;
	shipping: string;
	merchant_id: string;
	req_time: string;
	custom_fields: string;
	payout: string;
	lifetime: string;
	additional_params: string;
	google_pay_token: string;
	skip_success_page: string;
	view_type: string;
	payment_gate: string;
}

export interface ListTransactionsOptions {
	fromDate?: string;
	toDate?: string;
	fromAmount?: number;
	toAmount?: number;
	/** Single status or comma-separated: e.g. `"APPROVED"` or `"APPROVED,DECLINED"` */
	status?: TransactionStatus | (string & {});
	page?: number;
	pagination?: number;
}

export interface PayWayResponse<T> {
	status: PayWayResponseStatus;
	description?: string;
	data?: T;
}

export interface PayWayResponseStatus {
	code: string;
	message?: string;
	tran_id?: string;
	merchant_ref?: string;
}

export interface CheckTransactionData {
	payment_status_code: number;
	total_amount: number;
	original_amount: number;
	refund_amount: number;
	discount_amount: number;
	payment_amount: number;
	payment_currency: Currency;
	apv: string;
	payment_status: TransactionStatus;
	transaction_date: string;
}

export interface TransactionListItem {
	transaction_id: string;
	transaction_date: string;
	apv: string;
	payment_status: TransactionStatus;
	payment_status_code: number;
	original_amount: number;
	original_currency: Currency;
	total_amount: number;
	discount_amount: number;
	refund_amount: number;
	payment_amount: number;
	payment_currency: Currency;
	first_name: string;
	last_name: string;
	email: string;
	phone: string;
	bank_ref: string;
	payer_account: string;
	bank_name: string;
	card_source: string;
	payment_type: string;
}

export interface ListTransactionsResponse {
	data: TransactionListItem[];
	page: string;
	pagination: string;
	status: PayWayResponseStatus;
}

// --- Close Transaction ---

export interface CloseTransactionResponse {
	status: PayWayResponseStatus;
}

// --- Get Transaction Details ---

export interface TransactionOperation {
	status: string;
	amount: number;
	transaction_date: string;
	bank_ref: string;
}

export interface TransactionDetailData {
	transaction_id: string;
	payment_status_code: number;
	payment_status: TransactionStatus;
	original_amount: number;
	original_currency: Currency;
	payment_amount: number;
	payment_currency: Currency;
	total_amount: number;
	refund_amount: number;
	discount_amount: number;
	apv: string;
	transaction_date: string;
	first_name: string;
	last_name: string;
	email: string;
	phone: string;
	bank_ref: string;
	payment_type: string;
	payer_account: string;
	bank_name: string;
	card_source: string;
	transaction_operations: TransactionOperation[];
}

// --- Exchange Rate ---

export type ExchangeRateCurrency =
	| "aud"
	| "sgd"
	| "eur"
	| "gbp"
	| "myr"
	| "thb"
	| "hkd"
	| "cny"
	| "cad"
	| "krw"
	| "jpy"
	| "vnd";

export interface ExchangeRate {
	sell: string;
	buy: string;
}

export interface ExchangeRateResponse {
	status: PayWayResponseStatus;
	exchange_rates: Partial<Record<ExchangeRateCurrency, ExchangeRate>>;
}

// --- Generate QR ---

export type QRPaymentOption = "abapay_khqr" | "wechat" | "alipay";

export interface GenerateQROptions {
	transactionId: string;
	amount: number;
	currency?: Currency;
	paymentOption: QRPaymentOption;
	lifetime?: number;
	qrImageTemplate: string;
	firstName?: string;
	lastName?: string;
	email?: string;
	phone?: string;
	purchaseType?: TransactionType;
	items?: string;
	callbackUrl?: string;
	returnDeeplink?: string;
	customFields?: string;
	returnParams?: string;
	payout?: string;
}

export interface GenerateQRResponse {
	status: PayWayResponseStatus & { trace_id?: string };
	amount: number;
	currency: Currency;
	qrString: string;
	qrImage: string;
	abapay_deeplink: string;
	app_store: string;
	play_store: string;
}

// --- Get Transactions by Merchant Reference ---

export interface TransactionByRefItem {
	transaction_id: string;
	transaction_date: string;
	apv: string;
	payment_status: TransactionStatus;
	payment_status_code: number;
	original_amount: number;
	original_currency: Currency;
	total_amount: number;
	discount_amount: number;
	refund_amount: number;
	payment_amount: number;
	payment_currency: Currency;
	bank_ref: string;
	payer_account: string;
	bank_name: string;
	payment_type: string;
	merchant_ref: string;
}

export interface GetTransactionsByRefResponse {
	data: TransactionByRefItem[];
	status: PayWayResponseStatus;
}

// --- Internal endpoint request param interfaces ---

interface BaseRequestParams {
	hash: string;
	req_time: string;
	merchant_id: string;
}

export interface TransactionParams extends BaseRequestParams {
	tran_id: string;
}

export interface ListTransactionsParams extends BaseRequestParams {
	from_date?: string;
	to_date?: string;
	from_amount?: string;
	to_amount?: string;
	status?: string;
	page?: string;
	pagination?: string;
}

export interface ExchangeRateParams extends BaseRequestParams {}

export interface GenerateQRParams extends BaseRequestParams {
	tran_id: string;
	amount: number;
	currency: Currency;
	payment_option: QRPaymentOption;
	lifetime?: number;
	qr_image_template: string;
	first_name?: string;
	last_name?: string;
	email?: string;
	phone?: string;
	purchase_type?: TransactionType;
	items?: string;
	callback_url?: string;
	return_deeplink?: string;
	custom_fields?: string;
	return_params?: string;
	payout?: string;
}

export interface GetTransactionsByRefParams extends BaseRequestParams {
	merchant_ref: string;
}

export type RequestParams =
	| TransactionParams
	| ListTransactionsParams
	| ExchangeRateParams
	| GenerateQRParams
	| GetTransactionsByRefParams;
