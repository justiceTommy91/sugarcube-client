
# Usage

## Strongly typed affine geometry

The types and classes in this folder are based on the principles of coordinate-free affine geometry. For a formal introduction, see: [Three-Dimensional Computer Graphics; A Coordinate-Free Approach](https://graphics.pixar.com/people/derose/publications/GeometryBook/paper.pdf). (Go to chapter 3.)

Loosely, a point is a location in space and a vector is a displacement and a direction. They are not the same. For instance, you cannot add two points. (What would it mean to add two locations in space?) But you can add a vector to a point to get another point.

Example:
``` typescript
  const lowerLeftCorner = new Point3(0, 0, 0);
  const roomHeightVector = new Vector3(0, roomHeight, 0);
  const upperLeftCorner = Point3.add(lowerLeftCorner, roomHeightVector);
```

## Designed for efficiency
Obviously, creating Point and Vector every time a constant or temporary geometric value is needed is not desirable. Likewise, we don't want to create new instance for the result of each operation. Instead, the geometry types offer two alternatives.

#### POD
Geometric types have POD counterparts (POD stands for Plain Old Data). For instance, ```Point3``` has ```Point3Pod```. POD types have the same shape as their corresponding type, but are plain objects. They are useful, for instance, when quick constants are needed.

``` typescript
// Offset a point: bad example
function offsetByDelta(q: Point3, deltaX: number, deltaY: number, deltaZ: number):Point3 {
  // Vector delta is created and then discarded immediately after the add.
  const delta = new Vector3(deltaX, deltaY, deltaZ);
  return Point3.add(q, delta);
}

// Offset a point: good example
function offsetByDelta(q: Point3, deltaX: number, deltaY: number, deltaZ: number):Point3 {
  // Use Vector3Pod for delta.
  return Point3.add(q, { dx: deltaX, dy:deltaY, dz:deltaZ });
}
```

POD types have the same shape as their corresponding types. So, for instance, if you have a Point3 you can pass it as parameter to a function that takes a Point3Pod.

#### In-place operations
Let's say you need to compute q = p + v, where p is a Point3 and v is a Vector3. There are two ways to do so:

``` typescript
const p: Point3 = ...
const v: Vector3 = ...
// If you need p unchanged: create a new instance to receive q
const q = Point3.add(p, v);

// If you no longer need p after the addition:
const q = p.plus(v);
// Variable q is an alias for p. You could also write:
p.plus(v);  // and use p instead of q.
```

#### Chaining
In-place operators return ```this``` for easy chaining. For example, to compute q = p + v + w, you can simply write ``` p.plus(v).plus(w) ```

``` typescript
// Chaining operations
const p: Point3 = ...
const v: Vector3 = ...
const w: Vector3 = ...
const q = p.plus(v).plus(w);
```

## Not complete
This is not a complete geometry library; it's only the beginning of one. Types are missing (e.g. matrices). Operations are missing (e.g. cross product on 3D vectors). If something you need is not there, add it. But as you do so, follow a few rules:

1. Respect the affine-geometry paradigm and strong typing. I.e. a point is not a vector. A vector is not a point. Etc.
1. Document what you add.
1. Follow the rule of good library design: make it easy to use it correctly, make it hard to use it incorrectly.
1. Strike the right balance between convenience and efficiency.
1. Limit or exclude dependencies on other libraries. For example, do not introduce operations with three-js types. If this is needed it can be implemented somewhere else. We should be able to pull this library as-is and use it in another project. (Unfortunately, this rule is broken already, for historical reason.)
1. And if you decide to deliberately break these rules, well... wait until georges is gone.

