import { useReducer } from 'react'
import { AppContext } from './appContext.js'

const initialState = {
  datasets: [],
  selectedDatasetId: null,
  loading: false,
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_DATASETS':
      return { ...state, datasets: action.payload }
    case 'SELECT_DATASET':
      return { ...state, selectedDatasetId: action.payload }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'UPDATE_DATASET': {
      const updated = state.datasets.map(d =>
        d.id === action.payload.id ? { ...d, ...action.payload } : d
      )
      return { ...state, datasets: updated }
    }
    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}
