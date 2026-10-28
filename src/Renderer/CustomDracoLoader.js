import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'

class CustomDRACOLoader extends DRACOLoader {
    decodeGeometry(buffer, taskConfig) {
        const startTime = window.performance.now()
        // eslint-disable-next-line no-restricted-syntax, guard-for-in
        for ( const attribute in taskConfig.attributeTypes ) {
            const type = taskConfig.attributeTypes[ attribute ];
            if ( type.BYTES_PER_ELEMENT !== undefined ) {
                // eslint-disable-next-line no-param-reassign
                taskConfig.attributeTypes[ attribute ] = type.name;
            }
        } 
        const geometryPromise = super.decodeGeometry(buffer, taskConfig)
        return geometryPromise.then((geometry) => {
            const elapsed = window.performance.now() - startTime
            // eslint-disable-next-line no-param-reassign
            geometry.userData.dracoDecompressStartTime = startTime
            // eslint-disable-next-line no-param-reassign
            geometry.userData.dracoDecompressEndTime = startTime + elapsed
            return geometry
        })
    }
}

export default CustomDRACOLoader
