import { isEmail as checkEmail, isLength, matches, isNumeric } from 'validator'

export const isEmail = (email) => checkEmail(email)

export const isPassword = (password) => isLength(password, { min: 8, max: 128 })

export const isPhoneNumber = (mobile) => matches(mobile, /[0-9]{3}([-])?[0-9]{3}([-])?[0-9]{4}/g)

export const isNumberOrDash = (mobile) => isNumeric(mobile.replace(/-/g, ''))
