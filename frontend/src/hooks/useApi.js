import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

export function useApi() {
  return {
    getDatasets: () => api.get('/datasets').then(r => r.data),
    getDataset: (id) => api.get(`/dataset/${id}`).then(r => r.data),
    uploadFile: (formData) => api.post('/upload', formData).then(r => r.data),
    importFile: (formData) => api.post('/import', formData).then(r => r.data),
    deleteDataset: (id) => api.delete(`/dataset/${id}`).then(r => r.data),
    triggerAnalysis: (id) => api.post(`/analyze/${id}`).then(r => r.data),
    getAnalysis: (id) => api.get(`/analysis/${id}`).then(r => r.data),
    getChartData: (id, type) => api.get(`/visualize/${id}/${type}`).then(r => r.data),
    compareDatasets: (ids) => api.post('/compare', ids).then(r => r.data),
    predict: (id, modelType) => api.post(`/predict/${id}`, { model_type: modelType }).then(r => r.data),
    exportCsv: (id) => `/api/export/${id}`,
  }
}
