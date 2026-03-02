# Examples

Runnable examples for the `aba-payway` SDK. Each subdirectory is self-contained with its own `package.json`.

## Prerequisites

Set your ABA PayWay credentials as environment variables:

```bash
export ABA_PAYWAY_MERCHANT_ID="your_merchant_id"
export ABA_PAYWAY_API_KEY="your_api_key"
```

> Get sandbox credentials from [ABA PayWay](https://www.payway.com.kh/).

## Snippets

Focused examples — one file per SDK method.

```bash
cd examples/snippets
npm install
npm run create-transaction
```

| Script | File | Description |
|---|---|---|
| `npm run create-transaction` | [`create-transaction.ts`](snippets/create-transaction.ts) | Generate checkout params for a payment |
| `npm run check-transaction` | [`check-transaction.ts`](snippets/check-transaction.ts) | Check payment status by transaction ID |
| `npm run list-transactions` | [`list-transactions.ts`](snippets/list-transactions.ts) | List transactions with date/status filters |
| `npm run transaction-details` | [`transaction-details.ts`](snippets/transaction-details.ts) | Get full transaction details with operation history |
| `npm run close-transaction` | [`close-transaction.ts`](snippets/close-transaction.ts) | Cancel a pending transaction |
| `npm run exchange-rate` | [`exchange-rate.ts`](snippets/exchange-rate.ts) | Fetch ABA Bank exchange rates |
| `npm run generate-qr` | [`generate-qr.ts`](snippets/generate-qr.ts) | Generate a QR code for KHQR / WeChat / Alipay |
| `npm run transactions-by-ref` | [`transactions-by-ref.ts`](snippets/transactions-by-ref.ts) | Look up transactions by merchant reference |
| `npm run error-handling` | [`error-handling.ts`](snippets/error-handling.ts) | Handle all SDK error types |
| `npm run items-array` | [`items-array.ts`](snippets/items-array.ts) | Structured item entries with name, quantity, price |
| `npm run pre-auth-flow` | [`pre-auth-flow.ts`](snippets/pre-auth-flow.ts) | Pre-authorization transaction lifecycle |

## Framework Integrations

Each framework example is self-contained — install and run independently.

### Express

```bash
cd examples/express
npm install
npm start
# Server running at http://localhost:3000
```

Endpoints: `POST /api/checkout` · `POST /api/callback` · `GET /api/status/:id`

### Hono

```bash
cd examples/hono
npm install
npm start
# Server running at http://localhost:3000
```

Endpoints: `POST /api/checkout` · `POST /api/callback` · `GET /api/status/:id`

### Next.js

Copy [`nextjs/route.ts`](nextjs/route.ts) into your Next.js project at `app/api/checkout/route.ts`. See the file header for setup instructions.

## Sandbox

Full-featured Bun server with HTML UI for testing all SDK methods interactively.

```bash
bun run examples/sandbox-server.ts
# Open http://localhost:3333
```

## Test Cards

| Card | Number | Expiry | CVV | Result |
|---|---|---|---|---|
| Mastercard | `5156 8399 3770 6777` | `01/30` | `993` | Approved |
| Visa | `4286 0900 0000 0206` | `04/30` | `777` | Approved |
| Mastercard | `5156 8302 7256 1029` | `04/30` | `777` | Declined |
| Visa | `4156 8399 3770 6777` | `01/30` | `993` | Declined |
