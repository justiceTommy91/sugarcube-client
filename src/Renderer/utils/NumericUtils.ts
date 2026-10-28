/**
 * NumericUtils.ts
 *
 * Drop-in TypeScript replacement for the "numeric" JavaScript library.
 * Only the subset of functions actually used in this codebase is implemented.
 *
 * Source: https://github.com/sloisel/numeric  (v1.2.6)
 *
 * Portions of this code are derived from the numeric.js library:
 * Copyright (c) Sébastien Loisel
 * Licensed under the MIT License: https://opensource.org/licenses/MIT
 */

export type Vector = number[]
export type Matrix = number[][]

/** Machine epsilon for IEEE 754 double-precision (same value as numeric.epsilon). */
export const epsilon = 2.220446049250313e-16

/**
 * pythag — identical to the helper inside numeric.svd.
 * Computes sqrt(a² + b²) without overflow/underflow.
 */
function pythag(a: number, b: number): number {
    const absA = Math.abs(a)
    const absB = Math.abs(b)
    if (absA > absB) return absA * Math.sqrt(1.0 + (absB * absB / absA / absA))
    if (absB === 0.0) return absA
    return absB * Math.sqrt(1.0 + (absA * absA / absB / absB))
}

/** Euclidean (L2) norm of vector `v`.  Equivalent to numeric.norm2. */
export function norm2(v: Vector): number {
    let sum = 0
    for (let i = 0; i < v.length; i += 1) {
        sum += v[i] * v[i]
    }
    return Math.sqrt(sum)
}

/** Element-wise scalar multiplication.  Equivalent to numeric.mul(vector, scalar). */
export function mul(v: Vector, s: number): Vector {
    const out = new Array(v.length)
    for (let i = 0; i < v.length; i += 1) {
        out[i] = v[i] * s
    }
    return out
}

// ---------------------------------------------------------------------------
// Matrix operations
// ---------------------------------------------------------------------------

/** Transpose an m×n matrix.  Equivalent to numeric.transpose. */
export function transpose(A: Matrix): Matrix {
    const m = A.length
    const n = A[0].length
    const ret: Matrix = new Array(n)
    for (let j = 0; j < n; j += 1) {
        ret[j] = new Array(m)
        for (let i = 0; i < m; i += 1) {
            ret[j][i] = A[i][j]
        }
    }
    return ret
}

/** Create an n×n diagonal matrix from vector `v`.  Equivalent to numeric.diag. */
export function diag(v: Vector): Matrix {
    const n = v.length
    const D: Matrix = new Array(n)
    for (let i = 0; i < n; i += 1) {
        D[i] = new Array(n).fill(0)
        D[i][i] = v[i]
    }
    return D
}

/**
 * Matrix–matrix or matrix–vector multiplication.
 * Equivalent to numeric.dot for the 2D×2D and 2D×1D cases.
 */
export function dot(A: Matrix, B: Matrix): Matrix
export function dot(A: Matrix, b: Vector): Vector
export function dot(A: Matrix, B: Matrix | Vector): Matrix | Vector {
    const m = A.length
    const aColCount = A[0].length

    // Matrix × Vector  (numeric.dotMV)
    if (!Array.isArray(B[0])) {
        const b = B as Vector
        const out: Vector = new Array(m)
        for (let i = 0; i < m; i += 1) {
            let sum = 0
            for (let k = 0; k < aColCount; k += 1) {
                sum += A[i][k] * b[k]
            }
            out[i] = sum
        }
        return out
    }

    // Matrix × Matrix  (numeric.dotMMsmall)
    const Bmat = B as Matrix
    const p = Bmat[0].length
    const out: Matrix = new Array(m)
    for (let i = 0; i < m; i += 1) {
        out[i] = new Array(p)
        for (let j = 0; j < p; j += 1) {
            let sum = 0
            for (let k = 0; k < aColCount; k += 1) {
                sum += A[i][k] * Bmat[k][j]
            }
            out[i][j] = sum
        }
    }
    return out
}

/*
 * Compute the SVD of matrix A.  Returns `{ U, S, V }` where A = U · diag(S) · Vᵀ.
 * Ported from numeric.js src/svd.js (v1.2.6).
 *
 * Original comment from numeric.js:
 *   Shanti Rao sent me this routine by private email. I had to modify it
 *   slightly to work on Arrays instead of using a Matrix object.
 *   It is apparently translated from http://stitchpanorama.sourceforge.net/Python/svd.py
 */
export function svd(A: Matrix): { U: Matrix; S: Vector; V: Matrix } {
    // Compute the thin SVD from G. H. Golub and C. Reinsch, Numer. Math. 14, 403-420 (1970)
    const prec = epsilon // Math.pow(2,-52) // assumes double prec
    const tolerance = 1.e-64 / prec
    const itmax = 50

    const u: Matrix = A.map(row => [...row])
    const m = u.length
    const n = u[0].length

    if (m < n) {
        const result = svd(transpose(A))
        return { U: result.V, S: result.S, V: result.U }
    }

    const e = new Array<number>(n)
    const q = new Array<number>(n)
    for (let i = 0; i < n; i += 1) {
        e[i] = 0.0
        q[i] = 0.0
    }
    const v: Matrix = Array.from({ length: n }, () => new Array(n).fill(0))
    // v.zero();

    // Householder's reduction to bidiagonal form

    let f = 0.0
    let g = 0.0
    let h = 0.0
    let x = 0.0
    let y = 0.0
    let z = 0.0
    let s = 0.0
    let l = 0

    for (let i = 0; i < n; i += 1) {
        e[i] = g
        s = 0.0
        l = i + 1
        for (let j = i; j < m; j += 1) s += (u[j][i] * u[j][i])
        if (s <= tolerance) {
            g = 0.0
        } else {
            f = u[i][i]
            g = Math.sqrt(s)
            if (f >= 0.0) g = -g
            h = f * g - s
            u[i][i] = f - g
            for (let j = l; j < n; j += 1) {
                s = 0.0
                for (let k = i; k < m; k += 1) s += u[k][i] * u[k][j]
                f = s / h
                for (let k = i; k < m; k += 1) u[k][j] += f * u[k][i]
            }
        }
        q[i] = g
        s = 0.0
        for (let j = l; j < n; j += 1) s += u[i][j] * u[i][j]
        if (s <= tolerance) {
            g = 0.0
        } else {
            f = u[i][i + 1]
            g = Math.sqrt(s)
            if (f >= 0.0) g = -g
            h = f * g - s
            u[i][i + 1] = f - g
            for (let j = l; j < n; j += 1) e[j] = u[i][j] / h
            for (let j = l; j < m; j += 1) {
                s = 0.0
                for (let k = l; k < n; k += 1) s += (u[j][k] * u[i][k])
                for (let k = l; k < n; k += 1) u[j][k] += s * e[k]
            }
        }
        y = Math.abs(q[i]) + Math.abs(e[i])
        if (y > x) x = y
    }

    // accumulation of right hand gtransformations
    for (let i = n - 1; i !== -1; i -= 1) {
        if (g !== 0.0) {
            h = g * u[i][i + 1]
            for (let j = l; j < n; j += 1) v[j][i] = u[i][j] / h
            for (let j = l; j < n; j += 1) {
                s = 0.0
                for (let k = l; k < n; k += 1) s += u[i][k] * v[k][j]
                for (let k = l; k < n; k += 1) v[k][j] += (s * v[k][i])
            }
        }
        for (let j = l; j < n; j += 1) {
            v[i][j] = 0
            v[j][i] = 0
        }
        v[i][i] = 1
        g = e[i]
        l = i
    }

    // accumulation of left hand transformations
    for (let i = n - 1; i !== -1; i -= 1) {
        l = i + 1
        g = q[i]
        for (let j = l; j < n; j += 1) u[i][j] = 0
        if (g !== 0.0) {
            h = u[i][i] * g
            for (let j = l; j < n; j += 1) {
                s = 0.0
                for (let k = l; k < m; k += 1) s += u[k][i] * u[k][j]
                f = s / h
                for (let k = i; k < m; k += 1) u[k][j] += f * u[k][i]
            }
            for (let j = i; j < m; j += 1) u[j][i] /= g
        } else {
            for (let j = i; j < m; j += 1) u[j][i] = 0
        }
        u[i][i] += 1
    }

    // diagonalization of the bidiagonal form
    const precX = prec * x
    for (let k = n - 1; k !== -1; k -= 1) {
        for (let iteration = 0; iteration < itmax; iteration += 1) {
            // test f splitting
            let testConvergence = false
            for (l = k; l !== -1; l -= 1) {
                if (Math.abs(e[l]) <= precX) {
                    testConvergence = true
                    break
                }
                if (Math.abs(q[l - 1]) <= precX) break
            }
            if (!testConvergence) {
                // cancellation of e[l] if l>0
                let c = 0.0
                s = 1.0
                const l1 = l - 1
                for (let i = l; i < k + 1; i += 1) {
                    f = s * e[i]
                    e[i] *= c
                    if (Math.abs(f) <= precX) break
                    g = q[i]
                    h = pythag(f, g)
                    q[i] = h
                    c = g / h
                    s = -f / h
                    for (let j = 0; j < m; j += 1) {
                        y = u[j][l1]
                        z = u[j][i]
                        u[j][l1] = y * c + (z * s)
                        u[j][i] = -y * s + (z * c)
                    }
                }
            }
            // test f convergence
            z = q[k]
            if (l === k) {
                // convergence
                if (z < 0.0) {
                    // q[k] is made non-negative
                    q[k] = -z
                    for (let j = 0; j < n; j += 1) v[j][k] = -v[j][k]
                }
                break  // break out of iteration loop and move on to next k value
            }
            if (iteration >= itmax - 1) {
                throw new Error('Error: no convergence.')
            }
            // shift from bottom 2x2 minor
            x = q[l]
            y = q[k - 1]
            g = e[k - 1]
            h = e[k]
            f = ((y - z) * (y + z) + (g - h) * (g + h)) / (2.0 * h * y)
            g = pythag(f, 1.0)
            if (f < 0.0) {
                f = ((x - z) * (x + z) + h * (y / (f - g) - h)) / x
            } else {
                f = ((x - z) * (x + z) + h * (y / (f + g) - h)) / x
            }
            // next QR transformation
            let c = 1.0
            s = 1.0
            for (let i = l + 1; i < k + 1; i += 1) {
                g = e[i]
                y = q[i]
                h = s * g
                g *= c
                z = pythag(f, h)
                e[i - 1] = z
                c = f / z
                s = h / z
                f = x * c + g * s
                g = -x * s + g * c
                h = y * s
                y *= c
                for (let j = 0; j < n; j += 1) {
                    x = v[j][i - 1]
                    z = v[j][i]
                    v[j][i - 1] = x * c + z * s
                    v[j][i] = -x * s + z * c
                }
                z = pythag(f, h)
                q[i - 1] = z
                c = f / z
                s = h / z
                f = c * g + s * y
                x = -s * g + c * y
                for (let j = 0; j < m; j += 1) {
                    y = u[j][i - 1]
                    z = u[j][i]
                    u[j][i - 1] = y * c + z * s
                    u[j][i] = -y * s + z * c
                }
            }
            e[l] = 0.0
            e[k] = f
            q[k] = x
        }
    }

    // vt= transpose(v)
    // return (u,q,vt)
    for (let i = 0; i < q.length; i += 1) {
        if (q[i] < precX) q[i] = 0
    }

    // sort eigenvalues
    for (let i = 0; i < n; i += 1) {
        // writeln(q)
        for (let j = i - 1; j >= 0; j -= 1) {
            if (q[j] < q[i]) {
                //  writeln(i,'-',j)
                let temp = q[j]; q[j] = q[i]; q[i] = temp
                for (let k = 0; k < u.length; k += 1) { temp = u[k][i]; u[k][i] = u[k][j]; u[k][j] = temp }
                for (let k = 0; k < v.length; k += 1) { temp = v[k][i]; v[k][i] = v[k][j]; v[k][j] = temp }
                // u.swapCols(i,j)
                // v.swapCols(i,j)
                i = j
            }
        }
    }

    return { U: u, S: q, V: v }
}
