import { canonicalMapping, countsOf, calculate, decompose, notation } from './mahjong.js'

export const mirrorTile=t=>t<27?Math.floor(t/9)*9+8-t%9:t
const compareCounts=(a,b)=>{for(let j=0;j<a.length;j++)if(a[j]!==b[j])return b[j]-a[j];return 0}
export function symmetryMapping(tiles,{mirror=true}={}){
  if(!mirror)return canonicalMapping(tiles)
  const c=countsOf(tiles),suits=[0,1,2].map(s=>{
    const forward=c.slice(s*9,s*9+9),reverse=[...forward].reverse(),flipped=compareCounts(reverse,forward)<0
    return {s,counts:flipped?reverse:forward,flipped}
  }).sort((a,b)=>compareCounts(a.counts,b.counts)||a.s-b.s)
  const honors=canonicalMapping(tiles)
  return Array.from({length:34},(_,t)=>t>=27?honors[t]:suits.findIndex(x=>x.s===Math.floor(t/9))*9+(suits.find(x=>x.s===Math.floor(t/9)).flipped?8-t%9:t%9))
}
const mapTiles=(tiles,map)=>tiles.map(t=>map[t]).sort((a,b)=>a-b)
const equalTiles=(a,b)=>a.length===b.length&&a.every((t,i)=>t===b[i])
function signature(tiles){let v=0n;for(const count of countsOf(tiles))v=v*5n+BigInt(count);return v.toString(36)}
function waitSignature(tiles){let mask=0n;for(const t of tiles)mask|=1n<<BigInt(t);return mask.toString(36)}
export function symbolicNotation(tiles){return notation(tiles).replaceAll('m','A').replaceAll('p','B').replaceAll('s','C')}
export function modelExpression(model,{mirror=false}={}){
  const core=mirror?model.core.map(mirrorTile).sort((a,b)=>a-b):model.core,waits=mirror?model.waits.map(mirrorTile).sort((a,b)=>a-b):model.waits
  const hand=[symbolicNotation(core),...(model.waitPair?['XX']:[]),...(model.freePair?['PP']:[]),...(model.freeMelds?[`${model.freeMelds}M`]:[])].join(' + ')
  return `${hand} → ${symbolicNotation(waits)}${model.waitPair?' + X':''}`
}
export function createCoreAnalyzer({limitCopies=true,mirror=false,parameterize=false,canonicalize=false}={}){
  const bases=new Map(),analyses=new Map()
  return record=>{
    const rawKey=Number(record.freePair)+':'+record.core.join(',')+'|'+record.waits.join(',')
    if(analyses.has(rawKey))return analyses.get(rawKey)
    const identity=Array.from({length:34},(_,i)=>i)
    const make=(base,waits,parameterTile=null)=>{
      const map=mirror||parameterize||canonicalize?symmetryMapping(base,{mirror}):identity
      const core=mapTiles(base,map),constantWaits=mapTiles(waits,map),kind=parameterTile===null?(record.freePair?'H':'L'):'X'
      const key=`${limitCopies?'P':'T'}-${kind}-${signature(core)}-${waitSignature(constantWaits)}`
      const model={key,modelId:key.toUpperCase(),core,waits:constantWaits,waitPair:parameterTile!==null,freePair:record.freePair,freeMelds:(13-record.core.length-(record.freePair?2:0))/3,mirrorMerged:mirror,map,parameterTile,prototypeBinding:parameterTile===null?null:map[parameterTile]}
      return model
    }
    let best=null
    if(parameterize&&!record.freePair&&record.core.length>=7){
      const counts=countsOf(record.core)
      for(let x=0;x<34;x++)if(counts[x]===2&&record.waits.includes(x)){
        const base=record.core.filter(t=>t!==x),baseKey=base.join(',')
        if(!bases.has(baseKey))bases.set(baseKey,{complete:decompose(base,1,{allowPartial:true,limitCopies}).length>0,waits:calculate(base,{allowPartial:true,pairProvided:true,limitCopies}).waits})
        const info=bases.get(baseKey)
        // XX can be a head for base draws and a triplet when X is drawn.
        // Admit it only when this union is the entire verified wait set.
        if(!info.complete||info.waits.includes(x)||!equalTiles([...info.waits,x].sort((a,b)=>a-b),record.waits))continue
        const candidate=make(base,info.waits,x)
        if(!best||candidate.key<best.key)best=candidate
      }
    }
    best??=make(record.core,record.waits)
    analyses.set(rawKey,best);return best
  }
}
