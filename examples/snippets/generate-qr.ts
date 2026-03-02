/**
 * Generate QR Code
 *
 * Generate a dynamic QR code for payment via ABA KHQR, WeChat Pay, or Alipay.
 * Returns a QR image (base64), QR string, and ABA Mobile deep link.
 *
 * Usage: npx tsx examples/snippets/generate-qr.ts
 */

import { PayWay } from "aba-payway";

const merchantId = process.env.ABA_PAYWAY_MERCHANT_ID;
const apiKey = process.env.ABA_PAYWAY_API_KEY;

if (!merchantId || !apiKey) {
	throw new Error("Set ABA_PAYWAY_MERCHANT_ID and ABA_PAYWAY_API_KEY");
}

const payway = new PayWay({ merchantId, apiKey });

const result = await payway.generateQR({
	transactionId: `qr-${Date.now()}`,
	amount: 1.0,
	paymentOption: "abapay_khqr",
	qrImageTemplate: "template1",
	lifetime: 30, // minutes
	firstName: "John",
	lastName: "Doe",
});

console.log("QR string:", result.qrString);
console.log("Deep link:", result.abapay_deeplink);
console.log("QR image (base64):", `${result.qrImage.substring(0, 80)}...`);
