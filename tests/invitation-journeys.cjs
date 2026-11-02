// Full browser -> Vercel handler -> Apps Script -> isolated in-memory Sheets.
// No real invitations, keys, confirmations or gift records are used.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
const handler=require('../api/invitation.js');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const guests=[
 {id:'single',name:'Invitada Un Pase',seats:1,token:'a'.repeat(24)},
 {id:'couple',name:'Invitado Dos Pases',seats:2,token:'b'.repeat(64)}
];
function backend(){
 const tables={Invitados:[['ID','Titular','Cupos','TokenHash','Enlace'],...guests.map(g=>[g.id,g.name,g.seats,hash(g.token),''])],RSVP:[['ID','Asiste','Cantidad','Nombres','Mensaje','Actualizado']]};
 const key='isolated-test-key-'.repeat(4);
 const sheet=name=>({getName:()=>name,getSheetId:()=>Object.keys(tables).indexOf(name)+1,getLastRow:()=>tables[name].length,setFrozenRows(){},getRange:(row,col,n=1,m=1)=>({
  getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>tables[name][row-1+i]?.[col-1+j]??'')),
  setNumberFormat(){},setValues(values){values.forEach((r,i)=>{tables[name][row-1+i]??=[];r.forEach((v,j)=>tables[name][row-1+i][col-1+j]=v)})}
 })});
 const book={getSheets:()=>Object.keys(tables).map(sheet),getSheetByName:n=>tables[n]?sheet(n):null,insertSheet:n=>{tables[n]=[];return sheet(n)}};
 const ctx=vm.createContext({Utilities:{DigestAlgorithm:{SHA_256:1},Charset:{UTF_8:1},computeDigest:(_,s)=>[...crypto.createHash('sha256').update(s).digest()]},PropertiesService:{getScriptProperties:()=>({getProperty:n=>n==='API_KEY'?key:null})},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},SpreadsheetApp:{openById:()=>book,flush(){}},ContentService:{MimeType:{JSON:'json'},createTextOutput:body=>({setMimeType:()=>JSON.parse(body)})}});
 vm.runInContext(fs.readFileSync('integrations/google-sheets/Code.gs','utf8'),ctx);
 return {tables,key,call:body=>ctx.doPost({postData:{contents:body}})};
}
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const originalFetch=global.fetch,originalKey=process.env.RSVP_API_KEY;
 const base=`http://127.0.0.1:${process.env.TEST_PORT||3000}`;
 try{
  for(const width of [390,1440]){
   const service=backend();process.env.RSVP_API_KEY=service.key;
   global.fetch=async(url,opts)=>{
    assert.match(url,/^https:\/\/script\.google\.com\/macros\/s\//);
    return {ok:true,json:async()=>service.call(opts.body)};
   };
   const initialGuests=JSON.stringify(service.tables.Invitados);
   for(const guest of guests){
    const page=await browser.newPage({viewport:{width,height:900}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>window.lastCopied=text}}));
    await page.route('**/i/*',route=>route.fulfill({contentType:'text/html',body:fs.readFileSync('index.html','utf8')}));
    let outage=false;
    await page.route('**/api/invitation',async route=>{
     if(outage)return route.fulfill({status:503,json:{error:'SERVICE_UNAVAILABLE'}});
     const request=route.request();let status=200,body;
     await handler({method:request.method(),headers:request.headers(),body:request.postDataJSON()},{setHeader(){},status(code){status=code;return this},json(data){body=data;return this}});
     await route.fulfill({status,json:body});
    });
    const url=guest.seats===1?`${base}/i/${guest.token}`:`${base}/#invite=${guest.token}`;
    await page.goto(url);
    await page.waitForFunction(name=>document.querySelector('#guest-name').textContent===name,guest.name);
    await page.waitForFunction(()=>document.querySelector('#film').currentTime>.05);
    assert.equal(await page.locator('#film').evaluate(v=>getComputedStyle(v).objectFit),'cover');
    await page.locator('#intro-advance').click();
    await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
    await page.waitForFunction(()=>!document.querySelector('#film').paused);
    await page.locator('#intro-advance').click();
    assert.equal(await page.locator('.cover-parents p').count(),4);
    assert.equal(await page.locator('#monogram img').evaluate(i=>i.complete&&i.naturalWidth>0),true);
    await page.evaluate(()=>document.querySelector('#historia').scrollIntoView({behavior:'instant'}));
    await page.locator('#couple-photo img').evaluate(i=>i.decode());
    await page.waitForFunction(()=>document.querySelector('#historia').classList.contains('story-started'));
    await page.waitForTimeout(1100);
    assert.equal(await page.locator('.story-copy').evaluate(e=>getComputedStyle(e).opacity),'1');
    assert.equal(await page.locator('.story-end').evaluate(e=>getComputedStyle(e).opacity),'0');
    await page.waitForTimeout(1000);
    assert.equal(await page.locator('.story-end').evaluate(e=>getComputedStyle(e).opacity),'1');
    await page.locator('#celebracion').scrollIntoViewIfNeeded();
    await page.locator('#chapel img').evaluate(i=>i.decode());
    assert.equal(await page.locator('.program>div').count(),3);
    assert.match(await page.locator('.program').innerText(),/3:30 p. m./);
    assert.equal(await page.locator('#maps').getAttribute('href'),'https://maps.app.goo.gl/8mHtKmxxQYuKBo6k8');
    assert.equal(await page.locator('#maps').getAttribute('target'),'_blank');
    await page.locator('.dress').scrollIntoViewIfNeeded();
    await page.locator('.attire-single img').first().evaluate(i=>i.decode());
    assert.equal(await page.locator('#swatches .swatch').count(),6);
    assert.equal(await page.locator('#swatches-men .swatch').count(),3);
    await page.locator('.gifts').scrollIntoViewIfNeeded();
    for(const[id,number]of[['bank-account','19329724584030'],['bank-cci','00219312972458403012'],['bank-dollar-account','19114592696195'],['bank-dollar-cci','00219111459269619556']]){
     await page.locator(`[data-copy="${id}"]`).click();assert.equal(await page.evaluate(()=>window.lastCopied),number);
    }
    assert.equal(await page.locator('#gift-list').getAttribute('href'),'https://sinenvolturas.com/claudiacamarenajorgehiga/regalos');
    await page.locator('#open-gift-report').click();
    assert.equal(await page.locator('#gift-payer').inputValue(),guest.name);
    const currency=guest.seats===1?'USD':'PEN',operation=guest.seats===1?'000111':'000222';
    const message=guest.seats===1?'':'Con cariño, invitados de prueba';
    await page.locator('#gift-currency').selectOption(currency);
    await page.locator('#gift-operation').fill(operation);
    await page.locator('#gift-message').fill(message);
    await page.locator('#submit-gift-report').click();
    await page.waitForFunction(()=>document.querySelector('#gift-report-status').textContent.includes('pendiente'));
    const gift=service.tables.Obsequios.find(row=>row[0]===guest.id);
    assert.deepEqual(Array.from(gift.slice(0,7)),[guest.id,guest.name,guest.name,currency,operation,message,'Pendiente']);
    const giftCount=service.tables.Obsequios.length;
    await page.locator('#gift-operation').fill(operation);
    await page.locator('#submit-gift-report').click();
    await page.waitForFunction(()=>document.querySelector('#gift-operation').value==='');
    assert.equal(service.tables.Obsequios.length,giftCount);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#gift-report-dialog').isVisible(),false);
    assert.equal(await page.evaluate(()=>document.activeElement.id),'open-gift-report');
    await page.locator('.rsvp').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('#seat-count').innerText(),String(guest.seats));
    assert.equal(await page.locator('#seat-label').innerText(),guest.seats===1?'Pase':'Pases');
    assert.equal(await page.locator('#attendee-fields').isVisible(),false);
    await page.locator('[name=attendance][value=yes]').check();
    assert.equal(await page.locator('#names input').count(),guest.seats-1);
    assert.equal(await page.locator('#quantity-field').isVisible(),guest.seats>1);
    if(guest.seats===2){
     await page.locator('#submit-rsvp').click();
     assert.equal(service.tables.RSVP.some(row=>row[0]===guest.id),false);
     await page.locator('[name=companion-1]').fill('Acompañante Apellido');
    }
    outage=true;
    await page.locator('#submit-rsvp').click();
    await page.waitForFunction(()=>document.querySelector('#form-status').textContent.includes('No se pudo'));
    assert.equal(service.tables.RSVP.some(row=>row[0]===guest.id),false);
    outage=false;
    await page.locator('#submit-rsvp').click();
    await page.waitForFunction(()=>document.querySelector('#form-status').textContent.includes('guardó'));
    let saved=service.tables.RSVP.find(row=>row[0]===guest.id);
    assert.equal(saved[1],'Sí');assert.equal(saved[2],guest.seats);
    assert.deepEqual(JSON.parse(saved[3]),guest.seats===1?[guest.name]:[guest.name,'Acompañante Apellido']);
    await page.reload();
    await page.waitForFunction(()=>document.querySelector('[name=attendance][value=yes]').checked);
    if(guest.seats===2){
     assert.equal(await page.locator('[name=companion-1]').inputValue(),'Acompañante Apellido');
     await page.locator('#quantity').selectOption('1');
     await page.locator('#submit-rsvp').click();
     await page.waitForFunction(()=>document.querySelector('#form-status').textContent.includes('guardó'));
     assert.equal(service.tables.RSVP.find(row=>row[0]===guest.id)[2],1);
    }
    await page.locator('[name=attendance][value=no]').check();
    assert.equal(await page.locator('#attendee-fields').isVisible(),false);
    await page.locator('#submit-rsvp').click();
    await page.waitForFunction(()=>document.querySelector('#form-status').textContent.includes('guardó'));
    saved=service.tables.RSVP.find(row=>row[0]===guest.id);
    assert.equal(saved[1],'No');assert.equal(saved[2],0);assert.deepEqual(JSON.parse(saved[3]),[]);
    await page.reload();
    await page.waitForFunction(()=>document.querySelector('[name=attendance][value=no]').checked);
    await page.locator('footer').scrollIntoViewIfNeeded();
    await page.locator('.footer-monogram img').evaluate(i=>i.decode());
    assert.match(await page.locator('footer').innerText(),/Todo el amor nos trajo hasta aquí/i);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.deepEqual(errors,[]);
    assert.equal(JSON.stringify(service.tables.Invitados),initialGuests);
    console.log(`PASS ${guest.seats} pase(s), ${width}px: video, historia, programa, cuentas, abono, mensaje, RSVP, recarga, cambios y errores.`);
    await page.close();
   }
   assert.equal(service.tables.RSVP.length,3);assert.equal(service.tables.Obsequios.length,3);
  }
 }finally{
  global.fetch=originalFetch;
  if(originalKey===undefined)delete process.env.RSVP_API_KEY;else process.env.RSVP_API_KEY=originalKey;
  await browser.close();
 }
})().catch(e=>{console.error(e);process.exit(1)});
