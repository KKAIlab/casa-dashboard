import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import DataManagement from './pages/DataManagement'
import Analysis from './pages/Analysis'
import Prediction from './pages/Prediction'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/data" element={<DataManagement />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/prediction" element={<Prediction />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
