-- sudo.supply database schema
-- Run this in your Supabase SQL editor or via supabase db push

-- Profiles table: synced from Clerk via webhook
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique not null,
  email text not null,
  name text,
  created_at timestamptz default now()
);

create index if not exists idx_profiles_clerk_user_id on profiles(clerk_user_id);
create index if not exists idx_profiles_email on profiles(email);

-- Orders table: synced from Shopify via webhook
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id text,                          -- Clerk user ID (nullable for guest orders)
  shopify_order_id text unique not null,
  shopify_order_number text not null,
  status text not null default 'pending', -- pending, confirmed, shipped, delivered, cancelled
  total numeric(10,2) not null,
  currency text not null default 'USD',
  items jsonb not null default '[]',
  shipping_address jsonb,
  tracking_number text,
  tracking_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_orders_user_id on orders(user_id);
create index if not exists idx_orders_shopify_order_id on orders(shopify_order_id);
create index if not exists idx_orders_status on orders(status);

-- Row Level Security
alter table profiles enable row level security;
alter table orders enable row level security;

-- Profiles: users can read their own profile
create policy "Users can read own profile"
  on profiles for select
  using (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Orders: users can read their own orders
create policy "Users can read own orders"
  on orders for select
  using (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Service role can do everything (for webhooks)
create policy "Service role full access profiles"
  on profiles for all
  using (current_setting('role') = 'service_role');

create policy "Service role full access orders"
  on orders for all
  using (current_setting('role') = 'service_role');
