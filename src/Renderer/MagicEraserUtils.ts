/* vim: set sw=2: */
/* eslint-disable no-plusplus */
/* eslint-disable no-continue */

interface SegsData {
  w: number
  h: number
  pixels: Uint8Array
  numSegments: number
}

interface Plane {
  class: string,
  d: number,
  rot: [[number]],
}

export function computeEraseRegionGridPoints(segsData : SegsData) {
  const bboxes = new Map()

  for (let j = 0; j < segsData.h; j += 1) {
    for (let i = 0; i < segsData.w; i += 1) {
      const s = segsData.pixels[segsData.w * j + i]

      if (s === 0) continue

      if(!bboxes.get(s)) {
        bboxes.set(s, {
          minx: +Infinity,
          maxx: -Infinity,
          miny: +Infinity,
          maxy: -Infinity,
        })
      }

      const bbox = bboxes.get(s)

      if(i < bbox.minx) bbox.minx = i
      if(i > bbox.maxx) bbox.maxx = i
      if(j < bbox.miny) bbox.miny = j
      if(j > bbox.maxy) bbox.maxy = j
    }
  }

  const divs = 10

  const gridPoints = new Map()
  bboxes.forEach((bbox, s) => {
    const gp : number[][] = []

    gridPoints.set(s, gp)

    const w = bbox.maxx - bbox.minx
    const h = bbox.maxy - bbox.miny

    for (let j = 0; j < divs; j++) {
      const y = Math.round(bbox.miny + h * j / (divs - 1))

      for (let i = 0; i < divs; i++) {
        const x = Math.round(bbox.minx + w * i / (divs - 1))

        const v = segsData.pixels[segsData.w * y + x]

        if (v === s){
          gp.push([
            x / segsData.w,
            y / segsData.h
          ])
        }
      }
    }
  })

  return gridPoints
}


export function getInpaintIndexOfPlane(plane: Plane, planesInpaint: [Plane]) {
  if (!planesInpaint)
    return -1;
  
  return planesInpaint.findIndex((currentPlane) => {
    const m = plane.rot.flat()
    const mCurrent = currentPlane.rot.flat()    
    if (m.length !== mCurrent.length) return false
    if (currentPlane.class !== plane.class) return false

    /* eslint-disable eqeqeq */
    if (currentPlane.d != plane.d) return false    
    if (m.some((el, i) => el != mCurrent[i])) return false
    /* eslint-enable eqeqeq */
    
    return true
  })
}