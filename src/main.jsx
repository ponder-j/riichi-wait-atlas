import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowDownToLine, ArrowRight, BookOpen, Check, ChevronLeft, ChevronRight, Copy, Download, RotateCcw, Search, Shuffle, SlidersHorizontal, X } from 'lucide-react'
import { Button, Dialog, Input, NativeSelect } from './components/ui'
import { calculate, canonical, countsOf, decompose, notation, orbitCount, parseNotation, permutations, recordAt, tileName } from './mahjong'
import meta from './meta.json'
import { loadData } from './data'
import { downloadBlob } from './download'
import { Tile, Tiles, HandRow } from './components/hand'
import { WaitSearch } from './WaitSearch'
import './style.css'

const fmt = n => n.toLocaleString('en-US')
const NUMBERS = Array.from({length:11},(_,i)=>i+3)
const SUIT_PERMUTATIONS=[[0,1,2],[1,2,0],[2,0,1],[1,0,2],[0,2,1],[2,1,0]]
const windRotations=[[0,1,2,3],[1,2,3,0],[2,3,0,1],[3,0,1,2]]
const WIND_PERMUTATIONS=[...windRotations,...permutations([0,1,2,3]).filter(p=>!windRotations.some(r=>r.every((v,i)=>v===p[i])))]
const EMPTY_FILTERS = { suits:'all', honors:'all', quads:'all', remain:'all' }
function DownloadLink({ path, name, children, ...props }) {
  function click(e) {
    if(!window.ATLAS_DATA)return
    if(path==='mahjong-tiles-svg.zip')return
    if(path.endsWith('-waits-csv.zip')) { e.preventDefault();const n=Number(path.split('-')[0]);downloadCsv(n) }
  }
  async function downloadCsv(n) {
    try { const bytes=await loadData(n);const lines=['id,wait_types,hand,waits,remaining_max'];for(let i=0;i<bytes.length/18;i++){const r=recordAt(bytes,i);lines.push(`${n}-${String(i+1).padStart(6,'0')},${n},${notation(r.hand)},${notation(r.waits)},${r.remaining}`)}downloadBlob('\ufeff'+lines.join('\r\n'),`${n}-waits.csv`,'text/csv;charset=utf-8') }
    catch(e){alert(e.message)}
  }
  return <a href={`./downloads/${path}`} download={name||path} onClick={click} {...props}>{children}</a>
}
function initialState() { const p=new URLSearchParams(location.hash.slice(1));const n=Number(p.get('n'));return {n:NUMBERS.includes(n)?n:3,page:Math.max(0,(Number(p.get('page'))||1)-1),mode:p.get('view')==='wait-search'?'wait-search':'catalogue'} }

function App() {
  const initial=useRef(initialState()).current, selectedWaitRef=useRef(null)
  const [n,setN]=useState(initial.n),[page,setPage]=useState(initial.page),[pageSize,setPageSize]=useState(20)
  const [bytes,setBytes]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[reload,setReload]=useState(0)
  const [filters,setFilters]=useState(EMPTY_FILTERS),[query,setQuery]=useState(''),[applied,setApplied]=useState('')
  const [rules,setRules]=useState(false),[downloads,setDownloads]=useState(false),[inspector,setInspector]=useState(null),[mode,setMode]=useState(initial.mode)
  useEffect(()=>{selectedWaitRef.current?.scrollIntoView({block:'nearest',inline:'center'})},[n,mode])
  const [jump,setJump]=useState(''),[showFilters,setShowFilters]=useState(false),[toast,setToast]=useState('')
  useEffect(()=>{let active=true;setLoading(true);setError('');setBytes(null);loadData(n).then(b=>{if(active){setBytes(b);setLoading(false)}}).catch(e=>{if(active){setError(e.message);setLoading(false)}});return()=>{active=false}},[n,reload])
  useEffect(()=>{const p=new URLSearchParams({n:String(n),page:String(page+1)});if(mode==='wait-search')p.set('view','wait-search');history.replaceState(null,'','#'+p.toString())},[n,page,mode])
  useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(''),2400);return()=>clearTimeout(t)}},[toast])
  const search=useMemo(()=>{try{const tiles=parseNotation(applied);return {tiles:canonical(tiles),error:''}}catch(e){return {tiles:[],error:e.message}}},[applied])
  const indices=useMemo(()=>{
    if(!bytes||search.error)return []
    const need=countsOf(search.tiles), useSearch=search.tiles.length>0, result=[]
    for(let i=0;i<bytes.length/18;i++){
      const o=i*18;let suits=0,honors=0,hasQuad=false,prev=-1,repeat=0
      for(let j=0;j<13;j++){const t=bytes[o+j];if(t<27)suits|=1<<Math.floor(t/9);else honors++;repeat=t===prev?repeat+1:1;if(repeat===4)hasQuad=true;prev=t}
      const suitCount=(suits&1)+((suits>>1)&1)+((suits>>2)&1)
      if(filters.suits!=='all'&&suitCount!==Number(filters.suits))continue
      if(filters.honors==='none'&&honors>0||filters.honors==='yes'&&honors===0)continue
      if(filters.quads==='none'&&hasQuad||filters.quads==='yes'&&!hasQuad)continue
      let r
      if(useSearch||filters.remain!=='all')r=recordAt(bytes,i)
      if(filters.remain!=='all'&&r.remaining<Number(filters.remain))continue
      if(useSearch){
        // Partial searches are checked against all six global suit permutations.
        const c=countsOf(r.hand), permutations=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]]
        if(!permutations.some(p=>need.every((v,t)=>v<=c[t>=27?t:p[Math.floor(t/9)]*9+t%9])))continue
      }
      result.push(i)
    }
    return result
  },[bytes,filters,search])
  const pages=Math.max(1,Math.ceil(indices.length/pageSize)),activePage=Math.min(page,pages-1)
  const rows=useMemo(()=>bytes?indices.slice(activePage*pageSize,(activePage+1)*pageSize).map(i=>recordAt(bytes,i)):[],[bytes,indices,activePage,pageSize])
  const filterCount=Object.values(filters).filter(v=>v!=='all').length+(applied?1:0)
  function selectN(value){setN(value);setPage(0);setJump('')}
  function updateFilter(k,v){setFilters(f=>({...f,[k]:v}));setPage(0)}
  function reset(){setFilters(EMPTY_FILTERS);setQuery('');setApplied('');setPage(0)}
  function submitSearch(e){e.preventDefault();setApplied(query.trim());setPage(0)}
  function randomHand(){if(indices.length){const i=indices[Math.floor(Math.random()*indices.length)];setInspector({...recordAt(bytes,i),n})}}
  async function copy(s){try{await navigator.clipboard.writeText(s);setToast('牌谱已复制')}catch{setToast('请在详情中选择并复制牌谱')}}
  return <>
    <header className="header"><div className="header-inner"><h1>Riichi Wait Atlas</h1><nav aria-label="主导航"><button className={mode==='catalogue'?'active':''} onClick={()=>setMode('catalogue')}>全部牌谱</button><button className={mode==='wait-search'?'active':''} onClick={()=>setMode('wait-search')}>待牌反查</button><button className={mode==='calculator'?'active':''} onClick={()=>setMode('calculator')}>手牌验算</button></nav><div className="header-actions"><Button variant="ghost" aria-label="规则与口径" onClick={()=>setRules(true)}><BookOpen/><span>规则与口径</span></Button><Button variant="outline" onClick={()=>setDownloads(true)}><Download/><span>下载</span></Button></div></div></header>
    <main className="main">
      {mode==='catalogue'?<>
        <section className="overview" aria-labelledby="overview-title"><div className="section-top"><h2 id="overview-title">按听牌种数浏览</h2><div className="verified"><Check size={14}/><span>{fmt(meta.total)} 种 · 全部复核</span></div></div>
          <div className="wait-nav" role="group" aria-label="选择听牌种数">{NUMBERS.map(value=><button key={value} ref={n===value?selectedWaitRef:null} className={`wait-option ${n===value?'selected':''} ${meta.counts[value]===0?'zero':''}`} aria-pressed={n===value} onClick={()=>selectN(value)}><span className="wait-number">{value}<span>面听</span></span><span className="wait-count">{meta.counts[value]?fmt(meta.counts[value]):'无此牌型'}</span></button>)}</div>
        </section>
        <div className="catalogue-layout">
          <aside className={`filters ${showFilters?'filters-open':''}`} aria-label="牌谱筛选"><div className="filter-heading"><h2>筛选牌谱</h2><Button size="sm" variant="ghost" onClick={reset} disabled={!filterCount} aria-label="重置所有筛选"><RotateCcw size={13}/>重置</Button></div>
            <label className="field-label" htmlFor="suits">数牌花色</label><NativeSelect id="suits" value={filters.suits} onChange={e=>updateFilter('suits',e.target.value)}><option value="all">全部花色数量</option><option value="1">仅一种数牌花色</option><option value="2">两种数牌花色</option><option value="3">三种数牌花色</option></NativeSelect>
            <label className="field-label" htmlFor="honors">字牌</label><NativeSelect id="honors" value={filters.honors} onChange={e=>updateFilter('honors',e.target.value)}><option value="all">不限</option><option value="none">不含字牌</option><option value="yes">含字牌</option></NativeSelect>
            <label className="field-label" htmlFor="quads">手中四枚相同牌</label><NativeSelect id="quads" value={filters.quads} onChange={e=>updateFilter('quads',e.target.value)}><option value="all">不限</option><option value="none">不含四枚相同牌</option><option value="yes">含四枚相同牌</option></NativeSelect>
            <label className="field-label" htmlFor="remain">理论剩余张数</label><NativeSelect id="remain" value={filters.remain} onChange={e=>updateFilter('remain',e.target.value)}><option value="all">不限</option><option value="8">至少 8 张</option><option value="12">至少 12 张</option><option value="16">至少 16 张</option><option value="20">至少 20 张</option><option value="24">至少 24 张</option></NativeSelect>
            <div className="scope-note"><span>当前口径</span><p>门清 13 张 · 每种最多 4 枚</p><p>万筒索互换合并；四风互换、三元牌互换分别合并。数字镜像保留。</p><button onClick={()=>setRules(true)}>查看完整说明 <ArrowRight size={13}/></button></div>
            <div className="legend"><span>牌谱记法</span><p><code>m</code> 万　<code>p</code> 筒　<code>s</code> 索</p><p><code>1–7z</code> 东南西北白发中</p></div>
          </aside>
          <section className="results" aria-label={`${n}面听完整牌谱`}>
            <div className="results-heading"><div className="result-title"><h2>{n} 面听</h2><span>{fmt(meta.counts[n])} 种</span></div><div className="result-actions"><Button variant="ghost" size="sm" onClick={randomHand} disabled={!indices.length||loading}><Shuffle/>随机一手</Button><DownloadLink path={`${n}-waits-csv.zip`} className={`download-category ${!meta.counts[n]?'disabled-link':''}`} aria-disabled={!meta.counts[n]}><ArrowDownToLine size={14}/>本类 CSV</DownloadLink></div></div>
            {meta.counts[n]>0?<>
              <div className="search-toolbar"><form onSubmit={submitSearch} className="search-form"><Search size={16}/><Input aria-label="按包含的手牌检索" placeholder="包含牌谱，如 1234567m；忽略同类牌置换" value={query} onChange={e=>setQuery(e.target.value)}/>{query?<button type="button" className="clear-search" aria-label="清除检索" onClick={()=>{setQuery('');setApplied('');setPage(0)}}><X size={14}/></button>:null}<Button variant="outline" type="submit" size="sm">检索</Button></form><Button variant="outline" className="mobile-filter-button" onClick={()=>setShowFilters(v=>!v)}><SlidersHorizontal/>筛选{filterCount?` (${filterCount})`:''}</Button></div>
              {search.error?<p role="alert" className="inline-error">{search.error}</p>:null}
              {applied&&!search.error?<div className="search-state">包含 <code>{applied}</code><button onClick={()=>{setQuery('');setApplied('');setPage(0)}} aria-label="移除检索"><X size={12}/></button></div>:null}
              <div className="table-caption"><span aria-live="polite">{loading?'正在加载完整牌谱…':`匹配 ${fmt(indices.length)} 种`}</span><span>待牌下标为理论剩余枚数</span></div>
              {error?<div className="empty-state"><h3>加载失败</h3><p role="alert">{error}</p><Button onClick={()=>setReload(x=>x+1)}>重试</Button></div>:loading?<div className="loading-state" role="status"><span className="spinner"/>正在加载 {n} 面听牌谱</div>:indices.length===0?<div className="empty-state"><Search size={28}/><h3>没有匹配的手牌</h3><p>调整筛选条件，或清除包含牌谱检索。</p><Button variant="outline" onClick={reset}>清除筛选</Button></div>:<>
                <div className="table-head" aria-hidden="true"><span>编号 / 现有手牌（13 张）</span><span>待牌（{n} 种）</span><span>余张上限</span><span/></div>
                <div className="hands-list">{rows.map(r=><HandRow key={`${n}-${r.index}`} record={r} n={n} onInspect={()=>setInspector({...r,n})} onCopy={()=>copy(notation(r.hand))}/>)}</div>
                <div className="pagination"><span>{fmt(activePage*pageSize+1)}–{fmt(Math.min((activePage+1)*pageSize,indices.length))} / {fmt(indices.length)}</span><div className="page-controls"><NativeSelect aria-label="每页数量" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(0)}}><option value="20">20 条 / 页</option><option value="50">50 条 / 页</option><option value="100">100 条 / 页</option></NativeSelect><Button variant="outline" size="icon" aria-label="上一页" onClick={()=>setPage(activePage-1)} disabled={activePage===0}><ChevronLeft/></Button><span className="page-number">{fmt(activePage+1)} / {fmt(pages)}</span><Button variant="outline" size="icon" aria-label="下一页" onClick={()=>setPage(activePage+1)} disabled={activePage>=pages-1}><ChevronRight/></Button><form onSubmit={e=>{e.preventDefault();const v=Number(jump);if(Number.isInteger(v)&&v>=1&&v<=pages){setPage(v-1);setJump('')}}} className="jump-form"><Input type="number" min="1" max={pages} aria-label="跳转到页码" placeholder="页码" value={jump} onChange={e=>setJump(e.target.value)}/><Button variant="ghost" size="sm" type="submit">跳转</Button></form></div></div>
              </>}
            </>:<div className="empty-state impossible"><span className="empty-number">{n}</span><h3>不存在 {n} 面听的 13 张手牌</h3><p>普通和牌形最多九面听；七对子只产生单骑听。<br/>国士无双产生一面听或十三面听，因此十、十一、十二面听均为 0 种。</p><Button variant="outline" onClick={()=>selectN(13)}>查看十三面听 <ArrowRight/></Button></div>}
          </section>
        </div>
      </>:mode==='wait-search'?<WaitSearch onInspect={setInspector} onCopy={copy}/>:<Calculator onInspect={setInspector}/>}
      <footer><span>共 {fmt(meta.total)} 种 · 2026.10.31</span><span>牌图：<a href="https://github.com/FluffyStuff/riichi-mahjong-tiles" target="_blank" rel="noreferrer">FluffyStuff · 公有领域</a></span><button onClick={()=>setRules(true)}>枚举与复核</button></footer>
    </main>
    <Dialog open={rules} onOpenChange={setRules} title="规则、去重与完整性" className="rules-dialog"><Rules/></Dialog>
    <Dialog open={downloads} onOpenChange={setDownloads} title="下载牌谱与资源"><Downloads offline={!!window.ATLAS_DATA}/></Dialog>
    <Inspector record={inspector} onClose={()=>setInspector(null)} onCopy={copy}/>
    {toast?<div role="status" className="toast"><Check size={16}/>{toast}</div>:null}
  </>
}
function Inspector({record:r,onClose,onCopy}) {
  const [draw,setDraw]=useState(null),[permutation,setPermutation]=useState(0),[wind,setWind]=useState(0),[dragon,setDragon]=useState(0)
  useEffect(()=>{setDraw(r?.waits[0]??null);setPermutation(0);setWind(0);setDragon(0)},[r])
  const permutations=[[0,1,2],[1,0,2],[0,2,1],[2,1,0],[1,2,0],[2,0,1]],p=permutations[permutation]
  const transform=t=>t>=31?31+SUIT_PERMUTATIONS[dragon][t-31]:t>=27?27+WIND_PERMUTATIONS[wind][t-27]:p[Math.floor(t/9)]*9+t%9
  const hand=r?r.hand.map(transform).sort((a,b)=>a-b):[], waits=r?r.waits.map(transform).sort((a,b)=>a-b):[],actualDraw=draw===null?null:transform(draw)
  const solutions=useMemo(()=>r&&draw!==null?decompose([...r.hand,draw]):[],[r,draw])
  return <Dialog open={!!r} onOpenChange={v=>{if(!v)onClose()}} title={r?`${r.waits.length} 面听 · 和牌拆解`:'和牌拆解'} className="inspector-dialog">{r?<><div className="inspector-top"><code>{notation(hand)}</code><Button variant="ghost" size="sm" onClick={()=>onCopy(notation(hand))}><Copy/>复制</Button></div><div className="inspector-hand"><Tiles tiles={hand}/></div><div className="inspector-stats"><span>现有 <strong>13</strong> 张</span><span>待牌 <strong>{r.waits.length}</strong> 种</span><span>余张上限 <strong>{r.remaining}</strong> 张</span></div><div className="suit-swap"><span>对应 {orbitCount(r.hand)} 种实际牌名配置</span><div className="swap-buttons"><Button variant="outline" size="sm" onClick={()=>setPermutation(v=>(v+1)%6)}><RotateCcw/>切换花色</Button><Button variant="outline" size="sm" onClick={()=>setWind(v=>(v+1)%24)}>轮换四风</Button><Button variant="outline" size="sm" onClick={()=>setDragon(v=>(v+1)%6)}>轮换三元</Button></div></div><h3 className="inspector-label">选择一张待牌</h3><div className="draw-options">{r.waits.map(t=><button key={t} className={draw===t?'chosen':''} onClick={()=>setDraw(t)} aria-pressed={draw===t} aria-label={`摸入${tileName(transform(t))}`}><Tile t={transform(t)}/><span>{tileName(transform(t))}</span></button>)}</div><div className="solution-heading"><h3>摸入 {actualDraw===null?'':tileName(actualDraw)}</h3><span>{solutions.length} 种和牌拆解</span></div><div className="solutions">{solutions.map((s,i)=><div className="solution" key={i}><span>{s.type}{s.type==='四面子一雀头'?' · 首组为雀头':''}</span><div className="solution-groups">{s.groups.map((g,j)=><Tiles key={j} tiles={g.map(transform)} small drawn={actualDraw}/>)}</div></div>)}</div><p className="detail-note">余张上限仅扣除本手牌；实际可和张数还受牌河、他家手牌、振听与役种影响。高亮标出与摸入牌相同的牌种。</p></>:null}</Dialog>
}
function Calculator({onInspect}) {
  const [input,setInput]=useState('1112345678999m'),[result,setResult]=useState(null),[error,setError]=useState('')
  function run(e){e?.preventDefault();try{const tiles=parseNotation(input);if(tiles.length!==13)throw new Error(`需要恰好 13 张手牌，当前为 ${tiles.length} 张。`);setResult(calculate(tiles));setError('')}catch(e){setError(e.message);setResult(null)}}
  return <section className="calculator"><h2>手牌验算</h2><form className="calculator-form" onSubmit={run}><label htmlFor="calc-hand">13 张手牌</label><div><Input id="calc-hand" value={input} onChange={e=>setInput(e.target.value)} placeholder="如 1234567m111p111s"/><Button type="submit">计算待牌</Button></div><p>m 万 · p 筒 · s 索 · 1–7z 东南西北白发中</p></form><div className="examples"><span>试一试</span>{['1234567m111p111s','1112345678999m','19m19p19s1234567z'].map(s=><button key={s} onClick={()=>{setInput(s);setResult(null);setError('')}}>{s}</button>)}</div>{error?<p className="inline-error" role="alert">{error}</p>:null}{result?<div className="calculation-result"><Tiles tiles={result.hand}/><div className="calculation-heading"><h3>{result.waits.length?`${result.waits.length} 面听`:'尚未听牌'}</h3><span>{result.waits.length?`理论剩余 ${result.remaining} 张`:''}</span></div>{result.waits.length?<><Tiles tiles={result.waits}/><Button variant="outline" onClick={()=>onInspect(result)}>查看每张待牌的和牌拆解 <ArrowRight/></Button></>:<p>这手牌不能通过增加一张牌形成和牌形。</p>}</div>:null}</section>
}
function Rules() {
  return <div className="rules-body"><h3>枚举口径</h3><ul><li>34 种牌，每种 4 枚。现有手牌恰好 13 张，门清、无已宣告的杠。赤五按普通五计算。</li><li>“n 面听”指恰好有 n 种不同牌，摸入其中任意一种后构成四面子一雀头、七对子或国士无双。手中已有 4 枚的牌不计为待牌。</li><li>万、筒、索的全部 6 种整体置换归为同一种；东南西北的全部 24 种置换归为同一种；白发中的全部 6 种置换归为同一种，三组置换可独立组合。数牌按三个花色的 1–9 计数向量降序规范化，四风与三元牌各自按枚数降序规范化。数字平移与 1↔9 镜像保留，花色不按面子单独替换。</li><li>这里统计和牌形状，不依赖具体场风、门风、牌河或振听状态。门清可通过立直或门前清自摸和满足役的要求。余张上限为 Σ(4 − 手牌中该待牌的枚数)。</li></ul><h3>完整结果</h3><table className="counts-table"><thead><tr><th>听牌种数</th><th>同类牌去重后</th><th>保留实际牌名</th></tr></thead><tbody>{NUMBERS.map(n=><tr key={n}><td>{n} 面听</td><td>{fmt(meta.counts[n])}</td><td>{fmt(meta.labeledCounts[n])}</td></tr>)}</tbody><tfoot><tr><td>合计</td><td>{fmt(meta.total)}</td><td>{fmt(Object.values(meta.labeledCounts).reduce((a,b)=>a+b,0))}</td></tr></tfoot></table><h3>如何保证完整</h3><ol><li>穷举 55 种面子（34 刻子、21 顺子）的 4 个可重复无序组合，再枚举 34 种雀头，排除任一牌超过 4 枚的情况，得到全部标准 14 张和牌形。</li><li>对每个和牌形移除每种出现的牌，规范化数牌花色、四风和三元牌，并合并同一手牌的全部待牌。手牌在置换下不变时，补齐其对称下的待牌。任何标准听牌都能由对应和牌形移除和牌张得到。</li><li>检查六对子加一单张的七对子待牌；七对子单独最多一面听。另加入国士无双十三面听。国士单面听含大量单张字牌，不能与标准和牌形叠加。</li><li>以独立的“逐张摸入、取雀头、递归拆面子”算法复核全部 {fmt(meta.total)} 手。另独立穷举全部 {fmt(meta.verified.pureSuitHands)} 种清一色 13 张手牌，确认其中 {fmt(meta.verified.pureSuitRetained)} 种多面听全部收录。结果包含每手完整 13 张牌，不以自由面子占位。</li></ol><h3>为何没有十至十二面听</h3><p>穷举的标准和牌形最多九面听，唯一九面听为 <code>1112345678999m</code>。七对子最多一面听。国士无双只产生一面或十三面听，因此十、十一、十二面听均不存在。</p><h3>参考与资源</h3><p><a href="https://saikouisen.com/pdf/saikouisen_regulation.pdf" target="_blank" rel="noreferrer">最高位战日本职业麻将协会 · 竞赛规则</a> 第 46 条列出三种和牌形，第 48 条列出七对子、国士无双与九莲宝灯。</p><p><a href="https://github.com/FluffyStuff/riichi-mahjong-tiles" target="_blank" rel="noreferrer">FluffyStuff / riichi-mahjong-tiles</a>：公有领域 SVG 牌图，已下载到本地，网页展示不依赖远程图片。</p></div>
}
function Downloads({offline}) {
  return <div className="downloads-list">{offline?<p className="offline-note">当前为离线单文件版。各听牌分类的“本类 CSV”可直接导出；完整压缩包和原始牌图请从在线版下载。</p>:null}<a className="download-item" href={offline?'https://ponder-j.github.io/riichi-wait-atlas/':'./downloads/all-hands-csv.zip'} download={!offline}><div><strong>全部 {fmt(meta.total)} 手牌</strong><span>按 3–13 面听分表 · ZIP 内含 UTF-8 CSV</span></div><Download size={19}/></a><a className="download-item" href={offline?'https://ponder-j.github.io/riichi-wait-atlas/':'./downloads/riichi-atlas-offline.html'} download={!offline}><div><strong>离线 HTML 网页</strong><span>完整牌谱与牌图内嵌，保存后可双击打开</span></div><Download size={19}/></a><a className="download-item" href={offline?'https://ponder-j.github.io/riichi-wait-atlas/':'./downloads/mahjong-tiles-svg.zip'} download={!offline}><div><strong>34 种麻将牌 SVG</strong><span>FluffyStuff 原始资源 · 附许可证</span></div><Download size={19}/></a><a className="download-item" href={offline?'https://ponder-j.github.io/riichi-wait-atlas/':'./data/manifest.json'} download={!offline}><div><strong>统计与数据校验值</strong><span>JSON · 各组数量、SHA-256 与复核结果</span></div><Download size={19}/></a><p className="detail-note">CSV 中 m=万、p=筒、s=索、z=字牌。remaining_max 为仅扣本手牌的理论剩余张数；本类 CSV 下载包含该听牌种数的全部手牌。</p></div>
}
createRoot(document.getElementById('root')).render(<App/> )
