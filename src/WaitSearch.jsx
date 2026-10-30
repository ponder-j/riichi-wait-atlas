import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Search, X } from 'lucide-react'
import { Button, Input, NativeSelect } from './components/ui'
import { HandRow, Tiles } from './components/hand'
import { loadData } from './data'
import { downloadBlob } from './download'
import { notation } from './mahjong'
import { matchPage, matchingRecords, parseWaitQuery, searchWaits } from './wait-search'
import meta from './meta.json'

const fmt=n=>n.toLocaleString('en-US')
export function WaitSearch({onInspect,onCopy}) {
  const [input,setInput]=useState(''),[onePerClass,setOnePerClass]=useState(false)
  const [result,setResult]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[progress,setProgress]=useState(null),[exporting,setExporting]=useState(false)
  const [page,setPage]=useState(0),[pageSize,setPageSize]=useState(20),[jump,setJump]=useState('')
  const controller=useRef(null)
  useEffect(()=>()=>controller.current?.abort(),[])
  function clear(){controller.current?.abort();setInput('');setResult(null);setError('');setBusy(false);setProgress(null);setPage(0)}
  async function submit(e){
    e?.preventDefault();controller.current?.abort()
    let tiles
    try{tiles=parseWaitQuery(input)}catch(e){setError(e.message);setResult(null);setBusy(false);return}
    const current=new AbortController();controller.current=current;setBusy(true);setError('');setResult(null);setPage(0);setJump('');setProgress(null)
    try{
      const categories=Object.keys(meta.counts).map(Number).filter(n=>meta.counts[n]>0&&n===tiles.length)
      const datasets=await Promise.all(categories.map(async n=>({n,bytes:await loadData(n)})))
      if(current.signal.aborted)return
      const found=await searchWaits(datasets,tiles,{signal:current.signal,onProgress:setProgress})
      if(!current.signal.aborted)setResult(found)
    }catch(e){if(!current.signal.aborted)setError(e.message||'检索失败，请重试。')}
    finally{if(!current.signal.aborted)setBusy(false)}
  }
  const total=result?(onePerClass?result.groups.length:result.total):0,pages=Math.max(1,Math.ceil(total/pageSize)),activePage=Math.min(page,pages-1)
  const rows=useMemo(()=>matchPage(result,activePage,pageSize,onePerClass),[result,activePage,pageSize,onePerClass])
  async function exportResults(){
    if(!result||!total)return
    setExporting(true)
    try{const lines=['source_id,configuration,wait_types,hand,waits,remaining_max'];let count=0
      for(const r of matchingRecords(result,onePerClass)){lines.push(`${r.n}-${String(r.index+1).padStart(6,'0')},${r.rotation+1},${r.waits.length},${notation(r.hand)},${notation(r.waits)},${r.remaining}`);if(++count%4096===0)await new Promise(resolve=>setTimeout(resolve,0))}
      downloadBlob('\ufeff'+lines.join('\r\n'),`wait-search-${notation(result.tiles)}-exact.csv`,'text/csv;charset=utf-8')
    }catch(e){setError(e.message||'导出失败，请重试。')}finally{setExporting(false)}
  }
  return <section className="wait-search-page" aria-labelledby="wait-search-title">
    <div className="wait-search-form-panel"><h2 id="wait-search-title">按待牌查手牌</h2>
      <form onSubmit={submit} className="wait-search-form"><label htmlFor="wait-query">输入完整待牌，每种只填一次</label><div className="wait-query-row"><Input id="wait-query" autoComplete="off" spellCheck={false} value={input} onChange={e=>setInput(e.target.value)} placeholder="如 147s 或 69p7z" aria-describedby="wait-query-help"/><Button type="submit" disabled={busy}><Search/>{busy?'检索中':'查找手牌'}</Button>{input?<Button type="button" variant="ghost" size="icon" aria-label="清空待牌反查" onClick={clear}><X/></Button>:null}</div>
        
        <p id="wait-query-help" className="wait-query-help">m 万 · p 筒 · s 索 · 1–7z 东南西北白发中。只匹配完整待牌集合相同的手牌；范围为 3–13 面听，按输入牌名展开轮换。</p>
      </form>
      <div className="examples"><span>试一试</span>{['147s','69p7z','19m19p19s1234567z'].map(s=><button key={s} onClick={()=>{setInput(s);setError('')}}>{s}</button>)}</div>
      {error?<p role="alert" className="inline-error">{error}</p>:null}
    </div>
    {busy?<div className="wait-search-status" role="status"><span className="spinner"/>{progress?`已检查 ${fmt(progress.processed)} / ${fmt(progress.totalRecords)} 种牌型`:'正在加载完整牌谱…'}<Button variant="ghost" size="sm" onClick={()=>{controller.current?.abort();setBusy(false);setProgress(null)}}>取消</Button></div>:null}
    {result?<section className="results wait-search-results" aria-label="待牌反查结果"><div className="results-heading"><div className="result-title"><h3>匹配手牌</h3><span>{fmt(result.groups.length)} 类 · {fmt(result.total)} 手配置</span></div><Button variant="ghost" size="sm" onClick={exportResults} disabled={!total||exporting}><Download/>{exporting?'正在导出':'导出结果'}</Button></div><div className="wait-result-query"><span>待牌完全相同</span><Tiles tiles={result.tiles} small/><label className="one-per-class"><input type="checkbox" checked={onePerClass} onChange={e=>{setOnePerClass(e.target.checked);setPage(0)}}/>每类只看一例</label></div>
      {total?<><div className="table-caption"><span aria-live="polite">显示 {fmt(total)} 手 · 已合并重复配置</span><span>每手按实际待牌显示</span></div><div className="table-head" aria-hidden="true"><span>原型编号 / 现有手牌（13 张）</span><span>完整待牌</span><span>余张上限</span><span/></div><div className="hands-list">{rows.map(r=><HandRow key={`${r.n}-${r.index}-${r.rotation}`} record={r} n={r.n} onInspect={()=>onInspect(r)} onCopy={()=>onCopy(notation(r.hand))}/>)}</div><div className="pagination"><span>{fmt(activePage*pageSize+1)}–{fmt(Math.min((activePage+1)*pageSize,total))} / {fmt(total)}</span><div className="page-controls"><NativeSelect aria-label="反查每页数量" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(0)}}><option value="20">20 条 / 页</option><option value="50">50 条 / 页</option><option value="100">100 条 / 页</option></NativeSelect><Button variant="outline" size="icon" aria-label="反查上一页" onClick={()=>setPage(activePage-1)} disabled={activePage===0}><ChevronLeft/></Button><span className="page-number">{fmt(activePage+1)} / {fmt(pages)}</span><Button variant="outline" size="icon" aria-label="反查下一页" onClick={()=>setPage(activePage+1)} disabled={activePage>=pages-1}><ChevronRight/></Button><form className="jump-form" onSubmit={e=>{e.preventDefault();const v=Number(jump);if(Number.isInteger(v)&&v>=1&&v<=pages){setPage(v-1);setJump('')}}}><Input type="number" min="1" max={pages} aria-label="反查跳转页码" placeholder="页码" value={jump} onChange={e=>setJump(e.target.value)}/><Button variant="ghost" size="sm" type="submit">跳转</Button></form></div></div></>:<div className="empty-state"><Search size={28}/><h3>没有符合条件的手牌</h3><p>已检查对应面听种数及全部同类牌轮换。<br/>请检查待牌输入，或换一组待牌。</p></div>}
    </section>:!busy?<div className="wait-search-intro"><p>输入待牌即可反查完整的 13 张手牌。检索会还原万筒索、四风和三元牌的轮换，默认显示所有匹配的实际配置。</p></div>:null}
  </section>
}
