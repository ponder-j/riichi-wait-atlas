import React from 'react'
export function AbstractionControls({mirror,parameterize,onMirror,onParameterize}){
 return <div className="abstraction-controls" aria-label="牌形抽象选项"><label><input type="checkbox" checked={mirror} onChange={e=>onMirror(e.target.checked)}/>合并 1↔9 镜像</label><label><input type="checkbox" checked={parameterize} onChange={e=>onParameterize(e.target.checked)}/>合并可变待牌对子 XX</label></div>
}
