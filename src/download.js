export function downloadBlob(text,name,type='text/plain;charset=utf-8') {
  const url=URL.createObjectURL(new Blob([text],{type})), a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)
}
