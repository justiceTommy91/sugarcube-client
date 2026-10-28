import isMobile from 'utils/isMobile'

export default () => {
    if (isMobile()) {
        return Math.max(window.screen.width, window.screen.height) * (window.devicePixelRatio || 1)
    }
    return Math.max(window.innerWidth, window.innerHeight)
}
