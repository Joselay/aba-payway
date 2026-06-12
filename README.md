# aba-payway

[![npm version](https://img.shields.io/npm/v/aba-payway)](https://www.npmjs.com/package/aba-payway)
[![CI](https://github.com/Joselay/aba-payway/actions/workflows/ci.yml/badge.svg)](https://github.com/Joselay/aba-payway/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Type-safe TypeScript SDK for [ABA PayWay](https://www.payway.com.kh/).

> Unofficial community SDK. Not affiliated with ABA Bank.

## Install

```bash
bun add aba-payway
# or
npm install aba-payway
# or
pnpm add aba-payway
```

## Usage

```typescript
import { PayWay } from 'aba-payway'

const payway = new PayWay({
  merchantId: 'your_merchant_id',
  apiKey: 'your_api_key',
})

const params = payway.createTransaction({
  transactionId: 'order-001',
  amount: 10,
  items: 'Product A',
  returnUrl: 'https://yoursite.com/callback',
})
```

`createTransaction` returns checkout params for ABA's checkout form / JS SDK.

## Implemented

- `createTransaction`
- `checkTransaction`
- `listTransactions`
- `getTransactionDetails`
- `closeTransaction`
- `getExchangeRate`
- `generateQR`
- `getTransactionsByRef`

This SDK does not cover the full ABA PayWay API yet.

## Examples

See [`examples/`](./examples) for snippets and framework examples.

## Official docs

https://developer.payway.com.kh/

## License

MIT
