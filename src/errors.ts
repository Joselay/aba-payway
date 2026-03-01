export class PayWayError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "PayWayError";
	}
}

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

export class PayWayConfigError extends PayWayError {
	constructor(message: string) {
		super(message);
		this.name = "PayWayConfigError";
	}
}

export class PayWayHashError extends PayWayError {
	constructor(message: string) {
		super(message);
		this.name = "PayWayHashError";
	}
}
