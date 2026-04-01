-- Subscription plans, user subscriptions, payment transactions, RLS, helpers, and seed plans.
-- Applied to production Supabase as migration "create_subscription_tables" (April 2026).

-- =============================================
-- SUBSCRIPTION PLANS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    duration_months INTEGER NOT NULL CHECK (duration_months IN (1, 6, 12)),
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    features JSONB DEFAULT '[]'::jsonb,
    max_bookings_per_month INTEGER,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USER SUBSCRIPTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'active', 'expired', 'cancelled', 'paused')),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    auto_renew BOOLEAN DEFAULT false,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    trial_end_date TIMESTAMPTZ,
    is_trial BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- At most one active subscription per user (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_active_per_user
    ON public.subscriptions (user_id)
    WHERE status = 'active';

-- =============================================
-- PAYMENT TRANSACTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    payment_gateway VARCHAR(50) DEFAULT 'phonepe',
    gateway_order_id VARCHAR(100),
    gateway_transaction_id VARCHAR(100),
    gateway_response_code VARCHAR(20),
    gateway_response_message TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'success', 'failed', 'refunded', 'cancelled')),
    payment_method VARCHAR(50),
    bank_name VARCHAR(100),
    metadata JSONB DEFAULT '{}'::jsonb,
    initiated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON public.subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway_order_id ON public.payment_transactions(gateway_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active subscription plans"
    ON public.subscription_plans FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage subscription plans"
    ON public.subscription_plans FOR ALL
    USING (has_role('admin'))
    WITH CHECK (has_role('admin'));

CREATE POLICY "Users can read own subscriptions"
    ON public.subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscriptions"
    ON public.subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
    ON public.subscriptions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
    ON public.subscriptions FOR SELECT
    USING (has_role('admin'));

CREATE POLICY "Users can read own transactions"
    ON public.payment_transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service can manage transactions"
    ON public.payment_transactions FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can view all transactions"
    ON public.payment_transactions FOR SELECT
    USING (has_role('admin'));

-- =============================================
-- SEED DEFAULT SUBSCRIPTION PLANS (idempotent)
-- =============================================
INSERT INTO public.subscription_plans (name, description, duration_months, price, features, display_order)
SELECT 'Monthly', 'Perfect for trying out our service', 1, 299.00,
       '["Unlimited bookings", "Priority support", "Order tracking"]'::jsonb, 1
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE name = 'Monthly');

INSERT INTO public.subscription_plans (name, description, duration_months, price, features, display_order)
SELECT 'Half-Yearly', 'Best value for regular users', 6, 1499.00,
       '["Unlimited bookings", "Priority support", "Order tracking", "10% discount on bookings"]'::jsonb, 2
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE name = 'Half-Yearly');

INSERT INTO public.subscription_plans (name, description, duration_months, price, features, display_order)
SELECT 'Yearly', 'Maximum savings for power users', 12, 2499.00,
       '["Unlimited bookings", "Priority support", "Order tracking", "15% discount on bookings", "Free cancellations"]'::jsonb, 3
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE name = 'Yearly');

-- =============================================
-- HELPER FUNCTIONS
-- =============================================
CREATE OR REPLACE FUNCTION public.has_active_subscription(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.user_id = p_user_id
      AND s.status = 'active'
      AND s.end_date IS NOT NULL
      AND s.end_date > NOW()
  );
$$;

CREATE OR REPLACE FUNCTION public.get_current_subscription(p_user_id UUID)
RETURNS TABLE (
    subscription_id UUID,
    plan_name VARCHAR,
    status VARCHAR,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    days_remaining INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    s.id,
    sp.name::varchar,
    s.status::varchar,
    s.start_date,
    s.end_date,
    (EXTRACT(DAY FROM (s.end_date - NOW())))::integer
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON sp.id = s.plan_id
  WHERE s.user_id = p_user_id
    AND s.status = 'active'
  ORDER BY s.end_date DESC NULLS LAST
  LIMIT 1;
$$;
