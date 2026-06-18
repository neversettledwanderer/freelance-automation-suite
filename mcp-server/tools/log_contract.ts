/**
 * Tool: log_contract
 *
 * Inserts a new active contract into upwork_contracts. For closing/updating an
 * existing contract, use update_gig on the parent gig and re-call log_contract
 * with the completed_at/earnings/review details (or a future update_contract tool).
 */

import { supabase } from '../supabase.ts';

export type ContractType = 'fixed' | 'hourly';

export interface LogContractPayload {
  gig_id: string;
  proposal_id: string;
  client_name: string;
  contract_type: ContractType;
  rate: number;
  total_value?: number;
  started_at: string; // ISO 8601
  completed_at?: string; // ISO 8601
  earnings?: number;
  review_received?: boolean;
  review_score?: number;
}

function validatePayload(payload: unknown): { valid: true; data: LogContractPayload } | { valid: false; error: string } {
  const p = payload as Record<string, unknown>;
  const required: Array<keyof LogContractPayload> = ['gig_id', 'proposal_id', 'client_name', 'contract_type', 'rate', 'started_at'];

  const missing = required.filter(key => p[key] === undefined || p[key] === null || p[key] === '');
  if (missing.length > 0) {
    return { valid: false, error: `Missing required fields: ${missing.join(', ')}` };
  }

  if (!['fixed', 'hourly'].includes(p.contract_type as string)) {
    return { valid: false, error: `contract_type must be 'fixed' or 'hourly'` };
  }

  if (typeof p.rate !== 'number' || p.rate <= 0) {
    return { valid: false, error: 'rate must be a positive number' };
  }

  if (p.total_value !== undefined && (typeof p.total_value !== 'number' || p.total_value < 0)) {
    return { valid: false, error: 'total_value must be a non-negative number' };
  }

  if (p.earnings !== undefined && (typeof p.earnings !== 'number' || p.earnings < 0)) {
    return { valid: false, error: 'earnings must be a non-negative number' };
  }

  if (p.review_score !== undefined && (typeof p.review_score !== 'number' || p.review_score < 0 || p.review_score > 5)) {
    return { valid: false, error: 'review_score must be a number between 0 and 5' };
  }

  return { valid: true, data: (p as unknown) as LogContractPayload };
}

export async function log_contract(payload: unknown) {
  const validation = validatePayload(payload);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const data = validation.data;

  const insert = {
    gig_id: data.gig_id,
    proposal_id: data.proposal_id,
    client_name: data.client_name,
    contract_type: data.contract_type,
    rate: data.rate,
    total_value: data.total_value ?? null,
    started_at: data.started_at,
    completed_at: data.completed_at ?? null,
    earnings: data.earnings ?? null,
    review_received: data.review_received ?? false,
    review_score: data.review_score ?? null,
  };

  const { data: row, error } = await supabase
    .from('upwork_contracts')
    .insert(insert)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: row };
}
