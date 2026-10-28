export const clamp = (min: number, max: number) => (num: number) => Math.min(Math.max(num, min), max)

export const clamp01 = clamp(0, 1)

// Using approach from Numpy: https://numpy.org/doc/stable/reference/generated/numpy.isclose.html
export const floatsClose = (a: number, b: number, rtol = 1e-5, atol = 1e-8, equalNaN = false): boolean => {
  if (Number.isNaN(a) && Number.isNaN(b)) {
    return equalNaN
  }

  if (Number.isNaN(a) || Number.isNaN(b)) {
    return false
  }

  if (a === b) {
    return true
  }

  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return false
  }

  return Math.abs(a - b) <= (atol + rtol * Math.abs(b));
}
