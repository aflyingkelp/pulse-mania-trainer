import assert from 'node:assert/strict';import fs from 'node:fs';import {zipSync,strToU8} from './web/vendor/fflate.mjs';import {parseOsu,analyze,Session,makeDrill,transformNotes,RULESETS,svPosition,timingStats,validateWindows} from './web/core.mjs';
let count=0;function test(name,fn){fn();console.log('PASS '+name);count++}
const osu=`osu file format v14
[General]
AudioFilename: audio.wav
Mode:3
[Metadata]
Title:Archive validation
Artist:PULSE test fixture
Creator:Trainer QA
Version:7K timing and holds
Tags:import-test
[Difficulty]
CircleSize:7
OverallDifficulty:7
[Events]
0,0,"background,wide.png",0,0
[TimingPoints]
0,500,4,2,0,100,1,0
3000,-50,4,2,0,100,0,0
[HitObjects]
0,192,2000,1,0,0:0:0:0:
80,192,2500,128,0,3500:0:0:0:0:
160,192,3000,1,0,0:0:0:0:
240,192,4000,1,0,0:0:0:0:
320,192,4500,1,0,0:0:0:0:
400,192,5000,128,0,6000:0:0:0:0:
512,192,6500,1,0,0:0:0:0:
`;
let chart=parseOsu(osu);
test('osu metadata, 7K lanes, quoted background and long note times',()=>{assert.equal(chart.keys,7);assert.equal(chart.notes[6].lane,6);assert.equal(chart.notes[1].end,3.5);assert.equal(chart.backgroundName,'background,wide.png');assert.equal(chart.audioName,'audio.wav');assert.equal(chart.bpm,120)});
test('standard charts are explicitly rejected',()=>assert.throws(()=>parseOsu(osu.replace('Mode:3','Mode:0')),/Mode:3/));
test('invalid objects skipped with warnings',()=>{let c=parseOsu(osu+'\nNaN,192,9000,1,0,0:0:0:0:\n');assert.equal(c.notes.length,7);assert.equal(c.warnings.length,1)});
test('mirror and no-hold modifiers preserve note count',()=>{let n=transformNotes(chart,{mirror:true,noLN:true});assert.equal(n.length,7);assert.equal(n[0].lane,6);assert.ok(n.every(x=>x.end===x.t))});
test('seeded random preserves chord columns and is deterministic',()=>{assert.deepEqual(transformNotes(chart,{random:true},9),transformNotes(chart,{random:true},9));assert.equal(new Set(transformNotes(chart,{random:true},9).map(n=>n.lane)).size,7)});
test('perfect full run including hold tails scores one million',()=>{let s=new Session(chart);let events=s.notes.flatMap(n=>[{t:n.t,lane:n.lane,down:true},{t:n.end,lane:n.lane,down:false}]).sort((a,b)=>a.t-b.t||Number(b.down)-Number(a.down));for(let e of events){s.tick(e.t);if(e.down)s.press(e.lane,e.t);else s.release(e.lane,e.t)}assert.equal(s.score,1000000);assert.equal(s.accuracy,100);assert.equal(s.hits.length,9);assert.ok(s.complete)});
test('missed heads and tails resolve once, combo resets',()=>{let s=new Session(chart);s.tick(20);s.tick(21);assert.equal(s.hits.length,9);assert.equal(s.counts[5],9);assert.equal(s.score,0);assert.ok(s.complete)});
test('early hold release is penalized',()=>{let s=new Session(chart);s.press(1,2.5);s.release(1,2.8);assert.equal(s.counts[0],1);assert.equal(s.counts[5],1)});
test('rates and offsets judge in wall-clock milliseconds',()=>{let s=new Session(chart,{rate:2,offset:30});let h=s.press(0,2.06);assert.ok(Math.abs(h.error)<1e-8);assert.equal(h.grade,0)});
test('practice range excludes crossing holds and outside taps',()=>{let s=new Session(chart,{start:3,end:5});assert.equal(s.notes.length,3);assert.ok(s.notes.every(n=>n.t>=3&&n.end<=5))});
test('scroll velocity integration and constant mode',()=>{assert.equal(svPosition(chart,4,true),5);assert.equal(svPosition(chart,4,false),4)});
test('custom timing windows validation',()=>{assert.ok(validateWindows([20,40,60,80,100]));assert.ok(!validateWindows([20,20,60,80,100]))});
test('deterministic drills from 1K through 10K have no overlapping holds',()=>{for(let keys=1;keys<=10;keys++)for(let pattern of['stream','jacks','trills','stairs','chordstream','holds']){let c=makeDrill({keys,pattern,seconds:12});assert.deepEqual(c,makeDrill({keys,pattern,seconds:12}));for(let l=0;l<keys;l++){let ns=c.notes.filter(n=>n.lane===l);for(let i=1;i<ns.length;i++)assert.ok(ns[i-1].end<=ns[i].t+.0001)}assert.ok(c.notes.every(n=>n.lane>=0&&n.lane<keys))}});
test('analysis and timing statistics',()=>{let a=analyze(chart);assert.equal(a.notes,7);assert.equal(a.ln,2);let st=timingStats([{grade:0,error:-10},{grade:1,error:10},{grade:5,error:null}]);assert.equal(st.mean,0);assert.equal(st.ur,100)});
fs.mkdirSync('fixtures',{recursive:true});let sr=22050,seconds=8,samples=sr*seconds,wav=new Uint8Array(44+samples*2),dv=new DataView(wav.buffer);function txt(offset,s){for(let i=0;i<s.length;i++)wav[offset+i]=s.charCodeAt(i)}txt(0,'RIFF');dv.setUint32(4,wav.length-8,true);txt(8,'WAVEfmt ');dv.setUint32(16,16,true);dv.setUint16(20,1,true);dv.setUint16(22,1,true);dv.setUint32(24,sr,true);dv.setUint32(28,sr*2,true);dv.setUint16(32,2,true);dv.setUint16(34,16,true);txt(36,'data');dv.setUint32(40,samples*2,true);for(let i=0;i<samples;i++){let local=(i/sr)%0.5;let value=Math.sin(i/sr*2*Math.PI*660)*Math.exp(-local*30)*.2;dv.setInt16(44+i*2,Math.round(value*32767),true)}let png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jvKkAAAAASUVORK5CYII=','base64'));fs.writeFileSync('fixtures/import-validation.osz',zipSync({'nested/test.osu':strToU8(osu),'nested/audio.wav':wav,'nested/background,wide.png':png,'nested/non-mania.osu':strToU8(osu.replace('Mode:3','Mode:0'))}));console.log(`${count} core tests passed. Import fixture written.`);

let result;globalThis.self={postMessage:message=>{result=message}};await import('./web/import-worker.mjs');let assetId='a'.repeat(64);let backup=zipSync({'pulse-backup.json':strToU8('{}'),['assets/'+assetId]:new Uint8Array([1,2,3]),'ignored.exe':new Uint8Array([4])});self.onmessage({data:backup.buffer});test('backup ZIP worker retains extensionless assets and ignores unrelated files',()=>{assert.ok(!result.error);assert.equal(result.files.length,2);assert.equal(result.files.find(f=>f.path.startsWith('assets/')).bytes.length,3)});
test('replay event stream reproduces scoring at variable rates',()=>{let c=makeDrill({pattern:'holds',seconds:12}),s=new Session(c,{rate:1.25,offset:15});let events=s.notes.flatMap(n=>[{t:n.t+.01875,lane:n.lane,down:true},{t:n.end+.01875,lane:n.lane,down:false}]).sort((a,b)=>a.t-b.t||Number(b.down)-Number(a.down));for(let e of events){s.tick(e.t);if(e.down)s.press(e.lane,e.t);else s.release(e.lane,e.t)}s.tick(c.duration+1);let replay=new Session(c,{rate:1.25,offset:15});for(let e of s.events){replay.tick(e.t);if(e.down)replay.press(e.lane,e.t);else replay.release(e.lane,e.t)}replay.tick(c.duration+1);assert.deepEqual(replay.counts,s.counts);assert.equal(replay.score,s.score)});
console.log('All '+count+' tests passed.');
