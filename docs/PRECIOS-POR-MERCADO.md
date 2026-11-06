# Weë Credits: local-currency pricing by market (architecture proposal)

> **Owner decision, 2026-11-04 (implemented in `wt-ui-migracion`, not deployed).** Credits are bought exactly as in the YC demo: any amount from **US$5 to US$100 in steps of US$5, at 100 Credits per US$1**. There are **no packages** (Basic/Plus/Black Pro are gone everywhere, including the `credits_*`/`usd{N}` package catalogue this document proposed) and **no welcome bonus** (new accounts start at 0). The server recomputes and validates every purchase and grants only after the provider confirms an order (`paymentOrders`, immutable snapshot, idempotent by `requestId`). PEN for Peru = whole sol of (USD × exchange rate), with the rate read from `markets/PE` (source, value, date) and failing closed when it is missing. Only the `test` provider confirms payments (emulator/non-production); Stripe is NOT_IMPLEMENTED and Mercado Pago does not exist yet. Details: [`CREDITS.md`](CREDITS.md) §7. Everything below that talks about packages, package catalogues or a welcome bonus is superseded by this note.

Date: 2026-11-03 · Branch `ui/migracion-demo` · **Documentation and proposal only.**
No payment, Credit Engine, pricing configuration or production change has been made. This is implemented only after the owner approves the final matrix ([`MATRIZ-PRECIOS-CREDITS.md`](MATRIZ-PRECIOS-CREDITS.md)).

## 1. The principle: one global Credit, many local storefronts
**Global, never changes per country:**
- The **Credit** is the accounting unit. Internal reference: **100 Credits = US$1.**
- Balance, ledger, idempotency, reserve → settle → refund, and the operation price **in Credits**: identical everywhere.
- Provider costs and contribution margins are calculated **in USD**.

**Local, per market:**
- Currency, tax, exchange rate, payment provider and methods, legal entity, and the **recharge** prices in local currency.
- A market only decides **how much a package of Credits costs in its currency**. It never decides how many Credits an operation costs, nor touches a balance.

```
           GLOBAL (USD and Credits)                 │           LOCAL (per market)
 provider cost USD → operation price in Credits      │  package (Credits) → local price (PEN…) → provider (Mercado Pago…)
 margin 40–60 % against N_ref                        │  local tax, exchange rate, provider fee → net per Credit
                    └──────── single meeting point: net per Credit ≥ global floor ────────┘
```

**Consequence:** adding a country means a new market, a new price list and a new provider adapter. It changes neither the Credit Engine nor operation prices nor the ledger model.

## 2. Global pieces (shared by every market)
| Piece | Content | Note |
|---|---|---|
| `CREDITS_PER_USD = 100` | Internal reference | Already exists (`creditsPerUsd: 100`) |
| **Credit packages** | `credits_500`, `credits_1000`, `credits_1500`, `credits_2000`, `credits_2500`, `credits_5000`, `credits_10000`, each with `usdReference` (5 … 100) | Single catalog. Markets give them a local price; they never create other packages |
| **Operation prices** | Credits per operation, from USD cost and the family margin | Global (matrix §5) |
| **N_ref** (net per Credit at which every family meets its target) | ≈ **$0.0073** today (scenario) | **Provisional safeguard, not a constant.** It is derived again on every run from current costs and prices (§10.5) |
| **N_hard** (net per Credit below which some operation falls under 40 %) | ≈ **$0.0066** today (scenario; the limit is set by transcription at 3 Credits) | Same: derived, provisional. The real test is the margin of **every operation** (§10.5) |
| Weë Brain, no welcome bonus, blocking of unknown tariffs | Global decisions | They do not depend on the market |

## 3. Local pieces (one per market)
### 3.1 Market: `markets/{marketId}` (e.g. `PE`)
| Field | Peru |
|---|---|
| `country` / `currency` | PE / **PEN** |
| `legalEntity` | **Pending** (Peruvian entity, needed to operate with Mercado Pago Peru) |
| `tax` | IGV **18 %**, `inclusive: true` (included in the price, never added) |
| `fx.source` / `fx.base` / `fx.baseDate` | **SBS** / pending / pending |
| `fx.reviewEvery` / `fx.trigger` | monthly / **±5 %** |
| `rounding` | whole sol |
| `providers` | `mercadopago_pe` (Checkout Bricks; Checkout Pro as fallback) |
| `status` | `scenario` → `approved` → `active` |

**The market is not the language.** The interface language is still chosen only by the person and is never derived from location (CLAUDE.md §8). The market is decided by **billing**: the payment provider's country and the payment method. The currency is formatted with `i18n/formato.ts` in the active language: `S/ 17.00` looks the same in Spanish and English, with the right separators.

### 3.2 Price list: `marketPrices/{marketId}_v{n}`, versioned and immutable once approved
One row per global package:

| Field | Example (Peru scenario v0) |
|---|---|
| `packageId` / `credits` / `usdReference` | `credits_500` / 500 / 5 |
| `localAmountMinor` | **1700** (cents: S/ 17.00), always an integer, never a float |
| `fxBase` | 3.30 (scenario, to replace with the SBS rate) |
| `netPerCredit` (with verified fees, at base rate and at +5 %) | 0.00753 / 0.00717 (scenario) |
| `status` / `approvedBy` / `validFrom` | `scenario` / — / — |

- Each payment order **stores the `priceListVersion`** it was sold with, so revenue stays auditable even after prices change.
- A new list never rewrites the previous one. It creates `v{n+1}` and the old one stays as history.

### 3.3 Fees: `providerFees/{provider}_{market}`
- Split by **settlement timing** (immediate / 14 days) and **payment method** (card, Yape, Mercado Pago account). Yape may have a different fee from cards.
- Each row has `source: "merchant_verified" | "third_party_provisional"` plus evidence (statement or screenshot) and date.
- **A market cannot be activated with `third_party_provisional` fees.**

### 3.4 Payment provider adapter (one per provider and country)
The same contract as today's `PurchaseProvider` (`functions/src/payments/purchaseValidation.ts`), extended:
- `createOrder`: the server creates the order with the amount **from the price list**, never from the client.
- `verifyNotification`: authenticates the provider's webhook.
- `fetchPayment`: looks up status, amount, currency and reference with the server credential.
- `refund`.

A new country means a new adapter plus one line in `PROVIDERS`, the same rule the AI Engine already follows for AI providers. Peru: `mercadopago_pe`.

## 4. How a market's price list is calculated
```
1. Exact local price  = usdReference × fx.base
2. Local price        = rounding rule of the market (Peru: whole sol)
3. USD gross          = local price ÷ fx.base
4. Net                = gross − tax included − provider fee (% + fixed, per method and timing) − tax on the fee (if not recoverable)
5. netPerCredit       = net ÷ credits
6. Gate (quick check):  netPerCredit ≥ N_ref at the base rate · ≥ N_hard at fx.base × 1.05
7. Decision:            actual margin of EVERY operation ≥ 40 % at both points, for each combination
                        entity × method × timing × package (§10)
```
- If a package fails the gate, **it is not sold**: its local price goes up one step and goes back for approval, or that market does not offer the package.
- **Operation prices never drop** to make a local market fit.
- Checked against the Peru scenario: S/ 17 gives N = $0.00753 at the base rate (≥ N_ref ✔) and $0.00717 at +5 % (≥ N_hard ✔).

## 5. Exchange rate: stable prices, monthly review, trigger at ±5 %
- `fx.base` = the official rate of the market's source (Peru: **SBS**) on the day the list is approved.
- **Monthly review** (a proposed scheduled job, not implemented):
  - read the official rate and compare it with `fx.base`;
  - if it moves more than **±5 %**, mark the market `recalculation_needed`, compute a **draft** list `v{n+1}` with the same script, and notify the owner.
- **Customer prices never change on their own.** A new list only applies once approved.
- Between reviews, revenue in USD moves with the exchange rate. The gate in §4 guarantees that inside the band no operation falls below 40 %.
- **The rate never touches the balance:** the Credits for a package are the same whatever the rate.

## 6. Payment flow for a market (security requirements, unchanged)
1. The client asks to buy `credits_1000` in market `PE`.
2. The server reads the **active** price list and creates `paymentOrders/{orderId}`. The order stores: `pending`, market, `priceListVersion`, package, `localAmountMinor`, `currency`, `credits`, `usdReference`, `fxBase`, provider and `external_reference`.
3. Checkout Bricks takes payment for **that** amount using the methods enabled on the merchant account: card, Yape where enabled, Mercado Pago account. The available methods come from the account itself, not from a list in Weë.
4. The provider's webhook is authenticated. The server **looks up the payment** and checks status `approved`, amount, currency and reference against the order.
5. Only then: `grantCredits({ amount: credits, purchaseId: "mercadopago_<paymentId>" })`, idempotent; the order moves `pending → paid`.
   - The ledger entry adds, without changing the model: `meta.money = { currency, amountMinor, fxBase, usdAtBase, market, priceListVersion, provider, method }`.
   - Today's `priceUsd` field is set to the USD reference at the base rate.
6. Refunds and chargebacks get their own ledger entry, take back the remaining Credits up to the balance (never negative), and move the order to `refunded` / `charged_back`.
7. The client never changes the balance. Provider credentials live only on the server (Secret Manager).

**Yape limit to keep in mind:** a single Yape payment is capped at **S/ 500, S/ 900 or S/ 2,000** depending on the person's limit in the Yape app ([official doc](https://www.mercadopago.com.pe/developers/es/docs/checkout-api-orders/payment-integration/websites/yape)). The largest scenario package (S/ 330) fits under the lowest limit. If a future list goes over S/ 500, Yape would not be offered for that package to everyone.

## 7. Channels outside the market: mobile stores
- iOS and Android stores are separate **channels**, with their own billing rules (In-App Purchase / Play Billing), their own price tiers and their own commission.
- They get their own price list and must pass the same gate in §4 with their net per Credit.
- **Mercado Pago is not assumed to be usable for selling Credits inside the apps.** Until legal review by country, the apps show and spend Credits but do not sell them.

## 8. Peru: launch instance
| Item | Status |
|---|---|
| Currency | **PEN**, prices with IGV included |
| Provider | **Mercado Pago Peru · Checkout Bricks** (Checkout Pro as fallback) |
| Methods | Those enabled on the merchant account: card, Mercado Pago account and **Yape** where active |
| Settlement | Immediate preferred; compare with 14 days using the real fee |
| Price list | **`PE_v0` = scenario:** S/ 17 · 33 · 50 · 66 · 83 · 165 · 330 for 500 · 1,000 · 1,500 · 2,000 · 2,500 · 5,000 · 10,000 Credits, at a provisional rate of 3.30. **Not final** |
| Fees | **Third-party provisional** (3.99 % / 3.79 % + S/ 1 + IGV). **Not final** |
| To activate | Legal entity; verified fees per method and timing; SBS rate and date; recoverable IGV (accountant); USD support (no longer blocking: PEN approved); `PE_v1` list approved by the owner |

## 9. Change to today's code (only after approval)
1. Global catalog of `credits_*` packages. `CREDIT_PACKAGES` (Basic/Plus/Black Pro, USD) stays only to recognize past purchases.
2. `markets`, `marketPrices`, `providerFees` and `paymentOrders` collections, written only by the server (Firestore rules).
3. Extend `PurchaseProvider` with `createOrder` / `verifyNotification` / `fetchPayment` / `refund`, and the `mercadopago_pe` adapter.
4. `validatePurchase` grants **from the order** (package and Credits from the server), not from a `productId` sent by the client.
5. `meta.money` in the ledger. The `CREDIT_PACKAGES` copy in `services/creditsService.ts` and its hardcoded `'$4.99'` go away; prices are formatted with `i18n/formato.ts`.
6. Tests, in the emulator only and with no real payments:
   - prices from the server, never from the client;
   - gate N_ref / N_hard;
   - versioned price lists;
   - ±5 % trigger with no automatic change;
   - one grant per payment;
   - forged notification rejected;
   - refund and chargeback without a negative balance;
   - same balance whatever the market;
   - currency format in the 16 languages.

**Unchanged:** Credit Engine, ledger, idempotency, operation prices, Weë Brain 12 = 1, no welcome bonus, blocked tariffs.

## 10. Final safeguards (approved by the owner on 2026-11-03; documentation only)
The architecture is approved as a design. **Peru prices and Mercado Pago fees are still provisional.** The script ([`calculos/matriz-precios.mjs`](calculos/matriz-precios.mjs)) applies all of these safeguards.

### 10.1 Profitability checked per combination, never on averages
- The validation unit is **billing entity × payment method × settlement timing × package**, together with the active market and price list.
- Each combination is computed and approved **on its own**. A cheap method never makes up for an expensive one.
- Peru today:
  - 1 entity (Peruvian, **pending** confirmation);
  - 3 methods: card, Yape, Mercado Pago account;
  - 2 timings: immediate, 14 days;
  - 7 packages.

  That makes **42 combinations**.

### 10.2 Every variable transaction cost, each counted once
| Cost | How it enters | Why it is not double-counted |
|---|---|---|
| IGV included in the price | Subtracted from gross: `gross − gross ÷ 1.18` | Only subtracted, never added to the customer |
| Processor commission (%) | % of the price, by method and timing | — |
| Fixed fee per transaction (S/ 1) | Per order, converted at the base rate | Charged per order, not spread as a % |
| IGV on the commission | 18 % of the commission, **only if not recoverable** as tax credit | If it is recoverable, it is 0 |
| Currency conversion | % on the amount, only if the charge and the settlement are in different currencies | PEN charged and PEN settled = 0 |
| Bank withdrawal | Withdrawal cost ÷ orders per typical withdrawal | Spread across orders, not repeated per order |
| Refunds | Rate × commission not returned (plus its IGV if not recoverable) | The refunded Credits are reversed, so the revenue is **not** counted as lost again |
| Chargebacks | Rate × (gross − IGV) of the part already spent + chargeback fee | The commission is already subtracted above and **is not subtracted again** |

Values today:
- **Verified:** IGV only.
- **Third-party provisional:** card fee.
- **Unknown, which blocks:** Yape and Mercado Pago account fees.
- **Pending:** withdrawal; recoverable IGV; IGV on the credit note after a chargeback.
- **Not published:** commission on refunds; chargeback fee.
- **Scenario assumptions,** to replace with real figures: refunds 1 %, chargebacks 0.5 %, 100 % already spent.

### 10.3 Immutable price snapshot per payment order
Written **once**, when the server creates the order, in `paymentOrders/{orderId}.snapshot`. The rules forbid changing it afterwards:

| Field | Example |
|---|---|
| `market`, `billingEntity` | `PE`, `PE_entidad_peruana` |
| `priceListVersion` | `PE_v1` |
| `packageId`, `credits` | `credits_1000`, 1000 |
| `amountMinor`, `currency` | 3300, `PEN` |
| `taxRate`, `taxIncluded`, `taxAmountMinor` | 0.18, true, 503 |
| `paymentMethod`, `settlement` | `yape` / `card` / `account_money`, `instant` |
| `fxReference` (source, value, date) | `SBS`, 3.30, date of the price list |
| `usdReference`, `usdAtFx` | 10, 10.00 |
| `providerFeeVersion` | `mercadopago_pe_v{n}` (the fee row the combination was approved with) |
| `eligibilityRun` | Id of the eligibility run that allowed this combination |

- Payment confirmation **adds** a separate `verified` block: payment id, status, amount and currency confirmed by Mercado Pago, the method actually used, and the fee charged if the provider reports it. It never overwrites the snapshot.
- **If the method actually used differs from the one in the snapshot,** the order is checked against that method's eligibility. If that combination is disabled, the order is flagged for review. The Credits are not lost: the payment was confirmed. The case is audited.

### 10.4 Eligibility is recalculated on any economic change
The recalculation is triggered by:
- a change in **provider cost** (AI);
- a change in **payment fee** (any method or timing);
- a change in **tax**;
- an **exchange rate** outside ±5 % of the base;
- a change of **billing entity**.

On each trigger:
1. A new eligibility run is recorded with its inputs.
2. **Combinations that fail are disabled immediately** (fail-closed).
3. Combinations that pass but differ from the approved list are marked for review.

Re-enabling something, or approving a new price list, always needs the owner's **explicit approval**. Nothing turns itself back on.

### 10.5 Thresholds as provisional safeguards; the real test is every operation
- N_ref and N_hard are **derived on every run** from the current costs and Credit prices. They are not global constants.
- They serve as a quick check, never as the decision.
- **The decision:** in each combination, the actual contribution margin of **every operation** is computed (cost in USD ÷ (its Credits × that combination's net per Credit)), both at the base rate and at the edge of the band (+5 %).
- **Approval criterion:** every operation is ≥ 40 % at both points.
- **Report:** operations below their family target (they stay within the band) and above 60 % because Credits are whole (text step at 2 Credits).
- Weë Brain is left out of this check on purpose: 12 replies = 1 Credit is a subsidy decided by the owner.

### 10.6 One package and one method pass, or that combination is not offered
- A package is shown with a method only if **that combination** has passed.
- If it fails, **that package × method combination is disabled**, while the package can still be sold with methods that do pass. It stays disabled until the owner approves a revised price list.
- If no method passes for a package, the package is not shown in that market.

### 10.7 Peru scenario result (script, 2026-11-03)
| Combination | Status | Lowest margin of any operation (base / +5 %) |
|---|---|---|
| Card · immediate · S/ 17 … S/ 330 | **Passes** (7/7) | 47.4 % / 44.8 % (S/ 17) to 50.3 % / 47.9 % (S/ 330) |
| Card · 14 days · S/ 17 … S/ 330 | **Passes** (7/7) | 47.6 % / 44.9 % to 50.5 % / 48.0 % |
| Yape · both timings · 7 packages | **Disabled** (fee unknown) | — |
| Mercado Pago account · both timings · 7 packages | **Disabled** (fee unknown) | — |

- At the +5 % edge, some families fall 1–2 points below their target: transcription, voice, 2K and 4K images, 3D, video. None goes under 40 %.
- **Yape and Mercado Pago account will not be offered until their fees are verified on the merchant account.** No assumption makes them equal to the card fee.

**This is a scenario:** the fees, the rate (3.30), the entity, the recoverable IGV and the refund and chargeback rates are provisional or pending. Nothing is activated without verified merchant-account fees and the owner's explicit implementation approval.
