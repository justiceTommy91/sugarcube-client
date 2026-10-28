import type { RootState } from 'store'

export const getHomeProjectId = (state: RootState): string | null => state.homeProjects.projectId
