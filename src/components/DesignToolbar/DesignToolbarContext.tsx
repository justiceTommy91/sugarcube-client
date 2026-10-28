import React, { createContext, useContext, useRef } from 'react'

type DesignToolbarContextValue = {
    toolbarRef: React.RefObject<HTMLDivElement>
}

const DesignToolbarContext = createContext<DesignToolbarContextValue>({
    toolbarRef: React.createRef<HTMLDivElement>(),
})

export const useDesignToolbarContext = () => useContext(DesignToolbarContext)

export const DesignToolbarContextProvider = ({ children }: React.PropsWithChildren): React.ReactElement => {
    const toolbarRef = useRef<HTMLDivElement>(null)

    const value = React.useMemo(() => ({ toolbarRef }), [])

    return <DesignToolbarContext.Provider value={value}>{children}</DesignToolbarContext.Provider>
}
