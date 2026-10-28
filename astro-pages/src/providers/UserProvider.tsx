import React, { createContext, useContext, type ReactNode } from 'react'
import { useUser } from '@astro-hooks/useUser'
import type { UserInfo } from '@astro-services/userService'

type UserContextValue = {
    user: UserInfo | null
    isLoading: boolean
    isLoggedIn: boolean
}

const UserContext = createContext<UserContextValue>({
    user: null,
    isLoading: true,
    isLoggedIn: false,
})

export const useUserContext = () => useContext(UserContext)

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const value = useUser()
    return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}
