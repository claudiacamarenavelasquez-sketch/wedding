const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
 for (const width of [320, 390, 768, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
  await page.goto(`http://127.0.0.1:${process.env.TEST_PORT || 3000}`);
  await page.evaluate(() => document.fonts.ready);
  await page.locator('#monogram img').evaluate(img => img.decode());
  await page.locator('#portada').scrollIntoViewIfNeeded();
  const sizes = await page.locator('.cover h1>span').evaluateAll(els => els.map(el => getComputedStyle(el).fontSize));
  assert.equal(sizes[0], sizes[1]);
  assert.equal(await page.locator('.cover .scroll-cue').count(), 0);
  assert.match(await page.locator('#monogram img').getAttribute('src'), /monograma-bordado/);
  assert((await page.locator('#monogram').boundingBox()).width >= 78);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  if (width === 390) await page.locator('#portada').screenshot({ path: '/tmp/cover-embroidery.png' });
  await page.close();
 }
 await browser.close();
 console.log('Portada: nombres iguales, monograma grande y ancho verificados en cuatro tamaños.');
})().catch(error => { console.error(error); process.exit(1); });
