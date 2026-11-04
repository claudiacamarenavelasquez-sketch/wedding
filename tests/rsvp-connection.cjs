const test=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/invitation.js');
const fixed='https://script.google.com/macros/s/AKfycbxI9qiR24_O1ng66gGS9KZdwCNToXEmLvMevIPPmJPL58Y4ObWG6vx_uS-1hENuZvM/exec';
test('uses requested deployment even when Vercel has a stale URL',async()=>{
 const oldFetch=global.fetch,oldKey=process.env.RSVP_API_KEY,oldURL=process.env.RSVP_SCRIPT_URL;
 process.env.RSVP_API_KEY='private-test-key-'.repeat(4);process.env.RSVP_SCRIPT_URL='https://script.google.com/macros/s/stale/exec';
 let status,body;
 try{
  global.fetch=async(url)=>{assert.equal(url,fixed);return{ok:true,json:async()=>({ok:true,invitation:{name:'Invitado de prueba',seats:1}})}};
  await handler({method:'GET',headers:{authorization:'Bearer '+'a'.repeat(24)}},{setHeader(){},status(n){status=n;return this},json(data){body=data;return this}});
  assert.equal(status,200);assert.equal(body.name,'Invitado de prueba');
 }finally{global.fetch=oldFetch;if(oldKey===undefined)delete process.env.RSVP_API_KEY;else process.env.RSVP_API_KEY=oldKey;if(oldURL===undefined)delete process.env.RSVP_SCRIPT_URL;else process.env.RSVP_SCRIPT_URL=oldURL}
});
test('diagnoses connection failures without logging keys, tokens or upstream data',async()=>{
 const oldFetch=global.fetch,oldKey=process.env.RSVP_API_KEY,oldError=console.error;
 const key='secret-key-never-log-'.repeat(3),token='a'.repeat(24);let logs=[];
 console.error=(...args)=>logs.push(args.join(' '));
 const cases=[
  ['SCRIPT_BUSY',async()=>({ok:true,json:async()=>({ok:false,error:'BUSY'})})],
  ['SCRIPT_API_KEY_MISMATCH',async()=>({ok:true,json:async()=>({ok:false,error:'UNAUTHORIZED'})})],
  ['SCRIPT_API_KEY_MISSING',async()=>({ok:true,json:async()=>({ok:false,error:'NOT_CONFIGURED'})})],
  ['SCRIPT_SHEETS_ERROR',async()=>({ok:true,json:async()=>({ok:false,error:'SERVICE_ERROR'})})],
  ['SCRIPT_HTTP_403',async()=>({ok:false,status:403})],
  ['SCRIPT_RESPONSE_NOT_JSON',async()=>({ok:true,json:async()=>{throw Error('private upstream HTML')}})],
  ['SCRIPT_RESPONSE_INVALID',async()=>({ok:true,json:async()=>null})],
  ['SCRIPT_TIMEOUT',async()=>{const e=new Error('private data');e.name='TimeoutError';throw e}],
  ['SCRIPT_NETWORK_ERROR',async()=>{throw Error('private data')}]
 ];
 try{
  process.env.RSVP_API_KEY=key;
  for(const[reason,fetcher]of cases){
   logs=[];global.fetch=fetcher;let status,body;
   await handler({method:'GET',headers:{authorization:'Bearer '+token}},{setHeader(){},status(n){status=n;return this},json(data){body=data;return this}});
   assert.equal(status,503);assert.deepEqual(body,{error:'SERVICE_UNAVAILABLE'});
   assert.deepEqual(logs,['[RSVP_CONNECTION] '+reason]);
   assert(!logs.join().includes(key));assert(!logs.join().includes(token));assert(!logs.join().includes('private'));
  }
  delete process.env.RSVP_API_KEY;logs=[];
  let body;await handler({method:'GET',headers:{authorization:'Bearer '+token}},{setHeader(){},status(){return this},json(data){body=data;return this}});
  assert.equal(body.error,'NOT_CONFIGURED');assert.deepEqual(logs,['[RSVP_CONNECTION] VERCEL_API_KEY_MISSING']);
 }finally{global.fetch=oldFetch;console.error=oldError;if(oldKey===undefined)delete process.env.RSVP_API_KEY;else process.env.RSVP_API_KEY=oldKey}
});
