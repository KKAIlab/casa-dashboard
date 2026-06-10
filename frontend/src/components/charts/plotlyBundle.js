// Custom partial Plotly bundle. The full plotly.js-dist build is ~4.6 MB
// because it ships every trace type (3D, mapbox, finance, sankey, ...).
// This dashboard only renders five trace types, so we start from the core
// build and register just those — dropping the WebGL globe, geo, and
// financial modules we never touch.
import Plotly from 'plotly.js/lib/core'
import scattergl from 'plotly.js/lib/scattergl'
import bar from 'plotly.js/lib/bar'
import box from 'plotly.js/lib/box'
import heatmap from 'plotly.js/lib/heatmap'
import histogram from 'plotly.js/lib/histogram'
import violin from 'plotly.js/lib/violin'

// `scatter` is already included in plotly.js/lib/core.
Plotly.register([scattergl, bar, box, heatmap, histogram, violin])

export default Plotly
