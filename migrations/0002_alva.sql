-- Alva bank schema — per-user financial data (user_id TEXT).

create table if not exists customers (
  user_id    text primary key,
  full_name  text not null,
  agency     text not null,
  account_no text not null,
  phone      text,
  created_at timestamptz not null default now()
);

create table if not exists accounts (
  id              serial primary key,
  user_id         text not null,
  kind            text not null,
  name            text not null,
  balance_cents   bigint not null default 0,
  credit_limit_cents bigint,
  created_at      timestamptz not null default now()
);
create index if not exists accounts_user_id_idx on accounts (user_id);

create table if not exists cards (
  id           serial primary key,
  user_id      text not null,
  account_id   integer not null,
  last4        text not null,
  holder       text not null,
  brand        text not null,
  frozen       boolean not null default false,
  virtual      boolean not null default true,
  expiry_month integer not null,
  expiry_year  integer not null,
  created_at   timestamptz not null default now()
);
create index if not exists cards_user_id_idx on cards (user_id);

create table if not exists transactions (
  id           serial primary key,
  user_id      text not null,
  account_id   integer not null,
  kind         text not null,
  amount_cents bigint not null,
  counterparty text,
  description  text not null,
  category     text not null,
  created_at   timestamptz not null default now()
);
create index if not exists transactions_user_id_idx on transactions (user_id, created_at desc);

create table if not exists pix_keys (
  id         serial primary key,
  user_id    text not null,
  type       text not null,
  value      text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists pix_keys_value_idx on pix_keys (value);
create index if not exists pix_keys_user_id_idx on pix_keys (user_id);

create table if not exists bills (
  id           serial primary key,
  user_id      text not null,
  payee        text not null,
  barcode      text,
  amount_cents bigint not null,
  due_date     date not null,
  paid_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists bills_user_id_idx on bills (user_id);

create table if not exists investments (
  id           serial primary key,
  user_id      text not null,
  product      text not null,
  amount_cents bigint not null,
  yield_bps    integer not null,
  created_at   timestamptz not null default now()
);
create index if not exists investments_user_id_idx on investments (user_id);

create table if not exists ai_messages (
  id         serial primary key,
  user_id    text not null,
  role       text not null,
  content    text not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_messages_user_id_idx on ai_messages (user_id, created_at);

create table if not exists ai_insights (
  user_id    text primary key,
  content    text not null,
  updated_at timestamptz not null default now()
);
