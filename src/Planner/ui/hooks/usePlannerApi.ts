import { useMemo } from 'react'

import { usePlannerContext } from 'Planner/ui/components/PlannerContext'

export const usePlannerApi = () => {
  const { plannerApi } = usePlannerContext()

  return useMemo(() => ({
    plannerApi,
  }), [plannerApi])
}
