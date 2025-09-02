import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const app = express();
app.use(express.json({ limit: '5mb' }));

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function auth(req: Request): boolean {
  const header = req.header('authorization') || req.header('Authorization');
  if (!header) return false;
  const token = header.replace(/^Bearer\s+/i, '');
  return Boolean(token) && token === process.env.PARSER_API_KEY;
}

app.post('/parse', async (req: Request, res: Response) => {
  try {
    if (!auth(req)) return res.status(401).json({ error: 'Unauthorized' });

    const { html, url, marketplace_id = 1, options } = (req.body ?? {}) as {
      html?: string;
      url?: string;
      marketplace_id?: number;
      options?: { dry_run?: boolean };
    };

    let htmlInput: string | null = null;
    if (typeof html === 'string' && html.trim().length > 0) {
      htmlInput = html;
    } else if (typeof url === 'string' && url.trim().length > 0) {
      const r = await fetch(url, { headers: { 'User-Agent': 'mdparser-worker/1.0' } });
      if (!r.ok) return res.status(400).json({ error: `Failed to fetch url (${r.status})` });
      htmlInput = await r.text();
    } else {
      return res.status(400).json({ error: 'Provide html or url' });
    }

    const supabaseUrl = requireEnv('SUPABASE_URL');
    const supabaseKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Resolve ścieżkę do mdparser/dist/src/mdparser.js i załaduj przez CommonJS
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const parserPath = resolve(__dirname, '../mdparser/dist/src/mdparser.cjs');
    const require = createRequire(import.meta.url);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(parserPath);
    const parseAndSave = mod.parseAndSave || (mod.default && mod.default.parseAndSave);

    const result = await parseAndSave(htmlInput, supabase, {
      marketplace_id: Number(marketplace_id) || 1,
      dry_run: options?.dry_run === true ? true : false
    });

    return res.json({ parsed: result.products, saved: result.saved, errors: result.errors });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Internal error' });
  }
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`mdparser-worker listening on :${port}`);
});


