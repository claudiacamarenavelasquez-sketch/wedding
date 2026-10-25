const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
 const browser = await chromium.launch({ executablePath:'/usr/bin/chromium', args:['--no-sandbox'] });
 const base = `http://127.0.0.1:${process.env.TEST_PORT || 3000}`;
 for (const token of ['a'.repeat(24),'b'.repeat(64)]) {
  const page = await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  let payload;
  await page.route('**/i/*',route=>route.fulfill({contentType:'text/html',body:fs.readFileSync('index.html','utf8')}));
  await page.route('**/api/invitation',async route=>{
   assert.equal(route.request().headers().authorization,`Bearer ${token}`);
   if(route.request().method()==='GET') await route.fulfill({json:{name:'Invitado Apellido',seats:2}});
   else {payload=route.request().postDataJSON();await route.fulfill({json:{ok:true}})}
  });
  await page.goto(token.length===24?`${base}/i/${token}`:`${base}/#invite=${token}`);
  await page.waitForFunction(()=>document.getElementById('guest-name').textContent==='Invitado Apellido');
  assert.equal(await page.locator('#monogram img').evaluate(i=>new URL(i.src).pathname),'/assets/monograma-bordado.webp');
  await page.locator('[name=attendance][value=yes]').check();
  await page.locator('[name=companion-1]').fill('Acompañante Apellido');
  await page.locator('#submit-rsvp').click();
  await page.waitForFunction(()=>document.getElementById('form-status').textContent.includes('guardó'));
  assert.deepEqual(payload.names,['Invitado Apellido','Acompañante Apellido']);
  assert.equal(payload.count,2);
  await page.close();
 }
 await browser.close();
 console.log('Enlaces cortos y antiguos: carga de recursos, invitado y confirmación verificados.');
})().catch(error=>{console.error(error);process.exit(1)});
