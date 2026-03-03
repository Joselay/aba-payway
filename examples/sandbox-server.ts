import { PayWay, PayWayAPIError } from "../src/index.ts";

const merchantId = process.env.ABA_PAYWAY_MERCHANT_ID;
const apiKey = process.env.ABA_PAYWAY_API_KEY;

if (!merchantId || !apiKey) {
	throw new Error(
		"ABA_PAYWAY_MERCHANT_ID and ABA_PAYWAY_API_KEY environment variables are required",
	);
}

const payway = new PayWay({ merchantId, apiKey });

const html = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>ABA PayWay SDK Test</title>
	<style>
		* { margin: 0; padding: 0; box-sizing: border-box; }
		body { font-family: -apple-system, system-ui, sans-serif; background: #f5f5f5; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; min-height: 100vh; }
		.card { background: white; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.1); max-width: 420px; width: 100%; overflow: hidden; }
		.tabs { display: flex; border-bottom: 1px solid #e5e5e5; }
		.tab { flex: 1; padding: 14px; font-size: 14px; font-weight: 600; color: #888; background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; transition: color 0.15s, border-color 0.15s; }
		.tab:hover { color: #333; }
		.tab.active { color: #0066ff; border-bottom-color: #0066ff; }
		.tab-content { display: none; padding: 32px; }
		.tab-content.active { display: block; }
		h1 { font-size: 20px; margin-bottom: 8px; }
		p.subtitle { color: #666; margin-bottom: 24px; font-size: 14px; }
		label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 4px; color: #333; }
		input, select { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; margin-bottom: 16px; }
		button { width: 100%; padding: 12px; background: #0066ff; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; }
		button:hover { background: #0052cc; }
		#reopenBtn { display: none; margin-top: 8px; background: #444; }
		#reopenBtn:hover { background: #333; }
		.status { margin-top: 16px; padding: 12px; border-radius: 8px; font-size: 13px; display: none; }
		.status.error { display: block; background: #fee; color: #c00; }
		.status.success { display: block; background: #efe; color: #060; }
		.status.info { display: block; background: #eef; color: #006; }
	</style>
</head>
<body>
	<div class="card">
		<div class="tabs">
			<button class="tab active" onclick="switchTab('checkout')">Checkout</button>
			<button class="tab" onclick="switchTab('qr')">QR Payment</button>
		</div>

		<!-- Checkout Tab -->
		<div class="tab-content active" id="tab-checkout">
			<h1>ABA PayWay Test</h1>
			<p class="subtitle">Test the SDK against sandbox environment</p>

			<label>Transaction ID</label>
			<input type="text" id="tranId" />

			<label>Amount (USD)</label>
			<input type="number" id="amount" value="1.00" step="0.01" min="0.01" />

			<label>First Name</label>
			<input type="text" id="firstName" value="John" />

			<label>Last Name</label>
			<input type="text" id="lastName" value="Doe" />

			<label>Email</label>
			<input type="email" id="email" value="john@example.com" />

			<label>Phone</label>
			<input type="text" id="phone" value="012345678" />

			<button onclick="pay()">Pay Now</button>
			<button id="reopenBtn" onclick="openCheckout()">Re-open Payment Window</button>

			<div class="status" id="status"></div>
		</div>

		<!-- QR Payment Tab -->
		<div class="tab-content" id="tab-qr">
			<h1>Generate QR Payment</h1>
			<p class="subtitle">Generate an ABA KHQR / WeChat / Alipay QR code</p>

			<label>Transaction ID</label>
			<input type="text" id="qrTranId" />

			<label>Amount (USD)</label>
			<input type="number" id="qrAmount" value="0.01" step="0.01" min="0.01" />

			<label>Payment Option</label>
			<select id="qrPaymentOption">
				<option value="abapay_khqr">ABA KHQR</option>
				<option value="wechat">WeChat Pay</option>
				<option value="alipay">Alipay</option>
			</select>

			<label>Lifetime (minutes)</label>
			<input type="number" id="qrLifetime" value="10" min="3" max="43200" />

			<label>QR Image Template</label>
			<input type="text" id="qrTemplate" value="template3_color" />

			<label>First Name</label>
			<input type="text" id="qrFirstName" value="John" />

			<label>Last Name</label>
			<input type="text" id="qrLastName" value="Doe" />

			<label>Email</label>
			<input type="email" id="qrEmail" value="john@example.com" />

			<label>Phone</label>
			<input type="text" id="qrPhone" value="012345678" />

			<button onclick="generateQR()">Generate QR</button>

			<div class="status" id="qrStatus"></div>
			<div id="qrResult" style="margin-top:16px;text-align:center;display:none;">
				<img id="qrImage" src="" alt="QR Code" style="max-width:240px;border-radius:8px;" />
				<p style="margin-top:8px;font-size:12px;color:#666;word-break:break-all;" id="qrString"></p>
			</div>
		</div>
	</div>

	<!-- ABA PayWay requires this exact form structure -->
	<form method="POST" target="aba_webservice" action="" id="aba_merchant_request">
		<input type="hidden" name="hash" id="f_hash" value="" />
		<input type="hidden" name="tran_id" id="f_tran_id" value="" />
		<input type="hidden" name="amount" id="f_amount" value="" />
		<input type="hidden" name="merchant_id" id="f_merchant_id" value="" />
		<input type="hidden" name="req_time" id="f_req_time" value="" />
		<input type="hidden" name="payment_option" value="" />
		<input type="hidden" name="view_type" value="checkout" />
		<input type="hidden" name="payment_gate" value="0" />
		<input type="hidden" name="currency" id="f_currency" value="" />
		<input type="hidden" name="firstname" id="f_firstname" value="" />
		<input type="hidden" name="lastname" id="f_lastname" value="" />
		<input type="hidden" name="phone" id="f_phone" value="" />
		<input type="hidden" name="email" id="f_email" value="" />
		<input type="hidden" name="items" id="f_items" value="" />
		<input type="hidden" name="type" id="f_type" value="" />
		<input type="hidden" name="return_url" id="f_return_url" value="" />
		<input type="hidden" name="cancel_url" id="f_cancel_url" value="" />
		<input type="hidden" name="continue_success_url" id="f_continue_success_url" value="" />
	</form>

	<script>
		// Generate simple transaction IDs
		document.getElementById('tranId').value = 'PW' + Date.now();
		document.getElementById('qrTranId').value = 'QR' + Date.now();

		function switchTab(name) {
			document.querySelectorAll('.tab').forEach((t, i) => {
				const tabNames = ['checkout', 'qr'];
				t.classList.toggle('active', tabNames[i] === name);
			});
			document.querySelectorAll('.tab-content').forEach(c => {
				c.classList.toggle('active', c.id === 'tab-' + name);
			});
		}

		let sdkReady = false;

		function waitForSdk(callback, attempts) {
			attempts = attempts || 0;
			if (typeof AbaPayway !== 'undefined') {
				sdkReady = true;
				callback();
			} else if (attempts < 50) {
				setTimeout(() => waitForSdk(callback, attempts + 1), 200);
			} else {
				document.getElementById('status').className = 'status error';
				document.getElementById('status').textContent = 'ABA PayWay SDK failed to load';
			}
		}

		function openCheckout() {
			if (typeof AbaPayway !== 'undefined') {
				AbaPayway.checkout();
			}
		}

		async function pay() {
			const statusEl = document.getElementById('status');
			statusEl.className = 'status info';
			statusEl.textContent = 'Creating transaction...';

			try {
				const res = await fetch('/api/create-transaction', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						transactionId: document.getElementById('tranId').value,
						amount: parseFloat(document.getElementById('amount').value),
						firstName: document.getElementById('firstName').value,
						lastName: document.getElementById('lastName').value,
						email: document.getElementById('email').value,
						phone: document.getElementById('phone').value,
					}),
				});

				const data = await res.json();

				if (!res.ok) {
					statusEl.className = 'status error';
					statusEl.textContent = 'Error: ' + JSON.stringify(data);
					return;
				}

				// Populate the hidden form fields
				document.getElementById('aba_merchant_request').action = data.action;
				document.getElementById('f_hash').value = data.hash;
				document.getElementById('f_tran_id').value = data.tran_id;
				document.getElementById('f_amount').value = data.amount;
				document.getElementById('f_merchant_id').value = data.merchant_id;
				document.getElementById('f_req_time').value = data.req_time;
				document.getElementById('f_currency').value = data.currency;
				document.getElementById('f_firstname').value = data.firstname;
				document.getElementById('f_lastname').value = data.lastname;
				document.getElementById('f_phone').value = data.phone;
				document.getElementById('f_email').value = data.email;
				document.getElementById('f_items').value = data.items;
				document.getElementById('f_type').value = data.type;
				document.getElementById('f_return_url').value = data.return_url;
				document.getElementById('f_cancel_url').value = data.cancel_url;
				document.getElementById('f_continue_success_url').value = data.continue_success_url;

				statusEl.className = 'status success';
				statusEl.textContent = 'Transaction created! Opening payment...';
				document.getElementById('reopenBtn').style.display = 'block';

				// Wait for SDK then open checkout
				waitForSdk(() => {
					AbaPayway.checkout();
				});
			} catch (err) {
				statusEl.className = 'status error';
				statusEl.textContent = 'Error: ' + err.message;
			}
		}

		async function generateQR() {
			const statusEl = document.getElementById('qrStatus');
			const resultEl = document.getElementById('qrResult');
			statusEl.className = 'status info';
			statusEl.textContent = 'Generating QR...';
			resultEl.style.display = 'none';

			try {
				const res = await fetch('/api/generate-qr', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						transactionId: document.getElementById('qrTranId').value,
						amount: parseFloat(document.getElementById('qrAmount').value),
						paymentOption: document.getElementById('qrPaymentOption').value,
						lifetime: parseInt(document.getElementById('qrLifetime').value),
						qrImageTemplate: document.getElementById('qrTemplate').value,
						firstName: document.getElementById('qrFirstName').value,
						lastName: document.getElementById('qrLastName').value,
						email: document.getElementById('qrEmail').value,
						phone: document.getElementById('qrPhone').value,
					}),
				});

				const data = await res.json();

				if (!res.ok) {
					statusEl.className = 'status error';
					statusEl.textContent = 'Error: ' + JSON.stringify(data);
					return;
				}

				statusEl.className = 'status success';
				statusEl.textContent = 'QR generated! Status: ' + data.status.code + ' — ' + data.status.message;
				document.getElementById('qrImage').src = data.qrImage;
				document.getElementById('qrString').textContent = data.qrString;
				resultEl.style.display = 'block';
			} catch (err) {
				statusEl.className = 'status error';
				statusEl.textContent = 'Error: ' + err.message;
			}
		}
	</script>
	<!-- Load ABA SDK after form exists in DOM -->
	<script src="https://checkout.payway.com.kh/plugins/checkout2-0.js"></script>
</body>
</html>`;

Bun.serve({
	port: 3333,
	routes: {
		"/": new Response(html, {
			headers: { "Content-Type": "text/html" },
		}),
		"/api/create-transaction": {
			POST: async (req) => {
				try {
					const body = await req.json();
					console.log(
						"[create-transaction] Request body:",
						JSON.stringify(body, null, 2),
					);

					const params = payway.createTransaction({
						transactionId: body.transactionId,
						amount: Number(body.amount),
						currency: body.currency,
						firstName: body.firstName,
						lastName: body.lastName,
						email: body.email,
						phone: body.phone,
						items: body.items ?? "Test Product",
						returnUrl: "http://localhost:3333/api/callback",
					});

					console.log(
						"[create-transaction] Checkout params:",
						JSON.stringify(params, null, 2),
					);
					return Response.json(params);
				} catch (err: unknown) {
					console.error("[create-transaction] Error:", err);
					const message = err instanceof Error ? err.message : "Unknown error";
					return Response.json({ error: message }, { status: 500 });
				}
			},
		},
		"/api/check-transaction/:tranId": {
			GET: async (req) => {
				try {
					console.log("[check-transaction] tran_id:", req.params.tranId);
					const result = await payway.checkTransaction(req.params.tranId);
					console.log(
						"[check-transaction] Response:",
						JSON.stringify(result, null, 2),
					);
					return Response.json(result);
				} catch (err: unknown) {
					if (err instanceof PayWayAPIError) {
						console.error(
							"[check-transaction] Error:",
							err.message,
							"Body:",
							JSON.stringify(err.responseBody, null, 2),
						);
					} else {
						console.error("[check-transaction] Error:", err);
					}
					const message = err instanceof Error ? err.message : "Unknown error";
					return Response.json({ error: message }, { status: 500 });
				}
			},
		},
		"/api/transactions": {
			GET: async (req) => {
				try {
					const url = new URL(req.url);
					const options = {
						fromDate: url.searchParams.get("from_date") ?? undefined,
						toDate: url.searchParams.get("to_date") ?? undefined,
						status: url.searchParams.get("status") ?? undefined,
						page: url.searchParams.has("page")
							? Number(url.searchParams.get("page"))
							: undefined,
						pagination: url.searchParams.has("pagination")
							? Number(url.searchParams.get("pagination"))
							: undefined,
					};
					console.log(
						"[transactions] Query options:",
						JSON.stringify(options, null, 2),
					);
					const result = await payway.listTransactions(options);
					console.log(
						"[transactions] Response:",
						JSON.stringify(result, null, 2),
					);
					return Response.json(result);
				} catch (err: unknown) {
					console.error("[transactions] Error:", err);
					const message = err instanceof Error ? err.message : "Unknown error";
					return Response.json({ error: message }, { status: 500 });
				}
			},
		},
		"/api/transaction-details/:tranId": {
			GET: async (req) => {
				try {
					console.log("[transaction-details] tran_id:", req.params.tranId);
					const result = await payway.getTransactionDetails(req.params.tranId);
					console.log(
						"[transaction-details] Response:",
						JSON.stringify(result, null, 2),
					);
					return Response.json(result);
				} catch (err: unknown) {
					console.error("[transaction-details] Error:", err);
					const message = err instanceof Error ? err.message : "Unknown error";
					return Response.json({ error: message }, { status: 500 });
				}
			},
		},
		"/api/close-transaction/:tranId": {
			POST: async (req) => {
				try {
					console.log("[close-transaction] tran_id:", req.params.tranId);
					const result = await payway.closeTransaction(req.params.tranId);
					console.log(
						"[close-transaction] Response:",
						JSON.stringify(result, null, 2),
					);
					return Response.json(result);
				} catch (err: unknown) {
					console.error("[close-transaction] Error:", err);
					const message = err instanceof Error ? err.message : "Unknown error";
					return Response.json({ error: message }, { status: 500 });
				}
			},
		},
		"/api/exchange-rate": {
			GET: async () => {
				try {
					const result = await payway.getExchangeRate();
					console.log(
						"[exchange-rate] Response:",
						JSON.stringify(result, null, 2),
					);
					return Response.json(result);
				} catch (err: unknown) {
					console.error("[exchange-rate] Error:", err);
					const message = err instanceof Error ? err.message : "Unknown error";
					return Response.json({ error: message }, { status: 500 });
				}
			},
		},
		"/api/transactions-by-ref/:ref": {
			GET: async (req) => {
				try {
					console.log("[transactions-by-ref] ref:", req.params.ref);
					const result = await payway.getTransactionsByRef(req.params.ref);
					console.log(
						"[transactions-by-ref] Response:",
						JSON.stringify(result, null, 2),
					);
					return Response.json(result);
				} catch (err: unknown) {
					console.error("[transactions-by-ref] Error:", err);
					const message = err instanceof Error ? err.message : "Unknown error";
					return Response.json({ error: message }, { status: 500 });
				}
			},
		},
		"/api/generate-qr": {
			POST: async (req) => {
				try {
					const body = await req.json();
					console.log(
						"[generate-qr] Request body:",
						JSON.stringify(body, null, 2),
					);
					const result = await payway.generateQR({
						transactionId: body.transactionId,
						amount: Number(body.amount),
						currency: body.currency,
						paymentOption: body.paymentOption,
						lifetime: Number(body.lifetime),
						qrImageTemplate: body.qrImageTemplate,
						firstName: body.firstName,
						lastName: body.lastName,
						email: body.email,
						phone: body.phone,
					});
					console.log(
						"[generate-qr] Response:",
						JSON.stringify(result, null, 2),
					);
					return Response.json(result);
				} catch (err: unknown) {
					if (err instanceof PayWayAPIError) {
						console.error(
							"[generate-qr] Error:",
							err.message,
							"Body:",
							JSON.stringify(err.responseBody, null, 2),
						);
					} else {
						console.error("[generate-qr] Error:", err);
					}
					const message = err instanceof Error ? err.message : "Unknown error";
					return Response.json({ error: message }, { status: 500 });
				}
			},
		},
		"/api/callback": {
			POST: async (req) => {
				const formData = await req.formData();
				const data = Object.fromEntries(formData.entries());
				console.log(
					"[callback] Payment callback received:",
					JSON.stringify(data, null, 2),
				);
				return Response.json({ received: true, data });
			},
		},
	},
});

console.log("Test server running at http://localhost:3333");
