// Maakt PNG app-iconen uit public/icon-512.svg (styleguide 12): 192 en 512 voor Android en PWA,
// een maskable variant met veilige marge, en een apple-touch-icon van 180 px.
// Gebruik: npm run icons
import fs from 'node:fs';
import { chromium } from 'playwright';

const svg = fs.readFileSync(new URL('../public/icon-512.svg', import.meta.url), 'utf8');
const out = (name) => new URL(`../public/icons/${name}`, import.meta.url).pathname;

const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium' });
const page = await b.newPage();

async function render(size, file, { maskable = false } = {}) {
  await page.setViewportSize({ width: size, height: size });
  // Maskable: het beeldmerk in de veilige cirkel (80 procent), rest gevuld met Diepblauw.
  const inner = maskable ? Math.round(size * 0.8) : size;
  const html = `<html><body style="margin:0;width:${size}px;height:${size}px;background:${maskable ? '#0a66ff' : 'transparent'};display:grid;place-items:center">
    <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body></html>`;
  await page.setContent(html);
  await page.screenshot({ path: out(file), omitBackground: !maskable, clip: { x: 0, y: 0, width: size, height: size } });
  console.log('icons/' + file);
}

await render(192, 'icon-192.png');
await render(512, 'icon-512.png');
await render(512, 'icon-maskable-512.png', { maskable: true });
await render(180, 'apple-touch-icon.png');
await b.close();
