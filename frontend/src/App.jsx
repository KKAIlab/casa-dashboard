import { lazy, Suspense, Component } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import DataManagement from './pages/DataManagement'

const Analysis = lazy(() => import('./pages/Analysis'))
const Prediction = lazy(() => import('./pages/Prediction'))
const CrossSpecies = lazy(() => import('./pages/CrossSpecies'))

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (<div style={{ padding: 40, color: 'red' }}><h2>Something went wrong</h2><pre>{this.state.error.message}</pre><pre>{this.state.error.stack}</pre></div>)
    }
    return this.props.children
  }
}

const Loading = () => <div className="p-6 text-gray-400">Loading...</div>

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/data" element={<DataManagement />} />
              <Route path="/analysis" element={<Suspense fallback={<Loading />}><Analysis /></Suspense>} />
              <Route path="/cross-species" element={<Suspense fallback={<Loading />}><CrossSpecies /></Suspense>} />
              <Route path="/prediction" element={<Suspense fallback={<Loading />}><Prediction /></Suspense>} />
            </Route>
          </Routes>
        </HashRouter>
      </AppProvider>
    </ErrorBoundary>
  )
}
