# Weë Credits economy: audit and proposal (first deliverable)

> **Owner decision, 2026-11-04 (implemented in `wt-ui-migracion`, not deployed).** Credits are bought exactly as in the YC demo: any amount from **US$5 to US$100 in steps of US$5, at 100 Credits per US$1**. There are **no packages** (Basic/Plus/Black Pro are gone everywhere, including the `credits_*`/`usd{N}` package catalogue this document proposed) and **no welcome bonus** (new accounts start at 0). The server recomputes and validates every purchase and grants only after the provider confirms an order (`paymentOrders`, immutable snapshot, idempotent by `requestId`). PEN for Peru = whole sol of (USD × exchange rate), with the rate read from `markets/PE` (source, value, date) and failing closed when it is missing. Only the `test` provider confirms payments (emulator/non-production); Stripe is NOT_IMPLEMENTED and Mercado Pago does not exist yet. Details: [`CREDITS.md`](CREDITS.md) §7. Everything below that talks about packages, package catalogues or a welcome bonus is superseded by this note.

> **Superseded in part (2026-11-03).** The owner never approved §3, §4 and §8 below: the ×2.4 multiplier, Brain at 1 Credit per reply and the 240 welcome bonus are **rejected**. The current proposal is [`MATRIZ-PRECIOS-CREDITS.md`](MATRIZ-PRECIOS-CREDITS.md). §1, §2, §5, §6 and §7 still apply.

Date: 2026-11-02 · Branch `ui/migracion-demo` (base `6e11023d`) · **Read-only proposal: no price, package or payment has been changed.**
Sources: the code (file:line cited) and the providers' official pricing pages consulted on 2026-11-02.

## 0. The key finding
**The pricing engine ALREADY assumes 1 USD = 100 Credits:**
- `creditsPerUsd: 100`, `margin: 0.3` (`functions/src/engine/registry.ts:126-127`).
- Comment: "100 Credits = USD 1" (`functions/src/credits/creditCosts.ts:12`).

**What does not fit are the packages:**
- Basic 40 Credits/$4.99, Plus 90/$9.99 and Black Pro 200/$19.90 (`creditCosts.ts:171-173`, duplicated in `services/creditsService.ts:91-93`).
- That is about 8–10 Credits per dollar. Today, whoever buys pays **10–12×** more per Credit than the engine calculates.

What the change involves:
- Moving to $5→500 … $100→10,000 mostly fixes the packages.
- It also requires raising the margin, because **today's 30% markup does not cover payment fees or taxes**.

## 1. Current Credit Engine architecture
| Piece | Where | Status |
|---|---|---|
| **Balance** | `creditsBalance` on the account's Profile Real (`creditEngine.ts:215-245`), found via `request.auth.uid` | **Shared** between Profile Real and Profile Weë ✔ |
| **Ledger** | `creditTransactions/{type_requestId}` with `balanceBefore/After` and `statusHistory`; `creditStats` | ✔ Auditable |
| **Provider cost** | `aiGenerations.providerCost` (USD), kept separate from `creditsCharged` (`ledger.ts:199-229`) | ✔ |
| **Reserve → settle → refund** | `spendCredits` debits on reserve; `completeCredits` can only lower the amount and refunds the difference; `refundCredits` is idempotent (`creditEngine.ts:408-592`) | ✔ |
| **Idempotency** | Deterministic `requestId`; conflicting reuse is rejected (`:399-440`) | ✔ |
| **No negatives / concurrency** | Checks `balance < amount` inside a `runTransaction` | ✔ |
| **Rounding** | `Math.ceil`, minimum 1 (`aiPricing.ts:44`) | ✔ |
| **Client** | Rules block writes to balance and ledger; spend/grant/refund callables are admin-only | ✔ |
| **Purchases** | `validatePurchase` → `verify()` → fixed package → `grantCredits` with purchaseId `${provider}_${id}` (credited once) | ✔, but only fixed packages |

**Gaps found:**
1. **There is no real payment gateway.** Apple, Google and Stripe throw `NOT_IMPLEMENTED` (`payments/providers/apple.ts:14`, `google.ts:14`, `stripe.ts:14`) and there are no payment webhooks. Only `test` exists, and only in the emulator or non-production. **The real purchase cannot be "connected": it does not exist.**
2. **No reversal for chargebacks or store refunds.**
3. **Weë Brain charges after replying** (it only checks the balance first; `brain.ts:416-425`).
4. **Real consumption is only settled downward.** If it costs more than reserved, Weë absorbs the difference (`creditEngine.ts:506`).
5. **A multi-step job that fails late is refunded in full**, even though earlier steps had real cost (`credits.ts:262-265`).
6. **Simulated mode** (the default) charges `max(catalog, cost×100)` **with no margin** when cost exceeds the catalog price.
7. **The client balance** reads with `limit(1)` (`creditsService.ts:175`). An account with a duplicated Profile Real could see the wrong balance.
8. **Pricing hardcoded in the UI:** `priceLabel: '$4.99'` and `'$'+toFixed(2)` (`creditsService.ts:90-93, 237`) bypass `i18n/formato.ts`.

## 2. Verified provider costs (2026-11-02)
| Provider | Status | Rate |
|---|---|---|
| Gemini ([official](https://aistudio.google.com/docs/pricing)) | **VERIFIED** | 3.8-flash $0.75/$3.75 per M tokens **until 2026-12-31, then $1.50/$7.50** (the code does not include this increase) · 3.5-flash-lite $0.30/$2.50 · 3.1-flash-lite $0.25/$1.50 · Nano Banana 2 $0.045 / 0.067 / 0.101 / 0.151 (512 / 1K / 2K / 4K) · flash-lite-image $0.0336 · Nano Banana Pro $0.134 (1K/2K), $0.24 (4K) · Search grounding 5,000 free per month, then $14 per 1,000 |
| DeepSeek ([official](https://api-docs.deepseek.com/quick_start/pricing)) | **VERIFIED** | deepseek-flash $0.30/$1.20 at peak, $0.15/$0.60 off-peak |
| ElevenLabs ([official](https://elevenlabs.io/pricing/api)) | **VERIFIED** | v3/v2 **$0.08** per 1K characters (the code uses $0.10, the safe side) · Flash $0.04 |
| fal Hunyuan World ([official](https://fal.ai/models/fal-ai/hunyuan_world/image-to-world)) | **VERIFIED** | $0.30 per request |
| **Seedance (BytePlus)** | **UNVERIFIED** | The official page needs JavaScript and could not be read. The code uses 2.5: 10.7/6.4; 2.0: 7.0/4.3; fast 5.6; mini 3.5 USD per M tokens. **The 2.0 4K rate (4.0) looks wrong.** |
| FLUX (BFL), Seedream, MiniMax, Claude/OpenAI fallbacks | **UNVERIFIED** | The code itself marks MiniMax as unconfirmed |

**How to close the unverified ones:**
- Read the BytePlus price list logged into the ModelArk console (owner's account), or ask BytePlus sales for the table.
- Compare against the real `providerCost` in `aiGenerations` once the first jobs run.
- Until then, video prices stay **provisional**, with a hard ceiling.

## 3. Recommended gross-margin target
Net revenue per Credit sold, after fees:

| Channel | Fee (**to be confirmed by the owner with each provider**) | Net per $1 |
|---|---|---|
| Web with Stripe | ~2.9% + $0.30 per charge (on $5 ≈ 8.9%; on $100 ≈ 3.2%) | $0.91–0.97 |
| App Store / Google Play, Small Business Program | 15% | $0.85 |
| App Store / Google Play, standard | 30% | $0.70 |

**Taxes:**
- The stores collect and remit VAT/sales tax themselves, with tax-inclusive prices, so the net shrinks further by country (0–27%).
- On the web, Weë would be responsible for collecting tax (for example through Stripe Tax). **Taxes were not included in the margin: they must be added on top or absorbed.**

**Proposal: Credits = ceil(provider USD cost × 100 × 2.4).**
- In the worst case (30% store fee), that leaves **≈40% gross margin** after provider cost and fee.
- With the 15% store fee, ≈51%. On the web with Stripe, ≈54–58%.
- It covers occasional retries, since failed attempts are refunded to the user but cost Weë.
- **Rounding:** up to a whole Credit; above 100 Credits, up to the next multiple of 5.
- **Minimum:** 1 Credit.
- The multiplier lives in a single place (`aiSettings/global.margin` or a new `pricingMultiplier`), auditable and changeable without a deploy.

## 4. Current and proposed prices (1 Credit = $0.01)
| Operation | Provider / model | Cost (USD) | Current | **Proposed** | Notes |
|---|---|---|---|---|---|
| Weë Brain (reply) | deepseek-flash | ≤ $0.0035 per reply (code ceiling) | 1 per 12 replies (**below cost**) | **1 per reply**, or keep it subsidized as an acquisition cost | **Owner decision** |
| Brain / Travel search | flash-lite + grounding | $0.014 per query (after 5,000 free) | 3 | **4** | |
| Text (Chef, Writer, Travel, Design, Studio steps) | 3.1-flash-lite | ~$0.004 (4K in / 2K out) | 2 | **2** | |
| Text pro | 3.8-flash | ~$0.021 with 2027 prices | 7 | **8** | Claude/OpenAI fallbacks cost ~$0.028: they would sell below cost |
| Transcription | 3.5-flash-lite | ~$0.01 (600 s) | 2 | **3** | |
| Quick image (lite) | flash-lite-image / Klein / Seedream | ≤ $0.0336 | 3 | **9** | |
| Image | Nano Banana 2 1K | $0.067 (2K $0.101, 4K $0.151) | 10 | **17** (2K 25, 4K 37) | By resolution |
| Image pro / identity / logo | Nano Banana Pro | $0.134 (4K $0.24) | 18 | **33** (4K 58) | |
| **Photo with your Weë avatar** | Nano Banana Pro | $0.134 | 10 (**below cost**) | **33** | Today it is charged as `ai_image_enhance`. Must be charged as pro. |
| Weë avatar (creation) | 2× Nano Banana Pro | $0.268 | 50 | **65** | |
| Fashion try-on | FLUX VTO → fallback Pro | ~$0.06/MP, up to $0.134 | 15 | **33** | |
| Voice | ElevenLabs v3/v2 | $0.08 per 1K characters | 20 flat | **20 per 1,000 characters** (min 4) | Billing by length |
| Video (Seedance), **PROVISIONAL** | 2.0-mini / fast / 2.0 / 2.5 | 720p 10 s ≈ $0.76 / $1.21 / $1.51 / $2.31 · 2.5 at 1080p 10 s ≈ $5.69 (code rates, unverified) | 75 / 160 / 200 / 300 / 740 | **≈185 / 295 / 365 / 560** (720p 10 s) · 2.5 at 1080p **≈1,370** | Per second and resolution, once BytePlus is verified |
| Video editing (ffmpeg, no AI) | own compute | not measured | 20 | **20** (keep) | Measure the Cloud Functions cost |
| 3D world | fal Hunyuan World | $0.30 | 39 | **72** | Not live |
| Music, book | no provider | — | 30 / 100 | **No price** until there is a provider | Never charge for something that does not exist |
| Welcome bonus | — | — | 240 | **240** ($2.40) | **Owner decision** |

Errors and refunds are unchanged:
- Reserve before the job; settle the real cost when it finishes; refund the full reservation if it fails.
- Proposed improvement: settle the steps already completed in multi-step jobs.

## 5. Recharges (pay-as-you-go)
- New catalog: `usd5`→500, `usd10`→1,000, `usd15`→1,500, `usd20`→2,000, `usd25`→2,500, `usd50`→5,000, `usd100`→10,000.
  - Each one has its own productId (`zone.wee.credits.usd5`…).
  - It lives in a **single source** shared by server and client; the client stops carrying its own copy.
- The old packages stay **only** so `validatePurchase` can recognize past purchases, hidden from the store.
- The purchase screen keeps the demo design (amount slider + "Buy N Credits · $X"). Prices are formatted with `i18n/formato.ts`.
- **Real purchase: not possible yet.** No gateway exists (§1.1). I won't invent one:
  - In development, the button goes through the `test` provider in the emulator.
  - In production it will show "coming soon", as it does today, until Stripe/Apple/Google are integrated. That is a separate project needing the owner's accounts and keys.
- Before selling real money, the owner has to decide two things: whether **web prices include tax**, and whether **mobile shows the same Credits per dollar** (the stores take 15–30%).

## 6. Boost (proposal)
- **Model.** The person chooses an objective, a duration and a budget in Credits. **No impressions or reach are promised**, because there is no delivery system that would justify a figure.

| Field | Values |
|---|---|
| Objective | Post: "More people see it". Page: "More followers". |
| Duration | 1, 3 or 7 days |
| Budget | Minimum 500 Credits ($5), in steps of 500, up to 10,000 |
| Cost | Exactly the chosen budget. No provider cost (pure Weë revenue). The payment fee was already paid at recharge. |

- **Accounting:** the full budget is reserved on creation (`spendCredits`), settled each day in proportion to elapsed time, and **the unused part is refunded** if paused, stopped or rejected by moderation.
- **States:** draft → in review → active → paused → finished / refunded.
- **What is missing in the backend (documented, not invented):**
  - Collection `boostCampaigns`.
  - Callable `createBoost` / `pauseBoost`.
  - A scheduled job for daily settlement.
  - **Real delivery:** the feed algorithm does not know about campaigns. Until it does, Boost **does not boost anything**, and the interface will say so ("coming soon").
- In tests: emulator only, simulated responses, no real campaign.

## 7. Migration risks and test strategy
**Risks:**
- Repricing touches tests that pin the catalog: `credits.test`, `pricing-mode.test`, `estimate-plan.test`, `idempotencia-de-cobro.test`, `credits-weeai.test` and others.
- Seedance has not been verified.
- Gemini 3.8-flash price increase in 2027.
- Fallbacks priced above the ceiling.
- No real gateway.
- Existing balances bought under the old packages: **whoever bought 40 Credits for $4.99 keeps 40 Credits**, now worth $0.40 at the new rate.

**New tests** (no real money and no real provider, everything simulated or in the emulator):
- Recharge → Credits conversion for all seven amounts; the old packages are not sold.
- Formula and rounding; nothing sells below cost; minimum 1.
- Margin with simulated fees (15/30%).
- Boost: budget, reserve, proportional settlement, refund of the unused part.
- Reserve / settle / refund; duplicate request; two simultaneous operations on one balance.
- A purchase confirmed twice credits once; a failed purchase credits nothing.
- The same balance seen from Profile Real and Profile Weë.
- Every new text in the 16 languages.
- Visual comparison against the demo at 320/360/390/1024/1440 px.

## 8. Decisions the owner must make before implementing prices
1. **Multiplier ×2.4** (≈40% gross margin in the worst case), or another target.
2. **Weë Brain:** 1 Credit per reply, or keep it subsidized.
3. **Welcome bonus:** keep at 240 or change.
4. **Video:** accept provisional prices with a ceiling until BytePlus is verified.
5. **Taxes on the web** (prices with or without tax) and **mobile pricing** (same Credits per dollar despite the store's cut).
