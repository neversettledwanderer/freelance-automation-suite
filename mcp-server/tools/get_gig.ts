/**
 * Tool: get_gig
 *
 * Fetches a single gig by ID. Used by the proposal writer when given a gig_id.
 */

import { supabase } from '../supabase.ts';

export interface GetGigPayload {
  gig_id: string;
}

function validatePayload(payload: unknown): { valid: true; data: GetGigPayload } | { valid: false; error: string } {
  const p = payload as Record<string, unknown>;
  if (!p.gig_id || typeof p.gig_id !== 'string') {
    return { valid: false, error: 'Missing or invalid gig_id' };
  }
  return { valid: true, data: (p as unknown) as GetGigPayload };
}

export async function get_gig(payload: unknown) {
  const validation = validatePayload(payload);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const { data, error } = await supabase
    .from('upwork_gigs')
    .select('*')
    .eq('id', validation.data.gig_id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return { success: false, error: 'Gig not found', code: 404 };
    }
    return { success: false, error: error.message };
  }

  return { success: true, data };
}
