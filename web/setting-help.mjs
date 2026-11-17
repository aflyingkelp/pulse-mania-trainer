export const SETTING_HELP={
 offset:'Input judgment correction only. Positive values compensate for consistently late key presses; this moves neither music nor notes. Use results or tap calibration after aligning audio and visuals.',
 audioOffset:'Moves music only, independently of visuals and input windows. Positive = music later; negative = music earlier. Changes apply on the next start or resume.',
 visualOffset:'Moves note animation only. Positive = notes reach the receptor later; negative = earlier. It does not change music, scoring or replay input times.',
 audioSync:'Aligns judgments with estimated sound arriving at your output device using its output timestamp. Disable only if your browser reports inaccurate timing. It cannot remove physical speaker/Bluetooth delay.',
 ruleset:'Selects judgment windows. Lazer follows map OD and hold-release lenience; trainer presets use fixed windows. Custom lets you enter your own windows. Scores remain trainer-specific.',
 odMode:'Use the map’s Overall Difficulty, or override it to train with easier or stricter timing windows.',
 od:'Higher OD narrows the timing windows in the lazer profile. This does not change note patterns or scroll speed.',
 volume:'Music and generated drill volume. Hit sounds have a separate volume control.',
 hitVolume:'Volume of immediate successful-hit feedback and imported skin hit samples. Set to zero to mute hit sounds.',
 preservePitch:'Keeps the song’s pitch at changed playback rates. Non-1× rates use the browser media engine and can have more timing jitter; decoded Web Audio is used at 1×.',
 metronome:'Adds beat clicks over imported songs. Generated drills already contain a click track.',
 noFail:'Keeps a run going when health reaches zero. Misses and accuracy still count.',
 scrollSpeed:'osu!mania-style speed from 1–40. Higher is faster; it changes reading time, not song speed or judgment windows. F3/F4 adjusts it during play.',
 laneWidth:'Base width of each column. Adaptive sizing scales this to your screen; fixed sizing keeps this many CSS pixels when space permits. Imported column proportions are retained.',
 fieldSizing:'Adaptive scales the field with the available screen, fixed uses your column width, and full width uses all available width. Every mode remains bounded by the screen.',
 shape:'Built-in note shape. Circle notes use a true circular radius. Imported skin images take precedence while that skin is selected.',
 color:'Primary built-in note/receptor colour. Column colours follow a symmetric pattern across the key mode.',
 secondaryColor:'Colour of the alternating secondary columns in the built-in skin.',
 centerColor:'Colour of the special middle column in odd key modes.',
 dim:'Darkens the song background to improve note readability. 100% hides the background completely.',
 receptor:'Vertical position of the built-in hit line as a percentage of field height. Imported HitPosition takes precedence when skin layout is enabled.',
 upscroll:'Moves notes from bottom to top instead of top to bottom. Input bindings and scoring stay the same.',
 sv:'Displays the map’s inherited scroll-velocity changes. Off gives constant visual speed; neither option changes note timing.',
 beatLines:'Shows horizontal beat and measure guides behind notes.',
 showKeys:'Shows each column’s assigned keyboard key below the receptor.',
 showError:'Shows the recent hit-error meter. Early hits appear on the left, late hits on the right. You can move and resize the meter in HUD settings.',
 receptorStyle:'Selects the built-in receptor artwork. Hollow uses an empty outline matching the note shape. Imported key images override it when enabled.',
 receptorStroke:'Thickness of built-in hollow receptor outlines. It does not alter imported sprites.',
 keyHeight:'Height of built-in piano-style key areas. Hollow and circular receptors follow their shape instead.',
 noteHeight:'Thickness of built-in bars and diamonds. Circles keep equal width and height; imported sprites use skin sizing.',
 glow:'Intensity of lane lighting and successful-hit flashes. Lower values reduce visual clutter.',
 judgmentY:'Vertical judgment position for the settings preview. During gameplay the Judgment HUD widget controls position.',
 skinLayout:'Uses imported column proportions, gaps and hit position. The field still fits the screen and respects your minimum column width.',
 skinKeys:'Uses the selected skin’s idle and pressed receptor images. Turn off to use built-in receptors with imported note images.',
 skipEnabled:'Offers a skip only in long empty intros and breaks. It never jumps across taps or holds, and preserves score and combo.',
 autoSkipIntro:'Automatically skips a qualifying empty intro, leaving two real seconds before the first note. Mid-song breaks still require a manual skip.',
 leadIn:'Countdown before starting or restarting a run, in seconds. This is separate from audio and visual offsets.',
 target:'Accuracy threshold used by automatic rate progression after a practice loop.',
 rateStep:'How much playback rate increases after a practice loop meets the target. For example 0.05 changes 1.00× to 1.05×.',
 autoRate:'Increases playback rate by the rate step when an A/B loop reaches your target accuracy. It does not affect full-chart runs.',
 cacheMaps:'Saves verified downloaded audio/backgrounds to this browser for later and offline playback. Charts and scores are stored separately.',
 cacheLimit:'Maximum downloaded-media cache size in MB. Oldest-used media is removed first when the budget is exceeded.',
 autoHUD:'Uses a compact HUD on narrow, short or nearly full-width playfields. It hides detailed counts/session info there; turn off to show your complete custom layout.',
 hud:{},
};
const IDS={bindMode:'Select the key count whose bindings you want to edit. Click a lane button, then press its replacement key. Each lane needs a unique key.',previewKeys:'Key count shown by the live settings preview; this does not change the selected chart.',skinSelect:'Chooses built-in artwork or a skin imported on this device. Import an .osk to add a legacy mania skin.',settingsSearch:'Filters settings by their name or explanation. Clear the search to show the live preview again.'};
export function explainSettings(root=document.getElementById('settings')){
 if(!root)return;
 for(let input of root.querySelectorAll('[data-setting],#bindMode,#previewKeys,#skinSelect,#settingsSearch,[data-window]')){
  let name=input.dataset.setting,description=typeof SETTING_HELP[name]==='string'?SETTING_HELP[name]:input.dataset.window!==undefined?'Maximum early/late error for this grade, in real-time milliseconds. Windows must increase strictly; smaller values are stricter.':IDS[input.id];
  if(!description)continue;if(input.id==='settingsSearch'){input.title=description;continue}let label=input.closest('label')||input.parentElement;if(!input.dataset.explained){let title=[...label.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ').trim();if(title&&!input.hasAttribute('aria-label'))input.setAttribute('aria-label',title);let help=document.createElement('small');help.className='setting-help';help.id='help-'+(input.id||name||'window-'+input.dataset.window);help.textContent=description;label.append(help);input.setAttribute('aria-describedby',help.id);input.dataset.explained='1';if(input.type==='range'){let output=document.createElement('output');output.className='setting-value';label.prepend(output);let update=()=>{let v=+input.value;output.textContent=['volume','hitVolume','dim','glow'].includes(name)?Math.round(v*100)+'%':['receptor','judgmentY'].includes(name)?v+'%':String(v)};input.addEventListener('input',update);input._updateHelpValue=update}}
  input._updateHelpValue?.();
 }
}
