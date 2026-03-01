export interface PayWayConfig {
	merchantId: string;
	apiKey: string;
	production?: boolean;
}

export type PaymentOption =
	| "cards"
	| "abapay"
	| "abapay_deeplink"
	| "abapay_khqr_deeplink"
	| "wechat"
	| "alipay"
	| "bakong";

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
	skipSuccessPage?: string;
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
}

export interface CheckTransactionOptions {
	transactionId: string;
}

export interface ListTransactionsOptions {
	fromDate?: string;
	toDate?: string;
	fromAmount?: number;
	toAmount?: number;
	status?: TransactionStatus;
	page?: number;
	pagination?: number;
}

export interface PayWayResponse<T> {
	status: PayWayResponseStatus;
	description?: string;
	data?: T;
}

export interface PayWayResponseStatus {
	code: number;
	message?: string;
}

export interface CheckTransactionData {
	payment_status_code: number;
	total_amount: number;
	original_amount: number;
	refund_amount: number;
	discount_amount: number;
	payment_amount: number;
	payment_currency: string;
	apv: string;
	payment_status: string;
}

export interface TransactionListItem {
	tran_id: string;
	merchant_id: string;
	status: TransactionStatus;
	apv: string;
	amount: number;
	created_date: string;
}

export interface ListTransactionsData {
	data: TransactionListItem[];
	total: number;
	page: number;
}
