import fs from 'fs';
import path from 'path';

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type PayoutMethod = 'zelle' | 'usdt' | 'binance' | 'bank';

export interface Payout {
  id: string;
  provider_id: string;
  amount_usd: number;
  fee_usd: number;
  net_amount: number;
  method: PayoutMethod;
  method_details: Record<string, string>;
  status: PayoutStatus;
  reference: string;
  created_at: string;
  completed_at: string | null;
}

const PAYOUTS_PATH = path.join(process.cwd(), 'data', 'payouts.json');

function readStore(): Payout[] {
  try {
    if (!fs.existsSync(PAYOUTS_PATH)) return [];
    const raw = fs.readFileSync(PAYOUTS_PATH, 'utf-8').trim();
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeStore(payouts: Payout[]): void {
  const dir = path.dirname(PAYOUTS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(PAYOUTS_PATH, JSON.stringify(payouts, null, 2));
}

function generateReference(): string {
  const now = new Date();
  const ymd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `PAY-${ymd}-${rand}`;
}

export function createPayout(
  data: Omit<Payout, 'id' | 'reference' | 'created_at' | 'completed_at'>
): Payout {
  const payouts = readStore();
  const now = new Date().toISOString();
  const payout: Payout = {
    ...data,
    id: `po_${crypto.randomUUID().slice(0, 8)}`,
    reference: generateReference(),
    created_at: now,
    completed_at: null,
  };
  payouts.push(payout);
  writeStore(payouts);
  return payout;
}

export function getPayouts(providerId?: string): Payout[] {
  const all = readStore();
  if (!providerId) return all;
  return all.filter((p) => p.provider_id === providerId);
}

export function updatePayoutStatus(
  id: string,
  status: PayoutStatus,
  completedAt?: string
): Payout | null {
  const payouts = readStore();
  const idx = payouts.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  payouts[idx] = {
    ...payouts[idx],
    status,
    completed_at: completedAt ?? (status === 'completed' ? new Date().toISOString() : payouts[idx].completed_at),
  };
  writeStore(payouts);
  return payouts[idx];
}

export function getPendingBalance(providerId: string, paidOutBookingIds: string[] = []): number {
  // This is called with the sum of net_provider_usd from confirmed bookings
  // not yet included in a completed payout
  return 0; // Computed externally from booking data
}
