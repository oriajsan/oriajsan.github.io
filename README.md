# oriajsan.github.io

Portfólio de Jairo Santana e páginas do app Grana, publicados com GitHub Pages.

- `/` — portfólio
- `/grana/` — página do Grana
- `/grana/privacidade.html` — Política de Privacidade do Grana

HTML e CSS puros, sem build.

## Números da página inicial

- `assets/projects.config.json`: textos de cada trabalho e os repositórios
  de onde contar os commits (`allBranches: true` conta todas as branches,
  para repositórios com squash merge).
- `assets/stats.json`: commits, pull requests e commits por semana. É gerado
  todo dia às 06:00 UTC por `.github/workflows/stats.yml`, que roda
  `scripts/build-stats.mjs` com o secret `STATS_TOKEN`. Para rodar à mão:
  `STATS_TOKEN=<token> node scripts/build-stats.mjs`.

## Links do Grana

Os botões de `/grana/` apontam sempre para a versão mais recente, nunca para
uma versão específica:

- Android: `https://github.com/oriajsan/oriajsan.github.io/releases/latest/download/grana.apk`.
  As releases deste repositório guardam os APKs; cada uma é criada por
  `npm run build:announce` no repositório do app, que também avisa os apps
  instalados. O link do EAS não serve: o arquivo expira em ~30 dias.
- Web (PWA): `https://grana-b8e.pages.dev`, atualizado por `pwa/deploy.sh`.
