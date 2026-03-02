/**
 * Exchange Rate
 *
 * Fetch the latest exchange rates from ABA Bank.
 * Returns buy/sell rates for 12 currencies against USD.
 *
 * Usage: npx tsx examples/snippets/exchange-rate.ts
 */

import { PayWay } from "aba-payway";

const merchantId = process.env.ABA_PAYWAY_MERCHANT_ID;
const apiKey = process.env.ABA_PAYWAY_API_KEY;

if (!merchantId || !apiKey) {
	throw new Error("Set ABA_PAYWAY_MERCHANT_ID and ABA_PAYWAY_API_KEY");
}

const payway = new PayWay({ merchantId, apiKey });

const result = await payway.getExchangeRate();

console.log("Exchange rates:");
for (const [currency, rate] of Object.entries(result.exchange_rates)) {
	if (rate) {
		console.log(
			`  ${currency.toUpperCase()}: buy ${rate.buy} / sell ${rate.sell}`,
		);
	}
}
