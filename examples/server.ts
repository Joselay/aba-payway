import { PayWay } from "../src/index.ts";

const payway = new PayWay({
	merchantId: process.env.ABA_PAYWAY_MERCHANT_ID!,
	apiKey: process.env.ABA_PAYWAY_API_KEY!,
});

const html = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>ABA PayWay SDK Test</title>
	<style>
		* { margin: 0; padding: 0; box-sizing: border-box; }
		body { font-family: -apple-system, system-ui, sans-serif; background: #f5f5f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
		.card { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.1); max-width: 420px; width: 100%; }
		h1 { font-size: 20px; margin-bottom: 8px; }
		p { color: #666; margin-bottom: 24px; font-size: 14px; }
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
		<h1>ABA PayWay Test</h1>
		<p>Test the SDK against sandbox environment</p>

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
		// Generate a simple transaction ID
		document.getElementById('tranId').value = 'PW' + Date.now();

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
					console.log("[create-transaction] Request body:", JSON.stringify(body, null, 2));

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

					console.log("[create-transaction] Checkout params:", JSON.stringify(params, null, 2));
					return Response.json(params);
				} catch (err: unknown) {
					console.error("[create-transaction] Error:", err);
					const message =
						err instanceof Error ? err.message : "Unknown error";
					return Response.json({ error: message }, { status: 500 });
				}
			},
		},
		"/api/check-transaction/:tranId": {
			GET: async (req) => {
				try {
					console.log("[check-transaction] tran_id:", req.params.tranId);
					const result = await payway.checkTransaction(req.params.tranId);
					console.log("[check-transaction] Response:", JSON.stringify(result, null, 2));
					return Response.json(result);
				} catch (err: unknown) {
					if (err instanceof Error && "responseBody" in err) {
						console.error("[check-transaction] Error:", err.message, "Body:", JSON.stringify((err as { responseBody: unknown }).responseBody, null, 2));
					} else {
						console.error("[check-transaction] Error:", err);
					}
					const message =
						err instanceof Error ? err.message : "Unknown error";
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
						page: url.searchParams.has("page") ? Number(url.searchParams.get("page")) : undefined,
						pagination: url.searchParams.has("pagination") ? Number(url.searchParams.get("pagination")) : undefined,
					};
					console.log("[transactions] Query options:", JSON.stringify(options, null, 2));
					const result = await payway.listTransactions(options);
					console.log("[transactions] Response:", JSON.stringify(result, null, 2));
					return Response.json(result);
				} catch (err: unknown) {
					console.error("[transactions] Error:", err);
					const message =
						err instanceof Error ? err.message : "Unknown error";
					return Response.json({ error: message }, { status: 500 });
				}
			},
		},
		"/api/callback": {
			POST: async (req) => {
				const formData = await req.formData();
				const data = Object.fromEntries(formData.entries());
				console.log("[callback] Payment callback received:", JSON.stringify(data, null, 2));
				return Response.json({ received: true, data });
			},
		},
	},
});

console.log("Test server running at http://localhost:3333");
