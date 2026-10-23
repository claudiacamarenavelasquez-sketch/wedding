const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  for (const width of [320, 390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
    await page.goto(`http://127.0.0.1:${process.env.TEST_PORT || 3000}`);
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();
    assert.match(await footer.innerText(), /Todo el amor nos trajo hasta aquí/i);
    assert.doesNotMatch(await footer.innerText(), /Con amor/i);
    await footer.locator('.footer-botanical').evaluate(img => img.decode());
    assert.match(await footer.locator('.footer-botanical').getAttribute('src'), /cipreses-acuarela/);
    assert(Number(await footer.locator('.footer-botanical').evaluate(img => getComputedStyle(img).opacity)) <= .45);
    assert.match(await footer.evaluate(el => getComputedStyle(el, ':before').backgroundImage), /encaje-real/);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    if (width === 390) await footer.screenshot({ path: '/tmp/footer-refined.png' });
    await page.close();
  }
  await browser.close();
  console.log('Cierre: texto, cipreses, encaje y ancho verificados en cuatro tamaños.');
})().catch(error => { console.error(error); process.exit(1); });
