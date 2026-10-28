(function () {
    try {
        const compId = window.location.hash.replace('#', '').split('/')[0]

        let region = window.location.pathname.substring(1, 6)
        if (!['us/en', 'gb/en', 'nl/nl', 'nl/en'].includes(region)) {
            region = 'us/en'
        }

        if (compId && compId !== '-1') {
            window.compositionPreFetchLoading = true
            window.fetch('/' + region + '/ideas/sugarcube/api/compositions/' + compId + '/compiled/?geometry_type=3d,2d_wall,wall_placeable', {
                credentials: 'include',
                headers: {
                    Accept: 'application/json',
                    'Content-type': 'application/json',
                },
            })
                .then((res) => res.json())
                .then((data) => {
                    if (window.onCompositionPreFetchCallback) {
                        window.onCompositionPreFetchCallback(data)
                    } else {
                        window.compositionPreFetchData = data
                    }
                    window.compositionPreFetchLoading = false
                })
                .catch(() => {
                    if (window.onCompositionPreFetchFailedCallback) {
                        window.onCompositionPreFetchFailedCallback()
                    }
                    window.compositionPreFetchLoading = false
                })
        }
    } catch (error) {
        if (window.onCompositionPreFetchFailedCallback) {
            window.onCompositionPreFetchFailedCallback()
        }
        window.compositionPreFetchLoading = false
    }
})()
