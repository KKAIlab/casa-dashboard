import { createContext, useContext, useReducer } from 'react'

const AppContext = createContext()

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

export function useAppState() {
  return useContext(AppContext)
}
