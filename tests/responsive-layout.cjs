const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 for (const width of [320,390,650,768,899,900,1024,1440,1920,2768]) {
  const page = await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  await page.goto(`http://127.0.0.1:${process.env.TEST_PORT || 3000}`);
  await page.evaluate(()=>document.fonts.ready);
  const sizes = await page.evaluate(()=>{
   const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
   return {cover:rect('.cover-border'),names:rect('.cover h1'),invite:rect('.cover-invitation'),dress:rect('.dress-stationery'),overflow:document.documentElement.scrollWidth>innerWidth,storyFont:getComputedStyle(document.querySelector('#story-title')).fontSize};
  });
  assert(!sizes.overflow,`overflow at ${width}`);
  assert(sizes.names.bottom<sizes.invite.y,`cover overlap at ${width}`);
  assert(sizes.invite.bottom<sizes.cover.bottom,`invitation clipped at ${width}`);
  if(width>=900){
   assert(sizes.cover.width>=width*.88,`narrow desktop cover ${width}`);
   assert(sizes.cover.height<=950,`excessive cover height ${width}`);
   assert(sizes.dress.width>=width*.88,`narrow dress card ${width}`);
   assert(parseFloat(sizes.storyFont)>=40);
  }else if(width<=650)assert.equal(sizes.storyFont,'30px');
  for(const selector of ['#celebracion','.dress','.gifts','.rsvp','footer']){
   await page.locator(selector).scrollIntoViewIfNeeded();
   assert(await page.locator(selector).evaluate(e=>{const r=e.getBoundingClientRect();return r.width<=innerWidth+1}),`${selector} overflow ${width}`);
  }
  if(width===1440){
   for(const [selector,name] of [['#portada','cover'],['.dress','dress'],['.gifts','gifts'],['.rsvp','rsvp']])await page.locator(selector).screenshot({path:`/tmp/desktop-${name}.png`});
  }
  console.log(width,`cover ${Math.round(sizes.cover.width)} × ${Math.round(sizes.cover.height)}, dress ${Math.round(sizes.dress.width)}`);
  await page.close();
 }
 await browser.close();
 console.log('Todas las secciones verificadas desde celular hasta escritorio amplio.');
})().catch(error=>{console.error(error);process.exit(1)});
