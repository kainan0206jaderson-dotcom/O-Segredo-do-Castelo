// Tira uma captura de cada sala em PC (16:9) e em celular deitado, para comparar antes e depois.
// Uso: com `npm run dev` rodando, `node tools/capturas.mjs <pasta-de-saida> [url]`.
// Cada sala abre com um save de jogo avançado (Ato 1 vencido, feitiços aprendidos), para
// mostrar o HUD completo: objetivo, feitiço, corações, energia e a bolsa.
import { createRequire } from 'node:module';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// o Playwright já vem instalado na máquina (não é dependência do jogo)
const { chromium } = createRequire(import.meta.url)('playwright');

const out = process.argv[2] ?? 'capturas';
const url = process.argv[3] ?? 'http://localhost:5173/';
mkdirSync(out, { recursive: true });

const mapsDir = 'public/assets/maps';
const only = (process.env.SALAS ?? '').split(',').filter(Boolean);
const rooms = readdirSync(mapsDir).filter((f) => f.endsWith('.tmj') && (!only.length || only.includes(f.replace('.tmj', '')))).map((f) => {
  const m = JSON.parse(readFileSync(join(mapsDir, f), 'utf8'));
  const spawn = m.layers.flatMap((l) => l.objects ?? []).find((o) => o.type === 'spawn');
  return { key: `map.${f.replace('.tmj', '')}`, spawn: spawn.name };
});

const devices = [
  { name: 'pc', viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 },
  { name: 'celular', viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
];

function save(map, spawn) {
  return {
    version: 3, map, spawn, playTimeMs: 0,
    flags: Object.fromEntries([
      ...Object.keys(JSON.parse(readFileSync('content/tutorials.json', 'utf8'))).map((t) => [`tutorial:${t}`, true]),
      ...rooms.map((r) => [`visitou:${r.key}`, true]),
    ]),
    quests: { 'cartas-de-amelia': { stage: 'achar-cartas', done: false } },
    inventory: { 'estrela-perdida': 2 },
    spells: ['lumen', 'levitar', 'revelar'], selectedSpell: 'lumen', recipes: [], challenges: {},
    house: 'inteligencia', level: 3, xp: 0, vida: 6, energia: 7, equipment: {},
    aparencia: 'menino', nome: 'Orion', modo: 'normal',
  };
}

const browser = await chromium.launch();
for (const d of devices) {
  const ctx = await browser.newContext(d);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error(`[${d.name}] erro:`, e.message));
  for (const r of rooms) {
    await page.goto(url);
    await page.evaluate((s) => localStorage.setItem('segredo-do-castelo:save', JSON.stringify(s)), save(r.key, r.spawn));
    await page.reload();
    await page.waitForFunction(() => window.game?.scene.isActive('Title'), null, { timeout: 15000 });
    await page.evaluate(({ map, spawn }) => {
      window.session.continue();
      const g = window.game;
      for (const s of g.scene.getScenes(true)) s.scene.stop();
      g.scene.start('World', { map, spawn });
    }, { map: r.key, spawn: r.spawn });
    // espera a sala abrir; passa as falas de chegada (Espaço) e espera o nome da sala sumir
    await page.addStyleTag({ content: '#tela-cheia { display: none !important; }' });
    await page.waitForTimeout(1200);
    for (let i = 0; i < 60; i++) {
      const busy = await page.evaluate(() => {
        const w = window.game.scene.getScene('World');
        return Boolean(w.dialogue) || window.game.scene.isActive('Tutorial') || window.game.scene.isActive('ActCard');
      });
      if (!busy) break;
      await page.keyboard.press('Space');
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(2400);
    await page.screenshot({ path: join(out, `${d.name}-${r.key.replace('map.', '')}.png`) });
    console.log(d.name, r.key);
  }
  await ctx.close();
}
await browser.close();
