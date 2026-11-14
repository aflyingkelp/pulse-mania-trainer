import assert from 'node:assert/strict';
import {mountOnline} from './web/online.mjs';
class Element extends EventTarget{constructor(){super();this.value='';this.disabled=false;this.open=false;this.dataset={};this.classList={add(){},remove(){}}}showModal(){this.open=true}close(){this.open=false;this.dispatchEvent(new Event('close'))}}
let elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id)},select=new Element();select.dataset.selectMap='1';
globalThis.document={getElementById:get,querySelectorAll:q=>q==='[data-select-map]'?[select]:[]};globalThis.location={origin:'https://trainer.test'};
let data={charts:[{id:'chart'}],provider:'test'},set={id:1,title:'test',artist:'test',creator:'test',status:'ranked',downloadDisabled:false,difficulties:[{id:2,version:'4K',keys:4,length:10,bpm:120,notes:10,stars:1}]},resolveInstall,receivedSignal,calls=0,callbackGate=null;
globalThis.fetch=async(url,options)=>{if(options.method==='POST'){receivedSignal=options.signal;return new Promise(resolve=>resolveInstall=()=>resolve(Response.json(data)))}return Response.json({sets:[set],provider:'test'})};
get('onlineMax').value='20';
let online=mountOnline({getInstalled:()=>[],getVolume:()=>0,toast(){},async onInstalled(){calls++;assert.equal(get('mapSelector').open,false,'selector must close before cache/audio preparation');await callbackGate}});
online.ensureLoaded();await new Promise(resolve=>setImmediate(resolve));select.onclick();
let task=get('installPlay').onclick();assert.equal(get('closeSelector').disabled,false);get('closeSelector').onclick();assert.equal(receivedSignal.aborted,true);assert.equal(get('mapSelector').open,false);resolveInstall();await task;assert.equal(calls,0);
console.log('PASS closing an in-flight install aborts waiting and ignores late results');
select.onclick();task=get('installSet').onclick();get('mapSelector').dispatchEvent(new Event('cancel'));get('mapSelector').close();assert.equal(receivedSignal.aborted,true);resolveInstall();await task;assert.equal(calls,0);
console.log('PASS Escape cancels installation without leaving the UI locked');
let release;callbackGate=new Promise(resolve=>release=resolve);select.onclick();task=get('installPlay').onclick();resolveInstall();await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,1);assert.equal(get('mapSelector').open,false);assert.equal(get('closeSelector').disabled,false);release();await task;
console.log('PASS successful install removes the modal before slow playback preparation');
select.onclick();assert.equal(get('installSet').disabled,false);assert.equal(get('installPlay').disabled,false);assert.equal(get('closeSelector').disabled,false);
console.log('PASS selector remains usable after cancellation and a successful retry');
