const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const digest = s => crypto.createHash('sha256').update(s).digest('hex');
function setup() {
 const token = 'a'.repeat(64), key = 'test-only-key-'.repeat(4);
 const tables = {Invitados:[['ID','Titular','Cupos','TokenHash','Enlace'],['one','Familia Uno',2,digest(token),''],['two','Familia Dos',4,digest('b'.repeat(64)),'']],RSVP:[['ID','Asiste','Cantidad','Nombres','Mensaje','Actualizado']]};
 let released=0;
 function sheet(name){return {getName:()=>name,getLastRow:()=>tables[name].length,getRange:(row,col,n=1,m=1)=>({getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>tables[name][row-1+i]?.[col-1+j]??'')),setValues:values=>{values.forEach((r,i)=>{tables[name][row-1+i]??=[];r.forEach((v,j)=>tables[name][row-1+i][col-1+j]=v)});}})}}
 const ctx = vm.createContext({Utilities:{DigestAlgorithm:{SHA_256:1},Charset:{UTF_8:1},computeDigest:(_,s)=>[...crypto.createHash('sha256').update(s).digest()]},PropertiesService:{getScriptProperties:()=>({getProperty:n=>n==='API_KEY'?key:null})},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>released++})},SpreadsheetApp:{openById:()=>({getSheetByName:sheet}),flush:()=>{}},ContentService:{MimeType:{JSON:'json'},createTextOutput:body=>({setMimeType:()=>JSON.parse(body)})}});
 vm.runInContext(fs.readFileSync('integrations/google-sheets/Code.gs','utf8'),ctx);
 return {tables,ctx,call:(data)=>ctx.doPost({postData:{contents:JSON.stringify({apiKey:key,token,...data})}}),released:()=>released};
}
test('lookup reveals only the matching family',()=>{const s=setup(),r=s.call({action:'lookup'});assert.equal(r.invitation.name,'Familia Uno');assert.equal(JSON.stringify(r).includes('Familia Dos'),false)});
test('partial confirmation updates existing row and supports declining',()=>{const s=setup();let response={attending:true,count:1,names:['Uno'],message:'=SUM(1,1)'};assert(s.call({action:'save',response}).ok);assert.equal(s.tables.RSVP.length,2);assert.equal(s.tables.RSVP[1][4],"'=SUM(1,1)");assert.equal(s.call({action:'lookup'}).invitation.response.message,'=SUM(1,1)');response={attending:false,count:0,names:[],message:''};assert(s.call({action:'save',response}).ok);assert.equal(s.tables.RSVP.length,2);assert.equal(s.call({action:'lookup'}).invitation.response.attending,false);assert(s.released()>0)});
test('rejects extra seats, forged caps, missing names, invalid counts and inconsistent decline',()=>{for(const response of [{attending:true,count:3,names:['a','b','c'],message:''},{attending:true,count:1,names:['a'],message:'',seats:999},{attending:true,count:1,names:[' '],message:''},{attending:true,count:1.5,names:['a'],message:''},{attending:false,count:1,names:['a'],message:''}]){const s=setup();assert.equal(s.call({action:'save',response}).error,'INVALID_RESPONSE');assert.equal(s.tables.RSVP.length,1)}});
test('invalid token or key never writes',()=>{const s=setup();assert.equal(s.call({action:'lookup',token:'c'.repeat(64)}).error,'INVALID_INVITATION');assert.equal(s.call({action:'save',apiKey:'bad'}).error,'UNAUTHORIZED');assert.equal(s.tables.RSVP.length,1)});
test('conflicting RSVP headers are not overwritten',()=>{const s=setup();s.tables.RSVP[0]=['Datos anteriores'];assert.equal(s.call({action:'lookup'}).error,'SERVICE_ERROR');assert.equal(s.tables.RSVP[0][0],'Datos anteriores')});
test('Vercel proxy protects key, checks errors and returns actual saved status',async()=>{const handler=require('../api/invitation.js');const originalFetch=global.fetch;const oldUrl=process.env.RSVP_SCRIPT_URL,oldKey=process.env.RSVP_API_KEY;process.env.RSVP_SCRIPT_URL='https://script.google.com/macros/s/test/exec';process.env.RSVP_API_KEY='test-only-key-'.repeat(4);const run=async(req)=>{let status,body;await handler(req,{setHeader(){},status(s){status=s;return this},json(b){body=b;return this}});return{status,body}};try{let called=false;global.fetch=async()=>{called=true;return{ok:true,json:async()=>({ok:true})}};assert.equal((await run({method:'GET',headers:{}})).status,401);assert.equal(called,false);global.fetch=async(url,opts)=>{const b=JSON.parse(opts.body);assert.equal(b.action,'save');assert(b.apiKey);return{ok:true,json:async()=>({ok:false,error:'INVALID_RESPONSE'})}};const req={method:'PUT',headers:{authorization:'Bearer '+'a'.repeat(64)},body:{attending:true,count:99,names:[],message:''}};assert.equal((await run(req)).status,400);global.fetch=async()=>({ok:true,json:async()=>({ok:true})});const r=await run(req);assert.equal(r.status,200);assert.deepEqual(r.body,{ok:true});global.fetch=async()=>{throw Error('offline')};assert.equal((await run(req)).status,503)}finally{global.fetch=originalFetch;if(oldUrl===undefined)delete process.env.RSVP_SCRIPT_URL;else process.env.RSVP_SCRIPT_URL=oldUrl;if(oldKey===undefined)delete process.env.RSVP_API_KEY;else process.env.RSVP_API_KEY=oldKey}});
function originalList() {
 const s=setup();const table=[['','Invitados','Pases'],['Origen','Familia Uno',2],['Origen','Familia Dos',1]];
 const sheet={getSheetId:()=>1294208008,getName:()=> 'RSVP',getLastRow:()=>table.length,getActiveRange:()=>({getRow:()=>2,getNumRows:()=>1}),getRange:(row,col,n=1,m=1)=>({getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>table[row-1+i]?.[col-1+j]??'')),getFormulas:()=>Array.from({length:n},()=>Array(m).fill('')),setValues:values=>{values.forEach((r,i)=>{table[row-1+i]??=[];r.forEach((v,j)=>table[row-1+i][col-1+j]=v)})},setValue:value=>{table[row-1]??=[];table[row-1][col-1]=value}})};
 const book={getSheets:()=>[sheet],getActiveSheet:()=>sheet,toast:()=>{}};
 s.ctx.SpreadsheetApp.openById=()=>book;s.ctx.SpreadsheetApp.getActiveSpreadsheet=()=>book;
 s.ctx.PropertiesService.getScriptProperties=()=>({getProperty:n=>n==='API_KEY'?'test-only-key-'.repeat(4):null});
 let counter=0;s.ctx.Utilities.getUuid=()=> 'uuid-'+(++counter);s.ctx.LockService.getScriptLock=()=>({waitLock(){},tryLock:()=>true,releaseLock(){}});
 return {...s,table,sheet,book};
}
test('existing B/C list gets metadata and confirmation on same row without changing original columns',()=>{const s=originalList();const before=JSON.stringify(s.table.map(r=>r.slice(0,3)));s.ctx.prepararRSVP();assert.equal(s.table[0][5],'Enlace');s.ctx.generarEnlaceSeleccionado();assert(s.table[1][5].startsWith('https://claudiayjorge.vercel.app/i/'));const token=s.table[1][5].split('/i/')[1];const r=s.call({action:'lookup',token});assert.equal(r.invitation.name,'Familia Uno');assert.equal(r.invitation.seats,2);assert(s.call({action:'save',token,response:{attending:true,count:1,names:['Familia Uno'],message:''}}).ok);assert.equal(s.table[1][6],'Sí');assert.equal(s.table[1][7],1);assert.equal(s.table.length,3);assert.equal(JSON.stringify(s.table.map(r=>r.slice(0,3))),before);assert.equal(s.call({action:'lookup',token}).invitation.response.count,1);s.ctx.generarEnlaceSeleccionado();assert.equal(s.call({action:'lookup',token}).error,'INVALID_INVITATION')});
test('existing unknown D:J data is preserved and setup stops',()=>{for(const header of ['', 'Otro campo']){const s=originalList();s.table[0][3]=header;s.table[1][3]='Dato existente';assert.throws(()=>s.ctx.prepararRSVP());assert.equal(s.table[1][3],'Dato existente')}});

test('bulk generation needs no selection and preserves existing links on rerun',()=>{const s=originalList();s.sheet.getActiveRange=()=>null;s.ctx.prepararRSVP();assert.throws(()=>s.ctx.generarEnlaceSeleccionado(),/generarEnlacesFaltantes/);const result=s.ctx.generarEnlacesFaltantes();assert.equal(result.created,2);const links=s.table.slice(1).map(r=>r[5]);assert(links.every(link=>link.includes('/i/')));assert.equal(s.ctx.generarEnlacesFaltantes().created,0);assert.equal(s.ctx.generarEnlacesFaltantes().kept,2);assert.deepEqual(s.table.slice(1).map(r=>r[5]),links)});
test('list is recognized by actual headers even if its gid changed',()=>{const s=originalList();s.sheet.getSheetId=()=>9876;s.ctx.prepararRSVP();assert.equal(s.ctx.generarEnlacesFaltantes().created,2)});
test('bulk skips invalid passes and never rewrites names or original columns',()=>{const s=originalList();s.table[2][2]=0;const original=JSON.stringify(s.table.map(r=>r.slice(0,3)));s.ctx.prepararRSVP();const result=s.ctx.generarEnlacesFaltantes();assert.equal(result.created,1);assert.equal(result.invalidRows[0],3);assert.equal(s.table[2][5],undefined);assert.equal(JSON.stringify(s.table.map(r=>r.slice(0,3))),original)});

test('canonical invitation domain works without WEDDING_URL property',()=>{const s=originalList();s.ctx.PropertiesService.getScriptProperties=()=>({getProperty:n=>n==='API_KEY'?'test-only-key-'.repeat(4):null});s.ctx.prepararRSVP();assert.equal(s.ctx.generarEnlacesFaltantes().created,2);assert(s.table[1][5].startsWith('https://claudiayjorge.vercel.app/i/'))});

test('one-step initializer prepares blank metadata and generates links, then reruns safely',()=>{const s=originalList();const first=s.ctx.iniciarRSVP();assert.equal(first.creados,2);assert.equal(first.pestana,'RSVP');assert.equal(s.table[0][5],'Enlace');assert(s.table[1][5].includes('claudiayjorge.vercel.app/i/'));assert.equal(s.ctx.iniciarRSVP().creados,0);assert.equal(s.ctx.iniciarRSVP().conservados,2)});
test('creates a new separate RSVP database, imports original names/passes, writes links and reuses it',()=>{const s=originalList();const original=JSON.stringify(s.table);const props={API_KEY:'test-only-key-'.repeat(4)};s.ctx.PropertiesService.getScriptProperties=()=>({getProperty:n=>props[n]||null,setProperty:(n,v)=>{props[n]=v}});let creates=0;const sheets=[];function add(name){const data=[];const sheet={name,data,getName(){return this.name},setName(n){this.name=n},getSheetId:()=>100+sheets.indexOf(sheet),setFrozenRows(){},getLastRow:()=>data.length,getRange:(row,col,n=1,m=1)=>({getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>data[row-1+i]?.[col-1+j]??'')),setValues:values=>{values.forEach((r,i)=>{data[row-1+i]??=[];r.forEach((v,j)=>data[row-1+i][col-1+j]=v)})},setValue:v=>{data[row-1]??=[];data[row-1][col-1]=v}})};sheets.push(sheet);return sheet}add('Hoja 1');const created={getId:()=> 'new-test-sheet',getSheets:()=>sheets,getSheetByName:n=>sheets.find(s=>s.name===n),insertSheet:add,toast(){}};s.ctx.SpreadsheetApp.create=()=>{creates++;return created};s.ctx.SpreadsheetApp.openById=id=>id==='new-test-sheet'?created:s.book;const result=s.ctx.crearBaseRSVP();assert.equal(result.importados,2);assert.equal(result.creados,2);assert.equal(props.RSVP_SPREADSHEET_ID,'new-test-sheet');assert.equal(JSON.stringify(s.table),original);const guests=created.getSheetByName('Invitados');assert.equal(guests.data[1][1],'Familia Uno');assert.equal(guests.data[1][2],2);assert(guests.data[1][4].startsWith('https://claudiayjorge.vercel.app/i/'));const links=JSON.stringify(guests.data);s.ctx.crearBaseRSVP();assert.equal(creates,1);assert.equal(JSON.stringify(guests.data),links);const token=guests.data[1][4].split('/i/')[1];assert.equal(s.call({action:'lookup',token}).invitation.name,'Familia Uno');assert(s.call({action:'save',token,response:{attending:true,count:1,names:['Familia Uno'],message:''}}).ok);assert.equal(created.getSheetByName('RSVP').data[1][2],1)});

test('shortening existing links preserves old URLs and saved answers, reruns safely and revokes on renewal',()=>{
 const s=originalList();const props={API_KEY:'test-only-key-'.repeat(4)};
 s.ctx.PropertiesService.getScriptProperties=()=>({getProperty:n=>props[n]||null,setProperty:(n,v)=>props[n]=v});
 s.ctx.prepararRSVP();const legacy='d'.repeat(64);
 s.table[1][3]='legacy-id';s.table[1][4]=digest(legacy);s.table[1][5]='https://claudiayjorge.vercel.app/#invite='+legacy;
 assert(s.call({action:'save',token:legacy,response:{attending:true,count:1,names:['Familia Uno'],message:''}}).ok);
 const answer=JSON.stringify(s.table[1].slice(6));
 assert.equal(s.ctx.acortarEnlacesExistentes().shortened,1);
 const short=s.table[1][5].split('/i/')[1];assert.equal(short.length,24);
 assert.equal(s.call({action:'lookup',token:short}).invitation.response.count,1);
 assert.equal(s.call({action:'lookup',token:legacy}).invitation.name,'Familia Uno');
 assert.equal(JSON.stringify(s.table[1].slice(6)),answer);
 assert.equal(s.ctx.acortarEnlacesExistentes().shortened,0);
 assert(s.call({action:'save',token:short,response:{attending:false,count:0,names:[],message:''}}).ok);
 assert.equal(s.call({action:'lookup',token:legacy}).invitation.response.attending,false);
 s.ctx.generarEnlaceSeleccionado();
 assert.equal(s.call({action:'lookup',token:legacy}).error,'INVALID_INVITATION');
 assert.equal(s.call({action:'lookup',token:short}).error,'INVALID_INVITATION');
});
test('shortening refuses conflicting aliases without replacing the affected link',()=>{
 const s=originalList();s.ctx.prepararRSVP();const token='e'.repeat(64),url='https://claudiayjorge.vercel.app/#invite='+token;
 s.table[1][3]='id';s.table[1][4]=digest(token);s.table[1][5]=url;
 const props={API_KEY:'test-only-key-'.repeat(4),['SHORT_'+digest(token.slice(0,24))]:digest('another')};
 s.ctx.PropertiesService.getScriptProperties=()=>({getProperty:n=>props[n]||null,setProperty:(n,v)=>props[n]=v});
 assert.throws(()=>s.ctx.acortarEnlacesExistentes(),/Conflicto/);assert.equal(s.table[1][5],url);
});
test('Vercel proxy accepts 24-character tokens and rejects malformed short tokens',async()=>{
 const handler=require('../api/invitation.js');const oldFetch=global.fetch,oldKey=process.env.RSVP_API_KEY;
 process.env.RSVP_API_KEY='test-only-key-'.repeat(4);
 const run=async token=>{let code,body;await handler({method:'GET',headers:{authorization:'Bearer '+token}},{setHeader(){},status(s){code=s;return this},json(b){body=b;return this}});return{code,body}};
 try{
  global.fetch=async(_,opts)=>{assert.equal(JSON.parse(opts.body).token,'a'.repeat(24));return{ok:true,json:async()=>({ok:true,invitation:{name:'Invitado Apellido',seats:2}})}};
  assert.equal((await run('a'.repeat(24))).code,200);
  for(const token of ['a'.repeat(12),'a'.repeat(23),'a'.repeat(25),'x'.repeat(24)])assert.equal((await run(token)).code,401);
 }finally{global.fetch=oldFetch;if(oldKey===undefined)delete process.env.RSVP_API_KEY;else process.env.RSVP_API_KEY=oldKey}
});
