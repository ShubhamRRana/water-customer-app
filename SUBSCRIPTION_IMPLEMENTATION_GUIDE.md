# Subscription & Payment Implementation Guide

This document outlines the changes required to convert the WaterTanker **customer** app from a free app to a subscription-based paid app with Paytm payment gateway integration.

**Scope:** This repository is the **customer-facing** app only. It serves **individual customers** and **society** accounts (same `CustomerNavigator` and role `customer`, with `CustomerAccountKind` of `individual` or `society`). **Admin** dashboards, plan management UIs, subscriber analytics screens, and revenue reports are **out of scope** here—they belong to a separate admin product, backend jobs, or database tooling—not this codebase.

---

## Table of Contents

1. [Overview](#overview)
2. [Database Changes](#database-changes)
3. [New Screens](#new-screens)
4. [Service/API Changes](#serviceapi-changes)
5. [Navigation Changes](#navigation-changes)
6. [Paytm Integration](#paytm-integration)
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
    
    -- Paytm specific fields
    payment_gateway VARCHAR(50) DEFAULT 'paytm',
    gateway_order_id VARCHAR(100), -- Paytm ORDER_ID
    gateway_transaction_id VARCHAR(100), -- Paytm TXNID
    gateway_response_code VARCHAR(20), -- Paytm RESPCODE
    gateway_response_message TEXT, -- Paytm RESPMSG
    
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

**Purpose:** Handle Paytm payment flow

**Features:**
- Order summary display
- Paytm SDK integration
- Payment status handling
- Success/failure screens
- Retry option on failure

**Flow:**
1. Show order summary
2. Initialize Paytm transaction
3. Open Paytm payment page
4. Handle callback
5. Show result

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

#### 2. `paytm.service.ts`
**Location:** `src/services/paytm.service.ts`

```typescript
// Service structure outline

interface PaytmConfig {
  merchantId: string;
  merchantKey: string; // NEVER store in client - use backend
  website: string;
  industryType: string;
  channelId: string;
  callbackUrl: string;
}

interface PaytmOrderParams {
  orderId: string;
  amount: number;
  customerId: string;
  email: string;
  phone: string;
}

interface PaytmTransactionResponse {
  orderId: string;
  transactionId: string;
  status: 'TXN_SUCCESS' | 'TXN_FAILURE' | 'PENDING';
  responseCode: string;
  responseMessage: string;
  paymentMode: string;
  bankName?: string;
}

class PaytmService {
  // Initialize payment
  async initiateTransaction(params: PaytmOrderParams): Promise<{
    orderId: string;
    txnToken: string;
    amount: number;
  }>;
  
  // Verify transaction status
  async verifyTransaction(orderId: string): Promise<PaytmTransactionResponse>;
  
  // Handle callback
  async handleCallback(callbackData: any): Promise<PaytmTransactionResponse>;
  
  // Refund (if needed)
  async initiateRefund(orderId: string, refundAmount: number): Promise<RefundResponse>;
}
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

## Paytm Integration

### Prerequisites

1. **Paytm Business Account**
   - Register at https://business.paytm.com
   - Complete KYC verification
   - Get Merchant ID (MID) and Merchant Key

2. **API Credentials**
   - Merchant ID (MID)
   - Merchant Key (for checksum generation)
   - Website name
   - Industry type code

### Integration Options

#### Option 1: Paytm All-in-One SDK (Recommended)

```bash
# Install Paytm SDK for React Native
npm install paytm-allinone-react-native
# or
yarn add paytm-allinone-react-native
```

**iOS Setup:**
```bash
cd ios && pod install
```

**Android Setup:**
- Add to `android/build.gradle`:
```gradle
allprojects {
    repositories {
        maven {
            url "https://artifactory.paytm.in/libs-release-local"
        }
    }
}
```

#### Option 2: WebView Integration

If SDK issues arise, use WebView to load Paytm payment page:

```typescript
import { WebView } from 'react-native-webview';

// Load Paytm payment page in WebView
<WebView
  source={{ uri: paytmPaymentUrl }}
  onNavigationStateChange={handlePaymentCallback}
/>
```

### Payment Flow Implementation

```
┌─────────────────────────────────────────────────────────────────┐
│                      PAYMENT FLOW                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User selects plan                                           │
│          │                                                       │
│          ▼                                                       │
│  2. App creates order in database (status: pending)             │
│          │                                                       │
│          ▼                                                       │
│  3. App calls Backend API to initiate transaction               │
│          │                                                       │
│          ▼                                                       │
│  4. Backend generates checksum using Merchant Key               │
│     (NEVER expose Merchant Key to client)                       │
│          │                                                       │
│          ▼                                                       │
│  5. Backend calls Paytm Initiate Transaction API                │
│          │                                                       │
│          ▼                                                       │
│  6. Backend returns txnToken to App                             │
│          │                                                       │
│          ▼                                                       │
│  7. App opens Paytm SDK/WebView with txnToken                   │
│          │                                                       │
│          ▼                                                       │
│  8. User completes payment on Paytm                             │
│          │                                                       │
│          ▼                                                       │
│  9. Paytm sends callback to Backend                             │
│          │                                                       │
│          ▼                                                       │
│  10. Backend verifies checksum & transaction status             │
│          │                                                       │
│          ▼                                                       │
│  11. Backend updates subscription & transaction in DB           │
│          │                                                       │
│          ▼                                                       │
│  12. App polls/receives webhook for success/failure             │
│          │                                                       │
│          ▼                                                       │
│  13. App shows success/failure screen                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Paytm API Endpoints

| Environment | Base URL |
|-------------|----------|
| Staging | https://securegw-stage.paytm.in |
| Production | https://securegw.paytm.in |

**Key APIs:**

1. **Initiate Transaction**
   - POST `/theia/api/v1/initiateTransaction`
   - Returns: `txnToken`

2. **Process Transaction**
   - POST `/theia/api/v1/processTransaction`
   - Used for server-to-server payment

3. **Transaction Status**
   - POST `/v3/order/status`
   - Verify transaction status

### Checksum Generation (Backend Only)

```javascript
// Node.js example - MUST be on backend
const PaytmChecksum = require('paytmchecksum');

async function generateChecksum(params, merchantKey) {
  return await PaytmChecksum.generateSignature(
    JSON.stringify(params), 
    merchantKey
  );
}

async function verifyChecksum(params, checksum, merchantKey) {
  return await PaytmChecksum.verifySignature(
    JSON.stringify(params),
    merchantKey,
    checksum
  );
}
```

---

## Backend Requirements

Since the app currently uses Supabase directly, you'll need a backend for Paytm integration:

### Option 1: Supabase Edge Functions

```typescript
// supabase/functions/initiate-payment/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import PaytmChecksum from 'paytmchecksum';

serve(async (req) => {
  const { orderId, amount, customerId } = await req.json();
  
  const paytmParams = {
    body: {
      requestType: 'Payment',
      mid: Deno.env.get('PAYTM_MID'),
      websiteName: Deno.env.get('PAYTM_WEBSITE'),
      orderId: orderId,
      callbackUrl: `${Deno.env.get('CALLBACK_URL')}/payment-callback`,
      txnAmount: {
        value: amount.toFixed(2),
        currency: 'INR',
      },
      userInfo: {
        custId: customerId,
      },
    },
  };
  
  const checksum = await PaytmChecksum.generateSignature(
    JSON.stringify(paytmParams.body),
    Deno.env.get('PAYTM_KEY')
  );
  
  paytmParams.head = { signature: checksum };
  
  // Call Paytm API
  const response = await fetch(
    `${Deno.env.get('PAYTM_HOST')}/theia/api/v1/initiateTransaction?mid=${paytmParams.body.mid}&orderId=${orderId}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paytmParams),
    }
  );
  
  const data = await response.json();
  
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### Option 2: Separate Node.js Backend

If Edge Functions are insufficient, create a simple Express.js backend:

```
backend/
├── src/
│   ├── routes/
│   │   └── payment.routes.ts
│   ├── services/
│   │   └── paytm.service.ts
│   ├── middleware/
│   │   └── auth.middleware.ts
│   └── index.ts
├── package.json
└── .env
```

---

## Security Considerations

### Critical Security Rules

1. **NEVER store Merchant Key in the app**
   - Merchant Key must only exist on backend
   - Use environment variables

2. **Always verify transactions server-side**
   - Never trust client-side payment confirmation
   - Always call Paytm Status API to verify

3. **Validate checksum on callbacks**
   - Verify Paytm's checksum before processing

4. **Use HTTPS everywhere**
   - All API calls must be over HTTPS

5. **Implement idempotency**
   - Prevent duplicate transactions
   - Use unique order IDs

6. **Secure webhook endpoints**
   - Validate webhook signatures
   - Use IP whitelisting if possible

### Environment Variables

```env
# Backend .env file
PAYTM_MID=your_merchant_id
PAYTM_KEY=your_merchant_key
PAYTM_WEBSITE=DEFAULT
PAYTM_INDUSTRY_TYPE=Retail
PAYTM_CHANNEL_ID=WAP
PAYTM_HOST=https://securegw.paytm.in  # Production
# PAYTM_HOST=https://securegw-stage.paytm.in  # Staging
CALLBACK_URL=https://your-backend.com
```

---

## Implementation Checklist

### Phase 1: Database Setup
- [x] Create migration `024_create_subscription_tables.sql`
- [x] Create migration `025_add_subscription_check_to_bookings.sql`
- [x] Run migrations in Supabase (WaterTankerApp — subscription migrations applied April 2026)
- [x] Verify RLS policies (subscription_plans, subscriptions, payment_transactions; admin policies present for admin tooling)
- [x] Seed initial subscription plans (Monthly, Half-Yearly, Yearly)
- [x] Align `validate_booking_subscription` with agency-path bypass (`agency_id` set; trigger remains disabled until go-live)

### Phase 2: Backend Setup
- [x] Create Supabase Edge Functions (or separate backend)
- [x] Implement `/initiate-payment` endpoint (`supabase/functions/initiate-payment`)
- [x] Implement `/payment-callback` endpoint (`supabase/functions/payment-callback`)
- [x] Implement `/verify-payment` endpoint (`supabase/functions/verify-payment`)
- [x] Add Paytm checksum utilities (`supabase/functions/_shared/paytm.ts` via `paytmchecksum`)
- [x] Configure environment variables (Edge Function secrets in Supabase Dashboard: `PAYTM_MID`, `PAYTM_KEY`, `PAYTM_WEBSITE`, `PAYTM_HOST`, `CALLBACK_URL` — see `.env.example` notes; deployed April 2026 to WaterTankerApp)

**Deployed function URLs (replace with your project ref if different):**  
`https://<project-ref>.supabase.co/functions/v1/initiate-payment` · `payment-callback` · `verify-payment`.

**Check .env.example file for setting up Paytm Keys**  



### Phase 3: Services
- [x] Create `subscription.service.ts` (`SubscriptionService` — plans, subscriptions, payment rows, Paytm verify hook)
- [x] Create `paytm.service.ts` (`PaytmService` — `initiate-payment` / `verify-payment` Edge Function invokes)
- [x] Update `dataAccess.interface.ts` + `supabaseDataAccess.ts` (`ISubscriptionDataAccess`, `subscriptions` on `dataAccess`)
- [x] Add `src/types/subscription.types.ts` and export from `src/types/index.ts`
- [x] Modify `auth.service.ts` — `AuthResult` includes `subscription` and `hasActiveSubscription` for customer sessions
- [x] Modify `booking.service.ts` — self-serve bookings (`agencyId` unset) require active subscription; sets `subscriptionId` when present
- [x] RLS: `migrations/026_payment_transactions_user_insert.sql` + `027_payment_transactions_user_update_pending.sql` (authenticated insert/update own pending checkout rows; applied to WaterTankerApp April 2026)

### Phase 4: Customer Screens (individual + society)
- [x] Create `SubscriptionPlansScreen.tsx`
- [x] Create `SubscriptionStatusScreen.tsx`
- [x] Create `PaymentScreen.tsx` (Paytm checkout via `WebView` + `verify-payment`)
- [x] Create `PaymentHistoryScreen.tsx`
- [x] Update `CustomerNavigator.tsx` and `rootNavigation.ts` (`SubscriptionPlans`, `SubscriptionStatus`, `Payment`, `PaymentHistory`)
- [x] Update `CustomerMenuDrawer.tsx` (menu routes + items: plans, subscription, payment history)
- [x] Add `src/navigation/customerMenuNavigation.ts` (typed navigation for drawer routes)
- [x] Add `src/constants/paytmCheckout.ts` (optional `EXPO_PUBLIC_PAYTM_CHECKOUT_BASE_URL`; defaults to Paytm staging)
- [x] Extend `initiate-payment` response with `clientMeta` (`mid`, `orderId`, `amount`) for checkout HTML — **redeploy this Edge Function** after pulling
- [x] Dependency: `react-native-webview` (Expo)

### Phase 5: Integration & Testing
- [ ] Test payment flow in Paytm staging environment
- [ ] Test subscription activation
- [ ] Test subscription expiry
- [ ] Test renewal flow
- [ ] Test edge cases (payment failure, network issues)

### Phase 6: Go Live
- [ ] Switch to Paytm production credentials
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
| `src/services/subscription.service.ts` | Service |
| `src/services/paytm.service.ts` | Service |
| `src/screens/customer/SubscriptionPlansScreen.tsx` | Screen |
| `src/screens/customer/SubscriptionStatusScreen.tsx` | Screen |
| `src/screens/customer/PaymentScreen.tsx` | Screen |
| `src/screens/customer/PaymentHistoryScreen.tsx` | Screen |
| `src/types/subscription.types.ts` | Types |
| `supabase/functions/initiate-payment/index.ts` | Edge Function |
| `supabase/functions/payment-callback/index.ts` | Edge Function |
| `supabase/functions/verify-payment/index.ts` | Edge Function |
| `src/navigation/customerMenuNavigation.ts` | Navigation helper |
| `src/constants/paytmCheckout.ts` | Paytm checkout base URL |

---

## Resources

- [Paytm Developer Docs](https://developer.paytm.com/docs/)
- [Paytm All-in-One SDK](https://developer.paytm.com/docs/all-in-one-sdk/)
- [Paytm React Native SDK](https://github.com/nickesk/paytm-allinone-react-native)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

*Document created: January 27, 2026*  
*Last updated: April 1, 2026 — Phase 4 customer subscription screens and navigation complete. Redeploy `initiate-payment` if you need `clientMeta` on-device. Phase 5 (Paytm staging E2E) still pending.*
