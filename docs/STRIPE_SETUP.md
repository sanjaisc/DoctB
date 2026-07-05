# Stripe Integration Guide — ClinicBook

## Current State

ClinicBook's data model and enum types are **fully prepared** for Stripe payment processing, but **no Stripe SDK calls or webhook handlers have been implemented yet**. This document describes what exists today and provides step-by-step instructions for completing the integration.

## What's Already Built

### Data Model (Prisma Schema)

The following schema fields are ready to store Stripe data:

**Appointment model** (`prisma/schema.prisma`):
| Field | Type | Purpose |
|-------|------|---------|
| `paymentStatus` | String | `PENDING` → `AUTHORIZED` → `CAPTURED` → `REFUNDED`/`FORFEITED` |
| `paymentMethod` | String? | `STRIPE` / `CASH_AT_DESK` / `MANUAL_WAIVER` |
| `depositCents` | Int | Deposit amount in cents (for `STANDARD_DEPOSIT` self-pay type) |
| `selfPayCents` | Int | Total self-pay amount in cents |

**AppointmentLedger model**:
| Field | Type | Purpose |
|-------|------|---------|
| `type` | String | `DEPOSIT_AUTH` / `DEPOSIT_CAPTURE` / `REFUND` / `FULL_PAYMENT` / `BALANCE_PAYMENT` |
| `stripePaymentIntentId` | String? | Stripe PaymentIntent ID (e.g., `pi_3N...`) |
| `stripeChargeId` | String? | Stripe Charge ID (e.g., `ch_3N...`) |
| `stripeRefundId` | String? | Stripe Refund ID (e.g., `re_3N...`) |
| `refundStatus` | String? | `REFUND_PENDING` / `REFUNDED` / `REFUND_FAILED` / `FORFEITED` |
| `processedBy` | String? | `STRIPE_WEBHOOK` for automated events |

**SystemConfig model**:
| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `minDepositCents` | Int | 0 | Minimum deposit ($0.00) |
| `maxDepositCents` | Int | 50000 | Maximum deposit ($500.00) |
| `platformFeeCents` | Int | 0 | Platform fee per booking |
| `zeroDepositRequireCard` | Boolean | false | Require card on file even for $0 deposit |

### Application Enum Types (`src/lib/enums.ts`)

```
PAYMENT_METHOD.STRIPE          — Online card payment
PAYMENT_METHOD.CASH_AT_DESK    — Pay at clinic (staff manual booking)
PAYMENT_METHOD.MANUAL_WAIVER   — No payment (admin override)

LEDGER_TYPE.DEPOSIT_AUTH       — Stripe PaymentIntent created/authorized
LEDGER_TYPE.DEPOSIT_CAPTURE    — Deposit captured after appointment
LEDGER_TYPE.REFUND             — Full or partial refund
LEDGER_TYPE.FULL_PAYMENT       — Full self-pay amount charged
LEDGER_TYPE.BALANCE_PAYMENT    — Remaining balance after deposit

PAYMENT_STATUS.PENDING         — Awaiting payment
PAYMENT_STATUS.AUTHORIZED      — Deposit held on card
PAYMENT_STATUS.CAPTURED        — Payment completed
PAYMENT_STATUS.REFUNDED        — Money returned
PAYMENT_STATUS.FORFEITED       — No-show deposit kept

REFUND_STATUS.REFUND_PENDING   — Refund initiated
REFUND_STATUS.REFUNDED         — Refund completed
REFUND_STATUS.REFUND_FAILED     — Refund failed
REFUND_STATUS.FORFEITED        — Deposit forfeited (no-show)
```

### Audit Actions (`src/lib/constants.ts`)

```
DEPOSIT_AUTHORIZED, DEPOSIT_CAPTURED, REFUND_INITIATED,
REFUND_COMPLETED, REFUND_FAILED
```

### Currency

Hardcoded to USD in `src/lib/constants.ts`:
```ts
export const STRIPE_CURRENCY = "usd";
```

---

## Prerequisites: Stripe CLI Setup

### 1. Install the Stripe CLI

**macOS (Homebrew):**
```bash
brew install stripe/stripe-cli/stripe
```

**macOS (manual):**
```bash
curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg-public.asc | gpg --dearmor > stripe.gpg
sudo mv stripe.gpg /usr/local/share/keyrings/stripe-archive-keyring.gpg
echo "deb [signed-by=/usr/local/share/keyrings/stripe-archive-keyring.gpg] https://packages.stripe.dev/stripe-cli/ stable main" | sudo tee /etc/apt/sources.list.d/stripe.list
sudo apt update && sudo apt install stripe
```

**Windows:**
```powershell
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

**Verify installation:**
```bash
stripe version
```

### 2. Authenticate with Stripe

```bash
stripe login
```

This opens a browser window to authorize the CLI. Use your Stripe Dashboard credentials. After authentication, the CLI displays:
```
> Your Stripe API key is: sk_test_51N... (test mode)
```

### 3. Get Your Webhook Signing Secret

**For local development with Stripe CLI:**
```bash
# Forward webhook events to your local server
stripe listen --forward-to localhost:3000/api/stripe/webhook

# This outputs your local webhook signing secret:
# > Ready! Your webhook signing secret is whsec_... (use this for STRIPE_WEBHOOK_SECRET)
```

**For production (Stripe Dashboard):**
1. Go to **Developers → Webhooks** in the Stripe Dashboard
2. Click **"Add endpoint"**
3. Set the endpoint URL to: `https://your-domain.com/api/stripe/webhook`
4. Select events to listen to (see list below)
5. After creating, click **"Reveal"** on the signing secret
6. Copy the `whsec_...` value

### 4. Add Environment Variables

Add these to your `.env` file:

```bash
# Stripe API Keys (get from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Webhook Signing Secret (from `stripe listen` or Stripe Dashboard)
STRIPE_WEBHOOK_SECRET="whsec_..."
```

---

## Implementation Roadmap

### Step 1: Install the Stripe SDK

```bash
bun add stripe
bun add -d @types/stripe
```

### Step 2: Create Stripe Client Singleton

Create `src/lib/stripe.ts`:

```ts
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
});
```

### Step 3: Create a PaymentIntent on Booking

In `src/app/api/appointments/route.ts` (the public booking endpoint), after the appointment is confirmed:

```ts
import { stripe } from "@/lib/stripe";
import { STRIPE_CURRENCY } from "@/lib/constants";
import { LEDGER_TYPE, PAYMENT_STATUS } from "@/lib/enums";

// After appointment is created and slot is BOOKED:
if (paymentMethod === "STRIPE" && selfPayCents > 0) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: depositCents || selfPayCents,
    currency: STRIPE_CURRENCY,
    metadata: {
      appointmentId: appointment.id,
      clinicId: appointment.clinicId,
    },
    // Capture manually later (for deposits) or automatic (for full payment)
    capture_method: selfPayPaymentType === "STANDARD_DEPOSIT" ? "manual" : "automatic",
  });

  await db.appointmentLedger.create({
    data: {
      appointmentId: appointment.id,
      type: LEDGER_TYPE.DEPOSIT_AUTH,
      amountCents: depositCents || selfPayCents,
      stripePaymentIntentId: paymentIntent.id,
      description: `Deposit authorized for appointment ${appointment.id}`,
    },
  });

  await db.appointment.update({
    where: { id: appointment.id },
    data: { paymentStatus: PAYMENT_STATUS.AUTHORIZED },
  });
}
```

### Step 4: Implement the Webhook Handler

Create `src/app/api/stripe/webhook/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { PAYMENT_STATUS, LEDGER_TYPE, REFUND_STATUS } from "@/lib/enums";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { logAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[STRIPE WEBHOOK] Verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded":
      await handlePaymentSuccess(event.data.object);
      break;
    case "payment_intent.payment_failed":
      await handlePaymentFailure(event.data.object);
      break;
    case "charge.refunded":
      await handleRefund(event.data.object);
      break;
  }

  return NextResponse.json({ received: true });
}
```

### Step 5: Register Required Webhook Events

Subscribe to these events:

| Event | Purpose |
|-------|---------|
| `payment_intent.succeeded` | Deposit/payment captured successfully |
| `payment_intent.payment_failed` | Card declined or payment error |
| `charge.refunded` | Refund completed by Stripe |
| `charge.dispute.created` | Customer initiated a dispute/chargeback |

**With Stripe CLI (local dev):**
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook \
  --events payment_intent.succeeded \
  --events payment_intent.payment_failed \
  --events charge.refunded \
  --events charge.dispute.created
```

### Step 6: Handle Deposit Capture (Post-Appointment)

For `STANDARD_DEPOSIT` appointments, the deposit is authorized but not captured. After the appointment is marked `COMPLETED`:

```ts
if (appointment.paymentMethod === "STRIPE" && appointment.paymentStatus === "AUTHORIZED") {
  const captureResult = await stripe.paymentIntents.capture(
    ledger.stripePaymentIntentId
  );

  await db.appointmentLedger.create({
    data: {
      appointmentId: appointment.id,
      type: LEDGER_TYPE.DEPOSIT_CAPTURE,
      amountCents: captureResult.amount_captured,
      stripeChargeId: captureResult.latest_charge as string,
      description: "Deposit captured after appointment completion",
      processedBy: "SYSTEM",
    },
  });
}
```

### Step 7: Handle Refunds (Cancellations / No-Shows)

```ts
const refund = await stripe.refunds.create({
  payment_intent: ledger.stripePaymentIntentId,
  reason: "requested_by_customer",
});

await db.appointmentLedger.create({
  data: {
    appointmentId: appointment.id,
    type: LEDGER_TYPE.REFUND,
    amountCents: -refund.amount,
    stripeRefundId: refund.id,
    refundStatus: REFUND_STATUS.REFUNDED,
    description: "Refund for patient cancellation",
    processedBy: "SYSTEM",
  },
});
```

---

## Payment Flow Diagrams

### Deposit Flow (Standard Deposit)

```
Patient Books → PaymentIntent Created (manual capture) → AUTHORIZED
                                                              │
                                                    Appointment Completed
                                                              │
                                                    PaymentIntent Captured
                                                              │
                                                         CAPTURED
```

### Full Upfront Payment Flow

```
Patient Books → PaymentIntent Created (automatic capture) → CAPTURED
                                                              │
                                                    (No further action needed)
```

### Cancellation & Refund Flow

```
Appointment Cancelled → Refund Created via Stripe API → REFUND_PENDING
                                                              │
                                                   Stripe processes refund
                                                              │
                                                        REFUNDED
```

### No-Show Flow

```
Appointment Marked NO_SHOW → Deposit FORFEITED (no refund)
```

---

## Security Checklist

- [ ] **Webhook signature verification** — Always use `stripe.webhooks.constructEvent()` with `STRIPE_WEBHOOK_SECRET`
- [ ] **Idempotency** — Stripe webhooks can arrive multiple times. Check `appointment.paymentStatus` before processing.
- [ ] **Never trust the client** — Amounts come from the server (based on `selfPayCents`/`depositCents`), never from the frontend.
- [ ] **Use test mode first** — `sk_test_*` keys for development, `sk_live_*` for production.
- [ ] **Log all financial events** — Use the audit system (`logAudit()`) for every Stripe interaction.
- [ ] **Store minimal Stripe data** — Only `PaymentIntentId`, `ChargeId`, and `RefundId` in the database. Never store card numbers.

## Testing with Stripe CLI

```bash
# Trigger a successful payment event
stripe trigger payment_intent.succeeded

# Trigger a failed payment event
stripe trigger payment_intent.payment_failed

# Trigger a refund event
stripe trigger charge.refunded

# Trigger a dispute
stripe trigger charge.dispute.created

# List all received webhook events
stripe events list

# Resend a specific event
stripe events resend evt_1N...
```

## Switching to Production

1. Get live API keys from Stripe Dashboard
2. Update `.env`: `STRIPE_SECRET_KEY="sk_live_..."`, `STRIPE_PUBLISHABLE_KEY="pk_live_..."`
3. Create a production webhook endpoint in Stripe Dashboard (not CLI)
4. Update `STRIPE_WEBHOOK_SECRET` with the production signing secret
5. Configure Stripe Connect (if multi-tenant clinic payouts are needed)
6. Set up Stripe Billing for subscription models (if applicable)