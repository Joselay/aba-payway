import { createHmac } from "node:crypto";
import { PayWayHashError } from "./errors.ts";

/** Generate an HMAC-SHA512 hash from concatenated values, returned as a base64 string. */
export function createHash(values: readonly string[], apiKey: string): string {
	try {
		const message = values.join("");
		const hmac = createHmac("sha512", apiKey);
		hmac.update(message);
		return hmac.digest("base64");
	} catch (error) {
		throw new PayWayHashError(
			error instanceof Error ? error.message : "Hash generation failed",
		);
	}
}
