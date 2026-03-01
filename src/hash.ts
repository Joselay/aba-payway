import { createHmac } from "node:crypto";

export function createHash(values: string[], apiKey: string): string {
	const message = values.join("");
	const hmac = createHmac("sha512", apiKey);
	hmac.update(message);
	return hmac.digest("base64");
}
