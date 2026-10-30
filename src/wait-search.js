import { countsOf, parseNotation, permutations, recordAt } from './mahjong.js'

const SUITS=permutations([0,1,2]), WINDS=permutations([0,1,2,3]), DRAGONS=permutations([0,1,2])
const tick=()=>new Promise(resolve=>setTimeout(resolve,0))
function abortIfNeeded(signal){if(signal?.aborted)throw new DOMException('检索已取消','AbortError')}
export function parseWaitQuery(text) {
  const tiles=parseNotation(text)
  if(!tiles.length)throw new Error('请输入想听的牌，如 147s。')
  if(new Set(tiles).size!==tiles.length)throw new Error('待牌按牌种检索，同一种牌只需输入一次。')
  if(tiles.length>13)throw new Error('待牌最多为 13 种。')
  if(tiles.length<3)throw new Error('当前图鉴收录 3–13 面听，请输入至少 3 种完整待牌。')
  return tiles
}
function waitMasks(tiles){const m=[0,0,0,0,0];for(const t of tiles){if(t<27)m[Math.floor(t/9)]|=1<<(t%9);else if(t<31)m[3]|=1<<(t-27);else m[4]|=1<<(t-31)}return m}
function masksAt(bytes,o){let lo=0;for(let j=0;j<4;j++)lo+=(bytes[o+13+j]||0)*2**(8*j);return [lo&511,(lo>>>9)&511,(lo>>>18)&511,(lo>>>27)&15,((lo>>>31)&1)|((bytes[o+17]&3)<<1)]}
function compatiblePermutations(m,target){
  const accepts=(actual,need)=>actual===need
  const suits=[];for(let i=0;i<SUITS.length;i++)if(SUITS[i].every((dest,src)=>accepts(m[src],target[dest])))suits.push(i)
  if(!suits.length)return null
  function honorMaps(mask,need,perms){const result=[];for(let i=0;i<perms.length;i++){let actual=0;for(let src=0;src<perms[i].length;src++)if(mask&(1<<src))actual|=1<<perms[i][src];if(accepts(actual,need))result.push(i)}return result}
  const winds=honorMaps(m[3],target[3],WINDS);if(!winds.length)return null
  const dragons=honorMaps(m[4],target[4],DRAGONS);if(!dragons.length)return null
  return {suits,winds,dragons}
}
function distinctOptions(values,allowed,perms){
  const seen=new Set(),result=[]
  for(const i of allowed){const mapped=Array(values.length);for(let src=0;src<values.length;src++)mapped[perms[i][src]]=values[src];const key=mapped.join(',');if(!seen.has(key)){seen.add(key);result.push(i)}}
  return result
}
export function matchingRotations(record,tiles){
  const allowed=compatiblePermutations(waitMasks(record.waits),waitMasks(tiles))
  return allowed?rotationsForHand(record.hand,allowed):[]
}
function rotationsForHand(hand,allowed){
  const c=countsOf(hand),blocks=[0,0,0];for(let s=0;s<3;s++)for(let j=0;j<9;j++)blocks[s]=blocks[s]*5+c[s*9+j]
  const suits=distinctOptions(blocks,allowed.suits,SUITS),winds=distinctOptions(c.slice(27,31),allowed.winds,WINDS),dragons=distinctOptions(c.slice(31),allowed.dragons,DRAGONS),result=[]
  for(const s of suits)for(const w of winds)for(const d of dragons)result.push(s*144+w*6+d)
  return result
}
export function rotateRecord(record,rotation){
  const s=SUITS[Math.floor(rotation/144)],w=WINDS[Math.floor(rotation/6)%24],d=DRAGONS[rotation%6]
  const transform=t=>t<27?s[Math.floor(t/9)]*9+t%9:t<31?27+w[t-27]:31+d[t-31]
  return {...record,hand:record.hand.map(transform).sort((a,b)=>a-b),waits:record.waits.map(transform).sort((a,b)=>a-b),rotation}
}
export async function searchWaits(datasets,tiles,{signal,onProgress}={}){
  const groups=[],target=waitMasks(tiles),compatibilityCache=new Map(),totalRecords=datasets.reduce((a,b)=>a+b.bytes.length/18,0)
  let processed=0,total=0
  for(const {n,bytes} of datasets){
    for(let index=0;index<bytes.length/18;index++){
      if(processed%4096===0){abortIfNeeded(signal);onProgress?.({processed,totalRecords});await tick();abortIfNeeded(signal)}
      const masks=masksAt(bytes,index*18),key=masks.join(',')
      if(!compatibilityCache.has(key))compatibilityCache.set(key,compatiblePermutations(masks,target))
      const allowed=compatibilityCache.get(key)
      if(allowed){const hand=Array.from(bytes.subarray(index*18,index*18+13)),rotations=rotationsForHand(hand,allowed);if(rotations.length){groups.push({n,index,rotations});total+=rotations.length}}
      processed++
    }
  }
  abortIfNeeded(signal);onProgress?.({processed,totalRecords})
  return {groups,total,datasets,tiles}
}
export function* matchingRecords(result,onePerClass=false){
  const data=new Map(result.datasets.map(d=>[d.n,d.bytes]))
  for(const g of result.groups){const original=recordAt(data.get(g.n),g.index);for(const rotation of onePerClass?g.rotations.slice(0,1):g.rotations)yield {...rotateRecord(original,rotation),n:g.n}}
}
export function matchPage(result,page,pageSize,onePerClass=false){
  if(!result)return []
  const rows=[],start=page*pageSize,end=start+pageSize,data=new Map(result.datasets.map(d=>[d.n,d.bytes]));let offset=0
  for(const group of result.groups){
    const rotations=onePerClass?group.rotations.slice(0,1):group.rotations,next=offset+rotations.length
    if(next>start&&offset<end){const original=recordAt(data.get(group.n),group.index);for(let i=Math.max(0,start-offset);i<Math.min(rotations.length,end-offset);i++)rows.push({...rotateRecord(original,rotations[i]),n:group.n})}
    offset=next;if(offset>=end)break
  }
  return rows
}
