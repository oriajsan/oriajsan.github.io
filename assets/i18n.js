/* ------------------------------------------------------------------
   Idiomas: português do Brasil e inglês.
   O idioma inicial vem do script no <head> (escolha salva, ou o idioma
   preferido do navegador; se não for português nem inglês, inglês).
   Textos fixos da página: atributo data-i18n="chave" (conteúdo) e
   data-i18n-attr="atributo=chave,..." (atributos).
------------------------------------------------------------------- */
(function () {
  const LANGS = ["pt-BR", "en"];

  const dict = {
    "pt-BR": {
      "meta.title": "Jairo Santana · Desenvolvedor Full Stack",
      "meta.description": "Jairo Santana, desenvolvedor Full Stack na FlipDesk, com Ruby on Rails, Vue.js, TypeScript e React. Estudante de Engenharia da Computação na UFS, em Aracaju.",
      "lang.label": "Idioma",
      "hero.pitch": "Desenvolvedor Full Stack na FlipDesk, com Ruby on Rails, Vue.js, TypeScript e React.",
      "hero.location": "Aracaju, Sergipe · aberto a trabalho remoto",
      "hero.p1": "Estudo Engenharia da Computação na Universidade Federal de Sergipe e trabalho com TI desde 2023. Hoje cuido de uma plataforma de atendimento e CRM usada em produção, e em projetos pessoais já construí desde apps mobile até agentes de IA.",
      "hero.p2": "O que mais me motiva é resolver problemas: entender a fundo o que o usuário precisa, abstrair o que importa e chegar a uma solução simples e direta. Mas não basta resolver; é preciso explicar a solução de um jeito que o usuário entenda, porque a comunicação é a chave de todo trabalho bem executado. Para mim, é isso que faz um bom desenvolvedor.",
      "hero.p3": "Uso IA no dia a dia como ferramenta de desenvolvimento, não como decisão final. Todo código gerado passa pela minha revisão: leio, testo e valido o funcionamento antes de abrir o pull request.",
      "hero.cta": "Fale comigo",
      "scene.label": "Sistema solar dos meus trabalhos e projetos",
      "scene.legend": "O planeta com anéis é o meu trabalho atual; os outros são projetos pessoais e acadêmicos.",
      "scene.hint": "O tamanho de cada planeta acompanha os commits, e os mais recentes orbitam mais perto do Sol. Toque em um para ir até ele.",
      "scene.noData": "Não foi possível carregar os dados dos trabalhos agora. Tente recarregar a página.",
      "scene.noWebGL": "Não foi possível desenhar o sistema solar neste navegador. Os trabalhos estão listados logo abaixo.",
      "tag.work": "{name}, meu trabalho atual: ir para a ficha",
      "tag.project": "{name}: ir para o projeto",
      "scene.stats": "{commits} commits e {prs} pull requests, segundo o GitHub. Atualizado em {date}.",
      "work.title": "Experiência profissional",
      "work.sub": "Onde trabalho hoje, o planeta com anéis na órbita mais perto do Sol, e as experiências anteriores.",
      "work.error": "Não foi possível carregar a experiência agora.",
      "work.before": "Antes disso",
      "work.education": "Formação",
      "projects.title": "Projetos",
      "projects.sub": "Pessoais e acadêmicos, na mesma ordem das órbitas: do mais recente, mais perto do Sol, ao mais distante.",
      "projects.error": "Não foi possível carregar a lista de projetos agora.",
      "entry.current": "trabalho atual",
      "entry.past": "experiência profissional",
      "entry.orbit": "na {n} órbita",
      "entry.period": "período",
      "entry.commits": "commits",
      "entry.prs": "pull requests",
      "entry.usesDaily": "No dia a dia, uso",
      "entry.builtWith": "Feito com",
      "curve.title": "Commits por semana.",
      "curve.label": "{commits} commits em {weeks} {weeksWord}, com pico de {max} numa semana.",
      "curve.week": "semana ativa",
      "curve.weeks": "semanas ativas",
      "curve.empty": "A frequência semanal aparece depois que o GitHub Action atualizar os dados.",
      "contact.eyebrow": "Contato",
      "contact.title": "Vamos conversar?",
      "contact.text": "Tem uma vaga, um projeto ou uma dúvida sobre algum dos meus trabalhos? Escreva aqui e eu respondo por e-mail.",
      "contact.direct": "Se preferir, fale direto",
      "contact.cv": "Baixar currículo (PDF)",
      "contact.form": "Formulário de contato",
      "contact.name": "Nome",
      "contact.namePh": "Como posso te chamar?",
      "contact.email": "E-mail",
      "contact.emailPh": "voce@exemplo.com",
      "contact.emailHelp": "Uso só para responder a sua mensagem.",
      "contact.message": "Mensagem",
      "contact.messagePh": "Conte um pouco sobre a vaga, o projeto ou a sua dúvida.",
      "contact.required": "Todos os campos são obrigatórios.",
      "contact.send": "Enviar mensagem",
      "contact.sending": "Enviando…",
      "contact.subject": "Nova mensagem pelo portfólio",
      "contact.missing": "Preencha nome, e-mail e mensagem.",
      "contact.badEmail": "Confira o e-mail: ele parece incompleto.",
      "contact.mailto": "Abrindo o seu programa de e-mail com a mensagem pronta.",
      "contact.ok": "Mensagem enviada! Respondo assim que puder.",
      "contact.fail": "Não foi possível enviar agora. Tente de novo ou escreva para {email}.",
    },
    en: {
      "meta.title": "Jairo Santana · Full Stack Developer",
      "meta.description": "Jairo Santana, Full Stack Developer at FlipDesk, working with Ruby on Rails, Vue.js, TypeScript and React. Computer Engineering student at the Federal University of Sergipe, in Aracaju, Brazil.",
      "lang.label": "Language",
      "hero.pitch": "Full Stack Developer at FlipDesk, working with Ruby on Rails, Vue.js, TypeScript and React.",
      "hero.location": "Aracaju, Sergipe, Brazil · open to remote work",
      "hero.p1": "I study Computer Engineering at the Federal University of Sergipe and have worked in IT since 2023. Today I look after a customer service and CRM platform used in production, and in personal projects I've built everything from mobile apps to AI agents.",
      "hero.p2": "What drives me most is solving problems: understanding what the user really needs, abstracting what matters and reaching a simple, direct solution. But solving isn't enough; the solution has to be explained in a way the user understands, because communication is the key to any job well done. To me, that's what makes a good developer.",
      "hero.p3": "I use AI every day as a development tool, not as the final decision. I review all generated code myself: I read it, test it and check that it works before opening the pull request.",
      "hero.cta": "Get in touch",
      "scene.label": "Solar system of my work and projects",
      "scene.legend": "The ringed planet is my current job; the others are personal and academic projects.",
      "scene.hint": "Each planet's size follows its commits, and the most recent ones orbit closer to the Sun. Tap one to jump to it.",
      "scene.noData": "Couldn't load the project data right now. Please try reloading the page.",
      "scene.noWebGL": "This browser couldn't draw the solar system. The projects are listed right below.",
      "tag.work": "{name}, my current job: go to its entry",
      "tag.project": "{name}: go to the project",
      "scene.stats": "{commits} commits and {prs} pull requests, according to GitHub. Updated on {date}.",
      "work.title": "Professional experience",
      "work.sub": "Where I work today, the ringed planet in the orbit closest to the Sun, and my earlier experience.",
      "work.error": "Couldn't load my experience right now.",
      "work.before": "Before that",
      "work.education": "Education",
      "projects.title": "Projects",
      "projects.sub": "Personal and academic, in the same order as the orbits: from the most recent, closest to the Sun, to the farthest.",
      "projects.error": "Couldn't load the project list right now.",
      "entry.current": "current job",
      "entry.past": "professional experience",
      "entry.orbit": "{n} orbit",
      "entry.period": "period",
      "entry.commits": "commits",
      "entry.prs": "pull requests",
      "entry.usesDaily": "Day to day, I use",
      "entry.builtWith": "Built with",
      "curve.title": "Commits per week.",
      "curve.label": "{commits} commits over {weeks} {weeksWord}, peaking at {max} in one week.",
      "curve.week": "active week",
      "curve.weeks": "active weeks",
      "curve.empty": "Weekly activity shows up once the GitHub Action updates the data.",
      "contact.eyebrow": "Contact",
      "contact.title": "Let's talk",
      "contact.text": "Have a job opening, a project or a question about my work? Write here and I'll reply by email.",
      "contact.direct": "Or reach me directly",
      "contact.cv": "Download résumé (PDF, in Portuguese)",
      "contact.form": "Contact form",
      "contact.name": "Name",
      "contact.namePh": "What should I call you?",
      "contact.email": "Email",
      "contact.emailPh": "you@example.com",
      "contact.emailHelp": "Only used to reply to your message.",
      "contact.message": "Message",
      "contact.messagePh": "Tell me a bit about the role, the project or your question.",
      "contact.required": "All fields are required.",
      "contact.send": "Send message",
      "contact.sending": "Sending…",
      "contact.subject": "New message from the portfolio",
      "contact.missing": "Please fill in your name, email and message.",
      "contact.badEmail": "Please check the email address; it looks incomplete.",
      "contact.mailto": "Opening your email app with the message ready.",
      "contact.ok": "Message sent! I'll get back to you as soon as I can.",
      "contact.fail": "Couldn't send it right now. Please try again or write to {email}.",
    },
  };

  const MONTHS = {
    "pt-BR": ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"],
    en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  };

  let lang = LANGS.includes(window.__lang) ? window.__lang : "en";
  const listeners = [];
  const formatters = {};

  const I18N = {
    get lang() { return lang; },
    t(key, vars = {}) {
      const s = dict[lang][key] ?? dict["pt-BR"][key] ?? key;
      return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
    },
    // Texto do config: string simples, ou { "pt-BR": "...", "en": "..." }
    pick(value) {
      if (value == null || typeof value !== "object" || Array.isArray(value)) return value;
      return value[lang] ?? value.en ?? value["pt-BR"] ?? "";
    },
    num(n) {
      formatters[lang] = formatters[lang] || new Intl.NumberFormat(lang);
      return formatters[lang].format(n);
    },
    ordinal(n) {
      if (lang === "pt-BR") return `${n}ª`;
      const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th";
      return `${n}${s}`;
    },
    month(d) { return `${MONTHS[lang][d.getUTCMonth()]} ${d.getUTCFullYear()}`; },
    day(iso) {
      const d = new Date(String(iso).slice(0, 10) + "T00:00:00Z");
      if (isNaN(d)) return iso;
      const m = MONTHS[lang][d.getUTCMonth()];
      return lang === "pt-BR" ? `${d.getUTCDate()} ${m} ${d.getUTCFullYear()}` : `${m} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
    },
    onChange(fn) { listeners.push(fn); },
    setLang(next) {
      if (!LANGS.includes(next) || next === lang) return;
      lang = next;
      try { localStorage.setItem("lang", next); } catch (e) { /* sem armazenamento: vale só nesta visita */ }
      apply();
      listeners.forEach((fn) => fn(lang));
    },
  };

  function apply() {
    const root = document.documentElement;
    root.lang = lang;
    document.title = I18N.t("meta.title");
    document.querySelector('meta[name="description"]')?.setAttribute("content", I18N.t("meta.description"));
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = I18N.t(el.dataset.i18n); });
    document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      el.dataset.i18nAttr.split(",").forEach((pair) => {
        const [attr, key] = pair.split("=").map((s) => s.trim());
        el.setAttribute(attr, I18N.t(key));
      });
    });
    document.querySelectorAll("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    root.classList.remove("i18n-pending");
  }

  document.querySelectorAll("[data-lang]").forEach((b) => b.addEventListener("click", () => I18N.setLang(b.dataset.lang)));
  window.I18N = I18N;
  apply();
})();
