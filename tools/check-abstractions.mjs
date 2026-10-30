import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {gunzipSync} from 'node:zlib'
import {calculate,countsOf,notation,parseNotation} from '../src/mahjong.js'
import {buildCoreFamilies,catalogueSource,familyRecord,attachedGroups} from '../src/core-patterns.js'
import {createCoreAnalyzer,mirrorTile,symmetryMapping} from '../src/abstraction.js'
import {searchWaits} from '../src/wait-search.js'
const load=async(n,limited)=>{const p=limited?'public/data':'public/data/shape';return{n,bytes:gunzipSync(await readFile(new URL(`../${p}/${n}.bin.gz`,import.meta.url))),coreMasks:gunzipSync(await readFile(new URL(`../${p}/cores/${n}.bin.gz`,import.meta.url)))}}
const mapped=(tiles,map)=>tiles.map(t=>map[t]).sort((a,b)=>a-b)
const modelCounts=families=>families.map(f=>[f.modelId,f.members.length]).sort(([a],[b])=>a.localeCompare(b))
let samples=0
for(const limited of [true,false]){
 const data=await load(4,limited),search=q=>searchWaits([data],parseNotation(q),{limitCopies:limited})
 const [low,high]=await Promise.all([search('1234m'),search('6789m')])
 const [lf,hf]=await Promise.all([buildCoreFamilies(low,{mirror:true,parameterize:true}),buildCoreFamilies(high,{mirror:true,parameterize:true})])
 assert.equal(low.total,high.total);assert.deepEqual(modelCounts(lf),modelCounts(hf))
 // Every expanded result retains the input's actual waits, even when the model is mirrored.
 for(const [source,families]of[[low,lf],[high,hf]]){
  assert.equal(families.reduce((n,f)=>n+f.members.length,0),source.total)
  for(const f of families)for(const member of f.members){const r=familyRecord(source,member);assert.deepEqual(r.waits,source.tiles)}
  for(const f of families){const r=familyRecord(source,f.members[0]);assert.deepEqual(calculate(r.hand,{limitCopies:limited}).waits,source.tiles);samples++}
 }
 const three=await load(3,limited),query=await searchWaits([three],parseNotation('69m7z'),{limitCopies:limited}),families=await buildCoreFamilies(query,{mirror:true,parameterize:true})
 const example=families.find(f=>f.mirrorText==='78999A + XX + 2M → 69A + X');assert.ok(example);assert.ok(example.waitPair)
 for(const f of families)for(const member of f.members){const r=familyRecord(query,member);assert.deepEqual(r.waits,query.tiles);assert.deepEqual([...f.waits,member.prototypeBinding].sort((a,b)=>a-b),mapped(r.waits,member.prototypeMap))}
 // Candidate XX with X already among the constant waits is ineligible.
 const analyze=createCoreAnalyzer({limitCopies:limited,mirror:true,parameterize:true})
 const overlapping=parseNotation('6678999m'),overlapRecord={core:overlapping,waits:calculate(overlapping,{allowPartial:true,limitCopies:limited}).waits,freePair:false}
 assert.equal(analyze(overlapRecord).waitPair,false)
}
// The rank boundary is meaningful: shifts are not a global symmetry.
assert.equal(notation(calculate(parseNotation('12m'),{allowPartial:true,pairProvided:true}).waits),'3m')
assert.equal(notation(calculate(parseNotation('23m'),{allowPartial:true,pairProvided:true}).waits),'14m')
let totals={}
for(const limited of [true,false]){
 const d=await load(3,limited),indices=Array.from({length:d.bytes.length/18},(_,i)=>i),source={...catalogueSource(d.bytes,d.coreMasks,3,indices),limitCopies:limited}
 const families=await buildCoreFamilies(source,{canonicalize:true,mirror:true,parameterize:true})
 assert.equal(families.reduce((n,f)=>n+f.members.length,0),indices.length)
 const seen=new Uint8Array(indices.length)
 for(const f of families){
  const bindingSamples=new Map()
  for(const member of f.members){assert.equal(seen[member.groupIndex]++,0);if(!bindingSamples.has(member.prototypeBinding))bindingSamples.set(member.prototypeBinding,member)}
  for(const member of bindingSamples.values()){
   const r=familyRecord(source,member),expected=[...f.waits,...(f.waitPair?[r.parameterTile]:[])].sort((a,b)=>a-b)
   assert.equal(r.hand.length,13);assert.ok(countsOf(r.hand).every(v=>v<=4));assert.deepEqual(r.waits,expected)
   assert.deepEqual(calculate(r.hand,{limitCopies:limited}).waits,expected)
   assert.deepEqual(calculate(r.core,{limitCopies:limited,allowPartial:true,pairProvided:r.freePair}).waits,expected)
   const attached=attachedGroups(r);assert.equal(attached.melds.length,f.freeMelds);assert.equal(Boolean(attached.pair),f.freePair)
   if(f.waitPair){assert.equal(countsOf(r.core)[r.parameterTile],2);assert.ok(!f.waits.includes(r.parameterTile));assert.deepEqual(r.core.filter(t=>t!==r.parameterTile),f.core)}else assert.deepEqual(r.core,f.core)
   // Each suit can be reflected independently without changing the underlying winning relation.
   for(let mask=0;mask<8;mask++){
    const map=Array.from({length:34},(_,t)=>t<27&&(mask&(1<<Math.floor(t/9)))?mirrorTile(t):t)
    const h=mapped(r.core,map),w=mapped(r.waits,map),canonicalMap=symmetryMapping(h)
    assert.deepEqual(calculate(h,{limitCopies:limited,allowPartial:true,pairProvided:r.freePair}).waits,w)
    assert.deepEqual(mapped(h,canonicalMap),mapped(r.core,symmetryMapping(r.core)));samples++
   }
  }
 }
 assert.ok(seen.every(v=>v===1));totals[limited?'physical':'shape']={source:source.total,models:families.length,variableModels:families.filter(f=>f.waitPair).length}
 if(limited){assert.equal(families.length,270);const target=families.find(f=>f.mirrorText==='78999A + XX + 2M → 69A + X');assert.ok(target);assert.ok(target.bindings.size>20)}
}
const controller=new AbortController();controller.abort();await assert.rejects(()=>buildCoreFamilies({limitCopies:true,groups:[]},{signal:controller.signal}),{name:'AbortError'})
console.log('PASS: independent mirrors, exact-query preservation, finite XX bindings, full catalogue coverage, rank-boundary counterexample and cancellation.',JSON.stringify({...totals,solverChecks:samples}))
