import { describe, expect, it } from "vitest";
import { createHash } from "../src/hash.ts";

describe("createHash", () => {
	it("should generate a consistent HMAC-SHA512 base64 hash", () => {
		const values = ["20260101120000", "merchant123", "order-001", "10.00"];
		const apiKey = "test-api-key";

		const hash1 = createHash(values, apiKey);
		const hash2 = createHash(values, apiKey);

		expect(hash1).toBe(hash2);
		expect(hash1).toBeTypeOf("string");
		expect(hash1.length).toBeGreaterThan(0);
	});

	it("should produce different hashes for different values", () => {
		const apiKey = "test-api-key";
		const hash1 = createHash(["value1"], apiKey);
		const hash2 = createHash(["value2"], apiKey);

		expect(hash1).not.toBe(hash2);
	});

	it("should produce different hashes for different api keys", () => {
		const values = ["same-value"];
		const hash1 = createHash(values, "key1");
		const hash2 = createHash(values, "key2");

		expect(hash1).not.toBe(hash2);
	});

	it("should handle empty values array", () => {
		const hash = createHash([], "test-key");
		expect(hash).toBeTypeOf("string");
		expect(hash.length).toBeGreaterThan(0);
	});

	it("should produce valid base64 output", () => {
		const hash = createHash(["test"], "key");
		const base64Regex = /^[A-Za-z0-9+/]+=*$/;
		expect(hash).toMatch(base64Regex);
	});

	it("should concatenate values before hashing", () => {
		const apiKey = "test-key";
		const hashSeparate = createHash(["abc", "def"], apiKey);
		const hashCombined = createHash(["abcdef"], apiKey);

		expect(hashSeparate).toBe(hashCombined);
	});
});
