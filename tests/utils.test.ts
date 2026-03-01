import { describe, expect, it } from "vitest";
import {
	buildFormData,
	formatAmount,
	formatRequestTime,
	toBase64,
} from "../src/utils.ts";

describe("formatRequestTime", () => {
	it("should format date as yyyyMMddHHmmss in UTC", () => {
		const date = new Date(Date.UTC(2026, 0, 15, 9, 5, 30));
		const result = formatRequestTime(date);
		expect(result).toBe("20260115090530");
	});

	it("should pad single-digit values with zeros", () => {
		const date = new Date(Date.UTC(2026, 0, 1, 1, 2, 3));
		const result = formatRequestTime(date);
		expect(result).toBe("20260101010203");
	});

	it("should handle end of year", () => {
		const date = new Date(Date.UTC(2026, 11, 31, 23, 59, 59));
		const result = formatRequestTime(date);
		expect(result).toBe("20261231235959");
	});

	it("should return 14 characters", () => {
		const result = formatRequestTime(new Date());
		expect(result.length).toBe(14);
	});

	it("should default to current date if no argument", () => {
		const result = formatRequestTime();
		expect(result).toMatch(/^\d{14}$/);
	});
});

describe("buildFormData", () => {
	it("should create FormData with provided params", () => {
		const formData = buildFormData({ key1: "value1", key2: "value2" });
		expect(formData.get("key1")).toBe("value1");
		expect(formData.get("key2")).toBe("value2");
	});

	it("should skip undefined values", () => {
		const formData = buildFormData({ key1: "value1", key2: undefined });
		expect(formData.get("key1")).toBe("value1");
		expect(formData.has("key2")).toBe(false);
	});

	it("should skip empty string values", () => {
		const formData = buildFormData({ key1: "value1", key2: "" });
		expect(formData.get("key1")).toBe("value1");
		expect(formData.has("key2")).toBe(false);
	});

	it("should handle empty params object", () => {
		const formData = buildFormData({});
		const entries = Array.from(formData.entries());
		expect(entries.length).toBe(0);
	});
});

describe("formatAmount", () => {
	it("should format USD to 2 decimal places", () => {
		expect(formatAmount(10)).toBe("10.00");
	});

	it("should keep 2 decimal places for decimals", () => {
		expect(formatAmount(10.5)).toBe("10.50");
	});

	it("should round to 2 decimal places", () => {
		expect(formatAmount(10.999)).toBe("11.00");
	});

	it("should handle zero", () => {
		expect(formatAmount(0)).toBe("0.00");
	});

	it("should round KHR to integer", () => {
		expect(formatAmount(4500.5, "KHR")).toBe("4501");
	});

	it("should handle KHR integer", () => {
		expect(formatAmount(4000, "KHR")).toBe("4000");
	});
});

describe("toBase64", () => {
	it("should encode string to base64", () => {
		expect(toBase64("hello")).toBe("aGVsbG8=");
	});

	it("should encode URL to base64", () => {
		const url = "http://localhost:3000/callback";
		const result = toBase64(url);
		expect(Buffer.from(result, "base64").toString()).toBe(url);
	});

	it("should handle empty string", () => {
		expect(toBase64("")).toBe("");
	});
});
