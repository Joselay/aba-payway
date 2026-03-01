/** Base error class for all PayWay SDK errors. */
export class PayWayError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "PayWayError";
	}
}

/** Thrown when the ABA PayWay API returns a non-2xx HTTP response. */
export class PayWayAPIError extends PayWayError {
	public readonly statusCode: number;
	public readonly responseBody: unknown;

	constructor(message: string, statusCode: number, responseBody?: unknown) {
		super(message);
		this.name = "PayWayAPIError";
		this.statusCode = statusCode;
		this.responseBody = responseBody;
	}
}

/** Thrown when the SDK is constructed with missing or invalid configuration. */
export class PayWayConfigError extends PayWayError {
	constructor(message: string) {
		super(message);
		this.name = "PayWayConfigError";
	}
}

/** Thrown when HMAC hash generation fails. */
export class PayWayHashError extends PayWayError {
	constructor(message: string) {
		super(message);
		this.name = "PayWayHashError";
	}
}
