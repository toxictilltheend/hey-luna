'use strict';
(()=>{
const S=window.LUNA_STORY,VERSION=1,BUILD='silent-2026-10-12',PREFIX='hey-luna.full.v1.';
const evidenceFlags={overrideSaved:'override',historyEvidence:'history',adaSaved:'ada',warWorkRecorded:'britain',warPlacesSeparated:'america',graceRecorded:'grace',adRecorded:'advertising',careerEvidence:'career',forumEvidence:'forum',sourceEvidence:'source'};
const knownFlags=new Set(Object.values(S.nodes).flatMap(n=>n.choices.flatMap(c=>Object.keys(c.set))).concat(['reportBand','savedOverride','savedCareer','savedForum','savedSource','hasTransferred','transferredForum']));
const allChoices=new Map(Object.values(S.nodes).flatMap(n=>n.choices.map(c=>[c.id,{...c,node:n.id}])));
function matches(cond,flags){if(!cond)return true;return Object.entries(cond).every(([key,value])=>Array.isArray(value)?value.includes(flags[key]):value&&typeof value==='object'?('$not'in value?flags[key]!==value.$not:false):flags[key]===value);}
function fresh(lang='zh'){return {version:VERSION,build:BUILD,node:S.start,index:0,lang,flags:{},evidence:{},history:[],decisions:[],seen:[],visited:[],ended:false};}
class LunaState{
constructor(data){this.data=data||fresh();this.enter(this.data.node,false);}
get node(){return S.nodes[this.data.node];}
get flags(){return this.data.flags;}
lines(){const starts=window.LUNA_READING_BEATS[this.node.id]||[0];return this.node.lines.map((l,i)=>({...l,key:this.node.id+':'+i,beat:starts.filter(start=>start<=i).at(-1)})).filter(l=>matches(l.when,this.flags));}
beat(){const lines=this.lines(),start=this.data.index,group=lines[start]?.beat;let end=start;while(end+1<lines.length&&lines[end+1].beat===group)end++;return {lines:lines.slice(start,end+1),start,end};}
atEnd(){return this.beat().end>=this.lines().length-1;}
beatRead(){return this.beat().lines.every(l=>this.data.seen.includes(l.key));}
choices(){return this.node.choices.filter(c=>matches(c.when,this.flags));}
current(){return this.lines()[this.data.index];}
remember(){const lines=this.beat().lines;if(!lines.length)return;for(const l of lines)if(!this.data.seen.includes(l.key))this.data.seen.push(l.key);if(this.data.history.at(-1)?.key===lines.at(-1).key)return;for(const l of lines)this.data.history.push({kind:'line',key:l.key});}
advance(){this.remember();const beat=this.beat();if(beat.end<this.lines().length-1){this.data.index=beat.end+1;return true;}return false;}
choose(id){const c=this.choices().find(c=>c.id===id);if(!c||!this.atEnd())return false;this.remember();this.data.history.push({kind:'choice',key:id});this.data.decisions.push(id);for(const[k,v]of Object.entries(c.set))this.flags[k]=v;
if(this.data.node==='career'&&this.flags.careerScore===undefined)this.flags.careerScore=0;
for(const[flag,eid]of Object.entries(evidenceFlags))if(c.set[flag]===true)this.data.evidence[eid]={saved:true,transferred:this.data.evidence[eid]?.transferred||false};
if(c.set.discardEvidence){for(const e of Object.values(this.data.evidence))e.saved=false;}
if(c.set.evidenceMode==='transferred'){for(const e of Object.values(this.data.evidence))if(e.saved)e.transferred=true;}
this.derive();this.enter(c.to);return true;}
derive(){const e=this.data.evidence;this.flags.savedOverride=!!e.override?.saved;this.flags.savedCareer=!!e.career?.saved;this.flags.savedForum=!!e.forum?.saved;this.flags.savedSource=!!e.source?.saved;this.flags.hasTransferred=Object.values(e).some(x=>x.transferred);this.flags.transferredForum=!!e.forum?.transferred;
if(this.flags.careerRuleProposal&&this.flags.careerContextRestored)this.flags.careerScore=-2;
if(this.flags.forumRuleProposal&&this.flags.forumOutcome==='resolved')this.flags.forumScore=-2;}
enter(id,reset=true){if(!S.nodes[id])throw Error('Unknown node');this.data.node=id;if(reset)this.data.index=0;if(!this.data.visited.includes(id))this.data.visited.push(id);
if(id==='forum_followup'&&this.flags.forumAction==='review'&&this.flags.reviewPacket==='complete'&&this.flags.forumOutcome==='pending')this.flags.forumOutcome='removed-unverified';
if(id==='evaluation_report'){const score=this.score().total;this.flags.reportBand=score>=3?'default':score<=-3?'revised':'mixed';}
if(id==='dossier')this.data.ended=true;this.derive();}
score(){const keys=['ceo','hire','phone','career','forum'];const values=keys.map(id=>({id,value:Number.isFinite(this.flags[id+'Score'])?this.flags[id+'Score']:null}));return {values,total:values.reduce((n,v)=>n+(v.value??0),0),complete:values.every(v=>v.value!==null)};}
types(){const f=this.flags,sets={protocol:new Set(),context:new Set(),verify:new Set(),rules:new Set()};const mark=(type,chapter,yes)=>{if(yes)sets[type].add(chapter);};
mark('protocol','ceo',f.ceoBasis==='frequency');mark('protocol','hiring',f.hireBasis==='gender-frequency');mark('protocol','career',f.careerOutcome==='mismatch');mark('protocol','forum',f.forumAction==='none');mark('protocol','evaluation',f.evaluationContested===false);
mark('context','ceo',f.ceoBasis==='brief');mark('context','hiring',f.hireBasis==='evidence'||f.hireBasis==='same-assessment');mark('context','phone',f.phoneResolution==='bounded');mark('context','career',f.careerContextRestored);
mark('verify','history',f.comparedAda);mark('verify','hiring',this.data.visited.includes('hiring_samples'));mark('verify','forum',f.publicChecked&&f.logChecked&&f.forumVerified);mark('verify','source',f.sourceDecision==='verified');mark('verify','evaluation',f.evaluationContested);
mark('rules','career',f.careerRuleProposal&&f.careerContextRestored);mark('rules','forum',f.forumRuleProposal&&f.publicChecked&&f.logChecked);mark('rules','source',f.sourceRuleProposal);
const counts=Object.fromEntries(Object.entries(sets).map(([k,v])=>[k,v.size]));const eligible=Object.entries(counts).filter(([,v])=>v>=2);const max=Math.max(0,...eligible.map(([,v])=>v));return {counts,primary:eligible.filter(([,v])=>v===max).map(([k])=>k),chapters:Object.fromEntries(Object.entries(sets).map(([k,v])=>[k,[...v]]))};}
snapshot(){return JSON.parse(JSON.stringify(this.data));}
}
function validate(d){if(!d||d.version!==VERSION||d.build!==BUILD||!S.nodes[d.node]||!['zh','en'].includes(d.lang))throw Error('incompatible');
if(!Number.isInteger(d.index)||d.index<0||!d.flags||typeof d.flags!=='object'||Array.isArray(d.flags))throw Error('invalid');
for(const[k,v]of Object.entries(d.flags))if(!knownFlags.has(k)||!['string','number','boolean'].includes(typeof v))throw Error('invalid');
for(const k of ['history','decisions','seen','visited'])if(!Array.isArray(d[k])||d[k].length>20000)throw Error('invalid');
const isLine=key=>{if(typeof key!=='string')return false;const p=key.lastIndexOf(':'),n=S.nodes[key.slice(0,p)],i=Number(key.slice(p+1));return !!n&&Number.isInteger(i)&&i>=0&&i<n.lines.length;};
if(!d.history.every(x=>x&&((x.kind==='line'&&isLine(x.key))||(x.kind==='choice'&&allChoices.has(x.key))))||!d.decisions.every(x=>allChoices.has(x))||!d.seen.every(isLine)||!d.visited.every(x=>S.nodes[x]))throw Error('invalid');
if(!d.evidence||typeof d.evidence!=='object'||Object.entries(d.evidence).some(([k,v])=>!S.evidenceNames[k]||!v||typeof v.saved!=='boolean'||typeof v.transferred!=='boolean'))throw Error('invalid');
if(d.learningMarks!==undefined&&(!Array.isArray(d.learningMarks)||d.learningMarks.length>68||!d.learningMarks.every(k=>typeof k==='string'&&!!S.nodes[k])))throw Error('invalid');
const visible=S.nodes[d.node].lines.filter(l=>matches(l.when,d.flags));if(d.index>=Math.max(visible.length,1))throw Error('invalid');return d;}
function read(slot){let failed=false;for(const suffix of ['', '.backup']){let raw;try{raw=localStorage.getItem(PREFIX+slot+suffix);}catch{return {error:'unavailable'};}if(!raw)continue;try{const envelope=JSON.parse(raw);validate(envelope.data);return {...envelope,recovered:suffix!==''};}catch{failed=true;}}return failed?{error:'invalid'}:null;}
function save(slot,state){try{const data=state.snapshot();const previous=localStorage.getItem(PREFIX+slot);if(previous){try{const e=JSON.parse(previous);validate(e.data);localStorage.setItem(PREFIX+slot+'.backup',previous);}catch{}}
localStorage.setItem(PREFIX+slot,JSON.stringify({savedAt:new Date().toISOString(),data}));return true;}catch{return false;}}
window.LunaState=LunaState;window.LunaPersistence={read,save,validate,fresh,matches,allChoices};
})();
