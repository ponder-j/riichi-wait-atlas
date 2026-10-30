import { gunzipSync } from 'fflate'
import meta from './meta.json'
import shapeMeta from './shape-meta.json'
import coreVersions from './core-versions.json'
const cache = new Map()
export async function loadData(n,{limitCopies=true,cores=false}={}) {
  const key=`${limitCopies}:${cores}:${n}`,selected=limitCopies?meta:shapeMeta
  if(!cache.has(key)) cache.set(key,(async()=>{
    let b
    const embedded=cores?window.ATLAS_CORES?.[limitCopies?'physical':'shape']:limitCopies?window.ATLAS_DATA:window.ATLAS_SHAPE_DATA
    if(embedded) b=Uint8Array.from(atob(embedded[n]),c=>c.charCodeAt(0))
    else { const version=cores?`?v=${coreVersions[limitCopies?'physical':'shape'][n].slice(0,12)}`:'';const r=await fetch(`./data/${limitCopies?'':'shape/'}${cores?'cores/':''}${n}.bin.gz${version}`);if(!r.ok)throw new Error('牌谱数据加载失败，请重试。');b=new Uint8Array(await r.arrayBuffer()) }
    const result=b[0]===31&&b[1]===139?gunzipSync(b):b
    if(result.length!==selected.counts[n]*(cores?2:18))throw new Error('牌谱文件长度不符，请重新加载。')
    return result
  })().catch(e=>{cache.delete(key);throw e}))
  return cache.get(key)
}
