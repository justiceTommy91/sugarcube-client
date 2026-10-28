import fetch from 'services'
import type { Status } from 'models/support'

export const getStatus = () => fetch<Status>('/status/')
