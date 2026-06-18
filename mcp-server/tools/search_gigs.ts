/**
 * Tool: search_gigs
 *
 * Search the upwork_gigs table by id, status, priority, posted_after, or free-text query.
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

export type GigPriority = 'high' | 'medium' | 'low';

export interface SearchGigsPayload {
  id?: string;
  status?: GigStatus;
  priority?: GigPriority;
  posted_after?: string; // ISO 8601
  query?: string;
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

const VALID_PRIORITIES: GigPriority[] = ['high', 'medium', 'low'];

function validatePayload(payload: unknown): { valid: true; data: SearchGigsPayload } | { valid: false; error: string } {
  const p = payload as Record<string, unknown>;

  if (p.status !== undefined && !VALID_STATUSES.includes(p.status as GigStatus)) {
    return { valid: false, error: `Invalid status: ${p.status}` };
  }

  if (p.priority !== undefined && !VALID_PRIORITIES.includes(p.priority as GigPriority)) {
    return { valid: false, error: `Invalid priority: ${p.priority}` };
  }

  return { valid: true, data: p as SearchGigsPayload };
}

export async function search_gigs(payload: unknown) {
  const validation = validatePayload(payload);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const { id, status, priority, posted_after, query } = validation.data;

  let dbQuery = supabase.from('upwork_gigs').select('*');

  if (id) {
    dbQuery = dbQuery.eq('id', id);
  }
  if (status) {
    dbQuery = dbQuery.eq('status', status);
  }
  if (priority) {
    dbQuery = dbQuery.eq('priority', priority);
  }
  if (posted_after) {
    dbQuery = dbQuery.gte('posted_at', posted_after);
  }
  if (query && typeof query === 'string' && query.trim().length > 0) {
    const term = `%${query.trim()}%`;
    dbQuery = dbQuery.or(`title.ilike.${term},description.ilike.${term}`);
  }

  const { data, error } = await dbQuery.order('posted_at', { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data ?? [] };
}
