# Weë Credits: pricing matrix v5, Mercado Pago Peru **scenario** (nothing implemented, prices not final)

> **Owner decision, 2026-11-04 (implemented in `wt-ui-migracion`, not deployed).** Credits are bought exactly as in the YC demo: any amount from **US$5 to US$100 in steps of US$5, at 100 Credits per US$1**. There are **no packages** (Basic/Plus/Black Pro are gone everywhere, including the `credits_*`/`usd{N}` package catalogue this document proposed) and **no welcome bonus** (new accounts start at 0). The server recomputes and validates every purchase and grants only after the provider confirms an order (`paymentOrders`, immutable snapshot, idempotent by `requestId`). PEN for Peru = whole sol of (USD × exchange rate), with the rate read from `markets/PE` (source, value, date) and failing closed when it is missing. Only the `test` provider confirms payments (emulator/non-production); Stripe is NOT_IMPLEMENTED and Mercado Pago does not exist yet. Details: [`CREDITS.md`](CREDITS.md) §7. Everything below that talks about packages, package catalogues or a welcome bonus is superseded by this note.

Date: 2026-11-03 · Branch `ui/migracion-demo` (base `6e11023d`)
**Status: provisional scenario.** These are not approved final prices.

- The Mercado Pago fees used are **third-party estimates, not merchant-account rates**.
- No payment, Credit Engine, pricing configuration or production change has been made. Nothing has been deployed or merged.
- The prices are final only once WEE's real merchant-account fees are verified **and** the owner gives final approval.

Local-currency architecture by market (Peru first, more countries without touching the global Credit): [`PRECIOS-POR-MERCADO.md`](PRECIOS-POR-MERCADO.md). Calculation script: [`calculos/matriz-precios.mjs`](calculos/matriz-precios.mjs). Every input declares its source, and every block of output says "ESCENARIO" while anything is unverified.

## 0. Approved decisions (owner, 2026-11-03)
| Decision | Status |
|---|---|
| Initial web payment provider | **Mercado Pago Peru** |
| Integration in WEE Wallet | **Checkout Bricks** preferred; **Checkout Pro** as fallback if Bricks proves unnecessarily complex |
| Settlement | **Immediate** as the launch preference, subject to the real fee (§4) |
| Customer currency | **PEN** if Mercado Pago does not accept USD |
| Taxes | Customer prices **include** applicable taxes; never added twice |
| Welcome bonus | **None.** Existing balances and past transactions untouched |
| Weë Brain | **Exactly 12 replies = 1 Credit**; the 12th deducts exactly 1 (fix specified in §9, not applied) |
| Margins | 40–60 % by feature family (text, voice, standard images, 3D, video 50 %; search and transcription 45 %; pro image, avatar, try-on 55 %) |
| Unknown tariffs | Blocked: unknown video model, resolution or tariff; 4K; FLUX and Seedream. Video ≤ 15 s and ≤ $6 provider cost per operation |
| Reference rule | 1 USD = 100 Credits; packages equivalent to $5/10/15/20/25/50/100 |

## 1. Verified data vs provisional estimates
| Input | **Verified** (merchant account / official source) | **Provisional** used in this scenario | Source of the provisional value |
|---|---|---|---|
| Mercado Pago fee, Checkout Bricks, **immediate** | **— pending** (WEE's merchant account) | 3.99 % + S/ 1 + IGV on the commission | Third parties: [kom.pe](https://kom.pe/mercadopago-woocommerce-peru/), [comercioelectronico.lat](https://comercioelectronico.lat/herramientas/mercado-pago-opiniones/), [vendhi.com](https://www.vendhi.com/blog/5-procesadores-de-pago-que-puedes-utilizar-para-vender-por-internet-en-peru). **Not official.** |
| Mercado Pago fee, Checkout Bricks, **14 days** | **— pending** | 3.79 % + S/ 1 + IGV on the commission | Same; some sources quote the same rate for both timings |
| Withdrawal, instalment or conversion charges | **— pending** | Not included | — |
| Commission on refunds; chargeback fee | **— not published** in the official docs read ([refunds](https://www.mercadopago.com.pe/developers/es/docs/checkout-pro-preferences/additional-settings/refunds-and-cancellations), [chargebacks](https://www.mercadopago.com.pe/developers/es/docs/checkout-pro-preferences/chargebacks/introduction)) | Not included | — |
| USD accepted by Mercado Pago Peru | **— pending** (docs only show `PEN` as an example) | PEN | — |
| USD→PEN exchange rate | **— pending:** the SBS reference rate on the day prices are set | 3.30 (deliberately low: makes the S/ 1 weigh more) | Scenario value |
| IGV recoverable on the commission | **— pending** (WEE's tax regime) | Not recoverable (counted as a cost) | Conservative assumption |
| IGV rate | **18 %** (2026: 15.5 % IGV + 2.5 % IPM, Ley 32387) | — | [SUNAT](https://orientacion.sunat.gob.pe/3053-concepto-tasa-y-operaciones-gravadas-igv-empresas) |
| Provider costs (Gemini, DeepSeek, ElevenLabs ceiling, fal) | Verified on official pages (ECONOMIA §2) | Seedance: code rates, **unverified** | — |

Closing the scenario only takes the merchant-account entries in the script's `TARIFAS_MP.<timing>.verificada`, the SBS rate in `TC_BASE` and the tax answer; then the script is re-run. **The formulas and the margins do not change.**

## 2. Exchange rate: internal reference and stable customer prices
- **Internal calculations** use the **SBS** reference rate (S/ per US$) published on the day prices are set. That rate becomes the **base rate**.
- **Customer PEN prices stay stable.** They do not move with the daily rate.
- **Monthly review:** compare the SBS rate with the base rate.
- **Recalculation trigger:** a deviation **greater than ±5 %** (with base 3.30, outside 3.135–3.465), or any change in Mercado Pago fees or provider costs.
  - The trigger recalculates with the same script. Any change in customer prices goes back to the owner for approval.
  - In the script: `hayQueRecalcular(tcSbsHoy)`.
- **Effect of moving within the ±5 % band without recalculating** (smallest package, immediate):

| Rate vs base | Net per Credit | Lowest margin | Families below their target | Below 40 %? |
|---|---|---|---|---|
| Base (3.30) | $0.00753 | 47.8 % | none | no |
| **+5 %** (weaker sol, 3.465) | $0.00717 | 45.2 % | 2K and 4K images, pro image, photo with avatar, Weë avatar, try-on, 3D, video: about 1–3 points below target | **no** |
| −5 % (3.135) | $0.00793 | 50.4 % | none | no |

Inside the band, every feature stays within 40–60 %; at worst some fall a little short of their family target.
- **Option for the owner:** price for the band's edge (+5 %). Prices would rise about 5 % and the targets would hold across the whole band.
- **Recommendation:** keep the current calculation. It never leaves the approved band, and the trigger corrects larger moves.

## 3. PEN packages: mapping to Credits and to the USD reference
Proposal for the scenario:
- Credits stay fixed at 500 … 10,000.
- **PEN price = USD reference × base rate, rounded to the nearest whole sol.** No decimals, which is simple for the customer.
- With base 3.30, **not final** (depends on the real SBS rate):

| USD reference | **Credits** | Exact PEN | **Proposed PEN** | USD equivalent | Deviation from 1 USD = 100 Credits | Credits per sol |
|---|---|---|---|---|---|---|
| $5 | 500 | S/ 16.50 | **S/ 17** | $5.15 | +3.0 % | 29.41 |
| $10 | 1,000 | S/ 33.00 | **S/ 33** | $10.00 | 0.0 % | 30.30 |
| $15 | 1,500 | S/ 49.50 | **S/ 50** | $15.15 | +1.0 % | 30.00 |
| $20 | 2,000 | S/ 66.00 | **S/ 66** | $20.00 | 0.0 % | 30.30 |
| $25 | 2,500 | S/ 82.50 | **S/ 83** | $25.15 | +0.6 % | 30.12 |
| $50 | 5,000 | S/ 165.00 | **S/ 165** | $50.00 | 0.0 % | 30.30 |
| $100 | 10,000 | S/ 330.00 | **S/ 330** | $100.00 | 0.0 % | 30.30 |

**About S/ 19 / 37 / 55:** they are **not approved**. They only match 1 USD = 100 Credits if the rate is around **3.70**:

| Amount | Credits | At rate 3.30 | At 3.60 | At 3.70 | At 3.90 |
|---|---|---|---|---|---|
| S/ 19 | 500 | **+15.2 %** | +5.6 % | +2.7 % | −2.6 % |
| S/ 37 | 1,000 | **+12.1 %** | +2.8 % | 0.0 % | −5.1 % |
| S/ 55 | 1,500 | **+11.1 %** | +1.9 % | −0.9 % | −6.0 % |

Positive means the customer pays more per Credit than the reference: more margin, but a worse price. Negative means less margin. If the real SBS rate is about 3.70, the S/ 19 / 37 / 55 / … series is the "whole sol" version of this same rule. **The amounts are chosen once the SBS rate is known, never before.**

## 4. Net revenue per Credit for each PEN package (scenario)
```
USD gross          = PEN price ÷ rate
IGV included       = gross − gross ÷ 1.18                       (only subtracted)
commission         = (PEN price × fee % + S/ 1) ÷ rate
IGV on commission  = commission × 18 %                          (0 if recoverable)
net                = gross − IGV included − commission − IGV on commission ;   N = net ÷ Credits
```

**Immediate settlement**, rate 3.30, commission IGV counted as a cost, **provisional fees**:

| PEN package | Credits | IGV incl. | Commission | IGV comm. | **Net** | Retained | **N per Credit** |
|---|---|---|---|---|---|---|---|
| S/ 17 | 500 | $0.79 | $0.509 | $0.092 | **$3.766** | 73.1 % | $0.00753 |
| S/ 33 | 1,000 | $1.53 | $0.702 | $0.126 | $7.646 | 76.5 % | $0.00765 |
| S/ 50 | 1,500 | $2.31 | $0.908 | $0.163 | $11.769 | 77.7 % | $0.00785 |
| S/ 66 | 2,000 | $3.05 | $1.101 | $0.198 | $15.650 | 78.2 % | $0.00782 |
| S/ 83 | 2,500 | $3.84 | $1.307 | $0.235 | $19.773 | 78.6 % | $0.00791 |
| S/ 165 | 5,000 | $7.63 | $2.298 | $0.414 | $39.661 | 79.3 % | $0.00793 |
| S/ 330 | 10,000 | $15.25 | $4.293 | $0.773 | $79.680 | 79.7 % | $0.00797 |

### Immediate vs 14 days
Real merchant-account fees are needed before confirming the choice. Comparison template:

| | Immediate | 14 days | Difference |
|---|---|---|---|
| Fee in **WEE's account** (verified) | **pending** | **pending** | **pending** |
| Fee in this scenario (third parties) | 3.99 % + S/ 1 + IGV | 3.79 % + S/ 1 + IGV | 0.20 pts + IGV ≈ **0.24 % of price** |
| Extra net from 14 days, per recharge (scenario) | — | S/ 17: +$0.012 · S/ 33: +$0.024 · S/ 165: +$0.118 · S/ 330: +$0.236 | ≈ $2.36 per $1,000 recharged |
| Effect on operation prices | none | none | — |

- **Launch preference: immediate** (approved). AI providers are paid in USD as they are consumed, so a 14-day freeze on income is a cash-flow risk that costs more than 0.24 %.
- **Rule for final confirmation:**
  - if the real difference is **≤ 0.5 points**, keep immediate;
  - if it is larger, present the figure and its monthly impact before deciding;
  - if both timings cost the same, immediate.

## 5. Operation prices (scenario; same as v4, not final)
Credits are set on the worst case of the old v4 calculation: $5 package, immediate, rate 3.30, N = $0.007289. The S/ 17 package leaves slightly more ($0.00753), so these prices are conservative.

| Feature | Cost (USD) | Target | **Credits** | Combined margin at S/ 17 · base rate |
|---|---|---|---|---|
| Text step `ai_text` | 0.0046 | 50 % | 2 | 69.5 % ⚠ above 60 % because Credits are whole (1 Credit = 39 %) |
| Long text (2027 rate) | 0.0195 | 50 % | 6 | 56.9 % |
| Search with sources | 0.0213 | 45 % | 6 | 52.9 % |
| Transcription 600 s | 0.0118 | 45 % | 3 | 47.8 % |
| Voice per 1,000 characters / minimum 200 | 0.10 / 0.02 | 50 % | 28 / 6 | 52.6 % / 55.7 % |
| Image 512 / 1K / 2K / 4K (Nano Banana 2) | 0.045 / 0.067 / 0.101 / 0.151 | 50 % | 13 / 19 / 28 / 42 | 54.0 / 53.2 / 52.1 / 52.3 % |
| Quick image (Flash-Lite Image) | 0.0336 | 50 % | 10 | 55.4 % |
| Pro image 1K/2K / 4K | 0.134 / 0.24 | 55 % | 41 / 74 | 56.6 / 56.9 % |
| Photo with your Weë avatar (moves to pro) | 0.134 | 55 % | 41 | 56.6 % |
| Weë avatar | 0.268 | 55 % | 82 | 56.6 % |
| Try-on (priced on the Pro fallback) | ≤ 0.134 | 55 % | 41 | ≥ 56.6 % |
| 3D world (disabled) | 0.30 | 50 % | 83 | 52.0 % |
| Video, provisional (2.5 720p 10 s · 2.0 1080p 15 s) | 2.311 · 5.613 | 50 % | 635 · 1,541 | 51.7 % · 51.6 % |
| FLUX, Seedream, video 4K, unknown model, resolution or tariff, 2.5 1080p 15 s ($8.53 > $6) | — | — | **Blocked** | — |
| Weë Brain (12 replies = 1 Credit) | ≈ $0.0155 per block | owner's decision | 1 per 12 replies | about −106 % (subsidy) |

Full video table (per model, resolution and 5/10/15 s): the same as v4, still provisional.

## 6. Web integration: Checkout Bricks (preferred) · Checkout Pro (fallback)
| | **Checkout Bricks (preferred)** | **Checkout Pro (fallback)** |
|---|---|---|
| Experience | Payment Brick + Status Screen Brick **inside** the WEE Wallet, keeping the demo design | Redirect to Mercado Pago and return to WEE |
| Methods in Peru | Card, Mercado Pago account, Yape | Card, Mercado Pago account, Yape |
| Card data | Captured by Mercado Pago's own fields; WEE never sees it | Never touches WEE |
| When to switch | — | If Bricks proves unnecessarily complex (maintenance, states, mobile web compatibility) |

Official sources: [Checkout Bricks](https://www.mercadopago.com.pe/developers/es/docs/checkout-bricks/landing), [Checkout Pro](https://www.mercadopago.com.pe/developers/es/docs/checkout-pro/landing). Checkout API (Orders) is not planned: it only makes sense if neither option is enough.

## 7. Payment security requirements (future implementation; nothing implemented)
1. **Server-created pending orders.**
   - The client asks the server to "buy package X". The server creates `paymentOrders/{orderId}` with status `pending`, the package, PEN amount, Credits, account and `external_reference`.
   - The amount and Credits **come from the server catalog**, never from the client.
2. **Authenticated notifications plus server-side verification.**
   - Mercado Pago webhooks are checked against the notification signature.
   - The server **queries the payment from Mercado Pago's API** with its private credential. It checks status `approved`, amount, currency and `external_reference` against the order.
   - The client's success screen grants nothing.
3. **Credits only after confirmed payment.**
   - `grantCredits` runs only after that verification, moving the order `pending → paid`.
   - Rejected, pending or expired payments grant nothing.
4. **Idempotent allocation.**
   - One grant per Mercado Pago payment id: `purchaseId = mercadopago_<paymentId>`, reusing the existing `validatePurchase` / `grantCredits` idempotency.
   - A repeated notification or a race between notification and lookup cannot credit twice.
5. **Auditable refunds and chargebacks.**
   - Every refund or chargeback creates its own ledger entry linked to the order.
   - Credits are debited back up to the remaining balance; the shortfall is recorded, never a negative balance.
   - The order moves to `refunded` / `charged_back` with its history (statuses already noted as a gap in ECONOMIA §1).
6. **No client-side balance changes.**
   - The current rules already block writes to the balance and the ledger; they stay that way.
   - Mercado Pago credentials only on the server (Secret Manager), never in the client or the repository.
7. Tests in the emulator with Mercado Pago **test** users and credentials. No real payments.

## 8. Mobile stores (separate from web payments)
- **Mercado Pago is not assumed to be usable for buying Credits inside the iOS or Android apps.**
- Credits are digital content consumed inside the app. Apple (App Review Guidelines, section 3.1.1 "In-App Purchase") and Google Play (Payments policy) generally require their own billing system for digital content bought inside the app.
- There are country-specific exceptions and recent changes (external links in some markets, EU rules). They need a **legal review by country, with the current guideline text**, before any decision.

| Channel | How Credits are bought | Status |
|---|---|---|
| Web (wee.zone) | Mercado Pago Checkout Bricks | Approved as the initial provider |
| iOS app | Apple In-App Purchase, or an external link only where Apple allows it | **Not decided.** Needs legal review and its own fee and margin calculation (Apple's commission) |
| Android app | Google Play Billing, or an alternative only where Google allows it | **Not decided.** Same |

- Store commissions (15–30 %) **do not fit** the operation prices in this matrix without their own calculation (ECONOMIA §3).
- Until it is decided, the apps show the balance and use Credits but **do not sell** them.

## 9. Credit Engine and pricing decisions kept (to implement after approval)
- **Weë Brain:**
  - `CREDITS_POR_BLOQUE = 1` next to `RESPUESTAS_POR_CREDIT = 12`.
  - The 12th reply deducts exactly 1 whatever the history or attachments; today it can deduct 2–3 via `price.credits`, `brain.ts:399/716`.
  - The real cost still goes to the ledger, and search is still charged per message.
- **Welcome bonus:** remove the grant in `ensureAccount`. Existing `welcome_<uid>` transactions and balances stay intact, with their label.
- **Blocks:**
  - unknown video model, resolution or tariff (the fallback to Seedance 2.0 is removed);
  - 4K;
  - more than 15 s;
  - more than $6 provider cost;
  - FLUX and Seedream not routed until verified.
- **Unchanged:**
  - single balance per account;
  - reserve → downward settlement → refund;
  - `requestId` idempotency;
  - no negative balances;
  - a single pricing formula;
  - Weë Music not connected;
  - Boost without reach promises.

## 10. What is missing for final approval
1. **Verified Mercado Pago merchant-account fees** for Checkout Bricks: immediate and 14 days, the S/ 1, and any withdrawal, instalment or conversion charge.
2. **Whether Mercado Pago Peru accepts USD.** If not, PEN as approved.
3. **SBS rate** on the day prices are set; that fixes the PEN amounts (§3).
4. **Whether IGV on the commission is recoverable** (accountant).
5. Then: re-run the script, present the final matrix with its sources marked "verified", and wait for **final approval** before touching code.
