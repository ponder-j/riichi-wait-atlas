import React,{useEffect,useMemo,useRef,useState} from 'react'
import {ChevronLeft,ChevronRight,Download,Search,X} from 'lucide-react'
import {Button,Input,NativeSelect} from './components/ui'
import {HandRow,Tiles} from './components/hand'
import {CoreResults} from './components/CoreResults'
import {AbstractionControls} from './components/AbstractionControls'
import {symbolicNotation} from './abstraction'
import {loadData} from './data'
import {downloadBlob} from './download'
import {notation} from './mahjong'
import {matchPage,matchingRecords,parseWaitQuery,searchWaits} from './wait-search'
import {buildCoreFamilies,familyRecord,groupFamiliesByWaits} from './core-patterns'
import meta from './meta.json'
import shapeMeta from './shape-meta.json'
const fmt=n=>n.toLocaleString('en-US')
export function WaitSearch({onInspect,onCopy}){
 const [input,setInput]=useState(''),[limitCopies,setLimitCopies]=useState(false),[mergeCores,setMergeCores]=useState(true),[onePerClass,setOnePerClass]=useState(false)
 const [mirror,setMirror]=useState(true),[parameterize,setParameterize]=useState(true),[families,setFamilies]=useState(null),[grouping,setGrouping]=useState(false)
 const [result,setResult]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[progress,setProgress]=useState(null),[exporting,setExporting]=useState(false)
 const [page,setPage]=useState(0),[pageSize,setPageSize]=useState(20),[jump,setJump]=useState(''),controller=useRef(null)
 useEffect(()=>()=>controller.current?.abort(),[])
 useEffect(()=>{
  if(!result){setFamilies(null);setGrouping(false);return}
  const current=new AbortController();setFamilies(null);setGrouping(true)
  buildCoreFamilies(result,{mirror,parameterize,signal:current.signal}).then(found=>{if(!current.signal.aborted)setFamilies(found)}).catch(e=>{if(!current.signal.aborted)setError(e.message||'原型合并失败，请重试。')}).finally(()=>{if(!current.signal.aborted)setGrouping(false)})
  return()=>current.abort()
 },[result,mirror,parameterize])
 function invalidate(){controller.current?.abort();setResult(null);setFamilies(null);setError('');setBusy(false);setProgress(null);setPage(0)}
 function clear(){invalidate();setInput('')}
 async function submit(e){
  e?.preventDefault();controller.current?.abort();let tiles
  try{tiles=parseWaitQuery(input)}catch(e){setError(e.message);setResult(null);setBusy(false);return}
  const current=new AbortController();controller.current=current;setBusy(true);setError('');setResult(null);setFamilies(null);setPage(0);setJump('');setProgress(null)
  try{
   const selected=limitCopies?meta:shapeMeta,categories=Object.keys(selected.counts).map(Number).filter(n=>selected.counts[n]>0&&n===tiles.length)
   const datasets=await Promise.all(categories.map(async n=>{const [bytes,coreMasks]=await Promise.all([loadData(n,{limitCopies}),loadData(n,{limitCopies,cores:true})]);return {n,bytes,coreMasks}}))
   if(current.signal.aborted)return
   const found=await searchWaits(datasets,tiles,{signal:current.signal,onProgress:setProgress,limitCopies})
   if(!current.signal.aborted)setResult(found)
  }catch(e){if(!current.signal.aborted)setError(e.message||'检索失败，请重试。')}finally{if(!current.signal.aborted)setBusy(false)}
 }
 const modes=useMemo(()=>families?groupFamiliesByWaits(families):[],[families])
 const total=result?(onePerClass?result.groups.length:result.total):0,pages=Math.max(1,Math.ceil(total/pageSize)),activePage=Math.min(page,pages-1)
 const rows=useMemo(()=>mergeCores?[]:matchPage(result,activePage,pageSize,onePerClass),[result,activePage,pageSize,onePerClass,mergeCores])
 async function exportResults(){
  if(!result||!result.total||(mergeCores&&!families))return;setExporting(true)
  try{
   let lines
   if(mergeCores){lines=['wait_mode_id,wait_mode,model_id,model_expression,prototype_core,waiting_pair_XX,free_pair_PP,free_melds,prototype_fixed_waits,verified_X_bindings,exact_query_waits,matching_hands,limit_four_copies,merge_mirrors,parameterize_pair,example_hand,example_waits'];for(const mode of modes)for(const f of mode.families){const r=familyRecord(result,f.members[0]);lines.push([mode.modeId,symbolicNotation(mode.waits),f.modelId,f.modelText,notation(f.core),f.waitPair,Boolean(f.freePair),f.freeMelds,notation(f.waits),[...f.bindings.keys()].sort((a,b)=>a-b).map(t=>symbolicNotation([t])).join(' '),notation(result.tiles),f.members.length,result.limitCopies,mirror,parameterize,notation(r.hand),notation(r.waits)].join(','))}}
   else{lines=['source_id,configuration,wait_types,hand,waits,remaining_max,core,free_pair,free_melds,limit_four_copies'];let count=0;for(const r of matchingRecords(result,onePerClass)){lines.push(`${result.limitCopies?'P':'T'}${r.n}-${String(r.index+1).padStart(6,'0')},${r.rotation+1},${r.waits.length},${notation(r.hand)},${notation(r.waits)},${r.remaining},${notation(r.core)},${Boolean(r.freePair)},${(13-r.core.length-(r.freePair?2:0))/3},${result.limitCopies}`);if(++count%4096===0)await new Promise(resolve=>setTimeout(resolve,0))}}
   downloadBlob('\ufeff'+lines.join('\r\n'),`wait-search-${notation(result.tiles)}-${result.limitCopies?'four-copies':'shape'}-${mergeCores?'cores':'hands'}.csv`,'text/csv;charset=utf-8')
  }catch(e){setError(e.message||'导出失败，请重试。')}finally{setExporting(false)}
 }
 return <section className="wait-search-page" aria-labelledby="wait-search-title"><div className="wait-search-form-panel"><h2 id="wait-search-title">按待牌查手牌</h2><form onSubmit={submit} className="wait-search-form"><label htmlFor="wait-query">输入完整待牌，每种只填一次</label><div className="wait-query-row"><Input id="wait-query" autoComplete="off" spellCheck={false} value={input} onChange={e=>setInput(e.target.value)} placeholder="如 456m 或 4567m" aria-describedby="wait-query-help"/><Button type="submit" disabled={busy}><Search/>{busy?'检索中':'查找手牌'}</Button>{input?<Button type="button" variant="ghost" size="icon" aria-label="清空待牌反查" onClick={clear}><X/></Button>:null}</div><label className="boundary-control"><input type="checkbox" checked={limitCopies} onChange={e=>{invalidate();setLimitCopies(e.target.checked)}}/>考虑一种牌最多只有 4 张</label><p className="boundary-help">{limitCopies?'实牌待牌：手中已有 4 枚的牌，不再计入待牌。':'牌形待牌：即使需要理论上的第 5 枚，也计入完整待牌集合。'}现有 13 张手牌始终每种最多 4 枚。</p><p id="wait-query-help" className="wait-query-help">m 万 · p 筒 · s 索 · 1–7z 东南西北白发中。按所选规则精确匹配 3–13 面听，并还原同类牌轮换。</p></form><div className="examples"><span>试一试</span>{['456m','4567m','69p7z'].map(s=><button key={s} onClick={()=>{setInput(s);setError('')}}>{s}</button>)}</div>{error?<p role="alert" className="inline-error">{error}</p>:null}</div>
 {busy?<div className="wait-search-status" role="status"><span className="spinner"/>{progress?`已检查 ${fmt(progress.processed)} / ${fmt(progress.totalRecords)} 种牌型`:'正在加载完整牌谱…'}<Button variant="ghost" size="sm" onClick={invalidate}>取消</Button></div>:null}
 {result?<section className="results wait-search-results" aria-label="待牌反查结果"><div className="results-heading"><div className="result-title"><h3>匹配手牌</h3><span>{families?fmt(modes.length):'…'} 待牌模式 · {fmt(result.total)} 手配置</span></div><Button variant="ghost" size="sm" onClick={exportResults} disabled={!result.total||exporting||(mergeCores&&!families)}><Download/>{exporting?'正在导出':mergeCores?'导出核心 CSV':'导出手牌 CSV'}</Button></div><div className="wait-result-query"><span>完整待牌</span><Tiles tiles={result.tiles} small/><span className="boundary-badge">{result.limitCopies?'每种最多 4 张':'含理论第 5 张'}</span><label className="one-per-class"><input type="checkbox" checked={mergeCores} onChange={e=>{setMergeCores(e.target.checked);setPage(0)}}/>按核心牌形合并</label>{!mergeCores?<label className="one-per-class"><input type="checkbox" checked={onePerClass} onChange={e=>{setOnePerClass(e.target.checked);setPage(0)}}/>每类只看一例</label>:null}</div>
 {mergeCores?<AbstractionControls mirror={mirror} parameterize={parameterize} onMirror={v=>{setFamilies(null);setMirror(v)}} onParameterize={v=>{setFamilies(null);setParameterize(v)}}/>:null}
 {result.total?(mergeCores?(grouping||!families?<div className="loading-state" role="status"><span className="spinner"/>正在合并牌形原型…</div>:<CoreResults key={`${notation(result.tiles)}-${result.limitCopies}-${mirror}-${parameterize}`} source={result} families={families} modes={modes} onInspect={onInspect} onCopy={onCopy}/>):<><div className="table-caption"><span aria-live="polite">显示 {fmt(total)} 手 · 已合并重复配置</span><span>待牌下标为实牌剩余枚数</span></div><div className="table-head" aria-hidden="true"><span>原型编号 / 现有手牌（13 张）</span><span>完整待牌</span><span>余张上限</span><span/></div><div className="hands-list">{rows.map(r=><HandRow key={`${r.n}-${r.index}-${r.rotation}`} record={r} n={r.n} onInspect={()=>onInspect(r)} onCopy={()=>onCopy(notation(r.hand))}/>)}</div><div className="pagination"><span>{fmt(activePage*pageSize+1)}–{fmt(Math.min((activePage+1)*pageSize,total))} / {fmt(total)}</span><div className="page-controls"><NativeSelect aria-label="反查每页数量" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(0)}}><option value="20">20 条 / 页</option><option value="50">50 条 / 页</option><option value="100">100 条 / 页</option></NativeSelect><Button variant="outline" size="icon" aria-label="反查上一页" onClick={()=>setPage(activePage-1)} disabled={!activePage}><ChevronLeft/></Button><span className="page-number">{fmt(activePage+1)} / {fmt(pages)}</span><Button variant="outline" size="icon" aria-label="反查下一页" onClick={()=>setPage(activePage+1)} disabled={activePage>=pages-1}><ChevronRight/></Button><form className="jump-form" onSubmit={e=>{e.preventDefault();const v=Number(jump);if(Number.isInteger(v)&&v>=1&&v<=pages){setPage(v-1);setJump('')}}}><Input type="number" min="1" max={pages} aria-label="反查跳转页码" placeholder="页码" value={jump} onChange={e=>setJump(e.target.value)}/><Button variant="ghost" size="sm" type="submit">跳转</Button></form></div></div></>):<div className="empty-state"><Search size={28}/><h3>没有符合条件的手牌</h3><p>已按所选边界检查完整待牌集合及全部同类牌轮换。</p></div>}
 </section>:!busy?<div className="wait-search-intro"><p>先按完整待牌模式归类，再展示核心变体；数牌镜像默认合并。符合条件的待牌对子写成 XX，可展开核对每手完整的 13 张牌。</p></div>:null}
 </section>
}
