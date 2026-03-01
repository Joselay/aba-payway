export function formatRequestTime(date: Date = new Date()): string {
	const year = date.getUTCFullYear().toString();
	const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
	const day = date.getUTCDate().toString().padStart(2, "0");
	const hours = date.getUTCHours().toString().padStart(2, "0");
	const minutes = date.getUTCMinutes().toString().padStart(2, "0");
	const seconds = date.getUTCSeconds().toString().padStart(2, "0");
	return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

export function buildFormData(
	params: Record<string, string | undefined>,
): FormData {
	const formData = new FormData();
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== null && value !== "") {
			formData.append(key, value);
		}
	}
	return formData;
}

export function formatAmount(amount: number, currency = "USD"): string {
	if (currency.toUpperCase() === "KHR") {
		return Math.round(amount).toString();
	}
	return amount.toFixed(2);
}

export function toBase64(value: string): string {
	return Buffer.from(value).toString("base64");
}
