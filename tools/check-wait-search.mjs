import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'
import { calculate, canonical, notation, permutations, recordAt } from '../src/mahjong.js'
import { matchingRecords, matchingRotations, matchPage, parseWaitQuery, rotateRecord, searchWaits } from '../src/wait-search.js'

const data=new Map()
for(const n of [3,8,9,13])data.set(n,gunzipSync(await readFile(new URL(`../public/data/${n}.bin.gz`,import.meta.url))))
for(const q of ['', '11m4m7m', '12m', '8z'])assert.throws(()=>parseWaitQuery(q),q)
const datasets=n=>[{n,bytes:data.get(n)}]
let verified=0
for(const [query,n,expected] of [['147s',3,45910],['69p7z',3,2625],['135m',3,141],['69p4z',3,2625],['25m6s',3,2368],['123456789p',9,1],['19m19p19s1234567z',13,1]]){
  const tiles=parseWaitQuery(query),result=await searchWaits(datasets(n),tiles),seen=new Set()
  assert.equal(result.total,expected,query)
  for(const r of matchingRecords(result)){
    assert.deepEqual(r.waits,tiles)
    const hand=notation(r.hand);assert.ok(!seen.has(hand),`duplicate ${query}: ${hand}`);seen.add(hand)
    assert.deepEqual(calculate(r.hand).waits,tiles,hand)
    const original=recordAt(data.get(n),r.index);assert.deepEqual(canonical(r.hand),original.hand)
    verified++
  }
  if(query==='25m6s')assert.ok(seen.has('22334455m66s777z'))
  const firstPage=matchPage(result,0,20),secondPage=matchPage(result,1,20)
  assert.deepEqual([...matchingRecords(result)].slice(0,40),[...firstPage,...secondPage])
  assert.equal([...matchingRecords(result,true)].length,result.groups.length)
  assert.equal(matchPage(result,0,20,true).length,Math.min(20,result.groups.length))
  console.log(`PASS: ${query}: ${result.groups.length} classes, ${result.total} actual hands, every hand independently solved.`)
}
// Exhaust all 864 renamings independently; verify no matching configuration is lost.
const suits=permutations([0,1,2]),winds=permutations([0,1,2,3]),dragons=permutations([0,1,2])
for(const [n,index] of [[3,0],[3,3],[3,10000],[3,200000],[8,0],[8,2],[8,40],[9,0],[13,0]]){
 const original=recordAt(data.get(n),index),query=rotateRecord(original,517).waits,brute=new Set()
 for(const s of suits)for(const w of winds)for(const d of dragons){const f=t=>t<27?s[Math.floor(t/9)]*9+t%9:t<31?27+w[t-27]:31+d[t-31],waits=original.waits.map(f).sort((a,b)=>a-b);if(notation(waits)===notation(query))brute.add(notation(original.hand.map(f).sort((a,b)=>a-b)))}
 const optimized=new Set(matchingRotations(original,query).map(rotation=>notation(rotateRecord(original,rotation).hand)))
 assert.deepEqual(optimized,brute)
}
const impossible=await searchWaits(datasets(3),parseWaitQuery('159m'));assert.equal(impossible.total,0)
const controller=new AbortController();controller.abort();await assert.rejects(searchWaits(datasets(3),parseWaitQuery('147m'),{signal:controller.signal}),{name:'AbortError'})
console.log(`PASS: ${verified} exact-search hands, all-864-renamings completeness checks, paging, empty results, cancellation and input validation.`)

await writeFile(new URL('../reports/wait-search-verification.json',import.meta.url),JSON.stringify({ok:true,records:verified,exactQueries:7,renamingCases:9,renamingsPerCase:864,paging:true,cancellation:true,inputValidation:true},null,2)+'\n')
