import * as THREE from 'three'
import { PlacingBehavior, PlacingOptions } from 'Renderer/geomviewer/geom_constants';
import { FurnitureItemParameters, Matrix4x4, Placeables, PointXYZ } from "Renderer/geomviewer/geom_types";
import { createIdentity4, fromThreeMatrix4 } from "Renderer/geometry/utilities";
import { NumArrLen16 } from "../positioning/positioning_types";

// Helper: Convert a backend floor snap-rotation matrix to a transform that
// we can directly apply to scene geometry.
export function makeFloorModelMatrix(modelMatrix: Matrix4x4): THREE.Matrix4 {
  const mm = modelMatrix;
  const matrix = new THREE.Matrix4().set(...(mm.flat() as NumArrLen16));
  const isNineOClock = mm[1][0] === 1 && mm[0][1] === -1;
  const isThreeOClock = mm[1][0] === -1 && mm[0][1] === 1;
  if (isThreeOClock || isNineOClock) {
    const offsetX = mm[1][3];
    const offsetY = mm[0][3];
    const sign = isThreeOClock ? (-1) : (1);

    matrix.elements[1] *= (-1);
    matrix.elements[4] *= (-1);
    matrix.elements[13] = sign * offsetY;
    matrix.elements[12] = offsetX;
  }
  // Note: no translation fix is needed at 6 o'clock.

  return matrix;
}

// Helper: Convert a backend wall snap-rotation matrix to a transform that
// we can directly apply to scene geometry.
export function makeWallModelMatrix(
  modelMatrix: Matrix4x4,
  bboxMaxX: number
): THREE.Matrix4 {
  const mm = modelMatrix;
  const matrix = new THREE.Matrix4().set(...(mm.flat() as NumArrLen16));
  const isTwelveOClock = mm[0][0] === 1 && mm[1][1] === 1;
  const isNineOClock = mm[1][0] === 1 && mm[0][1] === -1;
  const isSixOClock = mm[0][0] === -1 && mm[1][1] === -1;
  const isThreeOClock = mm[1][0] === -1 && mm[0][1] === 1;

  if (isTwelveOClock) {
    matrix.elements[13] = 0; // Normal orientation: offset-y = 0; rest on floor.
  }
  if (isSixOClock) {
    matrix.elements[13] *= 2; // Flipped 180 deg: double offset-y.
  }
  if (isThreeOClock || isNineOClock) {
    const offsetX = mm[1][3]; // Flipped on side: offset-y becomes offset-x...
    const offsetY = bboxMaxX; // ... and offset-y is set to max-x from bbox.

    matrix.elements[1] *= (-1);
    matrix.elements[4] *= (-1);
    matrix.elements[13] = offsetY;
    matrix.elements[12] = offsetX;
  }

  // TODO: Z translation is currently arranged in wallPlaceable functionality (with the bbox).
  // Ideally we'd use this z translation as in the customAnchorPoints if all the placement system
  // bases were merged together. Meanwhile, removing the z from the modelMatrix so that no
  // forward translation is applied and is instead arranged by the wallPlaceable system.
  matrix.elements[14] = 0; // Offset-z.

  return matrix;
}


/**
 * SnapRotationHandler keeps track of the snap-rotation state for a given item placing
 * behavior. It is configured with Placeable data.
 */
export class SnapRotationHandler {
  // Enabled when the instance properly configured and as long as it remains
  // so through state changes.
  private enabled = false;

  // Current snap-rotation index. Note that this is the internal index, which is
  // different from the global index used in the public interface.
  private snapRotIndex = 0;

  // Currently placing behavior for the item that owns this instance.
  private placingBehavior: PlacingBehavior = PlacingBehavior.NONE;

  // List of snap rotations matrices for both the floor and wall behaviors.
  // Either of these lists may be empty.
  private snapRotations: {
    floor: THREE.Matrix4[];
    wall: THREE.Matrix4[];
  } = { floor: [], wall: [] };

  // Returns a configured SnapRotationHandler if item is snapRotatable according to <furnitureData>, undefined
  // otherwise.
  static create(furnitureData: FurnitureItemParameters) {
    const { placeables } = furnitureData
    // eslint-disable-next-line no-bitwise
    const isSnapRotatable = !!(furnitureData.placingOptions & PlacingOptions.SNAP_ROTATABLE)
    if (placeables && isSnapRotatable) {
      const snapRotIndex = furnitureData.anchorCombinationIndex || 0
      const snapRotHandler = new SnapRotationHandler()
      // eslint-disable-next-line no-bitwise
      const isWallOnly = !!(furnitureData.placingOptions & PlacingOptions.WALL_ONLY)
      const legacyPlacingBehavior = furnitureData.placingBehaviorHint ??
        (isWallOnly ? PlacingBehavior.ON_WALL : PlacingBehavior.ON_FLOOR);
      snapRotHandler.configure(placeables, furnitureData.max, legacyPlacingBehavior, snapRotIndex)
      return snapRotHandler
    }
    return undefined
  }

  // Configure the instance with the given placeables and initial parameters.
  // Returns whether the configuration is valid.
  configure(
    placeables: Placeables,  // Placeable data from furniture parameters.
    bboxMax: PointXYZ,       // Max point of item bbox.
    placingBehavior: PlacingBehavior, // Current owning item behavior.
    snapRotIndex: number, // Initial snap-rotation index.
  ): boolean {
    this.snapRotations.floor = [];
    this.snapRotations.wall = [];

    // Parse the placeable data into floor and wall snap-rotation matrices.
    placeables.anchors.forEach((anchor) => {
      if (anchor.matrixModel) {
        if (anchor.category === 'floor') {
          this.snapRotations.floor.push(makeFloorModelMatrix(anchor.matrixModel));
        } else if (anchor.category === 'wall') {
          this.snapRotations.wall.push(makeWallModelMatrix(anchor.matrixModel, bboxMax.x));
        }
      }
    });

    this.placingBehavior = placingBehavior;
    this.snapRotIndex = this.globalToLocalIndex(snapRotIndex);
    this.enabled = this.verifyConfig();

    return this.enabled;
  }

  // Update the owning-item behavior and snap-rotation index. Returns whether the
  // update is successful. The update may fail if either the new behavior or
  // snap-rotation index would leave the instance in an invalid configuration.
  // In that case, the state is left unchanged.
  update(behavior: PlacingBehavior, snapRotIndex: number): boolean {
    if (!this.enabled) {
      return false;
    }

    if (this.switchBehavior(behavior)) {
      return this.updateGlobalSnapRotIndex(snapRotIndex);
    }
    return false;
  }

  // Return the current snap-rotation index, or 0 if not enabled.
  getCurrentSnapRotationIndex(): number {
    return this.enabled ? this.localToGlobalIndex(this.snapRotIndex) : 0;
  }

  // Return the current snap-rotation matrix, or identity if not enabled.
  getCurrentSnapRotationMatrix(): THREE.Matrix4 {
    if (!this.enabled) {
      return new THREE.Matrix4();
    }

    if (this.placingBehavior === PlacingBehavior.ON_FLOOR) {
      return this.snapRotations.floor[this.snapRotIndex];
    }
    return this.snapRotations.wall[this.snapRotIndex];
  }

  // Return whether the current snap rotation is a default rotation.
  isDefaultRotation(): boolean {
    if (this.enabled) {
      return (this.snapRotIndex % 2) === 0;
    }
    return true;
  }

  // Go to the next available snap rotation for the current behavior. Returns
  // whether the snap-rotation changed.
  toNextSnapRotation(): boolean {
    if (!this.enabled) {
      return false;
    }

    let nextIndex = this.snapRotIndex - 1;
    if (this.placingBehavior === PlacingBehavior.ON_FLOOR) {
      if (nextIndex < 0) {
        nextIndex = this.snapRotations.floor.length - 1;
      }
    } else {
      if (nextIndex < 0) { // eslint-disable-line no-lonely-if
        nextIndex = this.snapRotations.wall.length - 1;
      }
    }

    const updated = nextIndex !== this.snapRotIndex;
    this.snapRotIndex = nextIndex;
    return updated;
  }

  // Gets a new instance of the Matrix4x4 snap rotation matrix from the threejs matrix.
  getCurrentSnapRotateTransform(needsPatch: boolean) {
    if (needsPatch) {
      return createIdentity4()
    }
    return fromThreeMatrix4(this.getCurrentSnapRotationMatrix())
  }

  // Update the snap-rotation index with the given global index. Returns whether
  // successful. This function will not allow the instance to get into an invalid
  // state.
  private updateGlobalSnapRotIndex(newGlobalIndex: number): boolean {
    const i = this.globalToLocalIndex(newGlobalIndex);
    if (i === this.snapRotIndex) {
      return true;
    }

    let check = false;
    if (this.placingBehavior === PlacingBehavior.ON_FLOOR) {
      check = i >= 0 && i < this.snapRotations.floor.length;
    } else {
      check = i >= 0 && i < this.snapRotations.wall.length;
    }

    if (check) {
      this.snapRotIndex = i;
    }
    return check;
  }

  // Update the owning-item behavior. Returns whether successful. This function will
  // not allow the instance to get into an invalid state. For example, it is invalid
  // to switch to a wall behavior if there are no wall-specific snap rotations.
  private switchBehavior(newBehavior: PlacingBehavior): boolean {
    if (newBehavior === this.placingBehavior) {
      return true;
    }

    if (newBehavior !== PlacingBehavior.ON_FLOOR && newBehavior !== PlacingBehavior.ON_WALL) {
      return false;
    }

    let check = false;
    if (newBehavior === PlacingBehavior.ON_FLOOR) {
      check = this.snapRotations.floor.length > 0 &&
        this.snapRotIndex < this.snapRotations.floor.length;
    } else {
      check = this.snapRotations.wall.length > 0 &&
        this.snapRotIndex < this.snapRotations.wall.length;
    }

    if (check) {
      this.placingBehavior = newBehavior;
    }
    return check;
  }

  // Returns whether the current configuration and state are valid.
  private verifyConfig(): boolean {
    if (this.placingBehavior === PlacingBehavior.ON_FLOOR) {
      return this.snapRotations.floor.length > 0 &&
        this.snapRotIndex >= 0 &&
        this.snapRotIndex < this.snapRotations.floor.length;
    }
    if (this.placingBehavior === PlacingBehavior.ON_WALL) {
      return this.snapRotations.wall.length > 0 &&
        this.snapRotIndex >= 0 &&
        this.snapRotIndex < this.snapRotations.wall.length;
    }

    return false;
  }

  // Convert i from an internal index to a global index.
  // The internal index simply keeps track of the current snap-rotation in either
  // the floor or wall snap-rotations list.
  // The global index keeps track of all snap-rotations, wall or floor, as a single
  // number and is born of legacy code.
  private globalToLocalIndex(i: number): number {
    if (this.placingBehavior === PlacingBehavior.ON_FLOOR) {
      return i;
    }
    return i - this.snapRotations.floor.length;
  }

  // Convert if from a local to a global index. (See globalToLocalIndex above.)
  private localToGlobalIndex(i: number): number {
    let globalIndex = i;
    if (this.placingBehavior === PlacingBehavior.ON_WALL) {
      globalIndex = i + this.snapRotations.floor.length;
    }
    return globalIndex;
  }

}
