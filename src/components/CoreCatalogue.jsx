import React,{useEffect,useState} from 'react'
import {Button} from './ui'
import {CoreFamilies} from './CoreFamilies'
import {loadData} from '../data'
import {buildCoreFamilies,catalogueSource} from '../core-patterns'
export function CoreCatalogue({bytes,n,indices,onInspect,onCopy}){
 const [result,setResult]=useState(null),[error,setError]=useState(''),[reload,setReload]=useState(0)
 useEffect(()=>{const controller=new AbortController();setResult(null);setError('');(async()=>{try{const masks=await loadData(n,{cores:true});if(controller.signal.aborted)return;const source=catalogueSource(bytes,masks,n,indices),families=await buildCoreFamilies(source,{canonicalize:true,signal:controller.signal});if(!controller.signal.aborted)setResult({source,families})}catch(e){if(!controller.signal.aborted)setError(e.message)}})();return()=>controller.abort()},[bytes,n,indices,reload])
 if(error)return <div className="empty-state"><p role="alert">{error}</p><Button onClick={()=>setReload(v=>v+1)}>重试</Button></div>
 if(!result)return <div className="loading-state" role="status"><span className="spinner"/>正在合并核心牌形…</div>
 return <CoreFamilies source={result.source} families={result.families} onInspect={onInspect} onCopy={onCopy} catalogue/>
}
