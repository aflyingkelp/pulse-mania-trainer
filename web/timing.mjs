const finite=value=>Number.isFinite(value)?value:0;
export function eventPerformanceTime(timestamp,now=performance.now(),origin=performance.timeOrigin){
 let value=Number(timestamp);if(value>1e12)value-=origin;
 return Number.isFinite(value)&&value<=now+100&&value>=now-10000?value:now;
}
export function deviceLatency(ctx){return Math.max(0,finite(ctx.baseLatency))+Math.max(0,finite(ctx.outputLatency))}
export function audibleContextTime(ctx,timestamp=performance.now(),synchronise=true){
 let now=performance.now(),event=eventPerformanceTime(timestamp,now);
 if(!synchronise)return ctx.currentTime+(event-now)/1000;
 let stamp=ctx.getOutputTimestamp?.();
 if(stamp&&stamp.performanceTime>0&&Number.isFinite(stamp.contextTime)){
  let mapped=stamp.contextTime+(event-stamp.performanceTime)/1000;
  let current=stamp.contextTime+(now-stamp.performanceTime)/1000;
  if(current<=ctx.currentTime+.05&&current>=ctx.currentTime-2)return mapped;
 }
 return ctx.currentTime-deviceLatency(ctx)+(event-now)/1000;
}
export function visualTime(chartTime,offsetMs,rate){return chartTime-(Number(offsetMs)||0)/1000*rate}
export function audioStartPlan(contextTime,startContext,position,rate,offsetMs){
 let target=startContext+(Number(offsetMs)||0)/1000,when=Math.max(contextTime,target);
 return{when,offset:Math.max(0,position+(when-target)*rate)};
}
