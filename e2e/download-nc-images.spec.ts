import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

const OUT_DIR = path.resolve(__dirname, '../public/images');
const TARGET_COUNT = 15;

function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    const req = proto.get(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://www.instagram.com/',
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          file.close();
          fs.unlink(dest, () => {});
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      }
    );
    req.on('error', (err) => { file.close(); fs.unlink(dest, () => {}); reject(err); });
    req.setTimeout(15_000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

test('download Nueva Chicago photos from Instagram', async ({ page }) => {
  test.setTimeout(120_000);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const cdnUrls: string[] = [];

  // Interceptar imágenes JPEG del CDN de Instagram mientras carga la página
  page.on('response', async (response) => {
    const url = response.url();
    const ct = response.headers()['content-type'] || '';
    if (
      ct.startsWith('image/jpeg') &&
      (url.includes('cdninstagram.com') || url.includes('fbcdn.net'))
    ) {
      if (!cdnUrls.includes(url)) cdnUrls.push(url);
    }
  });

  await page.goto('https://www.instagram.com/nuevachicago/', {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });

  // Cerrar modal de login si aparece
  for (const selector of [
    '[aria-label="Close"]',
    'button:has-text("Not now")',
    'button:has-text("Ahora no")',
    'button:has-text("Cerrar")',
  ]) {
    try {
      await page.locator(selector).first().click({ timeout: 3_000 });
      break;
    } catch {}
  }

  // Esperar que cargue el feed
  await page.waitForTimeout(3_000);

  // Scroll para cargar más posts
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.5));
    await page.waitForTimeout(1_500);
  }

  // Recolectar también URLs del DOM (img src)
  const domUrls: string[] = await page.$$eval('img[src]', (imgs) =>
    (imgs as HTMLImageElement[])
      .map((img) => img.src)
      .filter(
        (src) =>
          (src.includes('cdninstagram.com') || src.includes('fbcdn.net')) &&
          src.includes('.jpg')
      )
  );
  for (const u of domUrls) {
    if (!cdnUrls.includes(u)) cdnUrls.push(u);
  }

  console.log(`\nURLs CDN encontradas: ${cdnUrls.length}`);

  // Priorizar imágenes de alta resolución (posts, no thumbnails)
  const sorted = [
    ...cdnUrls.filter((u) => u.includes('1080') || u.includes('_n.jpg')),
    ...cdnUrls.filter((u) => !u.includes('1080') && !u.includes('_n.jpg')),
  ];

  let saved = 0;
  for (const url of sorted) {
    if (saved >= TARGET_COUNT) break;
    const filename = `nc-instagram-${String(saved).padStart(2, '0')}.jpg`;
    const dest = path.join(OUT_DIR, filename);
    try {
      await download(url, dest);
      console.log(`✓ ${filename}`);
      saved++;
    } catch (e: any) {
      console.warn(`✗ ${url.slice(0, 70)}... → ${e.message}`);
    }
  }

  console.log(`\n${saved} imágenes guardadas en ${OUT_DIR}`);
  console.log('Renombrá las que correspondan:');
  console.log('  → nc-equipo-indumentaria.jpg  (equipo verde y negro)');
  console.log('  → nc-estadio-nocturno.jpg     (estadio aéreo nocturno)');
});
