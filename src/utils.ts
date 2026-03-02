import type { Currency } from "./types.ts";

/** Format a Date as `yyyyMMddHHmmss` in UTC, used for ABA's `req_time` parameter. */
export function formatRequestTime(date: Date = new Date()): string {
	const year = date.getUTCFullYear().toString();
	const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
	const day = date.getUTCDate().toString().padStart(2, "0");
	const hours = date.getUTCHours().toString().padStart(2, "0");
	const minutes = date.getUTCMinutes().toString().padStart(2, "0");
	const seconds = date.getUTCSeconds().toString().padStart(2, "0");
	return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/** Filter out `undefined` and empty string values from a params object. */
export function filterParams(params: object): Record<string, string | number> {
	const out: Record<string, string | number> = {};
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== "") {
			out[key] = value as string | number;
		}
	}
	return out;
}

/** Build a FormData object from a record, skipping `undefined`, `null`, and empty string values. */
export function buildFormData(params: object): FormData {
	const formData = new FormData();
	for (const [key, value] of Object.entries(filterParams(params))) {
		formData.append(key, String(value));
	}
	return formData;
}

/** Format a numeric amount as a string: 2 decimal places for USD, rounded integer for KHR. */
export function formatAmount(
	amount: number,
	currency: Currency = "USD",
): string {
	if (currency === "KHR") {
		return Math.round(amount).toString();
	}
	return amount.toFixed(2);
}

/** Base64-encode a string value using Node.js Buffer. */
export function toBase64(value: string): string {
	return Buffer.from(value).toString("base64");
}
