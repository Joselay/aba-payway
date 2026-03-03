import type { Environment } from "./types.ts";

export const BASE_URLS: Record<Environment, string> = {
	sandbox: "https://checkout-sandbox.payway.com.kh",
	production: "https://checkout.payway.com.kh",
};

export const ENDPOINTS = {
	purchase: "/api/payment-gateway/v1/payments/purchase",
	checkTransaction: "/api/payment-gateway/v1/payments/check-transaction-2",
	transactionList: "/api/payment-gateway/v1/payments/transaction-list-2",
	transactionDetail: "/api/payment-gateway/v1/payments/transaction-detail",
	closeTransaction: "/api/payment-gateway/v1/payments/close-transaction",
	exchangeRate: "/api/payment-gateway/v1/exchange-rate",
	generateQR: "/api/payment-gateway/v1/payments/generate-qr",
	getTransactionsByRef:
		"/api/payment-gateway/v1/payments/get-transactions-by-mc-ref",
} as const;
