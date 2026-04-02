import { useState, useRef } from 'react'

export default function FileUploader({ onUpload, mode = 'raw' }) {
  const [dragging, setDragging] = useState(false)
  const [metadata, setMetadata] = useState({ name: '', genotype: '', mouseId: '', group: '' })
  const fileRef = useRef()

  const handleDrop = (e) => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files[0]; if (file) submitFile(file) }
  const submitFile = (file) => {
    onUpload(file, {
      name: metadata.name || file.name.replace('.csv', ''),
      genotype: metadata.genotype,
      mouseId: metadata.mouseId,
      group: metadata.group || metadata.genotype,
    }, mode)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Dataset name"
          value={metadata.name} onChange={e => setMetadata(m => ({ ...m, name: e.target.value }))} />
        <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Genotype (e.g. Het, WT, KO)"
          value={metadata.genotype} onChange={e => setMetadata(m => ({ ...m, genotype: e.target.value }))} />
        {mode === 'raw' && (<>
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Mouse ID (e.g. Het_01)"
            value={metadata.mouseId} onChange={e => setMetadata(m => ({ ...m, mouseId: e.target.value }))} />
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Group"
            value={metadata.group} onChange={e => setMetadata(m => ({ ...m, group: e.target.value }))} />
        </>)}
      </div>
      <div className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
        onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => e.target.files[0] && submitFile(e.target.files[0])} />
        <p className="text-gray-500">{mode === 'raw' ? 'Drop raw CASA CSV here (Shift-JIS or UTF-8)' : 'Drop pre-processed CSV here (with t-SNE + Cluster columns)'}</p>
      </div>
    </div>
  )
}
