/* eslint-disable class-methods-use-this */

/**
 * Base class for all types of scene items.
 */
export abstract class BaseItem {
  isFurnitureItem() {
    return false;
  }

  isArtItem() {
    return false;
  }

  isGhostItem() {
    return false;
  }

  isStackableSurfaceItem() {
    return false;
  }
}
