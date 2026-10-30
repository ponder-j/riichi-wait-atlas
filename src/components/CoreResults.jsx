import React,{useState} from 'react'
import {ChevronDown,ChevronUp,ChevronLeft,ChevronRight} from 'lucide-react'
import {Button} from './ui'
import {Tiles} from './hand'
import {CoreFamilies} from './CoreFamilies'
import {symbolicNotation} from '../abstraction'
const fmt=n=>n.toLocaleString('en-US')
export function CoreResults({source,families,modes,onInspect,onCopy,catalogue=false}){
 const [byWaits,setByWaits]=useState(true),[page,setPage]=useState(0),pages=Math.max(1,Math.ceil(modes.length/20)),active=Math.min(page,pages-1)
 return <div className="wait-mode-results"><div className="wait-mode-toolbar"><label className="boundary-control"><input type="checkbox" checked={byWaits} onChange={e=>setByWaits(e.target.checked)}/>按待牌模式分组</label><span>{byWaits?`${fmt(modes.length)} 种待牌模式`:`${fmt(families.length)} 种核心公式`} · 覆盖 {fmt(source.total)} {catalogue?'个原牌型':'手配置'}</span></div>{byWaits?<><p className="wait-mode-help">先按完整待牌集合归一花色{families[0]?.mirrorMerged?'与镜像':''}；同一模式内保留不同手牌结构，展开可查看核心变体及完整配置。</p><div className="wait-mode-list">{modes.slice(active*20,(active+1)*20).map(mode=><WaitModeCard key={mode.key} mode={mode} source={source} catalogue={catalogue} onInspect={onInspect} onCopy={onCopy} initialOpen={modes.length===1}/>)}</div><div className="pagination"><span>{fmt(modes.length)} 种待牌模式 · 覆盖 {fmt(source.total)} {catalogue?'个原牌型':'手实际配置'}</span><div className="page-controls"><Button variant="outline" size="icon" aria-label="待牌模式上一页" disabled={!active} onClick={()=>setPage(v=>v-1)}><ChevronLeft/></Button><span className="page-number">{active+1} / {fmt(pages)}</span><Button variant="outline" size="icon" aria-label="待牌模式下一页" disabled={active>=pages-1} onClick={()=>setPage(v=>v+1)}><ChevronRight/></Button></div></div></>:<CoreFamilies source={source} families={families} onInspect={onInspect} onCopy={onCopy} catalogue/>}</div>
}
function WaitModeCard({mode,source,catalogue,onInspect,onCopy,initialOpen}){
 const [open,setOpen]=useState(initialOpen)
 return <article className="wait-mode" data-wait-mode={mode.modeId}><div className="wait-mode-heading"><div><h3>待牌模式 <code>{symbolicNotation(mode.waits)}</code></h3><Tiles tiles={mode.waits} small/></div><div className="wait-mode-actions"><span>{fmt(mode.total)} {catalogue?'个原牌型':'手配置'} · {mode.families.length} 种核心变体</span><Button variant="ghost" size="sm" onClick={()=>setOpen(v=>!v)} aria-expanded={open}>{open?'收起核心变体':'查看核心变体'}{open?<ChevronUp/>:<ChevronDown/>}</Button></div></div>{open?<div className="wait-mode-body"><CoreFamilies source={{...source,total:mode.total}} families={mode.families} onInspect={onInspect} onCopy={onCopy} catalogue={catalogue} nested/></div>:null}</article>
}
