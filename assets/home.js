/* ------------------------------------------------------------------
   Página inicial. Os textos vêm de projects.config.json; os números, de
   stats.json, gerado todo dia pelo GitHub Action (scripts/build-stats.mjs).
------------------------------------------------------------------- */
const $ = (id) => document.getElementById(id);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const css = getComputedStyle(document.documentElement);
const colorOf = (id) => css.getPropertyValue(`--p-${id}`).trim() || "#a9b1c2";
const nf = new Intl.NumberFormat("pt-BR");
const months = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const fmtMonth = (d) => `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const fmtDay = (iso) => {
  const d = new Date(iso.slice(0, 10) + "T00:00:00Z");
  return isNaN(d) ? iso : `${d.getUTCDate()} ${fmtMonth(d)}`;
};
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const NO_WEEKS = "A frequência semanal aparece depois que o GitHub Action atualizar os dados.";

const scene3d = $("scene");

async function loadJSON(url) {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function main() {
  let config, stats;
  try {
    [config, stats] = await Promise.all([loadJSON("assets/projects.config.json"), loadJSON("assets/stats.json")]);
  } catch (e) {
    scene3d.style.aspectRatio = "auto";
    scene3d.innerHTML = `<p class="fallback">Não foi possível carregar os dados dos trabalhos agora. Tente recarregar a página.</p>`;
    $("work-list").outerHTML = `<p class="load-error">Não foi possível carregar a lista de trabalhos agora.</p>`;
    $("totals").hidden = true;
    return;
  }

  // Junta texto e números por id; quem não tem commits não aparece
  const byId = new Map(stats.projects.map((s) => [s.id, s]));
  const projects = config.projects
    .map((c) => ({ ...c, ...byId.get(c.id) }))
    .filter((p) => p.commits > 0)
    // Ordem das órbitas: trabalho em andamento primeiro, depois atividade mais recente
    .sort((a, b) => (b.ongoing - a.ongoing) || String(b.lastActivity).localeCompare(String(a.lastActivity)));

  renderTotals(projects, stats.updatedAt);
  renderList(projects);
  if (projects.length) {
    try {
      buildScene(projects);
    } catch (e) {
      scene3d.style.aspectRatio = "auto";
      scene3d.innerHTML = `<p class="fallback">Não foi possível desenhar o sistema solar neste navegador. Os trabalhos estão listados logo abaixo.</p>`;
    }
  }

  // Endereço com #id: vai até a ficha depois que ela existe
  const target = location.hash && document.getElementById(location.hash.slice(1));
  if (target && target.classList.contains("entry")) target.scrollIntoView({ block: "start" });
}

/* ---------- Totais ---------- */
function renderTotals(projects, updatedAt) {
  const totalCommits = projects.reduce((s, p) => s + p.commits, 0);
  const totalPRs = projects.reduce((s, p) => s + (p.pullRequests || 0), 0);
  $("totals").innerHTML = [
    [nf.format(totalCommits), "commits"],
    [nf.format(totalPRs), "pull requests"],
    [projects.length, "trabalhos"]
  ].map(([v, l]) => `<div><strong>${v}</strong><span>${l}</span></div>`).join("");
  if (updatedAt) $("source").textContent = `Dados do GitHub, atualizados em ${fmtDay(updatedAt)}.`;
}

/* ---------- Fichas ---------- */
function curveHTML(p) {
  if (!p.weeks || !Object.keys(p.weeks).length) {
    return `<figure class="curve empty"><svg viewBox="0 0 300 72" preserveAspectRatio="none" aria-hidden="true"><path class="line" d="M0 70 H300"/></svg><figcaption>${esc(p.freqNote || NO_WEEKS)}</figcaption></figure>`;
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
  const label = `${nf.format(p.commits)} commits em ${active} ${active === 1 ? "semana ativa" : "semanas ativas"}, com pico de ${max} numa semana.`;
  return `<figure class="curve">
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Commits por semana. ${esc(label)}">
      <line class="base" x1="0" y1="${H}" x2="${W}" y2="${H}"/>
      <path class="area" d="${area}"/><path class="line" d="${line}"/>
    </svg>
    <div class="ends"><span>${fmtMonth(start)}</span><span>${fmtMonth(end)}</span></div>
    <figcaption>Commits por semana. ${esc(label)}${p.freqNote ? " " + esc(p.freqNote) : ""}</figcaption>
  </figure>`;
}

const globeSize = (c) => Math.round(40 + 4.2 * Math.sqrt(c));

function renderList(projects) {
  $("work-list").innerHTML = projects.map((p, i) => {
    const links = (p.links || []).filter(([, h]) => !h.startsWith("#"));
    return `
  <li class="entry" id="${esc(p.id)}" style="--c:var(--dot-${esc(p.id)}, var(--muted)); --g:${globeSize(p.commits)}px">
    <div class="globe-slot" aria-hidden="true"><span class="globe"></span></div>
    <div class="body">
      <h3 tabindex="-1">${esc(p.name)}</h3>
      <p class="kind">${esc(p.kind)}, na ${i + 1}ª órbita</p>
      <p class="desc">${esc(p.desc)}</p>
      <dl class="measures">
        <div><dt>commits</dt><dd>${nf.format(p.commits)}</dd></div>
        <div><dt>pull requests</dt><dd>${nf.format(p.pullRequests || 0)}</dd></div>
        <div><dt>período</dt><dd>${esc(p.period)}</dd></div>
      </dl>
      <p class="stack">Feito com <strong>${esc(p.stack)}</strong>.</p>
      ${links.length ? `<div class="links">${links.map(([t, h]) => `<a href="${esc(h)}">${esc(t)}</a>`).join("")}</div>` : ""}
    </div>
    ${curveHTML(p)}
  </li>`;
  }).join("");
}

/* ---------- Clique no planeta: destaca e rola até a ficha ---------- */
let selectedId = null;
function goTo(id) {
  selectedId = id;
  document.querySelectorAll(".tag").forEach((t) => t.setAttribute("aria-pressed", String(t.dataset.id === id)));
  const card = $(id);
  if (!card) return;
  card.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  history.replaceState(null, "", `#${id}`);
  card.querySelector("h3").focus({ preventScroll: true });
  document.querySelectorAll(".entry.arrived").forEach((e) => e.classList.remove("arrived"));
  card.classList.add("arrived");
}

/* ---------- Cena 3D ---------- */
function buildScene(projects) {
  if (!window.THREE) throw new Error("three");
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 1);
  scene3d.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 400);

  // Estrelas (posições fixas, geradas com semente)
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const starPos = [];
  for (let i = 0; i < 900; i++) {
    const u = rnd() * 2 - 1, t = rnd() * Math.PI * 2, r = 90 + rnd() * 60;
    const s = Math.sqrt(1 - u * u);
    starPos.push(r * s * Math.cos(t), r * u, r * s * Math.sin(t));
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.35, sizeAttenuation: true, transparent: true, opacity: 0.75 })));

  // Sol
  const sunR = 2.4;
  const sun = new THREE.Mesh(new THREE.SphereGeometry(sunR, 48, 48), new THREE.MeshBasicMaterial({ color: 0xf2b84b }));
  scene.add(sun);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(sunR * 1.35, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0xf2b84b, transparent: true, opacity: 0.12 }));
  scene.add(glow);
  scene.add(new THREE.PointLight(0xfff1d6, 2.2, 0, 1.2));
  scene.add(new THREE.AmbientLight(0xffffff, 0.42));
  const fill = new THREE.DirectionalLight(0xdfe6ff, 0.55);
  camera.add(fill);
  scene.add(camera);

  // Planetas: tamanho pela raiz dos commits, órbita pela ordem de atividade
  const bodies = projects.map((p, i) => {
    const radius = 0.35 + 0.075 * Math.sqrt(p.commits);
    const orbit = 6.2 + i * 3.6;
    const color = new THREE.Color(colorOf(p.id));
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 40, 40),
      new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05 })
    );
    mesh.userData.id = p.id;
    scene.add(mesh);

    const ringPts = [];
    for (let k = 0; k <= 128; k++) {
      const a = (k / 128) * Math.PI * 2;
      ringPts.push(new THREE.Vector3(Math.cos(a) * orbit, 0, Math.sin(a) * orbit));
    }
    scene.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ringPts),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16 })));

    const halo = new THREE.Mesh(new THREE.RingGeometry(radius * 1.45, radius * 1.62, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
    halo.visible = false;
    scene.add(halo);

    const tag = document.createElement("button");
    tag.className = "tag";
    tag.type = "button";
    tag.dataset.id = p.id;
    tag.style.setProperty("--c", colorOf(p.id));
    tag.textContent = p.name;
    tag.setAttribute("aria-pressed", "false");
    tag.setAttribute("aria-label", `${p.name}: ir para o projeto`);
    tag.addEventListener("click", () => goTo(p.id));
    scene3d.appendChild(tag);

    return { p, mesh, halo, tag, radius, orbit,
      angle: (i * 2.1 + 0.6) % (Math.PI * 2),
      speed: 0.32 / Math.pow(orbit, 1.5) * 6 };
  });

  // Câmera inclinada, ajustada para caber a órbita externa em qualquer proporção
  const outer = bodies[bodies.length - 1].orbit + 2;
  function fit() {
    const w = scene3d.clientWidth, h = scene3d.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const need = Math.max(outer / Math.tan(hFov / 2), (outer * 0.8) / Math.tan(vFov / 2)) * 1.06;
    const tilt = THREE.MathUtils.degToRad(46); // ângulo acima do plano das órbitas
    camera.position.set(0, Math.sin(tilt) * need, Math.cos(tilt) * need);
    camera.lookAt(0, -0.4, 0);
    camera.updateProjectionMatrix();
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
    const hit = ray.intersectObjects(bodies.map((b) => b.mesh))[0];
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

  const v = new THREE.Vector3();
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const moving = !reduceMotion && !hovering && !scene3d.matches(":focus-within");
    const w = scene3d.clientWidth, h = scene3d.clientHeight;
    for (const b of bodies) {
      if (moving) b.angle += b.speed * dt;
      b.mesh.position.set(Math.cos(b.angle) * b.orbit, 0, Math.sin(b.angle) * b.orbit);
      b.mesh.rotation.y += moving ? dt * 0.4 : 0;
      b.halo.visible = b.p.id === selectedId;
      b.halo.position.copy(b.mesh.position);
      b.halo.quaternion.copy(camera.quaternion);
      v.copy(b.mesh.position); v.y -= b.radius;
      v.project(camera);
      const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h + 6;
      b.tag.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

main();
