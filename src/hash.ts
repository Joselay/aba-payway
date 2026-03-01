import { createHmac } from "node:crypto";

/** Generate an HMAC-SHA512 hash from concatenated values, returned as a base64 string. */
export function createHash(values: readonly string[], apiKey: string): string {
	const message = values.join("");
	const hmac = createHmac("sha512", apiKey);
	hmac.update(message);
	return hmac.digest("base64");
}
