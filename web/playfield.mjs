export const clampScroll=value=>Math.round(Math.max(1,Math.min(40,Number(value)||20))*10)/10;
export const scrollTime=speed=>11485/clampScroll(speed);
// lazer compensates for HitPosition so changing the receptor does not change
// the actual scrolling velocity. Its default hit line is 402 / 480 high.
export const scrollPixels=(speed,height)=>height*(402/480)/(scrollTime(speed)/1000);
export function fieldWidth(keys,columnWidth,skinWidth,available){return Math.max(1,Math.min(Math.max(keys*columnWidth,skinWidth||0),available))}
export function migratePlayfield(settings){
 if(!Number.isFinite(settings.scrollSpeed))settings.scrollSpeed=clampScroll((Number(settings.scroll)||650)*11.485/(720*402/480));
 settings.scrollSpeed=clampScroll(settings.scrollSpeed);
 if((settings.version||0)<6&&(!settings.laneWidth||settings.laneWidth<100))settings.laneWidth=128;
 settings.laneWidth=Math.max(40,Math.min(180,Number(settings.laneWidth)||128));settings.version=6;return settings;
}

export function adaptiveFieldWidth(keys,columnWidth,skinWidth,available,mode='adaptive'){if(mode==='full')return Math.max(1,available);if(mode==='fixed')return fieldWidth(keys,columnWidth,skinWidth,available);let target=keys*columnWidth*available/1024;if(available<600)target=Math.max(target,available*.94);return Math.max(1,Math.min(Math.max(target,skinWidth||0),available*(available<600?1:.9)))}
