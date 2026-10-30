import React from 'react'
import { Copy, ChevronRight } from 'lucide-react'
import { Button } from './ui'
import { countsOf, notation, tileName } from '../mahjong'
import meta from '../meta.json'
export function Tile({ t, small=false, highlight=false }) {
  const name=meta.tiles[t], src=window.ATLAS_TILES?.[t]||`./assets/tiles/${name}.svg`
  return <img className={`tile${small?' tile-small':''}${highlight?' tile-highlight':''}`} src={src} width="32" height="44" alt={tileName(t)} title={tileName(t)} draggable="false" />
}
export function Tiles({ tiles, small=false, drawn=-1, className='' }) {
  return <div className={`tiles ${className}`} role="img" aria-label={tiles.map(tileName).join('、')}>{tiles.map((t,i)=><React.Fragment key={`${i}-${t}`}>{i>0&&Math.floor(t/9)!==Math.floor(tiles[i-1]/9)?<span className="suit-gap" aria-hidden="true"/>:null}<Tile t={t} small={small} highlight={t===drawn}/></React.Fragment>)}</div>
}
export function HandRow({record:r,n,onInspect,onCopy}) {
  const c=countsOf(r.hand),code=`${r.limitCopies===false?'T':''}${n}-${String(r.index+1).padStart(6,'0')}`
  return <article className="hand-row"><div className="hand-cell"><div className="hand-meta"><span className="hand-id">#{code}</span><code>{notation(r.hand)}</code>{r.rotation!==undefined?<span className="configuration-id">配置 {r.rotation+1}</span>:null}<button onClick={onCopy} aria-label={`复制手牌 ${code}`} title="复制手牌"><Copy size={13}/></button></div><Tiles tiles={r.hand}/></div><div className="wait-cell"><span className="mobile-label">待牌 · {n} 种</span><div className="wait-tiles" role="img" aria-label={r.waits.map(t=>`${tileName(t)}余${4-c[t]}张`).join('、')}>{r.waits.map(t=><div key={t} className={`wait-tile ${c[t]===4?'fifth-copy':''}`} title={c[t]===4?'理论第 5 张：实牌余张为 0':undefined}><Tile t={t} small/><span>{4-c[t]}</span></div>)}</div></div><div className="remaining-cell"><strong>{r.remaining}</strong><span>张</span></div><Button className="detail-button" variant="ghost" size="icon" aria-label={`查看 ${code} 和牌拆解`} title="查看和牌拆解" onClick={onInspect}><ChevronRight/></Button></article>
}
