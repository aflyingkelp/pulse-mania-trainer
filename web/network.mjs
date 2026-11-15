// Pages uses the public map backend; the Worker deployment stays same-origin.
export function apiURL(path){
 if(!/^\/api\/[a-zA-Z0-9/?&=%.+_~-]*$/.test(path))throw Error('Invalid trainer API path.');
 let configured=typeof document!=='undefined'?document.querySelector?.('meta[name="pulse-api-origin"]')?.content:'';
 if(!configured)return path;
 let origin=new URL(configured);if(origin.protocol!=='https:'||origin.username||origin.password)throw Error('Invalid trainer API origin.');
 return origin.origin+path;
}
