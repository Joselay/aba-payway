# aba-payway

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

const result = await payway.createTransaction({
  transactionId: 'order-001',
  amount: 10.00,
  items: 'Product A',
  returnUrl: 'https://yoursite.com/callback',
})
```

## API Reference

### `new PayWay(config)`

| Parameter | Type | Required | Description |
|---|---|---|---|
| `merchantId` | `string` | Yes | Your ABA PayWay merchant ID |
| `apiKey` | `string` | Yes | Your ABA PayWay API key |
| `production` | `boolean` | No | Use production environment (default: `false`) |

### `payway.createTransaction(options)`

Create a new payment transaction.

```typescript
const result = await payway.createTransaction({
  transactionId: 'order-001',
  amount: 10.00,
  currency: 'USD',               // 'USD' | 'KHR' (default: 'USD')
  paymentOption: 'abapay_deeplink',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '012345678',
  items: 'Product A',
  returnUrl: 'https://yoursite.com/callback',
  continueSuccessUrl: 'https://yoursite.com/success',
})
```

**Payment options:** `cards`, `abapay`, `abapay_deeplink`, `abapay_khqr_deeplink`, `wechat`, `alipay`, `bakong`

### `payway.checkTransaction(transactionId)`

Check the status of a transaction.

```typescript
const status = await payway.checkTransaction('order-001')
// status.data.status → 'APPROVED' | 'DECLINED' | 'PENDING' | ...
```

### `payway.listTransactions(options?)`

List transactions with optional filters.

```typescript
const list = await payway.listTransactions({
  fromDate: '2024-01-01',
  toDate: '2024-12-31',
  status: 'APPROVED',
  page: 1,
  limit: 20,
})
```

## Framework Examples

### Next.js API Route (App Router)

```typescript
// app/api/pay/route.ts
import { PayWay } from 'aba-payway'

const payway = new PayWay({
  merchantId: process.env.PAYWAY_MERCHANT_ID!,
  apiKey: process.env.PAYWAY_API_KEY!,
  production: process.env.NODE_ENV === 'production',
})

export async function POST(request: Request) {
  const { orderId, amount } = await request.json()

  const result = await payway.createTransaction({
    transactionId: orderId,
    amount,
    items: 'Order payment',
    returnUrl: `${process.env.NEXT_PUBLIC_URL}/api/pay/callback`,
  })

  return Response.json(result)
}
```

### Express

```typescript
import express from 'express'
import { PayWay } from 'aba-payway'

const app = express()
const payway = new PayWay({
  merchantId: process.env.PAYWAY_MERCHANT_ID!,
  apiKey: process.env.PAYWAY_API_KEY!,
})

app.post('/pay', async (req, res) => {
  const result = await payway.createTransaction({
    transactionId: req.body.orderId,
    amount: req.body.amount,
    items: 'Order payment',
    returnUrl: 'https://yoursite.com/callback',
  })
  res.json(result)
})
```

## Environment Variables

| Variable | Description |
|---|---|
| `PAYWAY_MERCHANT_ID` | Your merchant ID from ABA PayWay |
| `PAYWAY_API_KEY` | Your API key from ABA PayWay |

## Transaction Statuses

| Status | Description |
|---|---|
| `APPROVED` | Payment successful |
| `DECLINED` | Payment declined |
| `PENDING` | Payment pending |
| `PRE-AUTH` | Pre-authorized |
| `CANCELLED` | Payment cancelled |
| `REFUNDED` | Payment refunded |

## License

MIT
