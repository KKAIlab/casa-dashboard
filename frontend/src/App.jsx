import { lazy, Suspense, Component, useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import DataManagement from './pages/DataManagement'
import { useDB } from './hooks/useDB'
import { useEngine } from './hooks/useEngine'

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

// Load the bundled WHO human references into IndexedDB on first launch so
// users can train the Cross-Species fertility axis without first clicking
// through the Data Management page. Runs at most once per browser profile
// (skipped when a dataset with the same mouseId already exists).
function StartupLoader() {
  const db = useDB()
  const engine = useEngine()
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const base = import.meta.env.BASE_URL || '/'
        const res = await fetch(`${base}references/manifest.json`)
        if (!res.ok) return
        const { references = [] } = await res.json()
        const existing = await db.getDatasets()
        const have = new Set(existing.map(d => d.mouseId))
        for (const ref of references) {
          if (cancelled) return
          if (have.has(ref.id)) continue
          await engine.importFromURL(`${base}references/${ref.file}`, {
            name: ref.name, genotype: ref.group, group: ref.group, mouseId: ref.id,
          })
        }
      } catch {
        // Silent: auto-load is a convenience, not a hard requirement.
      }
    }
    run()
    return () => { cancelled = true }
  }, [])
  return null
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <StartupLoader />
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
