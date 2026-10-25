const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({ executablePath:'/usr/bin/chromium', args:['--no-sandbox'] });
 for (const width of [320,390,768,1440]) {
  const page = await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'});
  await page.addInitScript(() => Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.copiedBankValue=text}}}));
  await page.goto(`http://127.0.0.1:${process.env.TEST_PORT || 3000}`);
  assert.equal(await page.locator('.gift-holder span').innerText(),'Jorge Takeshi Higa Sugashima');
  for (const [id,value] of [['bank-account','19329724584030'],['bank-cci','00219312972458403012']]) {
   await page.locator(`[data-copy="${id}"]`).click();
   assert.equal(await page.evaluate(()=>window.copiedBankValue),value);
   assert.match(await page.locator('#bank-copy-status').innerText(),/copiado/);
  }
  await page.evaluate(()=>{navigator.clipboard.writeText=async()=>{throw Error('Unavailable')}});
  await page.locator('[data-copy="bank-cci"]').click();
  assert.equal(await page.evaluate(()=>getSelection().toString()),'00219312972458403012');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.close();
 }
 await browser.close();
 console.log('Nombre completo, copia exacta de cuenta/CCI y alternativa manual verificados en cuatro tamaños.');
})().catch(error=>{console.error(error);process.exit(1)});
