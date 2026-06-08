interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * RemoteOK MCP — remote-work job board (tech-heavy), keyless.
 *
 * Wraps the public RemoteOK API (https://remoteok.com/api): list the most
 * recent remote jobs, keyword-search them, or fetch a full posting by id.
 * Salaries are in USD when present (0 means not disclosed).
 */


const BASE = 'https://remoteok.com/api';
const UA = 'pipeworx/1.0 (+https://pipeworx.io)';

interface RawJob {
  id?: unknown;
  position?: unknown;
  company?: unknown;
  location?: unknown;
  tags?: unknown;
  salary_min?: unknown;
  salary_max?: unknown;
  date?: unknown;
  url?: unknown;
  description?: unknown;
  legal?: unknown;
  [key: string]: unknown;
}

const tools: McpToolExport['tools'] = [
  {
    name: 'list_jobs',
    description:
      'List the most recent remote jobs from RemoteOK (a popular, tech-heavy remote-work job board; keyless). Returns the newest postings (id, position, company, location, tags, salary range, date, url) without the long HTML description. Salaries are USD when present (0 = not disclosed).',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max jobs to return (default 20, max 100).' },
      },
    },
  },
  {
    name: 'search_jobs',
    description:
      'Keyword-search current RemoteOK remote-job listings. Matches the query (case-insensitive) against job position, company name, or any tag. Tech-heavy board; keyless. Returns matching postings (id, position, company, location, tags, salary range, date, url). Salaries are USD when present.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Keyword to match against position, company, or tags (e.g. "javascript", "designer").' },
        limit: { type: 'number', description: 'Max jobs to return (default 20).' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_job',
    description:
      'Get the full RemoteOK job posting for a given job id, including the full HTML description. Use an id returned by list_jobs or search_jobs. Only jobs in the current ~100 most-recent listings are available. Salaries are USD when present.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'RemoteOK job id (string), e.g. "1132995".' },
      },
      required: ['id'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    switch (name) {
      case 'list_jobs': {
        const jobs = await fetchJobs();
        if ('error' in jobs) return jobs;
        const limit = clampLimit(args.limit, 20, 100);
        const out = jobs.list.slice(0, limit).map(summarize);
        return { count: out.length, jobs: out };
      }
      case 'search_jobs': {
        const query = typeof args.query === 'string' ? args.query.trim() : '';
        if (!query) return { error: 'Required argument "query" is missing. Pass a keyword string like "javascript".' };
        const jobs = await fetchJobs();
        if ('error' in jobs) return jobs;
        const limit = clampLimit(args.limit, 20, 100);
        const q = query.toLowerCase();
        const matched = jobs.list.filter((j) => {
          const position = str(j.position).toLowerCase();
          const company = str(j.company).toLowerCase();
          const tags = Array.isArray(j.tags) ? j.tags.map((t) => str(t).toLowerCase()) : [];
          return position.includes(q) || company.includes(q) || tags.some((t) => t.includes(q));
        });
        const out = matched.slice(0, limit).map(summarize);
        return { query, count: out.length, jobs: out };
      }
      case 'get_job': {
        const id = typeof args.id === 'string' ? args.id.trim() : args.id != null ? String(args.id) : '';
        if (!id) return { error: 'Required argument "id" is missing. Pass a RemoteOK job id string like "1132995".' };
        const jobs = await fetchJobs();
        if ('error' in jobs) return jobs;
        const found = jobs.list.find((j) => str(j.id) === id);
        if (!found) return { error: 'job not found in current listings', id };
        return full(found);
      }
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

async function fetchJobs(): Promise<{ list: RawJob[] } | { error: string }> {
  let res: Response;
  try {
    res = await fetch(BASE, { headers: { Accept: 'application/json', 'User-Agent': UA } });
  } catch (e) {
    return { error: `RemoteOK request failed: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (!res.ok) return { error: `RemoteOK: ${res.status} ${(await res.text().catch(() => '')).slice(0, 200)}` };
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { error: 'unexpected response from RemoteOK' };
  }
  if (!Array.isArray(body)) return { error: 'unexpected response from RemoteOK' };
  // Drop the legal/metadata object (has a `legal` key, no `position`) and any
  // malformed elements lacking a position.
  const list = (body as RawJob[]).filter(
    (el) => el && typeof el === 'object' && !('legal' in el) && typeof el.position === 'string' && el.position.length > 0,
  );
  return { list };
}

function summarize(j: RawJob): Record<string, unknown> {
  return {
    id: str(j.id),
    position: str(j.position),
    company: str(j.company),
    location: str(j.location),
    tags: Array.isArray(j.tags) ? j.tags.map(str) : [],
    salary_min: num(j.salary_min),
    salary_max: num(j.salary_max),
    date: str(j.date),
    url: str(j.url),
  };
}

function full(j: RawJob): Record<string, unknown> {
  return {
    id: str(j.id),
    position: str(j.position),
    company: str(j.company),
    location: str(j.location),
    tags: Array.isArray(j.tags) ? j.tags.map(str) : [],
    salary_min: num(j.salary_min),
    salary_max: num(j.salary_max),
    date: str(j.date),
    url: str(j.url),
    apply_url: str(j.apply_url),
    description: str(j.description),
  };
}

function clampLimit(v: unknown, def: number, max: number): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : def;
  if (n < 1) return 1;
  return Math.min(n, max);
}

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
