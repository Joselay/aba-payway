# aba-payway

[![npm version](https://img.shields.io/npm/v/aba-payway)](https://www.npmjs.com/package/aba-payway)
[![CI](https://github.com/Joselay/aba-payway/actions/workflows/ci.yml/badge.svg)](https://github.com/Joselay/aba-payway/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![npm downloads](https://img.shields.io/npm/dm/aba-payway)](https://www.npmjs.com/package/aba-payway)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](https://www.npmjs.com/package/aba-payway)

Type-safe TypeScript SDK for [ABA PayWay](https://www.payway.com.kh/) — Cambodia's #1 payment gateway.

> **Unofficial community SDK.** Not affiliated with ABA Bank.

## Features

- Zero runtime dependencies — uses Node.js built-in `crypto` and native `fetch`
- Full TypeScript support with strict types
- Dual ESM + CJS output
- Simple, clean API with camelCase interface
- Works with Node.js, Bun, Next.js, Express, Hono, and any JS runtime with `fetch`

## Installation

```bash
# bun
bun add aba-payway

# npm
npm install aba-payway

# pnpm
pnpm add aba-payway
```

## Quick Start

```typescript
import { PayWay } from 'aba-payway'

const payway = new PayWay({
  merchantId: 'your_merchant_id',
  apiKey: 'your_api_key',
})

// Generate checkout params (synchronous — no API call)
const params = payway.createTransaction({
  transactionId: 'order-001',
  amount: 10.00,
  items: 'Product A',
  returnUrl: 'https://yoursite.com/callback',
})

// Send `params` to your frontend, populate ABA's hidden form,
// and call AbaPayway.checkout() to open the payment dialog.
// See examples/server.ts for a complete working example.
```

## API Reference

### `new PayWay(config)`

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `merchantId` | `string` | Yes | — | Your ABA PayWay merchant ID |
| `apiKey` | `string` | Yes | — | Your ABA PayWay API key |
| `environment` | `'sandbox' \| 'production'` | No | `'sandbox'` | Target environment |
| `baseUrl` | `string` | No | — | Override the base URL directly (takes priority over `environment`) |

### `payway.createTransaction(options)`

Generate checkout parameters for a payment. **Synchronous** — computes the HMAC hash and returns form params without making any API calls.

Returns `CheckoutParams` — snake_case form parameters to submit via ABA's checkout JS SDK.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `transactionId` | `string` | Yes | Unique transaction ID (max 20 chars) |
| `amount` | `number` | Yes | Purchase amount |
| `currency` | `'USD' \| 'KHR'` | No | Default: `'USD'` |
| `paymentOption` | `PaymentOption` | No | `cards`, `abapay_khqr`, `abapay_khqr_deeplink`, `alipay`, `wechat`, `google_pay` |
| `firstName` | `string` | No | Buyer's first name |
| `lastName` | `string` | No | Buyer's last name |
| `email` | `string` | No | Buyer's email |
| `phone` | `string` | No | Buyer's phone |
| `items` | `string \| ItemEntry[]` | No | Item description — string or `{ name, quantity, price }[]` |
| `returnUrl` | `string` | No | Callback URL for payment completion |
| `cancelUrl` | `string` | No | Redirect URL when user closes payment |
| `continueSuccessUrl` | `string` | No | Redirect URL after success |
| `type` | `'purchase' \| 'pre-auth'` | No | Default: `'purchase'` |
| `shipping` | `number` | No | Shipping fee |
| `viewType` | `string` | No | `'hosted_view'` or `'popup'` |
| `lifetime` | `number` | No | Payment lifetime in minutes (3–43200) |
| `skipSuccessPage` | `number` | No | `0` (don't skip) or `1` (skip) |
| `payout` | `string` | No | Payout details (JSON string) |
| `returnDeeplink` | `string` | No | Mobile app deeplink |
| `googlePayToken` | `string` | No | Required if `paymentOption` is `'google_pay'` |

> `items`, `returnUrl`, `returnDeeplink`, and `payout` are automatically base64-encoded by the SDK.

### `payway.checkTransaction(transactionId)`

Check the status of a transaction.

```typescript
const result = await payway.checkTransaction('order-001')
console.log(result.status.code)          // '00' = success
console.log(result.data?.payment_status) // 'APPROVED' | 'DECLINED' | 'PENDING' | ...
```

### `payway.listTransactions(options?)`

List transactions with optional filters. Max 3-day date range.

```typescript
const list = await payway.listTransactions({
  fromDate: '2026-03-01 00:00:00',
  toDate: '2026-03-03 23:59:59',
  status: 'APPROVED',
  page: 1,
  pagination: 20,
})
```

| Parameter | Type | Description |
|---|---|---|
| `fromDate` | `string` | Start date: `'YYYY-MM-DD HH:mm:ss'` |
| `toDate` | `string` | End date: `'YYYY-MM-DD HH:mm:ss'` |
| `fromAmount` | `number` | Minimum amount filter |
| `toAmount` | `number` | Maximum amount filter |
| `status` | `string` | Comma-separated: `APPROVED`, `DECLINED`, `PENDING`, `PRE-AUTH`, `CANCELLED`, `REFUNDED` |
| `page` | `number` | Page number (default: `1`) |
| `pagination` | `number` | Records per page (default: `40`, max: `1000`) |

### `payway.getTransactionDetails(transactionId)`

Get detailed information about a transaction, including its operation history.

```typescript
const details = await payway.getTransactionDetails('order-001')
console.log(details.data?.payment_status)            // 'APPROVED'
console.log(details.data?.transaction_operations)     // [{ status, amount, ... }]
```

### `payway.closeTransaction(transactionId)`

Close (cancel) a pending transaction. The payment status becomes `CANCELLED`.

```typescript
const result = await payway.closeTransaction('order-001')
console.log(result.status.code) // '00' = success
```

### `payway.getExchangeRate()`

Fetch the latest exchange rates from ABA Bank for 12 currencies.

```typescript
const rates = await payway.getExchangeRate()
console.log(rates.exchange_rates.eur) // { sell: '...', buy: '...' }
```

### `payway.generateQR(options)`

Generate a dynamic QR code for payment via ABA KHQR, WeChat Pay, or Alipay.

```typescript
const qr = await payway.generateQR({
  transactionId: 'qr-001',
  amount: 10.00,
  paymentOption: 'abapay_khqr',
  qrImageTemplate: 'template1',
  lifetime: 30,
})
console.log(qr.qrString)         // QR content string
console.log(qr.abapay_deeplink)  // ABA Mobile deep link
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `transactionId` | `string` | Yes | Unique transaction ID (max 20 chars) |
| `amount` | `number` | Yes | Payment amount (min: 100 KHR or 0.01 USD) |
| `paymentOption` | `QRPaymentOption` | Yes | `abapay_khqr`, `wechat` (USD only), `alipay` (USD only) |
| `qrImageTemplate` | `string` | Yes | QR image template name |
| `currency` | `'USD' \| 'KHR'` | No | Default: `'USD'` |
| `lifetime` | `number` | No | Lifetime in minutes (3–43200) |
| `firstName` | `string` | No | Payer's first name |
| `lastName` | `string` | No | Payer's last name |
| `email` | `string` | No | Payer's email |
| `phone` | `string` | No | Payer's phone |
| `purchaseType` | `'purchase' \| 'pre-auth'` | No | Default: `'purchase'` |
| `items` | `string` | No | Item description (auto base64-encoded) |
| `callbackUrl` | `string` | No | Payment callback URL (auto base64-encoded) |
| `returnDeeplink` | `string` | No | Mobile deeplink (auto base64-encoded) |
| `payout` | `string` | No | Payout JSON string (auto base64-encoded) |

### `payway.getTransactionsByRef(merchantRef)`

Get transactions by merchant reference. Returns up to the last 50 transactions.

```typescript
const txns = await payway.getTransactionsByRef('REF-001')
for (const txn of txns.data) {
  console.log(txn.transaction_id, txn.payment_status)
}

## Error Handling

```typescript
import { PayWay, PayWayAPIError, PayWayConfigError } from 'aba-payway'
```

| Error Class | When Thrown |
|---|---|
| `PayWayConfigError` | Missing or invalid constructor config |
| `PayWayAPIError` | ABA API returns non-2xx response (has `statusCode` and `responseBody` properties) |
| `PayWayError` | Base error class |
| `PayWayHashError` | Hash generation failure |

## Framework Examples

### Next.js (App Router)

```typescript
// app/api/pay/route.ts
import { PayWay } from 'aba-payway'

const payway = new PayWay({
  merchantId: process.env.PAYWAY_MERCHANT_ID!,
  apiKey: process.env.PAYWAY_API_KEY!,
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
})

export async function POST(request: Request) {
  const { orderId, amount } = await request.json()

  const params = payway.createTransaction({
    transactionId: orderId,
    amount,
    items: 'Order payment',
    returnUrl: `${process.env.NEXT_PUBLIC_URL}/api/pay/callback`,
  })

  return Response.json(params)
}
```

### Express

```typescript
import express from 'express'
import { PayWay } from 'aba-payway'

const app = express()
app.use(express.json())

const payway = new PayWay({
  merchantId: process.env.PAYWAY_MERCHANT_ID!,
  apiKey: process.env.PAYWAY_API_KEY!,
})

app.post('/pay', (req, res) => {
  const params = payway.createTransaction({
    transactionId: req.body.orderId,
    amount: req.body.amount,
    items: 'Order payment',
    returnUrl: 'https://yoursite.com/callback',
  })
  res.json(params)
})
```

## Sandbox Test Cards

| Card | Number | Expiry | CVV | Result |
|---|---|---|---|---|
| Mastercard | `5156 8399 3770 6777` | `01/30` | `993` | Approved |
| Visa | `4286 0900 0000 0206` | `04/30` | `777` | Approved |
| Mastercard | `5156 8302 7256 1029` | `04/30` | `777` | Declined |
| Visa | `4156 8399 3770 6777` | `01/30` | `993` | Declined |

## Documentation

For the full ABA PayWay API documentation, see [aba-payway-docs](https://github.com/Joselay/aba-payway-docs).

## License

MIT
