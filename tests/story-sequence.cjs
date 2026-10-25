const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({ executablePath:'/usr/bin/chromium', args:['--no-sandbox'] });
 for (const reducedMotion of ['no-preference','reduce']) {
  const page = await browser.newPage({ viewport:{width:390,height:844}, reducedMotion });
  await page.goto(`http://127.0.0.1:${process.env.TEST_PORT || 3000}`);
  assert.equal(await page.locator('.story-copy .eyebrow').count(),0);
  await page.evaluate(() => document.querySelector('#historia').scrollIntoView({behavior:'instant'}));
  if (reducedMotion === 'no-preference') {
   await page.waitForFunction(() => document.querySelector('#historia').classList.contains('story-started'));
   await page.waitForTimeout(1100);
   assert.equal(await page.locator('.story-copy').evaluate(e=>getComputedStyle(e).opacity),'1');
   assert.equal(await page.locator('.story-end').evaluate(e=>getComputedStyle(e).opacity),'0');
   await page.waitForTimeout(900);
  }
  assert.equal(await page.locator('.story-end').evaluate(e=>getComputedStyle(e).opacity),'1');
  await page.close();
 }
 await browser.close();
 console.log('Secuencia de dos frases y lectura sin animaciones verificadas.');
})().catch(error=>{console.error(error);process.exit(1)});
