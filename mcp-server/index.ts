/**
 * Upwork MCP Server — Main Router
 *
 * Deployed as a Supabase Edge Function.
 * Registered in ~/.claude/claude_desktop_config.json as "upwork-hunt".
 *
 * Tools: add_gig | get_gig | update_gig | search_gigs |
 *        mark_submitted | log_contract | get_pipeline_overview
 *
 * Expects POST requests with JSON body: { tool: string, payload: object }
 */

import { add_gig } from './tools/add_gig.ts';
import { get_gig } from './tools/get_gig.ts';
import { update_gig } from './tools/update_gig.ts';
import { search_gigs } from './tools/search_gigs.ts';
import { mark_submitted } from './tools/mark_submitted.ts';
import { log_contract } from './tools/log_contract.ts';
import { get_pipeline_overview } from './tools/get_pipeline_overview.ts';

const TOOLS: Record<string, (payload: unknown) => Promise<Record<string, unknown>>> = {
  add_gig,
  get_gig,
  update_gig,
  search_gigs,
  mark_submitted,
  log_contract,
  get_pipeline_overview,
};

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed. Use POST.' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: { tool?: string; payload?: unknown };

  try {
    body = await req.json();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid JSON';
    return new Response(
      JSON.stringify({ success: false, error: `Invalid JSON body: ${message}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { tool, payload } = body;

  if (!tool || typeof tool !== 'string') {
    return new Response(
      JSON.stringify({ success: false, error: 'Missing or invalid "tool" field' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const handler = TOOLS[tool];

  if (!handler) {
    return new Response(
      JSON.stringify({ success: false, error: `Unknown tool: ${tool}` }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const result = await handler(payload ?? {});
    const status = result.success ? 200 : 400;
    return new Response(JSON.stringify(result), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Tool ${tool} crashed:`, message);
    return new Response(
      JSON.stringify({ success: false, error: `Tool execution failed: ${message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
