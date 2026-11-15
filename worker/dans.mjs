import {Inflate,Unzip,UnzipInflate,UnzipPassThrough,strFromU8} from '../web/vendor/fflate.mjs';
import {parseOsu,analyze} from '../web/core.mjs';
import {DAN_SOURCE,DAN_PACKS} from './dan-catalog.mjs';
import {allowedAppOrigin} from './cors.mjs';
const running=new Map(),key=p=>'dans/packs/'+p+'.json';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
function streamImport(pack,env){
 let active=true,timer,encoder=new TextEncoder();
 return new Response(new ReadableStream({start(controller){
  controller.enqueue(encoder.encode(' '.repeat(8192)+'\n'));
  timer=setInterval(()=>{if(active)controller.enqueue(encoder.encode(' '.repeat(1024)+'\n'))},5000);
  (async()=>{try{let d=await importDan(pack,env);if(active)controller.enqueue(encoder.encode(JSON.stringify({id:d.id,name:d.name,category:d.category,charts:d.charts,cached:!!d.cached})))}catch(e){if(active)controller.enqueue(encoder.encode(JSON.stringify({error:e.message})))}finally{clearInterval(timer);if(active){active=false;controller.close()}}})();
 },cancel(){active=false;clearInterval(timer)}}),{headers:{'content-type':'application/json','cache-control':'no-store','x-accel-buffering':'no'}});
}
const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
const pathKey=p=>p.replaceAll('\\','/').replace(/^\.\//,'').toLowerCase();
const mime=p=>/\.mp3$/i.test(p)?'audio/mpeg':/\.ogg$/i.test(p)?'audio/ogg':/\.wav$/i.test(p)?'audio/wav':/\.png$/i.test(p)?'image/png':/\.webp$/i.test(p)?'image/webp':/\.jpe?g$/i.test(p)?'image/jpeg':'application/octet-stream';
const crcTable=Uint32Array.from({length:256},(_,i)=>{for(let b=0;b<8;b++)i=i&1?0xedb88320^(i>>>1):i>>>1;return i>>>0});

export async function importDan(pack,env){
 if(!env.BUCKET)throw Error('Server storage is unavailable.');
 let cached=await env.BUCKET.get(key(pack.id));if(cached)return{...await cached.json(),cached:true};
 if(running.has(pack.id))return running.get(pack.id);
 let task=(async()=>{
  let end=pack.start+pack.compressed-1,response=await fetch(DAN_SOURCE,{headers:{Range:`bytes=${pack.start}-${end}`},redirect:'manual',signal:AbortSignal.timeout(300000)});
  if(response.status!==206||response.headers.get('content-range')!==`bytes ${pack.start}-${end}/1761460997`){await response.body?.cancel();throw Error('Dan archive server did not return the requested pack range.')}
  let charts=[],assets={},pending=[],received=0,expanded=0,crc=0xffffffff,fileCount=0,active=0,failure=null;
  let unzip=new Unzip(file=>{
   if(++fileCount>4000)throw Error('Too many files in Dan pack.');
   let chart=/\.osu$/i.test(file.name),media=/\.(mp3|ogg|wav|flac|m4a|aac|png|jpe?g|webp)$/i.test(file.name);
   if(!chart&&!media){class Discard{push(_data,final){if(final)this.ondata(null,new Uint8Array(),true)}}Discard.compression=file.compression;unzip.register(Discard);file.ondata=()=>{};file.start();unzip.register(UnzipInflate);unzip.register(UnzipPassThrough);return}
   let size=0,parts=[],limit=(chart?8:48)*1048576;active++;
   if(file.originalSize>limit)throw Error('Dan file exceeds the per-file import budget: '+file.name);
   file.ondata=(error,data,final)=>{
    if(error)throw error;size+=data.length;if(size>limit)throw Error('Dan file exceeds its import budget.');parts.push(data);
    if(!final)return;active--;let raw=new Uint8Array(size),at=0;for(let part of parts){raw.set(part,at);at+=part.length}parts=[];
    let job=(async()=>{
     let id=await hash(raw);
     if(chart){let text=strFromU8(raw);if(!/^Mode\s*:\s*3\s*$/m.test(text))return;let c=parseOsu(text,file.name);if(c.notes.length>250000)throw Error('Dan chart exceeds 250,000 notes.');c.id=id;c.analysis=analyze(c);c.hosted=true;c.danPack=pack.id;c.danCategory=pack.category;c.source='Dan Reform';c.provider='Dan Reform';c.added=Date.now();c.downloadedAt=new Date().toISOString();let dir=file.name.replaceAll('\\','/').slice(0,file.name.replaceAll('\\','/').lastIndexOf('/')+1);
      await env.BUCKET.put('dans/charts/'+id+'.json',JSON.stringify(c),{httpMetadata:{contentType:'application/json'}});
      charts.push({id,title:c.title,artist:c.artist,creator:c.creator,version:c.version,keys:c.keys,duration:c.duration,notes:c.notes.length,bpm:c.bpm,peak:c.analysis.peak,audioName:c.audioName,backgroundName:c.backgroundName,dir});
     }else{if(!await env.BUCKET.head('assets/'+id))await env.BUCKET.put('assets/'+id,raw,{httpMetadata:{contentType:mime(file.name),cacheControl:'private, max-age=31536000, immutable'}});assets[pathKey(file.name)]='/api/assets/'+id}
    })();job.catch(error=>{failure=error});pending.push(job);
   };file.start();
  });unzip.register(UnzipInflate);
  let inflate=new Inflate(data=>{expanded+=data.length;if(expanded>pack.size)throw Error('Dan pack expansion exceeds the published size.');for(let byte of data)crc=crcTable[(crc^byte)&255]^(crc>>>8);unzip.push(data,false)}),reader=response.body.getReader();
  try{while(true){let {done,value}=await reader.read();if(done)break;received+=value.length;if(received>pack.compressed)throw Error('Dan archive range is oversized.');for(let at=0;at<value.length;at+=65536){inflate.push(value.subarray(at,at+65536),false);if(pending.length)await Promise.all(pending.splice(0));if(failure)throw failure}}inflate.push(new Uint8Array(),true);unzip.push(new Uint8Array(),true);await Promise.all(pending);if(failure)throw failure;
   if(received!==pack.compressed||expanded!==pack.size||((crc^0xffffffff)>>>0)!==pack.crc||active)throw Error('Dan pack failed archive integrity validation.');
   if(!charts.length)throw Error('No mania charts found in Dan pack.');
   charts.sort((a,b)=>a.version.localeCompare(b.version,undefined,{numeric:true}));
   let result={id:pack.id,name:pack.name,category:pack.category,source:'https://www.danreform.com/',installedAt:new Date().toISOString(),downloadBytes:received,charts,assets};
   await env.BUCKET.put(key(pack.id),JSON.stringify(result),{httpMetadata:{contentType:'application/json'}});return result;
  }catch(e){await reader.cancel().catch(()=>{});throw e}finally{reader.releaseLock()}
 })();running.set(pack.id,task);try{return await task}finally{running.delete(pack.id)}
}

export async function danAPI(request,env){
 let url=new URL(request.url),match=/^\/api\/dans(?:\/([a-z0-9-]+)(?:\/(install|charts)(?:\/([a-f0-9]{64}))?)?)?$/.exec(url.pathname);if(!match)return json({error:'Unknown Dan route.'},404);
 if(!env.BUCKET)return json({error:'Server storage is unavailable.'},503);
 try{
  if(!match[1]&&request.method==='GET'){let packs=[];for(let i=0;i<DAN_PACKS.length;i+=6)await Promise.all(DAN_PACKS.slice(i,i+6).map(async p=>{let stored=await env.BUCKET.get(key(p.id)),d=stored?await stored.json():null;packs.push({...p,installed:!!d,chartCount:d?.charts.length||0,charts:d?.charts||[]})}));return json({packs:packs.sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})),source:'https://www.danreform.com/',total:DAN_PACKS.length})}
  let pack=DAN_PACKS.find(p=>p.id===match[1]);if(!pack)return json({error:'Unknown Dan pack.'},404);
  if(match[2]==='install'&&request.method==='POST'){if(!allowedAppOrigin(request.headers.get('origin'),url.origin))return json({error:'Origin not allowed.'},403);return streamImport(pack,env)}
  if(match[2]==='charts'&&match[3]&&request.method==='GET'){let obj=await env.BUCKET.get(key(pack.id));if(!obj)return json({error:'This Dan pack is not installed yet.'},404);let d=await obj.json(),entry=d.charts.find(c=>c.id===match[3]);if(!entry)return json({error:'Chart not found in this pack.'},404);let chart=await (await env.BUCKET.get('dans/charts/'+entry.id+'.json')).json();const asset=name=>!name?null:d.assets[pathKey(entry.dir+name)]||d.assets[pathKey(name)]||Object.entries(d.assets).find(([p])=>p.endsWith('/'+pathKey(name)))?.[1]||null;return json({...chart,audioId:asset(chart.audioName),backgroundId:asset(chart.backgroundName)})}
  return json({error:'Unsupported Dan request.'},405);
 }catch(e){console.error('Dan import:',e.message);return json({error:e.message},502)}
}
