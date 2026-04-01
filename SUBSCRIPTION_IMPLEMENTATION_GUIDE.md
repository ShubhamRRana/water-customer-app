# Subscription & Payment Implementation Guide

This document outlines the changes required to convert the WaterTanker **customer** app from a free app to a subscription-based paid app with **PhonePe** Payment Gateway (Standard Checkout) integration.

**Scope:** This repository is the **customer-facing** app only. It serves **individual customers** and **society** accounts (same `CustomerNavigator` and role `customer`, with `CustomerAccountKind` of `individual` or `society`). **Admin** dashboards, plan management UIs, subscriber analytics screens, and revenue reports are **out of scope** here—they belong to a separate admin product, backend jobs, or database tooling—not this codebase.

---

## Table of Contents

1. [Overview](#overview)
2. [Database Changes](#database-changes)
3. [New Screens](#new-screens)
4. [Service/API Changes](#serviceapi-changes)
5. [Navigation Changes](#navigation-changes)
6. [PhonePe Integration](#phonepe-integration)
7. [Backend Requirements](#backend-requirements)
8. [Security Considerations](#security-considerations)
9. [Implementation Checklist](#implementation-checklist)

---

## Overview

### Subscription Plans

| Plan | Duration | Suggested Pricing |
|------|----------|-------------------|
| Monthly | 1 month | ₹XXX/month |
| Half-Yearly | 6 months | ₹XXX (saves X%) |
| Yearly | 12 months | ₹XXX (saves X%) |

### Business Logic

- New users get a trial period (optional, e.g., 7 days)
- Users must have an active subscription to create bookings (applies to both individual and society customer logins)
- Auto-renewal option for convenience
- Grace period for expired subscriptions (optional)
- Subscriber analytics, plan CRUD, and cross-user reporting are handled outside this app (e.g., admin console or Supabase with appropriate roles)

---

## Database Changes

### New Migration: `024_create_subscription_tables.sql`

```sql
-- =============================================
-- SUBSCRIPTION PLANS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    duration_months INTEGER NOT NULL CHECK (duration_months IN (1, 6, 12)),
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    features JSONB DEFAULT '[]'::jsonb,
    max_bookings_per_month INTEGER, -- NULL means unlimited
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- USER SUBSCRIPTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'active', 'expired', 'cancelled', 'paused')),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    auto_renew BOOLEAN DEFAULT false,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    trial_end_date TIMESTAMP WITH TIME ZONE,
    is_trial BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure user has only one active subscription
    CONSTRAINT unique_active_subscription 
        EXCLUDE USING gist (user_id WITH =) 
        WHERE (status = 'active')
);

-- =============================================
-- PAYMENT TRANSACTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    
    -- Amount details
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    
    -- Gateway-agnostic fields (PhonePe: merchant order id + PG transaction ids)
    payment_gateway VARCHAR(50) DEFAULT 'phonepe',
    gateway_order_id VARCHAR(100), -- Merchant order id (matches PhonePe merchantOrderId)
    gateway_transaction_id VARCHAR(100), -- PG transaction id
    gateway_response_code VARCHAR(20),
    gateway_response_message TEXT,
    
    -- Transaction status
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'success', 'failed', 'refunded', 'cancelled')),
    
    -- Payment method details
    payment_method VARCHAR(50), -- UPI, CARD, NET_BANKING, WALLET
    bank_name VARCHAR(100),
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_end_date ON subscriptions(end_date);
CREATE INDEX idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX idx_payment_transactions_gateway_order_id ON payment_transactions(gateway_order_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Subscription Plans: Everyone can read active plans
CREATE POLICY "Anyone can read active subscription plans"
    ON subscription_plans FOR SELECT
    USING (is_active = true);

-- Subscription Plans: Inserts/updates/deletes for plans are NOT done from this customer app.
-- Use service role, migrations, or a separate admin backend. Example policy if you use an admin role in the DB:
-- CREATE POLICY "Admins can manage subscription plans"
--     ON subscription_plans FOR ALL
--     USING (has_role(auth.uid(), 'admin'));

-- Subscriptions: Users can read their own subscriptions
CREATE POLICY "Users can read own subscriptions"
    ON subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- Subscriptions: Users can create their own subscriptions
CREATE POLICY "Users can create own subscriptions"
    ON subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Subscriptions: Users can update their own subscriptions (for cancellation)
CREATE POLICY "Users can update own subscriptions"
    ON subscriptions FOR UPDATE
    USING (auth.uid() = user_id);

-- (Optional) Subscriptions: cross-user access only for non-customer tooling — not used by this app:
-- CREATE POLICY "Admins can view all subscriptions"
--     ON subscriptions FOR SELECT
--     USING (has_role(auth.uid(), 'admin'));

-- Payment Transactions: Users can read their own transactions
CREATE POLICY "Users can read own transactions"
    ON payment_transactions FOR SELECT
    USING (auth.uid() = user_id);

-- Payment Transactions: System can create transactions (service role)
CREATE POLICY "Service can manage transactions"
    ON payment_transactions FOR ALL
    USING (auth.role() = 'service_role');

-- (Optional) Cross-user transaction visibility for admin tooling only — not this app:
-- CREATE POLICY "Admins can view all transactions"
--     ON payment_transactions FOR SELECT
--     USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- SEED DEFAULT SUBSCRIPTION PLANS
-- =============================================
INSERT INTO subscription_plans (name, description, duration_months, price, features, display_order) VALUES
    ('Monthly', 'Perfect for trying out our service', 1, 299.00, 
     '["Unlimited bookings", "Priority support", "Order tracking"]'::jsonb, 1),
    ('Half-Yearly', 'Best value for regular users', 6, 1499.00, 
     '["Unlimited bookings", "Priority support", "Order tracking", "10% discount on bookings"]'::jsonb, 2),
    ('Yearly', 'Maximum savings for power users', 12, 2499.00, 
     '["Unlimited bookings", "Priority support", "Order tracking", "15% discount on bookings", "Free cancellations"]'::jsonb, 3);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to check if user has active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM subscriptions 
        WHERE user_id = p_user_id 
        AND status = 'active' 
        AND end_date > NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's current subscription
CREATE OR REPLACE FUNCTION get_current_subscription(p_user_id UUID)
RETURNS TABLE (
    subscription_id UUID,
    plan_name VARCHAR,
    status VARCHAR,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    days_remaining INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        sp.name,
        s.status,
        s.start_date,
        s.end_date,
        EXTRACT(DAY FROM (s.end_date - NOW()))::INTEGER
    FROM subscriptions s
    JOIN subscription_plans sp ON s.plan_id = sp.id
    WHERE s.user_id = p_user_id
    AND s.status = 'active'
    ORDER BY s.end_date DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Modify Existing Tables

Add subscription check to bookings:

```sql
-- Migration: 025_add_subscription_check_to_bookings.sql

-- Add column to track if booking was made under subscription
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id);

-- Create a trigger to validate subscription before booking
CREATE OR REPLACE FUNCTION validate_booking_subscription()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip validation when booking is created via backend/agency path (not self-serve customer insert)
    IF NEW.agency_id IS NOT NULL THEN
        RETURN NEW;
    END IF;
    
    -- Check if customer has active subscription
    IF NOT has_active_subscription(NEW.customer_id) THEN
        RAISE EXCEPTION 'Active subscription required to create bookings';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger (enable when ready to enforce subscriptions)
-- CREATE TRIGGER check_subscription_before_booking
--     BEFORE INSERT ON bookings
--     FOR EACH ROW
--     EXECUTE FUNCTION validate_booking_subscription();
```

---

## New Screens

All subscription and payment screens live in the **customer** area of the app. **Society** users use the same stack (`CustomerNavigator`); gate copy or entry points with `customerAccountKind === 'society'` vs `individual` only where the product requires different messaging—not separate admin routes.

#### 1. `SubscriptionPlansScreen.tsx`
**Location:** `src/screens/customer/SubscriptionPlansScreen.tsx`

**Purpose:** Display available subscription plans for users to choose from

**Features:**
- List of all active plans (Monthly, Half-Yearly, Yearly)
- Highlight savings for longer plans
- Feature comparison
- "Subscribe Now" button for each plan
- Current plan indicator (if subscribed)

**UI Components:**
- Plan cards with pricing
- Feature list with checkmarks
- Savings badges (e.g., "Save 20%")
- CTA buttons

---

#### 2. `SubscriptionStatusScreen.tsx`
**Location:** `src/screens/customer/SubscriptionStatusScreen.tsx`

**Purpose:** Show current subscription details and management options

**Features:**
- Current plan name and status
- Days remaining indicator
- Auto-renewal toggle
- Renewal/upgrade options
- Cancel subscription option
- Link to payment history

**UI Components:**
- Status card with expiry countdown
- Plan details section
- Action buttons (Renew, Upgrade, Cancel)

---

#### 3. `PaymentScreen.tsx`
**Location:** `src/screens/customer/PaymentScreen.tsx`

**Purpose:** Handle PhonePe payment flow

**Features:**
- Order summary display
- WebView loads PhonePe **redirect URL** from Create Payment API (returned by `initiate-payment`)
- Payment status handling via `verify-payment` (Order Status API) and optional redirect to `payment-callback`
- Success/failure screens
- Retry option on failure

**Flow:**
1. Show order summary
2. Call `initiate-payment` (OAuth + Create Payment on server)
3. Open PhonePe checkout URL in WebView
4. User returns to `payment-callback` redirect URL and/or taps **Verify** in-app
5. Subscription activates when Order Status is `COMPLETED`

---

#### 4. `PaymentHistoryScreen.tsx`
**Location:** `src/screens/customer/PaymentHistoryScreen.tsx`

**Purpose:** Display all payment transactions

**Features:**
- List of all transactions
- Filter by status (Success, Failed, Pending)
- Transaction details modal
- Download receipt option

---

### Not in this app (admin)

Plan management, subscriber lists, revenue dashboards, and exports are **not** implemented in this repository. If needed, implement them in a separate admin application or operational tools that use the service role or dedicated admin API—not the customer app.

---

## Service/API Changes

### New Services

#### 1. `subscription.service.ts`
**Location:** `src/services/subscription.service.ts`

```typescript
// Service structure outline

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  durationMonths: number;
  price: number;
  currency: string;
  features: string[];
  maxBookingsPerMonth: number | null;
  isActive: boolean;
  displayOrder: number;
}

interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'pending' | 'active' | 'expired' | 'cancelled' | 'paused';
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  isTrial: boolean;
}

class SubscriptionService {
  // Plan methods
  async getActivePlans(): Promise<SubscriptionPlan[]>;
  async getPlanById(planId: string): Promise<SubscriptionPlan>;
  
  // Subscription methods
  async getUserSubscription(userId: string): Promise<Subscription | null>;
  async hasActiveSubscription(userId: string): Promise<boolean>;
  async createSubscription(userId: string, planId: string): Promise<Subscription>;
  async activateSubscription(subscriptionId: string, transactionId: string): Promise<void>;
  async cancelSubscription(subscriptionId: string, reason: string): Promise<void>;
  async renewSubscription(subscriptionId: string): Promise<Subscription>;
  
  // Utility methods
  async checkExpiredSubscriptions(): Promise<void>; // Cron job
  async sendRenewalReminders(): Promise<void>; // Cron job
}
```

---

#### 2. `phonepe.service.ts`
**Location:** `src/services/phonepe.service.ts`

```typescript
// Thin client: invokes Edge Functions only (OAuth + secrets stay on server)

class PhonePeService {
  static async initiateTransaction(orderId: string): Promise<unknown>;
  static async verifyTransaction(orderId: string): Promise<VerifyPaymentResponse>;
}

// initiate-payment returns { redirectUrl, clientMeta: { orderId, amount }, ... }
// verify-payment returns { orderId, orderStatus, applied, reason? }
```

---

### Modified Services

#### `auth.service.ts` - Add Subscription Check

```typescript
// Add to login flow
async loginWithRole(email: string, password: string, role: string) {
  // ... existing login logic ...
  
  // Check subscription status for customers (individual and society both use role 'customer')
  if (role === 'customer') {
    const subscription = await subscriptionService.getUserSubscription(user.id);
    return {
      ...user,
      subscription: subscription,
      hasActiveSubscription: subscription?.status === 'active'
    };
  }
  
  return user;
}
```

---

#### `booking.service.ts` - Add Subscription Validation

```typescript
// Add to createBooking
async createBooking(bookingData: CreateBookingData) {
  // Check subscription before allowing booking
  const hasSubscription = await subscriptionService.hasActiveSubscription(
    bookingData.customerId
  );
  
  if (!hasSubscription) {
    throw new Error('SUBSCRIPTION_REQUIRED');
  }
  
  // ... existing booking logic ...
}
```

---

### New Data Access Methods

Add to `supabaseDataAccess.ts`:

```typescript
// Subscription Plans
async getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
async getSubscriptionPlanById(id: string): Promise<SubscriptionPlan>;
// Plan create/update: not from this app — use backend/migrations or admin tooling

// Subscriptions
async getUserSubscription(userId: string): Promise<Subscription | null>;
async createSubscription(data: CreateSubscriptionData): Promise<Subscription>;
async updateSubscription(id: string, data: UpdateSubscriptionData): Promise<void>;

// Payment Transactions
async createPaymentTransaction(data: CreateTransactionData): Promise<PaymentTransaction>;
async updatePaymentTransaction(id: string, data: UpdateTransactionData): Promise<void>;
async getPaymentTransactionsByUser(userId: string): Promise<PaymentTransaction[]>;
async getPaymentTransactionByOrderId(orderId: string): Promise<PaymentTransaction>;
```

---

## Navigation Changes

### Update `CustomerNavigator.tsx`

Register subscription screens for **all** customer sessions (individual and society). There is no separate society navigator in this project—society flows use the same stack with different screens where needed.

```typescript
// Add new screens to navigator
const CustomerStack = createStackNavigator();

function CustomerNavigator() {
  return (
    <CustomerStack.Navigator>
      {/* Existing screens */}
      <CustomerStack.Screen name="Home" component={CustomerHomeScreen} />
      <CustomerStack.Screen name="Booking" component={BookingScreen} />
      {/* ... other existing screens (including society trip screens when applicable) ... */}
      
      {/* New subscription screens */}
      <CustomerStack.Screen 
        name="SubscriptionPlans" 
        component={SubscriptionPlansScreen} 
      />
      <CustomerStack.Screen 
        name="SubscriptionStatus" 
        component={SubscriptionStatusScreen} 
      />
      <CustomerStack.Screen 
        name="Payment" 
        component={PaymentScreen} 
      />
      <CustomerStack.Screen 
        name="PaymentHistory" 
        component={PaymentHistoryScreen} 
      />
    </CustomerStack.Navigator>
  );
}
```

### Update `CustomerMenuDrawer.tsx`

Add subscription menu items (e.g., Plans, My subscription, Payment history) for customer users. **Do not** add subscription management entries to an admin navigator—this app does not ship one.

---

## PhonePe Integration

### Prerequisites

1. **PhonePe Payment Gateway (Business)** — [Get started](https://business.phonepe.com/pg/register?utm_source=website_dev_docs)
2. **Developer credentials** (Dashboard → Developer Settings): `client_id`, `client_secret`, `client_version` for OAuth **client_credentials** token.
3. **Redirect URL** — set Create Payment `merchantUrls.redirectUrl` to your public `payment-callback` Edge Function URL (same value as `CALLBACK_URL` secret).

### Standard Checkout v2 (implemented)

| Step | API | Notes |
|------|-----|--------|
| OAuth (server) | `POST` sandbox `https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token` · prod `https://api.phonepe.com/apis/identity-manager/v1/oauth/token` | Body: `application/x-www-form-urlencoded` (`client_id`, `client_version`, `client_secret`, `grant_type=client_credentials`). Response: `access_token`, `expires_at`. Use `Authorization: O-Bearer <token>` on PG calls. |
| Create payment | `POST` …`/checkout/v2/pay` | Amount in **paisa** (₹1 = 100). `merchantOrderId` = our `gateway_order_id`. Returns `redirectUrl` for WebView. |
| Order status | `GET` …`/checkout/v2/order/{merchantOrderId}/status` | Root `state`: `COMPLETED` = success, `PENDING` = in progress, `FAILED` = terminal failure. |

Official docs: [Integration steps](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/integration-steps), [Authorization](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/authorization), [Create Payment](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/create-payment), [Order Status](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/order-status).

Optional **S2S webhook** (username/password + `Authorization: SHA256(username:password)`) can be added later; redirect + Order Status + in-app “Verify” is sufficient for the current app.

### Edge implementation

- Shared module: [`supabase/functions/_shared/phonepe.ts`](supabase/functions/_shared/phonepe.ts) — OAuth cache, `createPayment`, `fetchOrderStatus`, success/pending/failure helpers, `extractTxnMeta` from `paymentDetails`.
- [`initiate-payment`](supabase/functions/initiate-payment/index.ts) — loads pending `payment_transactions`, converts rupees → paisa, calls Create Payment with `redirectUrl = CALLBACK_URL`, returns `{ redirectUrl, clientMeta: { orderId, amount } }`.
- [`verify-payment`](supabase/functions/verify-payment/index.ts) — authenticated user; Order Status by `merchantOrderId`; runs [`activation.ts`](supabase/functions/_shared/activation.ts) on success.
- [`payment-callback`](supabase/functions/payment-callback/index.ts) — **GET** (redirect landing) and **POST**; resolves `merchantOrderId`, confirms via Order Status, returns simple HTML for the browser.

### WebView (client)

Use `react-native-webview` with `source={{ uri: redirectUrl }}` (no hosted checkout base URL env var). Detect navigation to `payment-callback` or Supabase host to trigger verify when needed.

---

## Backend Requirements

Payment processing is implemented with **Supabase Edge Functions** only (no separate Node server required). Secrets live in **Project Settings → Edge Functions → Secrets**.

---

## Security Considerations

### Critical Security Rules

1. **Never put PhonePe `client_secret` in the app** — only Edge Function secrets / server env.
2. **Always confirm payment server-side** — use Order Status `state === COMPLETED` before activating subscription.
3. **Use HTTPS** for all PG and Supabase URLs.
4. **Idempotent order ids** — `gateway_order_id` is unique per checkout; duplicate Create Payment attempts are handled by checking Order Status first where applicable.
5. **Webhooks (optional)** — if enabled in PhonePe dashboard, verify `Authorization` header per [PhonePe webhook docs](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/webhook).

### Environment Variables (Edge Functions)

See [`.env.example`](.env.example) for the full list. Minimum: `PHONEPE_CLIENT_ID`, `PHONEPE_CLIENT_SECRET`, `PHONEPE_CLIENT_VERSION`, `PHONEPE_ENV` (`sandbox` or `production`), `CALLBACK_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`. Optional: `PHONEPE_MERCHANT_ID` for `X-MERCHANT-ID`, webhook credentials if you add a webhook handler.

---

## Implementation Checklist

### Phase 1: Database Setup
- [x] Create migration `024_create_subscription_tables.sql`
- [x] Create migration `025_add_subscription_check_to_bookings.sql`
- [x] Create migration `028_payment_gateway_default_phonepe.sql` (default `payment_gateway` = `phonepe` for new rows)
- [x] Run migrations in Supabase (WaterTankerApp — subscription migrations applied April 2026)
- [x] Verify RLS policies (subscription_plans, subscriptions, payment_transactions; admin policies present for admin tooling)
- [x] Seed initial subscription plans (Monthly, Half-Yearly, Yearly)
- [x] Align `validate_booking_subscription` with agency-path bypass (`agency_id` set; trigger remains disabled until go-live)

### Phase 2: Backend Setup
- [x] Create Supabase Edge Functions (or separate backend)
- [x] Implement `/initiate-payment` endpoint (`supabase/functions/initiate-payment`)
- [x] Implement `/payment-callback` endpoint (`supabase/functions/payment-callback`)
- [x] Implement `/verify-payment` endpoint (`supabase/functions/verify-payment`)
- [x] PhonePe PG helpers (`supabase/functions/_shared/phonepe.ts` — OAuth, Create Payment, Order Status; no `paytmchecksum`)
- [x] Configure environment variables (Edge Function secrets: `PHONEPE_CLIENT_ID`, `PHONEPE_CLIENT_SECRET`, `PHONEPE_CLIENT_VERSION`, `PHONEPE_ENV`, `CALLBACK_URL`, optional `PHONEPE_MERCHANT_ID` — see `.env.example`)

**Deployed function URLs (replace with your project ref if different):**  
`https://<project-ref>.supabase.co/functions/v1/initiate-payment` · `payment-callback` · `verify-payment`.

**Check `.env.example` for PhonePe and Supabase Edge secrets.**

### Phase 3: Services
- [x] Create `subscription.service.ts` (`SubscriptionService` — plans, subscriptions, payment rows, PhonePe verify hook)
- [x] Create `phonepe.service.ts` (`PhonePeService` — `initiate-payment` / `verify-payment` Edge Function invokes)
- [x] Update `dataAccess.interface.ts` + `supabaseDataAccess.ts` (`ISubscriptionDataAccess`, `subscriptions` on `dataAccess`)
- [x] Add `src/types/subscription.types.ts` and export from `src/types/index.ts`
- [x] Modify `auth.service.ts` — `AuthResult` includes `subscription` and `hasActiveSubscription` for customer sessions
- [x] Modify `booking.service.ts` — self-serve bookings (`agencyId` unset) require active subscription; sets `subscriptionId` when present
- [x] RLS: `migrations/026_payment_transactions_user_insert.sql` + `027_payment_transactions_user_update_pending.sql` (authenticated insert/update own pending checkout rows; applied to WaterTankerApp April 2026)

### Phase 4: Customer Screens (individual + society)
- [x] Create `SubscriptionPlansScreen.tsx`
- [x] Create `SubscriptionStatusScreen.tsx`
- [x] Create `PaymentScreen.tsx` (PhonePe checkout URL in `WebView` + `verify-payment`)
- [x] Create `PaymentHistoryScreen.tsx`
- [x] Update `CustomerNavigator.tsx` and `rootNavigation.ts` (`SubscriptionPlans`, `SubscriptionStatus`, `Payment`, `PaymentHistory`)
- [x] Update `CustomerMenuDrawer.tsx` (menu routes + items: plans, subscription, payment history)
- [x] Add `src/navigation/customerMenuNavigation.ts` (typed navigation for drawer routes)
- [x] `initiate-payment` returns `redirectUrl` + `clientMeta` (`orderId`, `amount`) — **redeploy Edge Functions** after credential or API changes
- [x] Dependency: `react-native-webview` (Expo)

### Phase 5: Integration & Testing
- [ ] Test payment flow in PhonePe sandbox (`PHONEPE_ENV=sandbox`)
- [ ] Test subscription activation
- [ ] Test subscription expiry
- [ ] Test renewal flow
- [ ] Test edge cases (payment failure, network issues)

### Phase 6: Go Live
- [ ] Switch to PhonePe production (`PHONEPE_ENV=production`) and production OAuth/checkout hosts
- [ ] Enable booking subscription validation trigger
- [ ] Monitor first few transactions
- [ ] Set up error alerting

---

## Estimated New Files

| File Path | Type |
|-----------|------|
| `migrations/024_create_subscription_tables.sql` | Migration |
| `migrations/025_add_subscription_check_to_bookings.sql` | Migration |
| `migrations/026_payment_transactions_user_insert.sql` | Migration |
| `migrations/027_payment_transactions_user_update_pending.sql` | Migration |
| `migrations/028_payment_gateway_default_phonepe.sql` | Migration |
| `src/services/subscription.service.ts` | Service |
| `src/services/phonepe.service.ts` | Service |
| `src/screens/customer/SubscriptionPlansScreen.tsx` | Screen |
| `src/screens/customer/SubscriptionStatusScreen.tsx` | Screen |
| `src/screens/customer/PaymentScreen.tsx` | Screen |
| `src/screens/customer/PaymentHistoryScreen.tsx` | Screen |
| `src/types/subscription.types.ts` | Types |
| `supabase/functions/initiate-payment/index.ts` | Edge Function |
| `supabase/functions/payment-callback/index.ts` | Edge Function |
| `supabase/functions/verify-payment/index.ts` | Edge Function |
| `supabase/functions/_shared/phonepe.ts` | Edge shared (PhonePe OAuth + PG APIs) |
| `src/navigation/customerMenuNavigation.ts` | Navigation helper |

---

## Resources

- [PhonePe PG — Integration steps](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/integration-steps)
- [PhonePe — Create Payment](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/create-payment)
- [PhonePe — Order Status](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/order-status)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

*Document created: January 27, 2026*  
*Last updated: April 1, 2026 — Subscription checkout uses PhonePe Standard Checkout v2 (Edge Functions + WebView). Phase 5 (PhonePe sandbox E2E) still pending.*
