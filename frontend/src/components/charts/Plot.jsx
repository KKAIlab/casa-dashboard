import factoryModule from 'react-plotly.js/factory'
import Plotly from 'plotly.js-dist-min'

const createPlotlyComponent = factoryModule.default || factoryModule
const Plot = createPlotlyComponent(Plotly)
export default Plot
