import { gunzipSync } from 'fflate'
import meta from './meta.json'
const cache = new Map()
export async function loadData(n) {
  if(!cache.has(n)) cache.set(n,(async()=>{
    let b
    if(window.ATLAS_DATA) b=Uint8Array.from(atob(window.ATLAS_DATA[n]),c=>c.charCodeAt(0))
    else { const r=await fetch(`./data/${n}.bin.gz`);if(!r.ok)throw new Error('牌谱数据加载失败，请重试。');b=new Uint8Array(await r.arrayBuffer()) }
    const result=b[0]===31&&b[1]===139?gunzipSync(b):b
    if(result.length!==meta.counts[n]*18)throw new Error('牌谱文件长度不符，请重新加载。')
    return result
  })().catch(e=>{cache.delete(n);throw e}))
  return cache.get(n)
}
