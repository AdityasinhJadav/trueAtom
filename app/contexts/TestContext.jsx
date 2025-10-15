import { createContext, useContext, useReducer, useEffect } from 'react'

const TestContext = createContext()

const initialState = {
  tests: [],
  products: [],
  customers: [],
  currentTest: null,
  isLoading: false,
  error: null,
  lastSync: null,
}

function testReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }
    case 'SET_PRODUCTS':
      return { ...state, products: action.payload }
    case 'SET_CUSTOMERS':
      return { ...state, customers: action.payload }
    case 'SET_TESTS':
      return { ...state, tests: action.payload }
    case 'ADD_TEST':
      return { ...state, tests: [...state.tests, action.payload] }
    case 'UPDATE_TEST':
      return {
        ...state,
        tests: state.tests.map(test =>
          test.id === action.payload.id ? action.payload : test
        ),
      }
    case 'STOP_VARIATION':
      return {
        ...state,
        tests: state.tests.map(test =>
          test.id === action.payload.testId 
            ? { 
                ...test, 
                stoppedVariations: [...(test.stoppedVariations || []), action.payload.variation]
              }
            : test
        ),
      }
    case 'DELETE_TEST':
      return {
        ...state,
        tests: state.tests.filter(test => test.id !== action.payload),
      }
    case 'SET_CURRENT_TEST':
      return { ...state, currentTest: action.payload }
    case 'SET_LAST_SYNC':
      return { ...state, lastSync: action.payload }
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    default:
      return state
  }
}

export function TestProvider({ children }) {
  const [state, dispatch] = useReducer(testReducer, initialState)

  // Data is automatically synced in the background
  // Products and customers are loaded via automatic sync

  useEffect(() => {
    const checkCompletedTests = () => {
      const now = new Date()
      const updatedTests = state.tests.map(test => {
        if (test.status === 'Running' && test.createdAt && test.duration && test.durationUnit) {
          const createdAt = new Date(test.createdAt)
          let durationInMs = test.duration
          switch (test.durationUnit) {
            case 'days':
              durationInMs *= 24 * 60 * 60 * 1000
              break
            case 'weeks':
              durationInMs *= 7 * 24 * 60 * 60 * 1000
              break
            case 'months':
              durationInMs *= 30 * 24 * 60 * 60 * 1000
              break
            default:
              durationInMs *= 24 * 60 * 60 * 1000
          }
          const endTime = new Date(createdAt.getTime() + durationInMs)
          if (now >= endTime) {
            return { ...test, status: 'Completed' }
          }
        }
        return test
      })
      const hasChanges = updatedTests.some((test, index) => test.status !== state.tests[index]?.status)
      if (hasChanges) {
        dispatch({ type: 'SET_TESTS', payload: updatedTests })
      }
    }
    checkCompletedTests()
    const interval = setInterval(checkCompletedTests, 60000)
    return () => clearInterval(interval)
  }, [state.tests])

  const value = { 
    ...state, 
    dispatch
  }
  return <TestContext.Provider value={value}>{children}</TestContext.Provider>
}

export function useTest() {
  const context = useContext(TestContext)
  if (context === undefined) {
    throw new Error('useTest must be used within a TestProvider')
  }
  return context
}


