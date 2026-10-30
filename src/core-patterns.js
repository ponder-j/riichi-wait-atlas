import { canonicalMapping, countsOf } from './mahjong.js'
import { groupRecord, rotateRecord } from './wait-search.js'
const tick=()=>new Promise(resolve=>setTimeout(resolve,0))
export async function buildCoreFamilies(source,{canonicalize=false,signal,onProgress}={}){
  const families=new Map(),normalized=new Map();let processed=0
  for(let groupIndex=0;groupIndex<source.groups.length;groupIndex++){
    if(groupIndex%2048===0){if(signal?.aborted)throw new DOMException('已取消','AbortError');onProgress?.(groupIndex);await tick();if(signal?.aborted)throw new DOMException('已取消','AbortError')}
    const g=source.groups[groupIndex],original=groupRecord(source,g)
    for(const rotation of g.rotations){
      const r=rotateRecord(original,rotation),rawKey=r.core.join(',');let core=r.core,waits=r.waits,map=null
      if(canonicalize){if(!normalized.has(rawKey)){const mapping=canonicalMapping(core);normalized.set(rawKey,{map:mapping,core:core.map(t=>mapping[t]).sort((a,b)=>a-b)})}const normalizedCore=normalized.get(rawKey);map=normalizedCore.map;core=normalizedCore.core;waits=waits.map(t=>map[t]).sort((a,b)=>a-b)}
      const key=Number(r.freePair)+':'+core.join(',');if(!families.has(key))families.set(key,{key,core,waits,freePair:r.freePair,freeMelds:(13-core.length-(r.freePair?2:0))/3,members:[]})
      families.get(key).members.push({groupIndex,rotation,map});processed++
    }
  }
  const result=[...families.values()].sort((a,b)=>a.core.length-b.core.length||b.members.length-a.members.length||a.key.localeCompare(b.key))
  if(signal?.aborted)throw new DOMException('已取消','AbortError')
  return result
}
export function familyRecord(source,member){const r=rotateRecord(groupRecord(source,source.groups[member.groupIndex]),member.rotation);if(!member.map)return r;const transform=tiles=>tiles.map(t=>member.map[t]).sort((a,b)=>a-b);return {...r,rotation:undefined,hand:transform(r.hand),core:transform(r.core),waits:transform(r.waits)}}
export function attachedGroups(record){const c=countsOf(record.hand);for(const t of record.core)c[t]--;function split(){const t=c.findIndex(v=>v>0);if(t===-1)return [];if(c[t]>=3){c[t]-=3;const rest=split();c[t]+=3;if(rest)return [[t,t,t],...rest]}if(t<27&&t%9<=6&&c[t+1]&&c[t+2]){c[t]--;c[t+1]--;c[t+2]--;const rest=split();c[t]++;c[t+1]++;c[t+2]++;if(rest)return [[t,t+1,t+2],...rest]}return null}if(record.freePair){for(let t=0;t<34;t++)if(c[t]>=2){c[t]-=2;const melds=split();c[t]+=2;if(melds)return {pair:[t,t],melds}}return null}const melds=split();return melds?{pair:null,melds}:null}
export function attachedMelds(record){return attachedGroups(record)?.melds||null}
export function catalogueSource(bytes,coreMasks,n,indices){return {datasets:[{n,bytes,coreMasks}],limitCopies:true,total:indices.length,groups:indices.map(index=>({n,index,rotations:[0],coreMask:coreMasks[index*2]|coreMasks[index*2+1]<<8}))}}
