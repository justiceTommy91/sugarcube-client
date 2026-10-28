import type { Showroom } from 'models/showrooms'
import { TAGS } from 'models/showrooms/constants'
import fetch from 'services'

export const getShowroomSlots = (page: string) => fetch(`/showroomslots/?page=${page}`)

export const getDashboardShowrooms = () => fetch<Showroom[]>(`/showrooms/?tag=${TAGS.DASHBOARD}`)

export const getShowroomsByTag = (tag: (typeof TAGS)[keyof typeof TAGS]) => fetch<Showroom[]>(`/showrooms/?tag=${tag}`)
