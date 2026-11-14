import assert from 'node:assert/strict';
import {zipSync,strToU8} from './web/vendor/fflate.mjs';
import {extractMapStream,ARCHIVE_LIMIT} from './worker/archive.mjs';
import {NoteIndex} from './web/note-index.mjs';
let passed=0;async function test(name,fn){await fn();console.log('PASS '+name);passed++}
function streamed(bytes,chunk=637){let at=0;return new Response(new ReadableStream({pull(c){if(at>=bytes.length)return c.close();c.enqueue(bytes.subarray(at,at+=Math.min(chunk,bytes.length-at)))}}))}
await test('streaming archive extraction keeps charts/audio and discards unrelated files',async()=>{
 let bytes=zipSync({'chart.osu':strToU8('mania chart'),'sound.mp3':new Uint8Array([1,2,3]),'storyboard.osb':new Uint8Array(1024*1024)},{level:6});
 let result=await extractMapStream(streamed(bytes,31));assert.deepEqual(Object.keys(result.files).sort(),['chart.osu','sound.mp3']);assert.equal(result.downloadBytes,bytes.length);assert.equal(new TextDecoder().decode(result.files['chart.osu']),'mania chart');
});
await test('a no-video archive above the old 28 MB cap streams without buffering unused data',async()=>{
 let bytes=zipSync({'unused.bin':new Uint8Array(29*1048576),'chart.osu':strToU8('chart')},{level:0});
 let result=await extractMapStream(streamed(bytes,65536));assert.ok(result.downloadBytes>28*1048576);assert.equal(Object.keys(result.files).length,1);
});
await test('video-bearing responses are cancelled before the video body is consumed',async()=>{
 let bytes=zipSync({'background.mp4':new Uint8Array(1048576)},{level:0}),at=0,cancelled=false;
 let response=new Response(new ReadableStream({pull(c){c.enqueue(bytes.subarray(at,at+=64))},cancel(){cancelled=true}}));
 await assert.rejects(()=>extractMapStream(response),/video archive/);assert.equal(cancelled,true);assert.ok(at<1024);
});
await test('large retained assets and oversized archive declarations are rejected',async()=>{
 let bytes=zipSync({'huge.mp3':new Uint8Array(1)},{level:0});new DataView(bytes.buffer).setUint32(22,33*1048576,true);
 await assert.rejects(()=>extractMapStream(streamed(bytes)),/size limit/);
 await assert.rejects(()=>extractMapStream(new Response('x',{headers:{'content-length':ARCHIVE_LIMIT+1}})),/256 MB/);
});
await test('visibility queries include offscreen hold heads and work after seeking backwards',()=>{
 let notes=[{t:0,end:100},{t:1,end:1},{t:50,end:50},{t:99,end:101},{t:200,end:200}],index=new NoteIndex(notes);
 assert.deepEqual(index.query(49,51),[notes[0],notes[2]]);assert.deepEqual(index.query(98,100),[notes[0],notes[3]]);assert.deepEqual(index.query(0,2),notes.slice(0,2));
});
await test('a 100,000 note visibility query visits a small region instead of scanning the chart',()=>{
 let notes=Array.from({length:100000},(_,t)=>({t,end:t})),index=new NoteIndex(notes),visible=index.query(50000,50005);
 assert.equal(visible.length,6);assert.ok(index.visited<100,'visited '+index.visited+' tree nodes');
});
console.log(passed+' streaming and performance tests passed.');
