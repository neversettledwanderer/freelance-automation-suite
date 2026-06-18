/**
 * Tool: add_gig
 *
 * Inserts a new gig discovered by the scraper. The `url` column has a UNIQUE
 * constraint, so duplicate inserts are caught and the existing row is returned.
 */

import { supabase } from '../supabase.ts';

export type GigPriority = 'high' | 'medium' | 'low';
export type BudgetType = 'fixed' | 'hourly';

export interface AddGigPayload {
  title: string;
  upwork_job_id: string;
  url: string;
  budget_type: BudgetType;
  budget_min?: number;
  budget_max?: number;
  description: string;
  skills_required: string[];
  client_id?: string;
  client_name?: string;
  client_payment_verified: boolean;
  client_rating?: number;
  client_spent?: string;
  score: number;
  priority: GigPriority;
  posted_at: string; // ISO 8601
}

function validatePayload(payload: unknown): { valid: true; data: AddGigPayload } | { valid: false; error: string } {
  const p = payload as Record<string, unknown>;
  const required: Array<keyof AddGigPayload> = [
    'title',
    'upwork_job_id',
    'url',
    'budget_type',
    'description',
    'skills_required',
    'client_payment_verified',
    'score',
    'priority',
    'posted_at',
  ];

  const missing = required.filter(key => p[key] === undefined || p[key] === null || p[key] === '');
  if (missing.length > 0) {
    return { valid: false, error: `Missing required fields: ${missing.join(', ')}` };
  }

  if (!['fixed', 'hourly'].includes(p.budget_type as string)) {
    return { valid: false, error: `budget_type must be 'fixed' or 'hourly'` };
  }

  if (!['high', 'medium', 'low'].includes(p.priority as string)) {
    return { valid: false, error: `priority must be 'high', 'medium', or 'low'` };
  }

  if (!Array.isArray(p.skills_required)) {
    return { valid: false, error: 'skills_required must be an array of strings' };
  }

  return { valid: true, data: (p as unknown) as AddGigPayload };
}

export async function add_gig(payload: unknown) {
  const validation = validatePayload(payload);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const data = validation.data;

  const insert = {
    title: data.title,
    upwork_job_id: data.upwork_job_id,
    url: data.url,
    budget_type: data.budget_type,
    budget_min: data.budget_min ?? null,
    budget_max: data.budget_max ?? null,
    description: data.description,
    skills_required: data.skills_required,
    client_id: data.client_id ?? null,
    client_name: data.client_name ?? null,
    client_payment_verified: data.client_payment_verified,
    client_rating: data.client_rating ?? null,
    client_spent: data.client_spent ?? null,
    score: data.score,
    priority: data.priority,
    posted_at: data.posted_at,
  };

  const { data: row, error } = await supabase
    .from('upwork_gigs')
    .insert(insert)
    .select()
    .single();

  if (error) {
    // Unique violation on url — return existing gig instead of erroring
    if (error.code === '23505') {
      const { data: existing, error: lookupError } = await supabase
        .from('upwork_gigs')
        .select('*')
        .eq('url', data.url)
        .single();

      if (lookupError) {
        return { success: false, error: `Duplicate URL but could not fetch existing gig: ${lookupError.message}` };
      }

      return { success: true, data: existing, note: 'Gig already existed; returned existing row.' };
    }

    return { success: false, error: error.message };
  }

  return { success: true, data: row };
}
