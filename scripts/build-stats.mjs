// Gera assets/stats.json com os números do GitHub de cada trabalho listado
// em assets/projects.config.json. Node 20+, sem dependências.
//
//   STATS_TOKEN=<token> node scripts/build-stats.mjs
//
// Se um repositório falhar, o projeto mantém os dados do stats.json atual.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const AUTHOR = "oriajsan";
const API = "https://api.github.com";
const root = new URL("../", import.meta.url);
const CONFIG = fileURLToPath(new URL("assets/projects.config.json", root));
const OUT = fileURLToPath(new URL("assets/stats.json", root));
const MAX_RETRIES = 5;

const token = process.env.STATS_TOKEN;
if (!token) {
  console.error("Defina STATS_TOKEN com um token do GitHub.");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function gh(url) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url.startsWith("http") ? url : API + url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "portfolio-stats",
      },
    });
    if ((res.status === 403 || res.status === 429) && attempt < MAX_RETRIES) {
      const wait = rateLimitWait(res);
      if (wait !== null) {
        console.warn(`Limite da API atingido. Esperando ${Math.ceil(wait / 1000)} s…`);
        await sleep(wait);
        continue;
      }
    }
    if (res.status >= 500 && attempt < MAX_RETRIES) {
      console.warn(`GitHub respondeu ${res.status}. Tentando de novo…`);
      await sleep(2 ** attempt * 2000);
      continue;
    }
    if (res.status === 409) return { data: [], next: null }; // repositório vazio
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`${res.status} em ${url}: ${body.slice(0, 200)}`);
    }
    const next = /<([^>]+)>;\s*rel="next"/.exec(res.headers.get("link") || "")?.[1] ?? null;
    return { data: await res.json(), next };
  }
}

// Tempo de espera indicado pelos cabeçalhos, ou null se o 403 não for de limite.
function rateLimitWait(res) {
  const retryAfter = res.headers.get("retry-after");
  if (retryAfter) return Number(retryAfter) * 1000 + 1000;
  if (res.headers.get("x-ratelimit-remaining") === "0") {
    const reset = Number(res.headers.get("x-ratelimit-reset")) * 1000;
    return Math.max(reset - Date.now(), 0) + 1000;
  }
  return res.status === 429 ? 60_000 : null;
}

// Segunda-feira da semana (UTC), no formato AAAA-MM-DD.
function weekKey(iso) {
  const d = new Date(iso);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

async function paginate(url, onPage) {
  while (url) {
    const { data, next } = await gh(url);
    onPage(data);
    url = next;
  }
}

// Commits do autor na branch padrão. Com allBranches, em todas as branches
// (para repositórios com squash merge, em que os commits ficam nas branches).
async function commitDates(repo, allBranches) {
  const dates = new Map(); // sha -> data; o sha evita contar o mesmo commit duas vezes
  const branches = [null];
  if (allBranches) {
    branches.length = 0;
    await paginate(`/repos/${repo}/branches?per_page=100`, (data) => branches.push(...data.map((b) => b.name)));
  }
  for (const branch of branches) {
    const sha = branch ? `&sha=${encodeURIComponent(branch)}` : "";
    await paginate(`/repos/${repo}/commits?author=${AUTHOR}&per_page=100${sha}`, (data) => {
      for (const c of data) dates.set(c.sha, c.commit.committer?.date ?? c.commit.author?.date);
    });
  }
  return dates;
}

async function pullRequestCount(repo) {
  const q = encodeURIComponent(`is:pr author:${AUTHOR} repo:${repo}`);
  const { data } = await gh(`/search/issues?q=${q}&per_page=1`);
  return data.total_count;
}

async function buildProject(p) {
  const dates = new Map();
  let pullRequests = 0;
  for (const repo of p.repos) {
    for (const [sha, date] of await commitDates(repo, p.allBranches)) dates.set(sha, date);
    pullRequests += await pullRequestCount(repo);
  }
  const weeks = {};
  let lastActivity = null;
  for (const date of dates.values()) {
    const k = weekKey(date);
    weeks[k] = (weeks[k] || 0) + 1;
    if (!lastActivity || date > lastActivity) lastActivity = date;
  }
  const sortedWeeks = Object.fromEntries(Object.entries(weeks).sort(([a], [b]) => a.localeCompare(b)));
  return {
    id: p.id,
    commits: dates.size,
    pullRequests,
    weeks: dates.size ? sortedWeeks : null,
    lastActivity: lastActivity ? lastActivity.slice(0, 10) : null,
  };
}

const config = JSON.parse(await readFile(CONFIG, "utf8"));
let previous = { updatedAt: null, projects: [] };
try {
  previous = JSON.parse(await readFile(OUT, "utf8"));
} catch {
  console.warn("Sem stats.json anterior; começando do zero.");
}
const previousById = new Map(previous.projects.map((p) => [p.id, p]));

const projects = [];
let failures = 0;
for (const p of config.projects) {
  try {
    const s = await buildProject(p);
    projects.push(s);
    console.log(`${p.id}: ${s.commits} commits, ${s.pullRequests} PRs`);
  } catch (err) {
    failures++;
    console.error(`${p.id}: falhou (${err.message})`);
    if (previousById.has(p.id)) {
      projects.push(previousById.get(p.id));
      console.error(`${p.id}: mantendo os dados anteriores.`);
    }
  }
}
// Projetos que saíram do config somem; os que falharam sem dados anteriores ficam de fora.

// A data só muda quando algum número muda, para não gerar um commit por dia sem novidade.
const same = JSON.stringify(projects) === JSON.stringify(previous.projects);
const updatedAt = same && previous.updatedAt ? previous.updatedAt : new Date().toISOString().slice(0, 10);

await writeFile(OUT, JSON.stringify({ updatedAt, projects }, null, 2) + "\n");
console.log(same ? "Nenhum número mudou." : `stats.json atualizado (${updatedAt}).`);
if (failures) console.warn(`${failures} projeto(s) com falha; veja o log acima.`);
