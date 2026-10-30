import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {gunzipSync} from 'node:zlib'
import {calculate,canonical,notation,parseNotation,recordAt} from '../src/mahjong.js'
import {searchWaits,matchingRecords} from '../src/wait-search.js'
import {buildCoreFamilies,familyRecord,attachedMelds,attachedGroups,catalogueSource} from '../src/core-patterns.js'
const load=async (n,limitCopies)=>{const p=limitCopies?'../public/data':'../public/data/shape';return {n,bytes:gunzipSync(await readFile(new URL(`${p}/${n}.bin.gz`,import.meta.url))),coreMasks:gunzipSync(await readFile(new URL(`${p}/cores/${n}.bin.gz`,import.meta.url)))}}
const bad=parseNotation('5666777789m111p'),good=parseNotation('4455566m111p999s')
assert.equal(notation(calculate(bad).waits),'456m')
assert.equal(notation(calculate(bad,{limitCopies:false}).waits),'4567m')
assert.equal(notation(calculate(good,{limitCopies:false}).waits),'456m')
assert.equal(notation(calculate(parseNotation('4455566m'),{limitCopies:false,allowPartial:true}).waits),'456m')
assert.throws(()=>parseNotation('77777m123p456s11z'))
let samples=0
for(const limited of [true,false])for(let n=3;n<=13;n++){
 const d=await load(n,limited);assert.equal(d.coreMasks.length,d.bytes.length/9)
 for(let i=0;i<d.bytes.length/18;i+=Math.max(1,Math.floor(d.bytes.length/18/150))){
  const r=recordAt(d.bytes,i),mask=d.coreMasks[i*2]|d.coreMasks[i*2+1]<<8,core=r.hand.filter((_,j)=>mask&(1<<j)),freePair=Boolean(mask&8192);assert.ok((freePair?[5,8,11]:[4,7,10,13]).includes(core.length));assert.deepEqual(calculate(r.hand,{limitCopies:limited}).waits,r.waits);assert.deepEqual(calculate(core,{limitCopies:limited,allowPartial:true,pairProvided:freePair}).waits,r.waits);assert.equal(attachedMelds({...r,core,freePair}).flat().length+(freePair?2:0),13-core.length);samples++
 }
}
for(const [limited,expected,familyCount] of [[true,2276,8],[false,2143,4]]){
 const datasets=[await load(3,limited)],r=await searchWaits(datasets,parseNotation('456m'),{limitCopies:limited}),families=await buildCoreFamilies(r),records=[...matchingRecords(r)]
 assert.equal(r.total,expected);assert.equal(families.length,familyCount);assert.equal(families.reduce((s,f)=>s+f.members.length,0),r.total)
 assert.equal(records.some(x=>notation(x.hand)===notation(bad)),limited)
 const standard=families.find(f=>notation(f.core)==='4455566m');assert.ok(standard);assert.equal(standard.freeMelds,2);assert.equal(standard.members.length,1004)
 for(const f of families)for(const member of f.members){const x=familyRecord(r,member);assert.equal(x.hand.length,13);assert.deepEqual(calculate(x.hand,{limitCopies:limited}).waits,r.tiles);assert.deepEqual(calculate(x.core,{limitCopies:limited,allowPartial:true,pairProvided:x.freePair}).waits,r.tiles);assert.equal(attachedMelds(x).length,f.freeMelds)}
}
const four=await searchWaits([await load(4,false)],parseNotation('4567m'),{limitCopies:false});assert.ok([...matchingRecords(four)].some(r=>notation(r.hand)===notation(bad)))
const extra=await searchWaits([await load(3,false)],parseNotation('69m6z'),{limitCopies:false});assert.ok([...matchingRecords(extra)].some(r=>notation(r.hand)==='77889999m55566z'))
const d=await load(3,true),indices=Array.from({length:d.bytes.length/18},(_,i)=>i),source=catalogueSource(d.bytes,d.coreMasks,3,indices),families=await buildCoreFamilies(source,{canonicalize:true})
assert.equal(families.length,1276);assert.equal(families.reduce((a,f)=>a+f.members.length,0),indices.length)
for(const f of families){assert.deepEqual(canonical(f.core),f.core);for(const m of f.members.slice(0,2)){const r=familyRecord(source,m);assert.deepEqual(calculate(r.hand).waits,f.waits);assert.deepEqual(calculate(r.core,{allowPartial:true,pairProvided:r.freePair}).waits,f.waits)}}
console.log(`PASS: copy-boundary regression, ${samples} dual-mode/core samples, exact wait sets, 1,276 catalogue families, member coverage and legal attached melds.`)

const pairResult=await searchWaits([await load(3,false)],parseNotation('369m'),{limitCopies:false}),pairFamilies=await buildCoreFamilies(pairResult),pairFamily=pairFamilies.find(f=>notation(f.core)==='45678m');
assert.ok(pairFamily);assert.equal(pairFamilies.length,14);assert.equal(pairFamilies.reduce((n,f)=>n+f.members.length,0),pairResult.total);assert.equal(pairFamily.members.length,38013);assert.equal(pairFamily.freePair,true);assert.equal(pairFamily.freeMelds,2);
assert.deepEqual(calculate(parseNotation('45678m'),{allowPartial:true,pairProvided:true,limitCopies:false}).waits,parseNotation('369m'));
let knownPairExample=false;for(const member of pairFamily.members){const r=familyRecord(pairResult,member),groups=attachedGroups(r);assert.equal(groups.pair.length,2);assert.equal(groups.melds.length,2);assert.deepEqual(calculate(r.hand,{limitCopies:false}).waits,parseNotation('369m'));if(notation(r.hand)==='45678m11p222s333z')knownPairExample=true}
assert.ok(knownPairExample);console.log('PASS: free pair abstraction for 45678m + one pair + two melds, including every represented full hand.');
