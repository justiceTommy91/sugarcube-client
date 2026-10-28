type TemplateVertex = {
  id: number
  position: { x: number, y: number }
}

type TemplateWall = {
  id: number
  vertices: number[]
}

type RoomTemplate = {
  walls: TemplateWall[]
  vertices: TemplateVertex[]
}

const isTemplate = (obj: object): obj is RoomTemplate => `vertices` in obj && `walls` in obj

export const collectClockwiseLoop = (template: object) => {
  const ret: {
    vertices: TemplateVertex[]
    walls: TemplateWall[]
  } = {
    vertices: [],
    walls: [],
  }
  if (!isTemplate(template)) {
    return ret
  }

  const startingWall = template.walls[0]
  if (!startingWall) {
    return ret
  }
  const startingVertex = template.vertices.find(v => v.id === startingWall.vertices[0])
  if (!startingVertex) {
    return ret
  }

  const verticesWalls = new Map<number, number[]>()
  template.vertices.forEach((vertex) => {
    const walls: number[] = []
    verticesWalls.set(vertex.id, walls)
    template.walls.forEach((wall) => {
      if (wall.vertices.includes(vertex.id)) {
        walls.push(wall.id)
      }
    })
  })
  const loopStartVertex = startingVertex
  const verticesLoop: TemplateVertex[] = [loopStartVertex]
  const wallsLoop: TemplateWall[] = [startingWall]

  let nextVertex: TemplateVertex | undefined = startingVertex
  let nextWall: TemplateWall | undefined = startingWall
  // The loop may close in the middle of sequence, e.g. 0-1-2-3-4-2.
  let startIndex = 0
  do {
    const nextVertexId: number | undefined = nextVertex.id === nextWall.vertices[0]
      ? nextWall.vertices[1]
      : nextWall.vertices[0]
    nextVertex = nextVertexId !== undefined ? template.vertices.find(v => v.id === nextVertexId) : undefined
    if (nextVertex) {
      if (verticesLoop.includes(nextVertex)) {
        // Loop is closed, stop now.
        startIndex = verticesLoop.indexOf(nextVertex)
        nextVertex = undefined
      } else {
        verticesLoop.push(nextVertex)
        const vertexWalls: number[] = verticesWalls.get(nextVertex.id) ?? []
        const nextWallId: number | undefined = nextWall.id === vertexWalls[0] ? vertexWalls[1] : vertexWalls[0]
        nextWall = nextWallId !== undefined ? template.walls.find(w => w.id === nextWallId) : undefined
        if (nextWall) {
          wallsLoop.push(nextWall)
        }
      }
    } else {
      nextWall = undefined
      verticesLoop.length = 0
    }
  } while (nextVertex && nextWall)
  ret.vertices = verticesLoop.slice(startIndex, verticesLoop.length)
  ret.walls = wallsLoop
  return ret
}