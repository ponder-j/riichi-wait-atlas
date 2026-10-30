import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {gzipSync} from 'node:zlib'
import {createHash} from 'node:crypto'
let shapeMeta
for(const limited of [true,false]){
 const raw=limited?'data/raw':'data/shape-raw',output=limited?'public/data':'public/data/shape'
 const meta=JSON.parse(await readFile(`${raw}/enumeration.json`,'utf8'))
 await mkdir(`${output}/cores`,{recursive:true})
 const hashes={},coreHashes={}
 for(let n=3;n<=13;n++){
  const data=await readFile(`${raw}/${n}.bin`),cores=await readFile(`${raw}/${n}.cores`)
  if(data.length!==meta.counts[n]*18||cores.length!==meta.counts[n]*2)throw new Error(`Invalid size: ${raw}/${n}`)
  if(!limited)await writeFile(`${output}/${n}.bin.gz`,gzipSync(data,{level:9}))
  await writeFile(`${output}/cores/${n}.bin.gz`,gzipSync(cores,{level:9}))
  hashes[n]=createHash('sha256').update(data).digest('hex');coreHashes[n]=createHash('sha256').update(cores).digest('hex')
 }
 const result={recordBytes:18,coreBytes:2,corePairFlag:8192,coreTileBits:13,counts:meta.counts,total:Object.values(meta.counts).reduce((a,b)=>a+b,0),sha256:hashes,coreSha256:coreHashes,limitCopies:limited}
 await writeFile(`${output}/patterns.json`,JSON.stringify(result,null,2)+'\n')
 if(!limited){shapeMeta=result;await writeFile('src/shape-meta.json',JSON.stringify(result,null,2)+'\n')}
}
console.log(JSON.stringify({shapeHands:shapeMeta.total}))
