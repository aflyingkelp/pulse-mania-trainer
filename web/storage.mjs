let database;
export function db(){return database??=new Promise((resolve,reject)=>{let r=indexedDB.open('pulse-trainer',3);r.onupgradeneeded=()=>{for(let name of ['charts','assets','scores','settings','remote-cache','skins','skin-assets'])if(!r.result.objectStoreNames.contains(name))r.result.createObjectStore(name,{keyPath:'id'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
export async function all(name){let d=await db();return new Promise((res,rej)=>{let r=d.transaction(name).objectStore(name).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
export async function get(name,id){let d=await db();return new Promise((res,rej)=>{let r=d.transaction(name).objectStore(name).get(id);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
export async function put(name,value){let d=await db();return new Promise((res,rej)=>{let t=d.transaction(name,'readwrite');t.objectStore(name).put(value);t.oncomplete=()=>res(value);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error)})}
export async function remove(name,id){let d=await db();return new Promise((res,rej)=>{let t=d.transaction(name,'readwrite');t.objectStore(name).delete(id);t.oncomplete=res;t.onerror=()=>rej(t.error)})}
export async function clear(name){let d=await db();return new Promise((res,rej)=>{let t=d.transaction(name,'readwrite');t.objectStore(name).clear();t.oncomplete=res;t.onerror=()=>rej(t.error)})}
export async function fingerprint(data){let h=await crypto.subtle.digest('SHA-256',data);return Array.from(new Uint8Array(h),b=>b.toString(16).padStart(2,'0')).join('')}
