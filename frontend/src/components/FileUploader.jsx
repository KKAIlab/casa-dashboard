import { useState, useRef } from 'react'

export default function FileUploader({ onUpload, mode = 'raw' }) {
  const [dragging, setDragging] = useState(false)
  const [metadata, setMetadata] = useState({
    name: '',
    genotype: '',
    mouse_id: '',
    field_num: '1',
    group: '',
  })
  const fileRef = useRef()

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) submitFile(file)
  }

  const submitFile = async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', metadata.name || file.name.replace('.csv', ''))
    formData.append('genotype', metadata.genotype)
    if (mode === 'raw') {
      formData.append('mouse_id', metadata.mouse_id)
      formData.append('field_num', metadata.field_num)
      formData.append('group', metadata.group || metadata.genotype)
    }
    await onUpload(formData, mode)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <input
          className="border rounded-lg px-3 py-2 text-sm"
          placeholder="Dataset name"
          value={metadata.name}
          onChange={e => setMetadata(m => ({ ...m, name: e.target.value }))}
        />
        <input
          className="border rounded-lg px-3 py-2 text-sm"
          placeholder="Genotype (e.g. Het, WT, KO)"
          value={metadata.genotype}
          onChange={e => setMetadata(m => ({ ...m, genotype: e.target.value }))}
        />
        {mode === 'raw' && (
          <>
            <input
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="Mouse ID (e.g. Het_01)"
              value={metadata.mouse_id}
              onChange={e => setMetadata(m => ({ ...m, mouse_id: e.target.value }))}
            />
            <input
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="Field number"
              value={metadata.field_num}
              onChange={e => setMetadata(m => ({ ...m, field_num: e.target.value }))}
            />
          </>
        )}
      </div>
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => e.target.files[0] && submitFile(e.target.files[0])}
        />
        <p className="text-gray-500">
          {mode === 'raw'
            ? 'Drop raw CASA CSV here (Shift-JIS or UTF-8)'
            : 'Drop pre-processed CSV here (with t-SNE + Cluster columns)'}
        </p>
      </div>
    </div>
  )
}
