import UAParser from 'ua-parser-js'

const parser = new UAParser()

export const getHardwareInfo = () => ({
    model: parser.getDevice().model,
    type: parser.getDevice().type,
    vendor: parser.getDevice().vendor,
    os: parser.getOS(),
    cpu: parser.getCPU(),
})

export default getHardwareInfo
