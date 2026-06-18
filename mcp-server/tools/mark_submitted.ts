/**
 * Tool: mark_submitted
 *
 * Called by the user after manually submitting a proposal on Upwork.
 * Creates a row in upwork_proposals and updates the parent gig status.
 */

import { supabase } from '../supabase.ts';

export type BudgetType = 'fixed' | 'hourly';

export interface ScreeningAnswer {
  question: string;
  answer: string;
}

export interface MarkSubmittedPayload {
  gig_id: string;
  proposal_text: string;
  bid_amount: number;
  bid_type: BudgetType;
  connects_spent: number;
  screening_answers?: ScreeningAnswer[];
}

function validatePayload(payload: unknown): { valid: true; data: MarkSubmittedPayload } | { valid: false; error: string } {
  const p = payload as Record<string, unknown>;
  const required: Array<keyof MarkSubmittedPayload> = ['gig_id', 'proposal_text', 'bid_amount', 'bid_type', 'connects_spent'];

  const missing = required.filter(key => p[key] === undefined || p[key] === null || p[key] === '');
  if (missing.length > 0) {
    return { valid: false, error: `Missing required fields: ${missing.join(', ')}` };
  }

  if (!['fixed', 'hourly'].includes(p.bid_type as string)) {
    return { valid: false, error: `bid_type must be 'fixed' or 'hourly'` };
  }

  if (typeof p.bid_amount !== 'number' || p.bid_amount <= 0) {
    return { valid: false, error: 'bid_amount must be a positive number' };
  }

  if (typeof p.connects_spent !== 'number' || p.connects_spent < 0) {
    return { valid: false, error: 'connects_spent must be a non-negative number' };
  }

  if (p.screening_answers !== undefined && !Array.isArray(p.screening_answers)) {
    return { valid: false, error: 'screening_answers must be an array of {question, answer} objects' };
  }

  return { valid: true, data: (p as unknown) as MarkSubmittedPayload };
}

export async function mark_submitted(payload: unknown) {
  const validation = validatePayload(payload);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const data = validation.data;

  // Verify the gig exists
  const { data: gig, error: gigError } = await supabase
    .from('upwork_gigs')
    .select('id')
    .eq('id', data.gig_id)
    .single();

  if (gigError || !gig) {
    return { success: false, error: gigError?.message ?? 'Gig not found' };
  }

  // Insert proposal
  const { data: proposal, error: proposalError } = await supabase
    .from('upwork_proposals')
    .insert({
      gig_id: data.gig_id,
      proposal_text: data.proposal_text,
      bid_amount: data.bid_amount,
      bid_type: data.bid_type,
      connects_spent: data.connects_spent,
      screening_answers: data.screening_answers ?? [],
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (proposalError) {
    return { success: false, error: proposalError.message };
  }

  // Update gig status to submitted
  const { error: updateError } = await supabase
    .from('upwork_gigs')
    .update({ status: 'submitted' })
    .eq('id', data.gig_id);

  if (updateError) {
    return { success: false, error: `Proposal created but failed to update gig status: ${updateError.message}` };
  }

  return { success: true, data: proposal };
}
