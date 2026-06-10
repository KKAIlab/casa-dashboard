import factoryModule from 'react-plotly.js/factory'
import Plotly from './plotlyBundle.js'

const createPlotlyComponent = factoryModule.default || factoryModule
const Plot = createPlotlyComponent(Plotly)
export default Plot
