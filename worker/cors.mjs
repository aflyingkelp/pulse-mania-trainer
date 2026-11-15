export const PAGES_ORIGIN='https://aflyingkelp.github.io';
export function allowedAppOrigin(origin,requestOrigin){return !origin||origin===requestOrigin||origin===PAGES_ORIGIN}
export async function handleAPI(request,env,handler){
 let origin=request.headers.get('origin'),allowed=origin===PAGES_ORIGIN;
 if(request.method==='OPTIONS'){
  if(!allowed)return new Response('Origin not allowed',{status:403});
  return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, HEAD, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Range','Access-Control-Max-Age':'86400','Vary':'Origin'}});
 }
 let response=await handler(request,env);if(!allowed)return response;
 let headers=new Headers(response.headers);headers.set('Access-Control-Allow-Origin',origin);headers.set('Access-Control-Expose-Headers','Content-Length, Content-Range, Accept-Ranges');headers.append('Vary','Origin');
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
