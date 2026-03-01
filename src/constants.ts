export const SANDBOX_BASE_URL = "https://checkout-sandbox.payway.com.kh";
export const PRODUCTION_BASE_URL = "https://checkout.payway.com.kh";

export const ENDPOINTS = {
	purchase: "/api/payment-gateway/v1/payments/purchase",
	checkTransaction: "/api/payment-gateway/v1/payments/check-transaction",
	transactionList: "/api/payment-gateway/v1/payments/transaction-list",
} as const;
