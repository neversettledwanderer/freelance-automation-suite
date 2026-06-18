/**
 * Tool: get_pipeline_overview
 *
 * Returns a summary of the pipeline:
 *   - total gigs grouped by status
 *   - proposals sent this week
 *   - response rate (responded / submitted)
 *   - active contracts count
 */

import { supabase } from '../supabase.ts';

function startOfWeek() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diff = now.getDate() - day;
  const start = new Date(now.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

export async function get_pipeline_overview(_payload: unknown) {
  // Count gigs by status
  const { data: statusRows, error: statusError } = await supabase
    .from('upwork_gigs')
    .select('status');

  if (statusError) {
    return { success: false, error: statusError.message };
  }

  const gigsByStatus: Record<string, number> = {};
  for (const row of statusRows ?? []) {
    gigsByStatus[row.status] = (gigsByStatus[row.status] || 0) + 1;
  }

  // Proposals submitted this week
  const weekStart = startOfWeek();
  const { count: proposalsThisWeek, error: proposalsError } = await supabase
    .from('upwork_proposals')
    .select('*', { count: 'exact', head: true })
    .gte('submitted_at', weekStart);

  if (proposalsError) {
    return { success: false, error: proposalsError.message };
  }

  // Response rate: proposals with response_received_at / total submitted
  const { data: allProposals, error: allProposalsError } = await supabase
    .from('upwork_proposals')
    .select('response_received_at');

  if (allProposalsError) {
    return { success: false, error: allProposalsError.message };
  }

  const totalSubmitted = (allProposals ?? []).length;
  const totalResponded = (allProposals ?? []).filter(p => p.response_received_at !== null).length;
  const responseRate = totalSubmitted > 0 ? totalResponded / totalSubmitted : 0;

  // Active contracts
  const { count: activeContracts, error: contractsError } = await supabase
    .from('upwork_contracts')
    .select('*', { count: 'exact', head: true })
    .is('completed_at', null);

  if (contractsError) {
    return { success: false, error: contractsError.message };
  }

  return {
    success: true,
    data: {
      gigs_by_status: gigsByStatus,
      proposals_sent_this_week: proposalsThisWeek ?? 0,
      total_submitted: totalSubmitted,
      total_responded: totalResponded,
      response_rate: Number(responseRate.toFixed(2)),
      active_contracts: activeContracts ?? 0,
    },
  };
}
