const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 for(const width of [320,390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  let submitted,fail=false;
  await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>window.copied=text}}));
  await page.route('**/api/invitation',async route=>{
   if(route.request().method()==='GET')return route.fulfill({json:{name:'Invitado Apellido',seats:2}});
   assert.equal(route.request().method(),'POST');
   submitted=route.request().postDataJSON();
   return route.fulfill(fail?{status:503,json:{error:'SERVICE_UNAVAILABLE'}}:{json:{ok:true}});
  });
  await page.goto(`http://127.0.0.1:${process.env.TEST_PORT||3000}/#invite=${'a'.repeat(24)}`);
  await page.waitForFunction(()=>document.querySelector('#guest-name').textContent==='Invitado Apellido');
  assert.equal(await page.locator('#gift-report-dialog').isVisible(),false);
  for(const [id,number]of [['bank-dollar-account','19114592696195'],['bank-dollar-cci','00219111459269619556']]){
   assert.equal(await page.locator('#'+id).innerText(),number);
   await page.locator(`[data-copy="${id}"]`).click();assert.equal(await page.evaluate(()=>window.copied),number);
  }
  await page.locator('#open-gift-report').click();
  assert(await page.locator('#gift-report-dialog').isVisible());
  assert.equal(await page.locator('#gift-payer').inputValue(),'Invitado Apellido');
  await page.locator('#gift-currency').selectOption('USD');
  await page.locator('#gift-operation').fill('00123456');
  await page.locator('#gift-message').fill('Con mucho cariño');
  await page.locator('#submit-gift-report').click();
  await page.waitForFunction(()=>document.querySelector('#gift-report-status').textContent.includes('pendiente'));
  assert.deepEqual(submitted,{payer:'Invitado Apellido',currency:'USD',operation:'00123456',message:'Con mucho cariño'});
  assert.equal(await page.locator('#gift-message').inputValue(),'');
  fail=true;await page.locator('#gift-operation').fill('009999');await page.locator('#submit-gift-report').click();
  await page.waitForFunction(()=>document.querySelector('#gift-report-status').textContent.includes('No se pudo'));
  assert.equal(await page.locator('#gift-operation').inputValue(),'009999');
  const rect=await page.locator('#gift-report-dialog').boundingBox();assert(rect.width<=width);
  if(width===390)await page.screenshot({path:'/tmp/gift-report-popup.png'});
  await page.keyboard.press('Escape');assert.equal(await page.locator('#gift-report-dialog').isVisible(),false);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'open-gift-report');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.close();
 }
 const page=await browser.newPage({reducedMotion:'reduce'});await page.goto(`http://127.0.0.1:${process.env.TEST_PORT||3000}`);
 await page.locator('#open-gift-report').click();await page.locator('#gift-payer').fill('Ejemplo');await page.locator('#gift-operation').fill('00123');await page.locator('#submit-gift-report').click();
 assert.match(await page.locator('#gift-report-status').innerText(),/No se ha enviado/);
 await browser.close();console.log('Popup, mensaje opcional, copia USD, errores y modo demostración verificados.');
})().catch(e=>{console.error(e);process.exit(1)});
