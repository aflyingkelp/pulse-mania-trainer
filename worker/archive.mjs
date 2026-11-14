import {Unzip,UnzipInflate,UnzipPassThrough} from '../web/vendor/fflate.mjs';

export const ARCHIVE_LIMIT=256*1048576;
const MEDIA=/\.(mp3|ogg|wav|flac|m4a|aac|png|jpe?g|webp)$/i;
const VIDEO=/\.(mp4|avi|flv|mkv|webm|mov|m4v|wmv|mpeg|mpg|ogv)$/i;
// Inflate incrementally: never retain the compressed archive or unpack video.
export async function extractMapStream(response){
 let claimed=Number(response.headers.get('content-length'));
 if(claimed>ARCHIVE_LIMIT){await response.body?.cancel();throw Object.assign(Error('The no-video archive exceeds 256 MB.'),{status:413})}
 let files=Object.create(null),paths=[],received=0,expanded=0,charts=0,open=0,signature=[],reader=response.body.getReader();
 let unzip=new Unzip(file=>{
  if(paths.length>=4000)throw Object.assign(Error('Mapset contains too many files.'),{status:413});
  paths.push(file.name);
  if(VIDEO.test(file.name))throw Error('Provider returned a video archive despite the no-video request.');
  let chart=/\.osu$/i.test(file.name),keep=chart||MEDIA.test(file.name);
  if(!keep){
   // Starting an entry drains it. A discard decoder avoids both inflation and
   // fflate's deferred compressed-chunk buffering for files we never use.
   class Discard{push(_data,final){if(final)this.ondata(null,new Uint8Array(),true)}}
   Discard.compression=file.compression;unzip.register(Discard);
   file.ondata=()=>{};file.start();
   unzip.register(UnzipInflate);unzip.register(UnzipPassThrough);return;
  }
  let limit=(chart?4:32)*1048576,size=0,parts=[];open++;
  if(file.originalSize>limit)throw Object.assign(Error('An extracted chart or media file exceeds its size limit.'),{status:413});
  file.ondata=(error,data,final)=>{
   if(error)throw error;
   size+=data.length;expanded+=data.length;if(chart)charts+=data.length;
   if(size>limit||expanded>60*1048576||charts>12*1048576)throw Object.assign(Error('Extracted map data exceeds the memory budget (32 MB per media file / 60 MB total).'),{status:413});
   parts.push(data);
   if(final){let joined=new Uint8Array(size),at=0;for(let part of parts){joined.set(part,at);at+=part.length}parts=[];files[file.name]=joined;open--}
  };file.start();
 });unzip.register(UnzipInflate);
 try{
  while(true){let {done,value}=await reader.read();if(done)break;received+=value.length;
   if(received>ARCHIVE_LIMIT)throw Object.assign(Error('The no-video archive exceeds 256 MB.'),{status:413});
   for(let i=0;i<value.length&&signature.length<4;i++)signature.push(value[i]);
   if(signature.length===4&&(signature[0]!==80||signature[1]!==75||signature[2]!==3||signature[3]!==4))throw Error('Provider did not return a ZIP map archive.');
   // Bound inflater input even when an upstream response arrives as one large chunk.
   for(let at=0;at<value.length;at+=65536)unzip.push(value.subarray(at,at+65536),false);
  }
  unzip.push(new Uint8Array(),true);if(signature.length<4||open)throw Error('The downloaded archive is incomplete.');
  return{files,paths,downloadBytes:received};
 }catch(e){await reader.cancel().catch(()=>{});throw e}finally{reader.releaseLock()}
}
