export const getLoginStatusMessage = (t, errorCode) => {
    switch (errorCode) {
        case 200:
            return t('login.welcome')
        case 400:
        case 401:
        case 403:
        case 422:
            return t("login.email and password don't match")
        case 500:
            return t('login.something went wrong on our end, please try again later')
        default:
            return ''
    }
}

export const getSignupStatusMessage = (t, errorCode) => {
    switch (errorCode) {
        case 200:
        case 201:
            return t('login.welcome')
        case 401:
        case 403:
            return t('login.email has already been taken')
        case 422:
            return t('login.email address or password is invalid')
        case 500:
            return t('login.something went wrong on our end, please try again later')
        default:
            return ''
    }
}
