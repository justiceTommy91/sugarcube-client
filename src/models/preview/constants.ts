export enum PreviewError {
    SERVER_ERROR = 'SERVER_ERROR',
    USER_NOT_ALLOWED = 'USER_NOT_ALLOWED',
    INVALID_MANIFEST = 'INVALID_MANIFEST',
}

export enum PreviewErrorTypeTracking {
    ServerError = 'ServerError',
    UserNotAllowed = 'UserNotAllowed',
    TooManyContextLosses = 'TooManyContextLosses',
    LowGraphicsMemory = 'LowGraphicsMemory',
    LowPerformanceDevice = 'LowPerformanceDevice',
}
