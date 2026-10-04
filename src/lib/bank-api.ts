import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql, type Sql } from "@/lib/db";

export type AccountKind = "checking" | "savings" | "credit";

export type Account = {
  id: number;
  kind: AccountKind;
  name: string;
  balanceCents: number;
  creditLimitCents: number | null;
};

export type Card = {
  id: number;
  accountId: number;
  last4: string;
  holder: string;
  brand: string;
  frozen: boolean;
  virtual: boolean;
  expiryMonth: number;
  expiryYear: number;
};

export type Tx = {
  id: number;
  accountId: number;
  kind: string;
  amountCents: number;
  counterparty: string | null;
  description: string;
  category: string;
  createdAt: string;
};

export type PixKey = {
  id: number;
  type: string;
  value: string;
};

export type Bill = {
  id: number;
  payee: string;
  barcode: string | null;
  amountCents: number;
  dueDate: string;
  paidAt: string | null;
};

export type Investment = {
  id: number;
  product: string;
  amountCents: number;
  yieldBps: number;
};

export type Customer = {
  fullName: string;
  agency: string;
  accountNo: string;
  phone: string | null;
};

export type Overview = {
  customer: Customer;
  accounts: Account[];
  cards: Card[];
  recent: Tx[];
  pixKeys: PixKey[];
  bills: Bill[];
  investments: Investment[];
  insight: string | null;
};

type AccountRow = {
  id: number;
  kind: string;
  name: string;
  balance_cents: number;
  credit_limit_cents: number | null;
};

type CardRow = {
  id: number;
  account_id: number;
  last4: string;
  holder: string;
  brand: string;
  frozen: boolean;
  virtual: boolean;
  expiry_month: number;
  expiry_year: number;
};

type TxRow = {
  id: number;
  account_id: number;
  kind: string;
  amount_cents: number;
  counterparty: string | null;
  description: string;
  category: string;
  created_at: string;
};

type PixRow = { id: number; type: string; value: string };
type BillRow = {
  id: number;
  payee: string;
  barcode: string | null;
  amount_cents: number;
  due_date: string;
  paid_at: string | null;
};
type InvestRow = {
  id: number;
  product: string;
  amount_cents: number;
  yield_bps: number;
};

function hashUser(userId: string): number {
  let h = 2166136261;
  for (let i = 0; i < userId.length; i++) {
    h ^= userId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function accountNumber(userId: string): { agency: string; accountNo: string } {
  const h = hashUser(userId);
  const n = (h % 900000) + 100000;
  const dv = n % 9;
  return { agency: "0001", accountNo: `${n}-${dv}` };
}

function last4From(userId: string): string {
  return String((hashUser(userId) % 9000) + 1000);
}

function isoDaysAgo(days: number, hour = 12): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, (days * 7) % 60, 0, 0);
  return d.toISOString();
}

function dueInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function mapAccount(row: AccountRow): Account {
  return {
    id: row.id,
    kind: row.kind as AccountKind,
    name: row.name,
    balanceCents: Number(row.balance_cents),
    creditLimitCents:
      row.credit_limit_cents == null ? null : Number(row.credit_limit_cents),
  };
}

function mapCard(row: CardRow): Card {
  return {
    id: row.id,
    accountId: row.account_id,
    last4: row.last4,
    holder: row.holder,
    brand: row.brand,
    frozen: Boolean(row.frozen),
    virtual: Boolean(row.virtual),
    expiryMonth: Number(row.expiry_month),
    expiryYear: Number(row.expiry_year),
  };
}

function mapTx(row: TxRow): Tx {
  return {
    id: row.id,
    accountId: row.account_id,
    kind: row.kind,
    amountCents: Number(row.amount_cents),
    counterparty: row.counterparty,
    description: row.description,
    category: row.category,
    createdAt: row.created_at,
  };
}

async function displayName(sql: Sql, userId: string, email: string | null): Promise<string> {
  const rows = await sql<{ name: string | null; email: string | null }>`
    select name, email from "user" where id = ${userId} limit 1
  `;
  const name = rows[0]?.name?.trim();
  if (name) return name;
  const fromEmail = (rows[0]?.email ?? email ?? "").split("@")[0];
  if (fromEmail) {
    return fromEmail.charAt(0).toUpperCase() + fromEmail.slice(1);
  }
  return "Cliente Alva";
}

async function ensureCustomer(
  sql: Sql,
  userId: string,
  email: string | null,
): Promise<void> {
  const existing = await sql<{ user_id: string }>`
    select user_id from customers where user_id = ${userId} limit 1
  `;
  if (existing.length) return;

  const fullName = await displayName(sql, userId, email);
  const { agency, accountNo } = accountNumber(userId);
  const digits = last4From(userId);
  const phone = `11 9${digits}${String(hashUser(userId + "p") % 9000 + 1000)}`;
  const randomKey = crypto.randomUUID();
  const year = new Date().getFullYear() + 3;

  await sql`
    insert into customers (user_id, full_name, agency, account_no, phone)
    values (${userId}, ${fullName}, ${agency}, ${accountNo}, ${phone})
  `;

  const checking = await sql<{ id: number }>`
    insert into accounts (user_id, kind, name, balance_cents)
    values (${userId}, 'checking', 'Conta Alva', 482740)
    returning id
  `;
  const savings = await sql<{ id: number }>`
    insert into accounts (user_id, kind, name, balance_cents)
    values (${userId}, 'savings', 'Poupança', 1865000)
    returning id
  `;
  const credit = await sql<{ id: number }>`
    insert into accounts (user_id, kind, name, balance_cents, credit_limit_cents)
    values (${userId}, 'credit', 'Cartão Alva', 124590, 800000)
    returning id
  `;

  const checkingId = checking[0]!.id;
  const savingsId = savings[0]!.id;
  const creditId = credit[0]!.id;

  await sql`
    insert into cards (
      user_id, account_id, last4, holder, brand, frozen, virtual, expiry_month, expiry_year
    ) values (
      ${userId}, ${creditId}, ${digits}, ${fullName}, 'visa', false, true, 8, ${year}
    )
  `;

  const keys: Array<[string, string]> = [["random", randomKey]];
  if (email) keys.push(["email", email.toLowerCase()]);
  keys.push(["phone", `+55${phone.replace(/\s/g, "")}`]);
  for (const [type, value] of keys) {
    const taken = await sql<{ value: string }>`
      select value from pix_keys where value = ${value} limit 1
    `;
    if (taken.length) continue;
    await sql`
      insert into pix_keys (user_id, type, value)
      values (${userId}, ${type}, ${value})
    `;
  }

  const seed: Array<{
    accountId: number;
    kind: string;
    amount: number;
    counterparty: string;
    description: string;
    category: string;
    days: number;
    hour: number;
  }> = [
    {
      accountId: checkingId,
      kind: "income",
      amount: 642000,
      counterparty: "Norte Labs",
      description: "Salário",
      category: "income",
      days: 4,
      hour: 8,
    },
    {
      accountId: checkingId,
      kind: "pix_in",
      amount: 18000,
      counterparty: "Marina Costa",
      description: "Pix recebido",
      category: "pix",
      days: 3,
      hour: 19,
    },
    {
      accountId: checkingId,
      kind: "pix_out",
      amount: -25000,
      counterparty: "João Mendes",
      description: "Pix enviado",
      category: "pix",
      days: 2,
      hour: 14,
    },
    {
      accountId: checkingId,
      kind: "card",
      amount: -5490,
      counterparty: "iFood",
      description: "iFood",
      category: "food",
      days: 1,
      hour: 20,
    },
    {
      accountId: checkingId,
      kind: "card",
      amount: -2240,
      counterparty: "Uber",
      description: "Uber",
      category: "transport",
      days: 1,
      hour: 9,
    },
    {
      accountId: checkingId,
      kind: "bill",
      amount: -3990,
      counterparty: "Netflix",
      description: "Netflix",
      category: "entertainment",
      days: 6,
      hour: 7,
    },
    {
      accountId: checkingId,
      kind: "card",
      amount: -18900,
      counterparty: "Mercado Livre",
      description: "Mercado Livre",
      category: "shopping",
      days: 8,
      hour: 16,
    },
    {
      accountId: checkingId,
      kind: "card",
      amount: -4720,
      counterparty: "Drogasil",
      description: "Farmácia",
      category: "health",
      days: 5,
      hour: 11,
    },
    {
      accountId: checkingId,
      kind: "bill",
      amount: -14270,
      counterparty: "Enel",
      description: "Conta de luz",
      category: "bills",
      days: 9,
      hour: 10,
    },
    {
      accountId: checkingId,
      kind: "card",
      amount: -1850,
      counterparty: "Padaria da Esquina",
      description: "Padaria",
      category: "food",
      days: 0,
      hour: 8,
    },
    {
      accountId: checkingId,
      kind: "bill",
      amount: -2190,
      counterparty: "Spotify",
      description: "Spotify",
      category: "entertainment",
      days: 11,
      hour: 7,
    },
    {
      accountId: savingsId,
      kind: "yield",
      amount: 8614,
      counterparty: "Alva",
      description: "Rendimento da poupança",
      category: "yield",
      days: 2,
      hour: 0,
    },
    {
      accountId: creditId,
      kind: "card",
      amount: -32900,
      counterparty: "Amazon",
      description: "Amazon",
      category: "shopping",
      days: 7,
      hour: 21,
    },
    {
      accountId: creditId,
      kind: "card",
      amount: -91690,
      counterparty: "Latam",
      description: "Passagem aérea",
      category: "transport",
      days: 13,
      hour: 15,
    },
    {
      accountId: checkingId,
      kind: "bill",
      amount: -9990,
      counterparty: "Smart Fit",
      description: "Academia",
      category: "health",
      days: 10,
      hour: 6,
    },
  ];

  for (const tx of seed) {
    const created = isoDaysAgo(tx.days, tx.hour);
    await sql`
      insert into transactions (
        user_id, account_id, kind, amount_cents, counterparty, description, category, created_at
      ) values (
        ${userId}, ${tx.accountId}, ${tx.kind}, ${tx.amount}, ${tx.counterparty},
        ${tx.description}, ${tx.category}, ${created}
      )
    `;
  }

  const bills: Array<[string, number, number, string]> = [
    ["Enel", 15640, 5, "23791.12345 12345.678901 23456.789012 1 12340000015640"],
    ["Vivo Fibra", 11990, 8, "84670.00000 00000.000000 00000.000000 2 12340000011990"],
    ["Condomínio Vila Nova", 42000, 12, "34191.79001 01043.510047 91020.150008 3 12340000042000"],
  ];
  for (const [payee, amount, days, barcode] of bills) {
    await sql`
      insert into bills (user_id, payee, barcode, amount_cents, due_date)
      values (${userId}, ${payee}, ${barcode}, ${amount}, ${dueInDays(days)})
    `;
  }

  await sql`
    insert into investments (user_id, product, amount_cents, yield_bps)
    values
      (${userId}, 'CDB Alva 115% CDI', 400000, 1288),
      (${userId}, 'Tesouro Selic 2029', 250000, 1065)
  `;
}

async function loadOverview(sql: Sql, userId: string): Promise<Overview> {
  const [customerRows, accountRows, cardRows, txRows, pixRows, billRows, investRows, insightRows] =
    await Promise.all([
      sql<{ full_name: string; agency: string; account_no: string; phone: string | null }>`
        select full_name, agency, account_no, phone from customers where user_id = ${userId}
      `,
      sql<AccountRow>`
        select id, kind, name, balance_cents, credit_limit_cents
        from accounts where user_id = ${userId} order by id
      `,
      sql<CardRow>`
        select id, account_id, last4, holder, brand, frozen, virtual, expiry_month, expiry_year
        from cards where user_id = ${userId} order by id
      `,
      sql<TxRow>`
        select id, account_id, kind, amount_cents, counterparty, description, category, created_at
        from transactions where user_id = ${userId} order by created_at desc limit 40
      `,
      sql<PixRow>`select id, type, value from pix_keys where user_id = ${userId} order by id`,
      sql<BillRow>`
        select id, payee, barcode, amount_cents, due_date, paid_at
        from bills where user_id = ${userId} order by due_date
      `,
      sql<InvestRow>`
        select id, product, amount_cents, yield_bps from investments where user_id = ${userId} order by id
      `,
      sql<{ content: string }>`select content from ai_insights where user_id = ${userId}`,
    ]);

  const c = customerRows[0];
  return {
    customer: {
      fullName: c?.full_name ?? "Cliente Alva",
      agency: c?.agency ?? "0001",
      accountNo: c?.account_no ?? "000000-0",
      phone: c?.phone ?? null,
    },
    accounts: accountRows.map(mapAccount),
    cards: cardRows.map(mapCard),
    recent: txRows.map(mapTx),
    pixKeys: pixRows,
    bills: billRows.map((row) => ({
      id: row.id,
      payee: row.payee,
      barcode: row.barcode,
      amountCents: Number(row.amount_cents),
      dueDate: row.due_date,
      paidAt: row.paid_at,
    })),
    investments: investRows.map((row) => ({
      id: row.id,
      product: row.product,
      amountCents: Number(row.amount_cents),
      yieldBps: Number(row.yield_bps),
    })),
    insight: insightRows[0]?.content ?? null,
  };
}

async function checkingOf(sql: Sql, userId: string) {
  const rows = await sql<AccountRow>`
    select id, kind, name, balance_cents, credit_limit_cents
    from accounts where user_id = ${userId} and kind = 'checking' limit 1
  `;
  const row = rows[0];
  if (!row) throw new Error("Conta não encontrada");
  return mapAccount(row);
}

async function insertTx(
  sql: Sql,
  userId: string,
  accountId: number,
  kind: string,
  amountCents: number,
  counterparty: string,
  description: string,
  category: string,
) {
  await sql`
    insert into transactions (
      user_id, account_id, kind, amount_cents, counterparty, description, category
    ) values (
      ${userId}, ${accountId}, ${kind}, ${amountCents}, ${counterparty}, ${description}, ${category}
    )
  `;
}

export const getOverview = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const session = await getSessionUser();
    await ensureCustomer(sql, context.userId, session?.email ?? null);
    return loadOverview(sql, context.userId);
  });

const pixSchema = z.object({
  key: z.string().trim().min(3).max(140),
  amountCents: z.number().int().positive().max(5_000_000),
  description: z.string().trim().max(140).optional(),
});

export const sendPix = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => pixSchema.parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const checking = await checkingOf(sql, context.userId);
    if (checking.balanceCents < data.amountCents) {
      return { ok: false as const, error: "Saldo insuficiente na conta Alva." };
    }

    const dest = await sql<{ user_id: string }>`
      select user_id from pix_keys where value = ${data.key} limit 1
    `;
    const destId = dest[0]?.user_id;
    if (destId === context.userId) {
      return { ok: false as const, error: "Não dá para enviar Pix para você mesmo." };
    }

    const note = data.description?.trim() || "Pix enviado";

    await sql`
      update accounts
      set balance_cents = balance_cents - ${data.amountCents}
      where id = ${checking.id} and user_id = ${context.userId}
    `;
    await insertTx(
      sql,
      context.userId,
      checking.id,
      "pix_out",
      -data.amountCents,
      data.key,
      note,
      "pix",
    );

    if (destId) {
      const destChecking = await sql<{ id: number }>`
        select id from accounts where user_id = ${destId} and kind = 'checking' limit 1
      `;
      if (destChecking[0]) {
        await sql`
          update accounts
          set balance_cents = balance_cents + ${data.amountCents}
          where id = ${destChecking[0].id} and user_id = ${destId}
        `;
        const me = await sql<{ full_name: string }>`
          select full_name from customers where user_id = ${context.userId}
        `;
        await insertTx(
          sql,
          destId,
          destChecking[0].id,
          "pix_in",
          data.amountCents,
          me[0]?.full_name ?? "Alva",
          "Pix recebido",
          "pix",
        );
      }
    }

    return { ok: true as const };
  });

export const simulateIncomingPix = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z.object({ amountCents: z.number().int().positive().max(200_000) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const checking = await checkingOf(sql, context.userId);
    await sql`
      update accounts
      set balance_cents = balance_cents + ${data.amountCents}
      where id = ${checking.id} and user_id = ${context.userId}
    `;
    await insertTx(
      sql,
      context.userId,
      checking.id,
      "pix_in",
      data.amountCents,
      "Clara Nogueira",
      "Pix recebido",
      "pix",
    );
    return { ok: true as const };
  });

const transferSchema = z.object({
  fromKind: z.enum(["checking", "savings"]),
  toKind: z.enum(["checking", "savings"]),
  amountCents: z.number().int().positive().max(5_000_000),
});

export const transferOwn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => transferSchema.parse(input))
  .handler(async ({ context, data }) => {
    if (data.fromKind === data.toKind) {
      return { ok: false as const, error: "Escolha contas diferentes." };
    }
    const sql = await getSql();
    const from = await sql<AccountRow>`
      select id, kind, name, balance_cents, credit_limit_cents
      from accounts where user_id = ${context.userId} and kind = ${data.fromKind} limit 1
    `;
    const to = await sql<AccountRow>`
      select id, kind, name, balance_cents, credit_limit_cents
      from accounts where user_id = ${context.userId} and kind = ${data.toKind} limit 1
    `;
    if (!from[0] || !to[0]) return { ok: false as const, error: "Conta não encontrada." };
    if (Number(from[0].balance_cents) < data.amountCents) {
      return { ok: false as const, error: "Saldo insuficiente." };
    }
    await sql`
      update accounts set balance_cents = balance_cents - ${data.amountCents}
      where id = ${from[0].id} and user_id = ${context.userId}
    `;
    await sql`
      update accounts set balance_cents = balance_cents + ${data.amountCents}
      where id = ${to[0].id} and user_id = ${context.userId}
    `;
    await insertTx(
      sql,
      context.userId,
      from[0].id,
      "transfer",
      -data.amountCents,
      to[0].name,
      `Para ${to[0].name}`,
      "transfer",
    );
    await insertTx(
      sql,
      context.userId,
      to[0].id,
      "transfer",
      data.amountCents,
      from[0].name,
      `De ${from[0].name}`,
      "transfer",
    );
    return { ok: true as const };
  });

export const payBill = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ billId: z.number().int() }).parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const bill = await sql<BillRow>`
      select id, payee, barcode, amount_cents, due_date, paid_at
      from bills where id = ${data.billId} and user_id = ${context.userId} limit 1
    `;
    const row = bill[0];
    if (!row) return { ok: false as const, error: "Boleto não encontrado." };
    if (row.paid_at) return { ok: false as const, error: "Esse boleto já foi pago." };
    const checking = await checkingOf(sql, context.userId);
    const amount = Number(row.amount_cents);
    if (checking.balanceCents < amount) {
      return { ok: false as const, error: "Saldo insuficiente para pagar este boleto." };
    }
    await sql`
      update accounts set balance_cents = balance_cents - ${amount}
      where id = ${checking.id} and user_id = ${context.userId}
    `;
    await sql`
      update bills set paid_at = now()
      where id = ${row.id} and user_id = ${context.userId}
    `;
    await insertTx(
      sql,
      context.userId,
      checking.id,
      "bill",
      -amount,
      row.payee,
      `Boleto ${row.payee}`,
      "bills",
    );
    return { ok: true as const };
  });

export const toggleCardFreeze = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ cardId: z.number().int() }).parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ frozen: boolean }>`
      select frozen from cards where id = ${data.cardId} and user_id = ${context.userId} limit 1
    `;
    if (!rows[0]) return { ok: false as const, error: "Cartão não encontrado." };
    const next = !rows[0].frozen;
    await sql`
      update cards set frozen = ${next}
      where id = ${data.cardId} and user_id = ${context.userId}
    `;
    return { ok: true as const, frozen: next };
  });

export const payCreditInvoice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const credit = await sql<AccountRow>`
      select id, kind, name, balance_cents, credit_limit_cents
      from accounts where user_id = ${context.userId} and kind = 'credit' limit 1
    `;
    const row = credit[0];
    if (!row) return { ok: false as const, error: "Cartão não encontrado." };
    const used = Number(row.balance_cents);
    if (used <= 0) return { ok: false as const, error: "Não há fatura em aberto." };
    const checking = await checkingOf(sql, context.userId);
    if (checking.balanceCents < used) {
      return { ok: false as const, error: "Saldo insuficiente para pagar a fatura." };
    }
    await sql`
      update accounts set balance_cents = balance_cents - ${used}
      where id = ${checking.id} and user_id = ${context.userId}
    `;
    await sql`
      update accounts set balance_cents = 0
      where id = ${row.id} and user_id = ${context.userId}
    `;
    await insertTx(
      sql,
      context.userId,
      checking.id,
      "bill",
      -used,
      "Cartão Alva",
      "Pagamento da fatura",
      "bills",
    );
    return { ok: true as const };
  });

const chatSchema = z.object({
  message: z.string().trim().min(1).max(500),
});

export const getAiHistory = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ id: number; role: string; content: string; created_at: string }>`
      select id, role, content, created_at
      from ai_messages where user_id = ${context.userId}
      order by created_at desc limit 24
    `;
    return rows.reverse().map((row) => ({
      id: row.id,
      role: row.role as "user" | "assistant",
      content: row.content,
      createdAt: row.created_at,
    }));
  });

function snapshotForAi(overview: Overview): string {
  const checking = overview.accounts.find((a) => a.kind === "checking");
  const savings = overview.accounts.find((a) => a.kind === "savings");
  const credit = overview.accounts.find((a) => a.kind === "credit");
  const pending = overview.bills.filter((b) => !b.paidAt);
  const txs = overview.recent.slice(0, 12);
  const invest = overview.investments;
  return JSON.stringify({
    nome: overview.customer.fullName,
    conta: {
      agencia: overview.customer.agency,
      numero: overview.customer.accountNo,
    },
    saldos: {
      corrente_centavos: checking?.balanceCents ?? 0,
      poupanca_centavos: savings?.balanceCents ?? 0,
      fatura_cartao_centavos: credit?.balanceCents ?? 0,
      limite_cartao_centavos: credit?.creditLimitCents ?? 0,
    },
    boletos_abertos: pending.map((b) => ({
      favorecido: b.payee,
      valor_centavos: b.amountCents,
      vencimento: b.dueDate,
    })),
    investimentos: invest.map((i) => ({
      produto: i.product,
      valor_centavos: i.amountCents,
      rentabilidade_bps: i.yieldBps,
    })),
    ultimos_lancamentos: txs.map((t) => ({
      descricao: t.description,
      valor_centavos: t.amountCents,
      categoria: t.category,
      quando: t.createdAt,
    })),
  });
}

async function callGrok(messages: Array<{ role: "system" | "user" | "assistant"; content: string }>) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return { ok: false as const, error: "unavailable" as const };
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4.5",
      max_tokens: 500,
      temperature: 0.6,
      messages,
    }),
  });
  if (!res.ok) return { ok: false as const, error: "api" as const };
  const body = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return { ok: true as const, text: body.choices[0]?.message.content?.trim() ?? "" };
}

const SYSTEM_PROMPT = `Você é o assistente da Alva, um banco digital brasileiro (demonstração). Fale em português do Brasil, tom calmo, direto e humano — sem emojis, sem jargão de marketing. Use os dados financeiros reais do cliente fornecidos no contexto. Valores estão em centavos: converta para reais (R$) na resposta. Pode sugerir Pix, pagamento de boletos, guardar na poupança ou olhar o cartão, mas deixe claro que a Alva é um banco demonstrativo e não substitui aconselhamento financeiro profissional. Respostas curtas: 1 a 3 parágrafos, no máximo.`;

export const sendAiMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => chatSchema.parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const session = await getSessionUser();
    await ensureCustomer(sql, context.userId, session?.email ?? null);
    const overview = await loadOverview(sql, context.userId);

    await sql`
      insert into ai_messages (user_id, role, content)
      values (${context.userId}, 'user', ${data.message})
    `;

    const history = await sql<{ role: string; content: string }>`
      select role, content from ai_messages
      where user_id = ${context.userId}
      order by created_at desc limit 8
    `;
    const chronological = history.reverse();

    const grok = await callGrok([
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "system",
        content: `Dados atuais do cliente:\n${snapshotForAi(overview)}`,
      },
      ...chronological.map((m) => ({
        role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
        content: m.content,
      })),
    ]);

    const reply = grok.ok
      ? grok.text || "Não consegui formular uma resposta agora."
      : grok.error === "unavailable"
        ? "O assistente está indisponível neste ambiente. Você ainda pode usar Pix, cartões e boletos normalmente."
        : "Não consegui falar com o assistente agora. Tente de novo em instantes.";

    const saved = await sql<{ id: number; created_at: string }>`
      insert into ai_messages (user_id, role, content)
      values (${context.userId}, 'assistant', ${reply})
      returning id, created_at
    `;

    return {
      ok: true as const,
      message: {
        id: saved[0]?.id ?? 0,
        role: "assistant" as const,
        content: reply,
        createdAt: saved[0]?.created_at ?? new Date().toISOString(),
      },
    };
  });

export const generateInsight = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const session = await getSessionUser();
    await ensureCustomer(sql, context.userId, session?.email ?? null);
    const overview = await loadOverview(sql, context.userId);

    const grok = await callGrok([
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Gere UM insight curto (2 frases) sobre a saúde financeira deste cliente, com um próximo passo concreto. Dados:\n${snapshotForAi(overview)}`,
      },
    ]);

    const text = grok.ok
      ? grok.text
      : "Seus gastos do mês se concentram em alimentação e lazer. Guardar R$ 200 na poupança nesta semana deixa a reserva mais confortável.";

    await sql`
      insert into ai_insights (user_id, content, updated_at)
      values (${context.userId}, ${text}, now())
      on conflict (user_id) do update set content = excluded.content, updated_at = now()
    `;
    return { ok: true as const, insight: text };
  });
