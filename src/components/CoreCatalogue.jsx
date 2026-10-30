import React,{useEffect,useState} from 'react'
import {Button} from './ui'
import {CoreResults} from './CoreResults'
import {AbstractionControls} from './AbstractionControls'
import {loadData} from '../data'
import {buildCoreFamilies,catalogueSource,groupFamiliesByWaits} from '../core-patterns'
export function CoreCatalogue({bytes,n,indices,onInspect,onCopy}){
 const [result,setResult]=useState(null),[error,setError]=useState(''),[reload,setReload]=useState(0),[mirror,setMirror]=useState(true),[parameterize,setParameterize]=useState(true)
 useEffect(()=>{const controller=new AbortController();setResult(null);setError('');(async()=>{try{const masks=await loadData(n,{cores:true});if(controller.signal.aborted)return;const source=catalogueSource(bytes,masks,n,indices),families=await buildCoreFamilies(source,{canonicalize:true,mirror,parameterize,signal:controller.signal});if(!controller.signal.aborted)setResult({source,families,modes:groupFamiliesByWaits(families)})}catch(e){if(!controller.signal.aborted)setError(e.message)}})();return()=>controller.abort()},[bytes,n,indices,reload,mirror,parameterize])
 return <><AbstractionControls mirror={mirror} parameterize={parameterize} onMirror={v=>{setResult(null);setMirror(v)}} onParameterize={v=>{setResult(null);setParameterize(v)}}/>{error?<div className="empty-state"><p role="alert">{error}</p><Button onClick={()=>setReload(v=>v+1)}>重试</Button></div>:!result?<div className="loading-state" role="status"><span className="spinner"/>正在合并牌形原型…</div>:<CoreResults key={`${n}-${mirror}-${parameterize}-${reload}`} source={result.source} families={result.families} modes={result.modes} onInspect={onInspect} onCopy={onCopy} catalogue/>}</>
}
