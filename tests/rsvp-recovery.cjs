const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const base=`http://127.0.0.1:${process.env.TEST_PORT||3000}/#invite=${'a'.repeat(24)}`;
 for(const mode of ['busy-once','busy-persistent','unauthorized','network-once','legacy-browser']){
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  if(mode==='legacy-browser')await page.addInitScript(()=>Object.defineProperty(AbortSignal,'timeout',{value:undefined,configurable:true}));
  let gets=0,puts=0,recovered=false;
  await page.route('**/api/invitation',async route=>{
   if(route.request().method()==='PUT'){puts++;return route.fulfill({status:503,headers:{'Retry-After':'1'},json:{error:'SERVICE_UNAVAILABLE'}})}
   gets++;
   if(mode==='network-once'&&gets===1)return route.abort('failed');
   if(!recovered&&((mode==='busy-once'&&gets===1)||mode==='busy-persistent'))return route.fulfill({status:503,headers:{'Retry-After':'1'},json:{error:'SERVICE_UNAVAILABLE'}});
   if(!recovered&&mode==='unauthorized')return route.fulfill({status:401,json:{error:'INVALID_INVITATION'}});
   return route.fulfill({json:{name:'Invitado recuperado',seats:2}});
  });
  await page.goto(base);
  if(mode==='busy-persistent'||mode==='unauthorized'){
   await page.locator('#retry-rsvp').waitFor({state:'visible'});
   assert.equal(gets,mode==='busy-persistent'?2:1);
   assert.equal(await page.locator('#submit-rsvp').isEnabled(),false);
   recovered=true;
   await page.locator('#retry-rsvp').click();
  }
  await page.waitForFunction(()=>document.querySelector('#guest-name').textContent==='Invitado recuperado');
  assert.equal(await page.locator('#retry-rsvp').isVisible(),false);
  assert.equal(await page.locator('#mode-note').isVisible(),false);
  assert.equal(await page.locator('#quantity option').count(),2);
  assert.equal(await page.locator('#submit-rsvp').isEnabled(),true);
  await page.locator('[name=attendance][value=yes]').check();
  await page.locator('[name=companion-1]').fill('Acompañante');
  await page.locator('#submit-rsvp').click();
  await page.waitForFunction(()=>document.querySelector('#form-status').textContent.includes('No se pudo'));
  await page.waitForTimeout(1100);
  assert.equal(puts,1);assert.equal(await page.locator('#rsvp-thanks-dialog').isVisible(),false);
  assert.equal(await page.locator('#submit-rsvp').isEnabled(),true);
  console.log('PASS recuperación:',mode,'GET:',gets,'PUT sin reenvío:',puts);
  await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
