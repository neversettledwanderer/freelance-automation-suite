/**
 * Tool: update_gig
 *
 * Updates status, notes, and/or score on an existing gig.
 */

import { supabase } from '../supabase.ts';

export type GigStatus =
  | 'discovered'
  | 'triaged'
  | 'proposal_ready'
  | 'submitted'
  | 'viewed'
  | 'shortlisted'
  | 'interviewing'
  | 'contract_offered'
  | 'active'
  | 'completed'
  | 'archived';

export interface UpdateGigPayload {
  gig_id: string;
  status?: GigStatus;
  notes?: string;
  score?: number;
}

const VALID_STATUSES: GigStatus[] = [
  'discovered',
  'triaged',
  'proposal_ready',
  'submitted',
  'viewed',
  'shortlisted',
  'interviewing',
  'contract_offered',
  'active',
  'completed',
  'archived',
];

function validatePayload(payload: unknown): { valid: true; data: UpdateGigPayload } | { valid: false; error: string } {
  const p = payload as Record<string, unknown>;
  if (!p.gig_id || typeof p.gig_id !== 'string') {
    return { valid: false, error: 'Missing or invalid gig_id' };
  }

  if (p.status !== undefined && !VALID_STATUSES.includes(p.status as GigStatus)) {
    return { valid: false, error: `Invalid status: ${p.status}` };
  }

  if (p.score !== undefined && (typeof p.score !== 'number' || p.score < 0 || p.score > 100)) {
    return { valid: false, error: 'score must be a number between 0 and 100' };
  }

  return { valid: true, data: (p as unknown) as UpdateGigPayload };
}

export async function update_gig(payload: unknown) {
  const validation = validatePayload(payload);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const { gig_id, status, notes, score } = validation.data;
  const update: Record<string, unknown> = {};
  if (status !== undefined) update.status = status;
  if (notes !== undefined) update.notes = notes;
  if (score !== undefined) update.score = score;

  if (Object.keys(update).length === 0) {
    return { success: false, error: 'No fields provided to update' };
  }

  const { data, error } = await supabase
    .from('upwork_gigs')
    .update(update)
    .eq('id', gig_id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}
