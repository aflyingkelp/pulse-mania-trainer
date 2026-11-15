import assert from 'node:assert/strict';
import {zipSync,strToU8} from './web/vendor/fflate.mjs';
import {importDan,danAPI} from './worker/dans.mjs';
import {DAN_PACKS,DAN_SOURCE} from './worker/dan-catalog.mjs';
import {LocalBucket} from './scripts/local-bucket.mjs';
assert.equal(DAN_PACKS.length,26);for(let category of['Jack','Speed','Stamina','Tech'])assert.equal(DAN_PACKS.filter(p=>p.category===category).length,2);
assert.ok(DAN_PACKS.every(p=>p.start>0&&p.compressed>0&&p.size>0));
console.log('PASS all 26 published packs include both versions of every skill category');
let text='osu file format v14\n[General]\nMode:3\nAudioFilename:test.mp3\n[Metadata]\nTitle:Dan test\nArtist:Trainer QA\nCreator:Trainer QA\nVersion:Speed test\n[Difficulty]\nCircleSize:4\nOverallDifficulty:5\n[TimingPoints]\n0,500,4,2,0,100,1,0\n[HitObjects]\n64,192,1000,1,0,0:0:0:0:\n';
let inner=zipSync({'chart.osu':strToU8(text),'test.mp3':new Uint8Array([1,2,3,4]),'readme.txt':strToU8('credits')},{level:0}),outer=zipSync({'test.osz':inner},{level:6}),view=new DataView(outer.buffer),start=30+view.getUint16(26,true)+view.getUint16(28,true),size=view.getUint32(18,true),compressed=outer.slice(start,start+size),pack={id:'zeta-v1',name:'Zeta - v1',category:'Main',start,compressed:size,size:inner.length,crc:view.getUint32(14,true)},env={BUCKET:new LocalBucket('work/dan-tests-'+Date.now())},original=globalThis.fetch,calls=0;
globalThis.fetch=async(url,options)=>{calls++;assert.equal(options.redirect,'manual');assert.equal(url,DAN_SOURCE);assert.equal(options.headers.Range,`bytes=${start}-${start+size-1}`);let at=0;return new Response(new ReadableStream({pull(c){if(at===compressed.length)return c.close();let end=Math.min(at+37,compressed.length);c.enqueue(compressed.slice(at,end));at=end}}),{status:206,headers:{'content-range':`bytes ${start}-${start+size-1}/1761460997`}})};
try{
 let result=await importDan(pack,env);assert.equal(result.charts.length,1);assert.equal(Object.keys(result.assets).length,1);assert.ok(await env.BUCKET.get('dans/charts/'+result.charts[0].id+'.json'));
 console.log('PASS nested range extraction stores only charts and playable media');
 let streamed=await danAPI(new Request('https://test/api/dans/zeta-v1/install',{method:'POST'}),env);assert.equal((await streamed.json()).cached,true);let cached=await importDan(pack,env);assert.equal(cached.cached,true);assert.equal(calls,1);
 let chart=await (await danAPI(new Request('https://test/api/dans/zeta-v1/charts/'+result.charts[0].id),env)).json();assert.ok(chart.audioId.startsWith('/api/assets/'));assert.equal(chart.keys,4);assert.equal(chart.notes.length,1);
 let catalog=await (await danAPI(new Request('https://test/api/dans'),env)).json();assert.equal(catalog.packs.length,26);assert.equal(catalog.packs.find(p=>p.id==='zeta-v1').chartCount,1);assert.equal(catalog.packs.find(p=>p.id==='zeta-v1').charts[0].notes,1);
 console.log('PASS server cache and catalog expose metadata without loading every chart');
 await assert.rejects(()=>importDan({...pack,id:'bad-crc',crc:0},env),/integrity/);assert.equal(await env.BUCKET.get('dans/packs/bad-crc.json'),null);
 assert.equal((await danAPI(new Request('https://test/api/dans/unknown/install',{method:'POST'}),env)).status,404);
 assert.equal((await danAPI(new Request('https://test/api/dans/zeta-v1/install',{method:'POST',headers:{origin:'https://evil.test'}}),env)).status,403);
 console.log('PASS integrity failures stay unpublished and unapproved installs are rejected');
}finally{globalThis.fetch=original}
