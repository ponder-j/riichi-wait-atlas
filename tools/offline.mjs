import { build } from 'esbuild'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
const root = path.resolve(import.meta.dirname, '..')
const meta=JSON.parse(await readFile(path.join(root,'src/meta.json'),'utf8'))
const data={}, shapeData={}, cores={physical:{},shape:{}}, tiles={}
for(let n=3;n<=13;n++)data[n]=(await readFile(path.join(root,`public/data/${n}.bin.gz`))).toString('base64')
for(let n=3;n<=13;n++){shapeData[n]=(await readFile(path.join(root,`public/data/shape/${n}.bin.gz`))).toString('base64');cores.physical[n]=(await readFile(path.join(root,`public/data/cores/${n}.bin.gz`))).toString('base64');cores.shape[n]=(await readFile(path.join(root,`public/data/shape/cores/${n}.bin.gz`))).toString('base64')}
for(let i=0;i<34;i++)tiles[i]='data:image/svg+xml;base64,'+(await readFile(path.join(root,`public/assets/tiles/${meta.tiles[i]}.svg`))).toString('base64')
const result=await build({entryPoints:[path.join(root,'src/main.jsx')],bundle:true,write:false,format:'iife',minify:true,target:'es2022',loader:{'.css':'empty'},define:{'process.env.NODE_ENV':'"production"'}})
const names=await readdir(path.join(root,'dist/assets')),css=await readFile(path.join(root,'dist/assets',names.find(x=>/^index-.*\.css$/.test(x))),'utf8')
const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#f5f7fa"><title>Riichi Wait Atlas - Offline</title><style>${css}</style></head><body><div id="root"></div><script>window.ATLAS_DATA=${JSON.stringify(data)};window.ATLAS_SHAPE_DATA=${JSON.stringify(shapeData)};window.ATLAS_CORES=${JSON.stringify(cores)};window.ATLAS_TILES=${JSON.stringify(tiles)};</script><script>${result.outputFiles[0].text.replaceAll('</script','<\\/script')}</script></body></html>`
await writeFile(path.join(root,'public/downloads/riichi-atlas-offline.html'),html)
await writeFile(path.join(root,'dist/downloads/riichi-atlas-offline.html'),html)
console.log(JSON.stringify({offlineBytes:Buffer.byteLength(html),hands:meta.total}))
