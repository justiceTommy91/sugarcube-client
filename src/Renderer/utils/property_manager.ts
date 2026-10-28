import * as THREE from 'three'

/* eslint-disable @typescript-eslint/no-explicit-any */
type ChangeType = {
  obj: any
  prop: string
  originalValue: any
}

type MethodKeys<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];
type MethodArgs<
  T extends object,
  K extends MethodKeys<T>
> = T[K] extends (...args: infer A) => any ? A : never;
/* eslint-enable @typescript-eslint/no-explicit-any */

type Keys<T> = keyof T;
type RelatedTable<T> = { [K in Keys<T>]?: Keys<T> }
const sceneRevertMethods: RelatedTable<THREE.Scene> = {
  add: 'remove',
};
const object3dRevertMethods: RelatedTable<THREE.Object3D> = {
  add: 'remove',
};

// Tracks objects' property changes through a changesStack, and
// provides an API to revert those changes to initial value.
class PropertyManager {
  private changesStack: ChangeType[] = []

  private hasChanges() {
    return this.changesStack.length > 0
  }

  private preparePropertyForChange<T extends object, K extends keyof T>(obj: T, prop: K) {
    if (!obj || !(prop in obj)) {
      return false
    }

    let originalValue = obj[prop]
    if (originalValue instanceof THREE.Vector3) {
      originalValue = originalValue.clone() as T[K]
    } else if (originalValue instanceof THREE.Color) {
      originalValue = originalValue.clone() as T[K]
    }
    
    this.changesStack.push({ obj, prop: prop as string, originalValue })
    return true
  }

  private prepareForMethodCall<T extends object, K extends MethodKeys<T>, A extends MethodArgs<T, K>>
  (obj: T, prop: K, ...args: A) {
    let revertMethodKey
    if (obj instanceof THREE.Scene) {
      revertMethodKey = sceneRevertMethods[prop as keyof THREE.Scene]
    } else if (obj instanceof THREE.Object3D) {
      revertMethodKey = object3dRevertMethods[prop as keyof THREE.Object3D]
    }

    if (!revertMethodKey) {
      return false
    }
    this.changesStack.push({ obj, prop: revertMethodKey as string, originalValue: args })
    return true
  }

  // eslint-disable-next-line class-methods-use-this
  private setProperty<T extends object, K extends keyof T>(obj: T, prop: K, newValue: T[K]) {
    const originalValue = obj[prop]
    if (originalValue instanceof Function) {
      originalValue.apply(obj, newValue as MethodArgs<T, MethodKeys<T>>)
    } else if (originalValue instanceof THREE.Vector3 && newValue instanceof THREE.Vector3) {
      originalValue.copy(newValue)
    } else if (originalValue instanceof THREE.Color && newValue instanceof THREE.Color) {
      originalValue.copy(newValue)
    } else {
      obj[prop] = newValue
    }

    if (obj instanceof THREE.Material && prop.toString().includes('map')) {
      obj.needsUpdate = true
    }
  }

  public applyPropertyChange<T extends object, K extends keyof T>(obj: T, prop: K, newValue: T[K]) {
    if (this.preparePropertyForChange(obj, prop)) {
      this.setProperty(obj, prop, newValue)
    }
  }

  public applyMethod<T extends object, K extends MethodKeys<T>, A extends MethodArgs<T, K>>
  (obj: T, prop: K, ...args: A) {
    if (this.prepareForMethodCall(obj, prop, ...args)) {
      this.setProperty(obj, prop, args as T[K])
    }
  }

  public revertChanges() {
    if (!this.hasChanges()) {
      return
    }

    this.changesStack.reverse().forEach(({ obj, prop, originalValue }) => {
      this.setProperty(obj, prop, originalValue)
    })
    this.changesStack.length = 0
  }
}

export default PropertyManager