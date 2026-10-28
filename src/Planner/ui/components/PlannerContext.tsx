import React, {
    useLayoutEffect,
    PropsWithChildren,
    useMemo,
    createContext,
    useContext,
  } from 'react'
  
  import { PlannerApi } from 'Planner/planner_api'
  import { RoomInfo } from 'Planner/api_types'
  import { API_NOT_INITIALIZED } from 'Planner/api_constants'
  
  type PlannerState = {
    plannerApi: PlannerApi
  }
  const PlannerContext = createContext<PlannerState>({ plannerApi: PlannerApi.getInstance() })
  
  type PlannerContextProps = {
    roomInfo?: RoomInfo
  }
  
  export const PlannerContextProvider = ({ roomInfo, children }: PropsWithChildren<PlannerContextProps>) => {
    const plannerApi = PlannerApi.getInstance()
    const cachedProps = useMemo(() => ({ plannerApi }), [plannerApi])

    useLayoutEffect(() => {
      if (plannerApi && roomInfo) {
        if (plannerApi.getState() !== API_NOT_INITIALIZED) {
          plannerApi.shutdown()
        }
        plannerApi.initialize(roomInfo)
      }
      return (() => plannerApi.shutdown())
    }, [roomInfo])

    return (
      <PlannerContext.Provider value={cachedProps}>
        {children}
      </PlannerContext.Provider>
    )
  }
  
  export const usePlannerContext = () => {
    const context = useContext(PlannerContext)
    if (context === undefined) {
      throw new Error('usePlannerContext must be used within a PlannerContextProvider');
    }
    return context
  }