export const SUITS = ['m', 'p', 's', 'z']
export const HONORS = ['东', '南', '西', '北', '白', '发', '中']
export function tileName(t) { return t < 27 ? `${t % 9 + 1}${['万','筒','索'][Math.floor(t / 9)]}` : HONORS[t - 27] }
export function notation(tiles) { return SUITS.map((s, i) => { const digits = tiles.filter(t => Math.floor(t / 9) === i).map(t => t % 9 + 1).join(''); return digits ? digits + s : '' }).join('') }
export function parseNotation(text) {
  const input = text.toLowerCase().replace(/\s/g, '')
  if (!input) return []
  if (!/^(?:[1-9]+[mpsz])+$/.test(input)) throw new Error('请输入牌谱，如 1112345678999m；m 万、p 筒、s 索、z 字。')
  const tiles = []
  for (const match of input.matchAll(/([1-9]+)([mpsz])/g)) {
    const suit = SUITS.indexOf(match[2])
    for (const d of match[1]) { if (suit === 3 && Number(d) > 7) throw new Error('字牌使用 1–7z：东南西北白发中。'); tiles.push(suit * 9 + Number(d) - 1) }
  }
  const c = countsOf(tiles)
  if (c.some(v => v > 4)) throw new Error('同一种牌不能超过 4 张。')
  return tiles.sort((a, b) => a - b)
}
export function countsOf(tiles) { const c = Array(34).fill(0); for (const t of tiles) c[t]++; return c }
export function canonicalMapping(tiles) {
  const c = countsOf(tiles)
  const suits = [0,1,2].map(s => ({ s, c: c.slice(s*9,s*9+9) }))
  suits.sort((a,b) => { for(let j=0;j<9;j++) if(a.c[j]!==b.c[j]) return b.c[j]-a.c[j]; return a.s-b.s })
  const winds=[27,28,29,30].sort((a,b)=>c[b]-c[a]||a-b)
  const dragons=[31,32,33].sort((a,b)=>c[b]-c[a]||a-b)
  return Array.from({length:34},(_,t)=>t>=31?31+dragons.indexOf(t):t>=27?27+winds.indexOf(t):suits.findIndex(x=>x.s===Math.floor(t/9))*9+t%9)
}
export function canonical(tiles) { const map=canonicalMapping(tiles);return tiles.map(t=>map[t]).sort((a,b)=>a-b) }
export function recordAt(bytes, index) {
  const o = index * 18, hand = Array.from(bytes.subarray(o,o+13)), waits=[]
  for(let t=0;t<34;t++) if(bytes[o+13+Math.floor(t/8)] & (1<<(t%8))) waits.push(t)
  const c = countsOf(hand)
  return { hand, waits, remaining: waits.reduce((s,t)=>s+4-c[t],0), index }
}
// A separate recursive solver, used by the inspector rather than the generated dataset.
export function decompose(tiles, limit=32, {limitCopies=true,allowPartial=false,pairProvided=false}={}) {
  const c=countsOf(tiles), results=[],seen=new Set()
  if((pairProvided?![3,6,9,12].includes(tiles.length):allowPartial?![2,5,8,11,14].includes(tiles.length):tiles.length!==14) || c.some(x=>x>(limitCopies?4:5))) return results
  if(tiles.length===14&&c.filter(x=>x===2).length===7) results.push({ type:'七对子', groups:c.flatMap((v,t)=>v===2?[[t,t]]:[]) })
  const orphanIds=[0,8,9,17,18,26,27,28,29,30,31,32,33]
  if(tiles.length===14&&orphanIds.every(t=>c[t]>=1)&&c.every((v,t)=>!v||orphanIds.includes(t))) results.push({type:'国士无双', groups:[tiles]})
  function melds(groups, pair) {
    if(results.length>=limit) return
    let t=c.findIndex(v=>v>0)
    if(t===-1) { const key=(pair?.join(',')||'')+'|'+groups.map(g=>g.join(',')).sort().join('|');if(!seen.has(key)){seen.add(key);results.push({type:pair?'四面子一雀头':'面子',groups:pair?[pair,...groups]:groups})} return }
    if(c[t]>=3){c[t]-=3;melds([...groups,[t,t,t]],pair);c[t]+=3}
    if(t<27&&t%9<=6&&c[t+1]&&c[t+2]){c[t]--;c[t+1]--;c[t+2]--;melds([...groups,[t,t+1,t+2]],pair);c[t]++;c[t+1]++;c[t+2]++}
  }
  if(pairProvided)melds([],null)
  else for(let p=0;p<34;p++) if(c[p]>=2){c[p]-=2;melds([],[p,p]);c[p]+=2}
  return results
}
export function calculate(tiles,{limitCopies=true,allowPartial=false,pairProvided=false}={}) { const c=countsOf(tiles), waits=[]; for(let t=0;t<34;t++) if((!limitCopies||c[t]<4)&&decompose([...tiles,t],1,{limitCopies,allowPartial,pairProvided}).length) waits.push(t); return {hand:tiles,waits,remaining:waits.reduce((s,t)=>s+4-c[t],0),limitCopies} }
export function orbitCount(tiles) {
  const c=countsOf(tiles),s=[0,1,2].map(i=>c.slice(i*9,i*9+9).join(''))
  const suitOrbit=s[0]===s[1]&&s[1]===s[2]?1:new Set(s).size===3?6:3
  const factorial=n=>n<=1?1:n*factorial(n-1)
  const orbit=values=>{const frequency=new Map();for(const v of values)frequency.set(v,(frequency.get(v)||0)+1);return factorial(values.length)/[...frequency.values()].reduce((a,v)=>a*factorial(v),1)}
  return suitOrbit*orbit(c.slice(27,31))*orbit(c.slice(31))
}
export function permutations(values) { return values.length?values.flatMap((v,i)=>permutations(values.filter((_,j)=>j!==i)).map(rest=>[v,...rest])):[[]] }
