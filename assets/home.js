/* ------------------------------------------------------------------
   Página inicial. Os textos vêm de projects.config.json; os números, de
   stats.json, gerado todo dia pelo GitHub Action (scripts/build-stats.mjs).
------------------------------------------------------------------- */
const $ = (id) => document.getElementById(id);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const css = getComputedStyle(document.documentElement);
const colorOf = (id) => css.getPropertyValue(`--p-${id}`).trim() || "#a9b1c2";
// Textos, números e datas no idioma atual (assets/i18n.js)
const t = (key, vars) => I18N.t(key, vars);
const L = (value) => I18N.pick(value);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const scene3d = $("scene");
let loaded = null; // { projects, updatedAt }, para redesenhar ao trocar de idioma
let config = null;

// Arquivo opcional (imagem de projeto, currículo): só aparece se existir, sem link quebrado
const exists = new Map();
function assetExists(url) {
  if (!exists.has(url)) {
    exists.set(url, fetch(url, { method: "HEAD", cache: "no-cache" }).then((r) => r.ok).catch(() => false));
  }
  return exists.get(url);
}

async function loadJSON(url) {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function main() {
  showResume();
  let stats;
  const [cfg, st] = await Promise.allSettled([loadJSON("assets/projects.config.json"), loadJSON("assets/stats.json")]);
  if (cfg.status === "fulfilled") {
    config = cfg.value;
    renderPast();
    I18N.onChange(renderPast);
  }
  if (cfg.status !== "fulfilled" || st.status !== "fulfilled") {
    scene3d.style.aspectRatio = "auto";
    scene3d.innerHTML = `<p class="fallback" data-i18n="scene.noData">${esc(t("scene.noData"))}</p>`;
    $("job-list").outerHTML = `<p class="load-error" data-i18n="work.error">${esc(t("work.error"))}</p>`;
    $("project-list").outerHTML = `<p class="load-error" data-i18n="projects.error">${esc(t("projects.error"))}</p>`;
    observeReveals();
    return;
  }
  stats = st.value;

  // Junta texto e números por id; quem não tem commits não aparece
  const byId = new Map(stats.projects.map((s) => [s.id, s]));
  const projects = config.projects
    .map((c) => ({ ...c, ...byId.get(c.id), isWork: c.category === "work" }))
    .filter((p) => p.commits > 0)
    // Ordem das órbitas: trabalho em andamento primeiro, depois atividade mais recente
    .sort((a, b) => (b.ongoing - a.ongoing) || String(b.lastActivity).localeCompare(String(a.lastActivity)));

  loaded = { projects, updatedAt: stats.updatedAt };
  renderSceneStats(projects, stats.updatedAt);
  renderList(projects);
  attachShots(projects);
  observeReveals();
  paintGlobes(projects);
  if (projects.length) {
    try {
      buildScene(projects);
    } catch (e) {
      scene3d.style.aspectRatio = "auto";
      scene3d.innerHTML = `<p class="fallback" data-i18n="scene.noWebGL">${esc(t("scene.noWebGL"))}</p>`;
    }
  }

  // Troca de idioma: redesenha o que é gerado por código, mantendo o destaque
  I18N.onChange(() => {
    renderSceneStats(loaded.projects, loaded.updatedAt);
    renderList(loaded.projects);
    attachShots(loaded.projects);
    observeReveals();
    paintGlobes(loaded.projects);
    if (selectedId) $(selectedId)?.classList.add("arrived");
    document.querySelectorAll(".tag").forEach((tag) => {
      const p = loaded.projects.find((x) => x.id === tag.dataset.id);
      if (p) tag.setAttribute("aria-label", tagLabel(p));
    });
  });

  // Endereço com #id: vai até a ficha depois que ela existe
  const target = location.hash && document.getElementById(location.hash.slice(1));
  if (target && target.classList.contains("entry")) scrollToEntry(target, "auto");
}

/* ---------- Totais: uma linha discreta junto da legenda do sistema solar ---------- */
function renderSceneStats(projects, updatedAt) {
  const el = $("scene-stats");
  if (!projects.length || !updatedAt) { el.hidden = true; return; }
  el.textContent = t("scene.stats", {
    commits: I18N.num(projects.reduce((s, p) => s + p.commits, 0)),
    prs: I18N.num(projects.reduce((s, p) => s + (p.pullRequests || 0), 0)),
    date: I18N.day(updatedAt),
  });
  el.hidden = false;
}

/* ---------- Antes disso e formação: textos fixos do config, sem planeta ---------- */
function renderPast() {
  const item = (id, title, org, note, period, mode, desc) => `
<li class="past-item reveal" id="${esc(id)}">
  <p class="when"><span class="period">${esc(period)}</span>${mode ? `<span class="mode">${esc(mode)}</span>` : ""}</p>
  <div class="what">
    <h4>${esc(title)}</h4>
    <p class="org">${esc(org)}${note ? ` · ${esc(note)}` : ""}</p>
    ${desc ? `<p class="desc">${esc(desc)}</p>` : ""}
  </div>
</li>`;
  const past = config.experience || [];
  const edu = config.education || [];
  $("past-list").innerHTML = past.map((x) => item(`antes-${x.id}`, L(x.role), L(x.org), L(x.note), L(x.period), L(x.mode), L(x.desc))).join("");
  $("edu-list").innerHTML = edu.map((x) => item(`formacao-${x.id}`, L(x.degree), L(x.org), "", L(x.period), L(x.note), L(x.desc))).join("");
  $("past-block").hidden = !past.length;
  $("edu-block").hidden = !edu.length;
  // A seção aparece mesmo que os dados do GitHub não carreguem
  if (past.length || edu.length) $("experiencia").hidden = false;
  observeReveals();
}

/* ---------- Currículo: o item só aparece se o PDF estiver publicado ---------- */
function showResume() {
  const item = $("cv-item");
  const href = item?.querySelector("a")?.getAttribute("href");
  if (href) assetExists(href).then((ok) => { item.hidden = !ok; });
}

/* ---------- Fichas ---------- */
function curveHTML(p) {
  const note = L(p.freqNote);
  if (!p.weeks || !Object.keys(p.weeks).length) {
    return `<figure class="curve empty"><svg viewBox="0 0 300 72" preserveAspectRatio="none" aria-hidden="true"><path class="line" d="M0 70 H300"/></svg><figcaption>${esc(note || t("curve.empty"))}</figcaption></figure>`;
  }
  const keys = Object.keys(p.weeks).sort();
  const start = new Date(keys[0] + "T00:00:00Z");
  const end = new Date(keys[keys.length - 1] + "T00:00:00Z");
  const n = Math.max(2, Math.round((end - start) / (7 * 864e5)) + 1);
  const vals = Array.from({ length: n }, (_, i) =>
    p.weeks[new Date(start.getTime() + i * 7 * 864e5).toISOString().slice(0, 10)] || 0);
  const max = Math.max(...vals);
  const W = 300, H = 72;
  const pts = vals.map((v, i) => [ (i / (n - 1)) * W, H - 2 - (v / max) * (H - 8) ]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${W} ${H} L0 ${H} Z`;
  const active = vals.filter(Boolean).length;
  const label = t("curve.label", {
    commits: I18N.num(p.commits), weeks: active, max: I18N.num(max),
    weeksWord: t(active === 1 ? "curve.week" : "curve.weeks"),
  });
  return `<figure class="curve">
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(t("curve.title"))} ${esc(label)}">
      <line class="base" x1="0" y1="${H}" x2="${W}" y2="${H}"/>
      <path class="area" d="${area}"/><path class="line" d="${line}"/>
    </svg>
    <div class="ends"><span>${I18N.month(start)}</span><span>${I18N.month(end)}</span></div>
    <figcaption>${esc(t("curve.title"))} ${esc(label)}${note ? " " + esc(note) : ""}</figcaption>
  </figure>`;
}

const globeSize = (c) => Math.round(40 + 4.2 * Math.sqrt(c));

function renderList(projects) {
  // Trabalho e projetos em seções separadas; o número da órbita continua o mesmo
  const html = { job: [], project: [] };
  projects.forEach((p, i) => html[p.isWork ? "job" : "project"].push(entryHTML(p, i)));
  $("job-list").innerHTML = html.job.join("");
  $("project-list").innerHTML = html.project.join("");
  $("experiencia").hidden = !html.job.length && !(config?.experience?.length || config?.education?.length);
  $("projetos").hidden = !html.project.length;
  $("legend").hidden = !html.job.length || !html.project.length;
}

function entryHTML(p, i) {
  const links = (p.links || []).filter(([, h]) => !h.startsWith("#"));
  const kind = p.isWork && p.role
    ? `${L(p.role)} · ${t(p.ongoing ? "entry.current" : "entry.past")}`
    : L(p.kind);
  return `
<li class="entry reveal${p.isWork ? " is-work" : ""}" id="${esc(p.id)}" style="--c:var(--dot-${esc(p.id)}, var(--muted)); --g:${globeSize(p.commits)}px">
  <div class="globe-slot" aria-hidden="true"><span class="globe"><span class="orb"><span class="surface"></span></span></span></div>
  <div class="body">
    <h3 tabindex="-1">${esc(p.name)}</h3>
    <p class="kind">${esc(kind)}, ${esc(t("entry.orbit", { n: I18N.ordinal(i + 1) }))}</p>
    <p class="desc">${esc(L(p.desc))}</p>
    <dl class="measures">
      <div class="main"><dt>${esc(t("entry.period"))}</dt><dd>${esc(L(p.period))}</dd></div>
      <div class="minor"><dt>${esc(t("entry.commits"))}</dt><dd>${I18N.num(p.commits)}</dd></div>
      <div class="minor"><dt>${esc(t("entry.prs"))}</dt><dd>${I18N.num(p.pullRequests || 0)}</dd></div>
    </dl>
    <p class="stack">${esc(t(p.isWork ? "entry.usesDaily" : "entry.builtWith"))} <strong>${esc(L(p.stack))}</strong>.</p>
    ${links.length ? `<div class="links">${links.map(([text, h]) => `<a href="${esc(h)}">${esc(L(text))}</a>`).join("")}</div>` : ""}
  </div>
  ${curveHTML(p)}
</li>`;
}

/* ---------- Imagem opcional do projeto (campo "image" no config) ---------- */
// Sem imagem, ou com o arquivo ausente, a ficha fica como antes: nada é inserido.
function attachShots(projects) {
  for (const p of projects) {
    if (!p.image) continue;
    assetExists(p.image).then((ok) => {
      const body = document.querySelector(`#${CSS.escape(p.id)} .body`);
      if (!ok || !body || body.querySelector(".shot")) return;
      const fig = document.createElement("figure");
      fig.className = "shot";
      const img = document.createElement("img");
      img.src = p.image;
      img.alt = L(p.imageAlt) || "";
      img.loading = "lazy";
      img.decoding = "async";
      img.width = p.imageWidth || 1600;
      img.height = p.imageHeight || 1000;
      img.addEventListener("error", () => fig.remove());
      fig.append(img);
      body.querySelector(".desc").after(fig);
    });
  }
}

const tagLabel = (p) => t(p.isWork ? "tag.work" : "tag.project", { name: p.name });

/* ---------- Texturas nos planetas das fichas ---------- */
// Gera em segundo plano; até lá, os planetas ficam com a cor sólida
const textureOf = (id) => window.planetTextureAsync
  ? window.planetTextureAsync(id, colorOf(id)).catch(() => null)
  : Promise.resolve(null);

function paintGlobes(projects) {
  for (const p of projects) {
    textureOf(p.id).then((canvas) => {
      const globe = document.querySelector(`#${CSS.escape(p.id)} .globe`);
      if (canvas && globe) globe.style.setProperty("--tex", `url(${canvas.toDataURL("image/jpeg", 0.85)})`);
    });
  }
}

/* Leva a ficha para o centro da tela, onde ela ganha mais foco. Se a ficha for
   mais alta que a tela (comum no celular), alinha pelo topo para o título não sumir. */
function scrollToEntry(entry, behavior) {
  const fits = entry.offsetHeight <= window.innerHeight - 32;
  entry.scrollIntoView({ behavior, block: fits ? "center" : "start" });
}

/* ---------- Clique no planeta: destaca e rola até a ficha ---------- */
let selectedId = null;
function goTo(id) {
  selectedId = id;
  const card = $(id);
  if (!card) return;
  scrollToEntry(card, reduceMotion ? "auto" : "smooth");
  history.replaceState(null, "", `#${id}`);
  card.querySelector("h3").focus({ preventScroll: true });
  document.querySelectorAll(".entry.arrived").forEach((e) => e.classList.remove("arrived"));
  card.classList.add("arrived");
}

/* ---------- Cena 3D ---------- */
function buildScene(projects) {
  if (!window.THREE) throw new Error("three");
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0); // transparente: as estrelas do hero aparecem por trás
  scene3d.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 400);

  // Sol
  const sunR = 2.4;
  const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xf2b84b });
  const sun = new THREE.Mesh(new THREE.SphereGeometry(sunR, 64, 64), sunMaterial);
  textureOf("sun").then((canvas) => {
    if (!canvas) return;
    sunMaterial.map = new THREE.CanvasTexture(canvas);
    sunMaterial.color.set(0xffffff);
    sunMaterial.needsUpdate = true;
  });
  scene.add(sun);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(sunR * 1.35, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0xf2b84b, transparent: true, opacity: 0.12 }));
  scene.add(glow);
  scene.add(new THREE.PointLight(0xfff1d6, 2.2, 0, 1.2));
  scene.add(new THREE.AmbientLight(0xffffff, 0.42));
  const fill = new THREE.DirectionalLight(0xdfe6ff, 0.55);
  camera.add(fill);
  scene.add(camera);

  // Planetas: tamanho pela raiz dos commits, órbita pela ordem de atividade.
  // Cada órbita começa depois da borda da anterior (planeta + anéis + folga),
  // então nenhum planeta ou anel encosta no Sol ou no vizinho.
  const RING_OUTER = 1.86, GAP = 0.9;
  let edge = sunR * 1.35; // borda do brilho do Sol
  const layout = projects.map((p) => {
    const radius = 0.35 + 0.075 * Math.sqrt(p.commits);
    const reach = radius * (p.isWork ? RING_OUTER : 1);
    const orbit = edge + GAP + reach;
    edge = orbit + reach;
    return { radius, orbit };
  });

  const bodies = projects.map((p, i) => {
    const { radius, orbit } = layout[i];
    const color = new THREE.Color(colorOf(p.id));
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05 });
    textureOf(p.id).then((canvas) => {
      if (!canvas) return;
      material.map = new THREE.CanvasTexture(canvas);
      material.map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      material.color.set(0xffffff);
      material.roughness = 0.78;
      material.metalness = 0;
      material.needsUpdate = true;
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 48), material);
    mesh.rotation.z = 0.18 * (i % 2 ? -1 : 1); // leve inclinação do eixo
    mesh.userData.id = p.id;
    scene.add(mesh);

    // Anéis, como os de Saturno: marcam o trabalho profissional
    if (p.isWork) {
      const ringColor = color.clone().lerp(new THREE.Color(0xffffff), 0.35);
      for (const [inner, outer, opacity] of [[1.3, 1.58, 0.5], [1.64, RING_OUTER, 0.28]]) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(radius * inner, radius * outer, 96),
          new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false }));
        ring.rotation.x = Math.PI / 2;
        ring.userData.id = p.id;
        mesh.add(ring);
      }
    }

    const ringPts = [];
    for (let k = 0; k <= 128; k++) {
      const a = (k / 128) * Math.PI * 2;
      ringPts.push(new THREE.Vector3(Math.cos(a) * orbit, 0, Math.sin(a) * orbit));
    }
    scene.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ringPts),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16 })));


    const tag = document.createElement("button");
    tag.className = "tag";
    tag.type = "button";
    tag.dataset.id = p.id;
    tag.style.setProperty("--c", colorOf(p.id));
    tag.textContent = p.name;
    tag.setAttribute("aria-label", tagLabel(p));
    tag.addEventListener("click", () => goTo(p.id));
    scene3d.appendChild(tag);

    return { p, mesh, tag, radius, orbit,
      angle: (i * 2.1 + 0.6) % (Math.PI * 2),
      speed: 0.32 / Math.pow(orbit, 1.5) * 6 };
  });

  // Câmera inclinada 46° acima do plano das órbitas. O enquadramento é calculado:
  // a câmera fica na menor distância em que todos os pontos que um planeta (ou
  // anel) pode ocupar ao longo da órbita cabem na cena, e o conjunto é centralizado
  // na vertical. Com a câmera inclinada, a frente da órbita fica mais perto e
  // aparece maior; por isso uma estimativa simples cortava os planetas embaixo.
  const tilt = THREE.MathUtils.degToRad(46);
  const viewDir = new THREE.Vector3(0, Math.sin(tilt), Math.cos(tilt));
  const extents = [];
  for (const b of bodies) {
    const reach = b.radius * (b.p.isWork ? RING_OUTER : 1);
    const yExt = Math.max(b.radius, reach * Math.sin(0.18)); // anéis inclinados com o eixo
    for (let k = 0; k < 48; k++) {
      const a = (k / 48) * Math.PI * 2;
      for (const r of [b.orbit - reach, b.orbit + reach]) {
        for (const y of [-yExt, yExt]) extents.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
      }
    }
  }
  const target = new THREE.Vector3(), up = new THREE.Vector3(), tmp = new THREE.Vector3();
  const place = (d) => {
    camera.position.copy(target).addScaledVector(viewDir, d);
    camera.lookAt(target);
    camera.updateMatrixWorld(true);
  };
  const bounds = () => {
    const box = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, behind: false };
    for (const pt of extents) {
      tmp.copy(pt).project(camera);
      if (tmp.z > 1) box.behind = true;
      box.x0 = Math.min(box.x0, tmp.x); box.x1 = Math.max(box.x1, tmp.x);
      box.y0 = Math.min(box.y0, tmp.y); box.y1 = Math.max(box.y1, tmp.y);
    }
    return box;
  };
  const MARGIN = 0.96; // 2% de respiro em cada borda
  const fitsAt = (d) => {
    place(d);
    const b = bounds();
    return !b.behind && b.x0 >= -MARGIN && b.x1 <= MARGIN && b.y0 >= -MARGIN && b.y1 <= MARGIN;
  };
  const nearestFit = () => {
    let lo = 1, hi = 600;
    for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (fitsAt(mid)) hi = mid; else lo = mid; }
    place(hi);
    return hi;
  };

  function fit() {
    const w = scene3d.clientWidth, h = scene3d.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const halfV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    target.set(0, 0, 0);
    for (let pass = 0; pass < 3; pass++) {
      const d = nearestFit();
      const b = bounds();
      up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      target.addScaledVector(up, ((b.y0 + b.y1) / 2) * halfV * d); // centraliza na vertical
    }
    nearestFit();

    // As etiquetas ficam abaixo dos planetas e podem passar da borda de baixo
    // da cena. Calcula o ponto mais baixo possível de cada uma ao longo da
    // órbita e reserva esse espaço, para não cobrirem a legenda.
    const tagH = bodies[0].tag.offsetHeight || 32;
    const probe = new THREE.Vector3();
    let lowest = 0;
    for (const b of bodies) {
      for (let k = 0; k < 36; k++) {
        const a = (k / 36) * Math.PI * 2;
        probe.set(Math.cos(a) * b.orbit, -b.radius, Math.sin(a) * b.orbit).project(camera);
        lowest = Math.max(lowest, (-probe.y * 0.5 + 0.5) * h + 6 + tagH);
      }
    }
    scene3d.style.marginBottom = `${Math.max(0, Math.ceil(lowest - h))}px`;
  }
  new ResizeObserver(fit).observe(scene3d);
  fit();

  // Interação
  let hovering = false;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(bodies.map((b) => b.mesh), true)[0];
    return hit && hit.object.userData.id;
  }
  renderer.domElement.addEventListener("pointermove", (ev) => {
    renderer.domElement.style.cursor = pick(ev) ? "pointer" : "default";
  });
  renderer.domElement.addEventListener("click", (ev) => {
    const id = pick(ev);
    if (id) goTo(id);
  });
  scene3d.addEventListener("pointerenter", () => (hovering = true));
  scene3d.addEventListener("pointerleave", () => (hovering = false));

  // Fora da tela, a cena não é desenhada (economiza bateria e CPU durante a rolagem)
  let onScreen = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }).observe(scene3d);
  }

  const v = new THREE.Vector3();
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!onScreen) { requestAnimationFrame(frame); return; }
    const moving = !reduceMotion && !hovering && !scene3d.matches(":focus-within");
    const w = scene3d.clientWidth, h = scene3d.clientHeight;
    for (const b of bodies) {
      if (moving) b.angle += b.speed * dt;
      b.mesh.position.set(Math.cos(b.angle) * b.orbit, 0, Math.sin(b.angle) * b.orbit);
      b.mesh.rotation.y += moving ? dt * 0.4 : 0;
      v.copy(b.mesh.position); v.y -= b.radius;
      v.project(camera);
      const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h + 6;
      b.tag.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }
    if (moving) sun.rotation.y += dt * 0.06;
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ---------- Estrelas: cobrem as seções escuras (hero e contato) ---------- */
function drawStars() {
  document.querySelectorAll("canvas.stars").forEach((canvas, index) => drawStarsIn(canvas, 7 + index * 131));
}

function drawStarsIn(canvas, starSeed) {
  const host = canvas.parentElement;
  const draw = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight, dpr = Math.min(devicePixelRatio, 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Posições fixas pela semente; a quantidade acompanha a área
    let seed = starSeed;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const count = Math.round((w * h) / 1500);
    for (let i = 0; i < count; i++) {
      const x = rnd() * w, y = rnd() * h, big = rnd() > 0.97;
      const r = big ? 0.9 + rnd() * 0.7 : 0.35 + rnd() * 0.55;
      const tint = rnd();
      const color = tint > 0.9 ? "255, 226, 196" : tint > 0.8 ? "206, 222, 255" : "255, 255, 255";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color}, ${big ? 0.95 : 0.3 + rnd() * 0.55})`;
      ctx.fill();
    }
  };
  new ResizeObserver(draw).observe(host);
}

/* ---------- Animações de rolagem ----------
   - estrelas em paralaxe: andam mais devagar que a página, como se estivessem longe;
   - fichas, títulos e contato "chegam" quando entram na tela.
   Nada disso roda com prefers-reduced-motion. O conteúdo só fica escondido
   para a animação se este script estiver rodando (classe "motion" no <html>). */
const motionOK = !reduceMotion && "IntersectionObserver" in window;
if (motionOK) document.documentElement.classList.add("motion");

const seenIds = new Set(); // ao trocar de idioma as fichas são recriadas; as já vistas não animam de novo
let revealObserver = null;
function observeReveals() {
  const items = document.querySelectorAll(".reveal:not(.seen)");
  if (!motionOK) { items.forEach((el) => el.classList.add("seen")); return; }
  revealObserver = revealObserver || new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add("seen");
      if (e.target.id) seenIds.add(e.target.id);
      revealObserver.unobserve(e.target);
    }
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
  items.forEach((el) => (el.id && seenIds.has(el.id) ? el.classList.add("seen") : revealObserver.observe(el)));
}

function scrollEffects() {
  if (!motionOK) return;
  let queued = false;
  const update = () => {
    queued = false;
    const vh = window.innerHeight;
    // Paralaxe: posição da seção na tela (0 = entrando por baixo, 1 = saindo por cima)
    document.querySelectorAll("canvas.stars").forEach((canvas) => {
      const r = canvas.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const progress = (vh - r.top) / (vh + r.height);
      canvas.style.transform = `translate3d(0, ${((progress - 0.5) * r.height * 0.28).toFixed(1)}px, 0)`;
    });
  };
  const request = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request);
  request();
}

drawStars();
observeReveals();
scrollEffects();
main();
