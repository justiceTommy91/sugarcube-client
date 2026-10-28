import React, { useState, useEffect } from 'react'
import { string, number, func } from 'prop-types'

import { useDebounce } from 'hooks'

const Textarea = ({ placeholder, value, name, onChange, debounce }) => {
    const [note, setNote] = useState('')
    const [hasTyped, setHasTyped] = useState(false)
    const debouncedNote = useDebounce(note, debounce)
    const onType = (e) => {
        setHasTyped(true)
        setNote(e.target.value)
    }
    useEffect(() => {
        setHasTyped(false)
        // Don't overwrite the local value if it's
        // basically the same
        if (note.trim() !== value) {
            setNote(value || '')
        }
    }, [value])
    useEffect(() => {
        if (hasTyped) {
            onChange({
                target: {
                    name,
                    value: debouncedNote,
                },
            })
        }
    }, [debouncedNote])

    return (
        <textarea
            placeholder={placeholder}
            value={note}
            name={name}
            onChange={onType}
            onKeyDown={(e) => e.stopPropagation()}
        />
    )
}

Textarea.defaultProps = {
    placeholder: '',
    value: '',
    name: '',
    debounce: 0,
}

Textarea.propTypes = {
    placeholder: string,
    value: string,
    name: string,
    onChange: func.isRequired,
    debounce: number,
}

export default Textarea
