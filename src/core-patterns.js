import { countsOf } from './mahjong.js'
import { groupRecord, rotateRecord } from './wait-search.js'
import { createCoreAnalyzer,modelExpression } from './abstraction.js'
const tick=()=>new Promise(resolve=>setTimeout(resolve,0))
export async function buildCoreFamilies(source,{canonicalize=false,mirror=false,parameterize=false,signal,onProgress}={}){
  const families=new Map(),analyze=createCoreAnalyzer({limitCopies:source.limitCopies!==false,mirror,parameterize,canonicalize})
  for(let groupIndex=0;groupIndex<source.groups.length;groupIndex++){
    if(groupIndex%2048===0){if(signal?.aborted)throw new DOMException('已取消','AbortError');onProgress?.(groupIndex);await tick();if(signal?.aborted)throw new DOMException('已取消','AbortError')}
    const group=source.groups[groupIndex],original=groupRecord(source,group)
    for(const rotation of group.rotations){
      const record=rotateRecord(original,rotation),model=analyze(record)
      if(!families.has(model.key))families.set(model.key,{...model,members:[],bindings:new Map(),modelText:modelExpression(model),mirrorText:modelExpression(model,{mirror:true})})
      const family=families.get(model.key)
      family.members.push({groupIndex,rotation,map:canonicalize?model.map:null,prototypeMap:model.map,parameterTile:model.parameterTile,prototypeBinding:model.prototypeBinding})
      if(model.waitPair)family.bindings.set(model.prototypeBinding,(family.bindings.get(model.prototypeBinding)||0)+1)
    }
  }
  const result=[...families.values()].sort((a,b)=>a.core.length-b.core.length||b.members.length-a.members.length||a.key.localeCompare(b.key))
  if(signal?.aborted)throw new DOMException('已取消','AbortError')
  return result
}
export function familyRecord(source,member){
  let record=rotateRecord(groupRecord(source,source.groups[member.groupIndex]),member.rotation)
  if(member.map){const transform=tiles=>tiles.map(t=>member.map[t]).sort((a,b)=>a-b);record={...record,rotation:undefined,hand:transform(record.hand),core:transform(record.core),waits:transform(record.waits)}}
  if(member.parameterTile!==null&&member.parameterTile!==undefined)record.parameterTile=member.map?member.map[member.parameterTile]:member.parameterTile
  return record
}
export function attachedGroups(record){const c=countsOf(record.hand);for(const t of record.core)c[t]--;function split(){const t=c.findIndex(v=>v>0);if(t===-1)return [];if(c[t]>=3){c[t]-=3;const rest=split();c[t]+=3;if(rest)return [[t,t,t],...rest]}if(t<27&&t%9<=6&&c[t+1]&&c[t+2]){c[t]--;c[t+1]--;c[t+2]--;const rest=split();c[t]++;c[t+1]++;c[t+2]++;if(rest)return [[t,t+1,t+2],...rest]}return null}if(record.freePair){for(let t=0;t<34;t++)if(c[t]>=2){c[t]-=2;const melds=split();c[t]+=2;if(melds)return {pair:[t,t],melds}}return null}const melds=split();return melds?{pair:null,melds}:null}
export function attachedMelds(record){return attachedGroups(record)?.melds||null}
export function catalogueSource(bytes,coreMasks,n,indices){return {datasets:[{n,bytes,coreMasks}],limitCopies:true,total:indices.length,groups:indices.map(index=>({n,index,rotations:[0],coreMask:coreMasks[index*2]|coreMasks[index*2+1]<<8}))}}
