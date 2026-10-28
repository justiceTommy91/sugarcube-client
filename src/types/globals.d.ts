type Constructor<T> = T extends { new (...args: infer Args): infer Ret } ? { new (...args: Args): Ret } : never

declare global {
    type AppState = 'mounted' | 'interactive'
    type UserType = 'anonymous' | 'guest' | 'individual' | 'business'

    function overrideWorker(WorkerCtor: Constructor<typeof Worker>): void

    function onStateChange(namespace: 'app', callback: (state: AppState) => void): void
    function onStateChange(namespace: string, callback: (state: unknown) => void): void
    function setState(namespace: 'app', state: AppState): void
    function setState(namespace: string, state: unknown): void

    var MSStream: unknown
    var globalRendererSessionId: string | null
    var globalPlannerSessionId: string | null
    var globalPlannerSessionStart: number | null
    var activeSceneUuid: string | null | undefined
    var activeCompositionUuid: string | null | undefined
    var activeRoomSourceType: string | null | undefined

    // Tracking {{{
    var sendEvent: (data: {
        event_category: string
        event_action: string
        event_label: string
        custom?: Record<string, string>
    }) => void | undefined
    var appType: string
    var appEnvironment: string
    var appMode: string
    var appPartnerId: string
    var appStoreId: string
    var testCycleId: string
    var userType: UserType
    var isAstroPage: boolean
    // }}}

    var kreativ:
        | {
              Worker?: typeof window.Worker
          }
        | undefined
}

export {}
