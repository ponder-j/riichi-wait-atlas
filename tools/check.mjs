import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'
import { calculate, canonical, countsOf, decompose, notation, orbitCount, parseNotation, recordAt } from '../src/mahjong.js'
const meta=JSON.parse(await readFile(new URL('../src/meta.json',import.meta.url)))
assert.equal(meta.total,Object.values(meta.counts).reduce((a,b)=>a+b,0))
const examples=[['1234567m111p111s',3],['1112345678999m',9],['19m19p19s1234567z',13],['1122334455667m',3]]
for(const [s,n] of examples){const result=calculate(parseNotation(s));assert.equal(result.waits.length,n,s);assert.equal(result.hand.length,13);for(const t of result.waits)assert.ok(decompose([...result.hand,t]).length)}
assert.deepEqual(canonical(parseNotation('1234567m1112z55z')),canonical(parseNotation('1234567p2224z77z')))
assert.throws(()=>parseNotation('11111m'))
assert.throws(()=>parseNotation('8z'))
assert.throws(()=>parseNotation('123万'))
assert.equal(orbitCount(parseNotation('123m123p123s1112z')),12)
assert.deepEqual(canonical(parseNotation('123m111p1112345s')),canonical(parseNotation('1112345m123p111s')))
let checked=0
for(let n=3;n<=13;n++){
 const bytes=gunzipSync(await readFile(new URL(`../public/data/${n}.bin.gz`,import.meta.url)))
 assert.equal(bytes.length,meta.counts[n]*18)
 for(let i=0;i<bytes.length/18;i+=Math.max(1,Math.floor(meta.counts[n]/500))){const r=recordAt(bytes,i);assert.equal(r.waits.length,n);const c=countsOf(r.hand);assert.equal(r.remaining,r.waits.reduce((a,t)=>a+4-c[t],0));assert.equal(notation(parseNotation(notation(r.hand))),notation(r.hand));assert.deepEqual(calculate(r.hand).waits,r.waits);checked++}
}
console.log(`PASS: browser codec and solver agree on ${checked} distributed records, including every 7–13 wait hand.`)
