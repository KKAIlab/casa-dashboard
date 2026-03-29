export const CASA_PARAMS = ['VCL', 'VSL', 'VAP', 'LIN', 'STR', 'WOB', 'ALH', 'BCF']

export const TSNE_FEATURES = ['VCL', 'VSL', 'ALH', 'BCF']

export const PARAM_INFO = {
  VCL: { name: 'Curvilinear Velocity', unit: 'μm/s' },
  VSL: { name: 'Straight-Line Velocity', unit: 'μm/s' },
  VAP: { name: 'Average Path Velocity', unit: 'μm/s' },
  LIN: { name: 'Linearity', unit: '' },
  STR: { name: 'Straightness', unit: '' },
  WOB: { name: 'Wobble', unit: '' },
  ALH: { name: 'Lateral Head Displacement', unit: 'μm' },
  BCF: { name: 'Beat Cross Frequency', unit: 'Hz' },
}

export const CLUSTER_COLORS = ['#4DBBD5', '#E64B35', '#00A087', '#3C5488', '#F39B7F']

export const ANALYSIS_STATUS = {
  pending: { label: 'Pending', color: 'text-yellow-600' },
  running: { label: 'Running', color: 'text-blue-600' },
  done: { label: 'Complete', color: 'text-green-600' },
  error: { label: 'Error', color: 'text-red-600' },
}
