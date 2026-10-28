/* eslint-disable */

/*
MIT License

Copyright (c) 2016 zeroseven design studios GmbH

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

https://github.com/zeroseven/react-screen-orientation/
*/

import React, { Children, Component } from 'react'
import PropTypes from 'prop-types'
import { getWindow } from 'models/location/selectors'

export class Orientation extends Component {
    render() {
        const { orientation, children, className } = this.props
        return <div className={`${className} react-orientation react-orientation--${orientation}`}>{children}</div>
    }
}

Orientation.propTypes = {
    alwaysRender: PropTypes.bool,
    children: PropTypes.node,
    className: PropTypes.string,
    orientation: PropTypes.oneOf(['portrait', 'landscape']).isRequired,
}

Orientation.defaultProps = {
    className: '',
    alwaysRender: true,
}

const noop = () => false

if (getWindow().screen) {
    window.screen.lockOrientationUniversal =
        window.screen.lockOrientation || window.screen.mozLockOrientation || window.screen.msLockOrientation
}

const lock = (orientation) => {
    const { screen } = getWindow()
    if (screen?.orientation && typeof screen.orientation.lock === 'function') {
        return window.screen.orientation.lock(orientation)
    } else if (screen?.lockOrientationUniversal) {
        return new Promise((resolve, reject) => {
            if (screen.lockOrientationUniversal(orientation)) {
                resolve()
            } else {
                reject()
            }
        })
    } else {
        return new Promise((resolve, reject) => reject())
    }
}

export default class DeviceOrientation extends Component {
    constructor(props) {
        super(props)
        this.lockOrientation(props)
        this.onOrientationChange = this.onOrientationChange.bind(this)

        this.state = {
            orientation: null,
            type: null,
            angle: null,
        }
    }

    componentWillMount() {
        this.onOrientationChange(null)
    }

    componentDidMount() {
        console.log('DeviceOrientation', 'componentDidMount')
        if (getWindow().screen?.orientation && 'onchange' in window.screen.orientation) {
            console.log('Using screen.orientation.onchange')
            window.screen.orientation.addEventListener('change', this.onOrientationChange)
        } else if ('onorientationchange' in getWindow()) {
            console.log('Using window.onorientationchange')
            window.addEventListener('orientationchange', this.onOrientationChange)
        } else {
            console.warn('No orientationchange events')
        }
    }

    componentWillUnmount() {
        console.log('DeviceOrientation', 'componentWillUnmount')
        if (getWindow().screen?.orientation && 'onchange' in window.screen.orientation) {
            console.log('Removing screen.orientation.onchange')
            window.screen.orientation.removeEventListener('change', this.onOrientationChange)
        } else if ('onorientationchange' in getWindow()) {
            console.log('Removing window.onorientationchange')
            window.removeEventListener('orientationchange', this.onOrientationChange)
        }
    }

    onOrientationChange(event) {
        const onOrientationChange = this.props.onOrientationChange || noop
        var orientation = 'portrait'
        var type = 'primary'
        var angle = 0
        if (getWindow().orientation) {
            angle = window.orientation
            orientation = Math.abs(angle) === 90 ? 'landscape' : 'portrait'
        }

        if (getWindow().screen.orientation) {
            ;[orientation, type] = window.screen.orientation.type.split('-')
            angle = window.screen.orientation
        }
        this.setState({
            orientation,
            type,
            angle,
        })
        onOrientationChange(orientation, type, angle)
    }

    lockOrientation({ lockOrientation }) {
        if (typeof lockOrientation !== 'string') {
            return
        }
        const onLockOrientation = this.props.onLockOrientation || noop
        return lock(lockOrientation)
            .then(function () {
                onLockOrientation(true)
            })
            .catch(function () {
                onLockOrientation(false)
            })
    }

    render() {
        const { children, className } = this.props
        const { orientation } = this.state
        return (
            <div className={`${className}`}>
                {Children.map(children, (child) => {
                    const { props } = child
                    if (props.alwaysRender || props.orientation === orientation) {
                        return child
                        // } else {
                        //   console.log('Skipping child', child)
                    }
                })}
            </div>
        )
    }
}

// https://developer.mozilla.org/en-US/docs/Web/API/screen/lockOrientation
const LOCK_ORIENTATIONS = [
    'portrait-primary',
    'portrait-secondary',
    'landscape-primary',
    'landscape-secondary',
    'portrait',
    'landscape',
    'default',
]

const isOrientation = (props, propName, componentName, location, propFullName) => {
    const propValue = props[propName]
    if (propValue.type !== Orientation) {
        return new Error(
            `Invalid ${location} '${propFullName}' supplied to '${componentName}', expected 'Orientation' component.`,
        )
    }
}

DeviceOrientation.propTypes = {
    children: PropTypes.oneOfType([isOrientation, PropTypes.arrayOf(isOrientation)]).isRequired,
    className: PropTypes.string,
    lockOrientation: PropTypes.oneOfType([
        PropTypes.oneOf(LOCK_ORIENTATIONS),
        PropTypes.arrayOf(PropTypes.oneOf(LOCK_ORIENTATIONS)),
    ]),
    onLockOrientation: PropTypes.func,
    onOrientationChange: PropTypes.func,
}

DeviceOrientation.defaultProps = {
    className: '',
}
