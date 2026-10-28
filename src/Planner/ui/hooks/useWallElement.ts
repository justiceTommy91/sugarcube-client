import { useCallback, useEffect, useState, useMemo } from 'react'

import { usePlannerApi } from 'Planner/ui/hooks/usePlannerApi'

export const useWallElement = (elementId: string) => {
  const { plannerApi } = usePlannerApi()
  const [elementInfo, setElementInfo] = useState(plannerApi?.getWallElementInfo(elementId) || undefined)

  const updateInfo = useCallback(() => {
    setElementInfo(plannerApi.getWallElementInfo(elementId))
  }, [elementId])

  useEffect(() => {
    updateInfo()
    plannerApi.addWallGraphObserver(updateInfo)
    return () => plannerApi.removeWallGraphObserver(updateInfo)
  }, [elementId])

  const derivedInfo = useMemo(() => {
    const topWall = elementInfo?.roomIntersections[0]
    const bottomWall = elementInfo?.roomIntersections[1]
    const leftWall = elementInfo?.roomIntersections[2]
    const rightWall = elementInfo?.roomIntersections[3]

    const leftBottom = elementInfo?.corners[0]
    const leftTop = elementInfo?.corners[1]
    const rightTop = elementInfo?.corners[2]
    const rightBottom = elementInfo?.corners[3]

    const leftMiddle = leftTop && leftBottom &&
    {
      x: 0.5 * (leftTop.x + leftBottom.x),
      y: 0.5 * (leftTop.y + leftBottom.y),
      z: 0.5 * (leftTop.z + leftBottom.z),
    }
    const rightMiddle = rightTop && rightBottom &&
    {
      x: 0.5 * (rightTop.x + rightBottom.x),
      y: 0.5 * (rightTop.y + rightBottom.y),
      z: 0.5 * (rightTop.z + rightBottom.z),
    }
    const topMiddle = rightTop && leftTop &&
    {
      x: 0.5 * (rightTop.x + leftTop.x),
      y: 0.5 * (rightTop.y + leftTop.y),
      z: 0.5 * (rightTop.z + leftTop.z),
    }
    const bottomMiddle = rightBottom && leftBottom &&
    {
      x: 0.5 * (rightBottom.x + leftBottom.x),
      y: 0.5 * (rightBottom.y + leftBottom.y),
      z: 0.5 * (rightBottom.z + leftBottom.z),
    }
    const leftDistance = leftMiddle && leftWall &&
      Math.sqrt((leftMiddle.x - leftWall.x) ** 2 +
        (leftMiddle.y - leftWall.y) ** 2 +
        (leftMiddle.z - leftWall.z) ** 2)
    const rightDistance = rightMiddle && rightWall &&
      Math.sqrt((rightMiddle.x - rightWall.x) ** 2 +
        (rightMiddle.y - rightWall.y) ** 2 +
        (rightMiddle.z - rightWall.z) ** 2)
    const topDistance = topMiddle && topWall &&
      Math.sqrt((topMiddle.x - topWall.x) ** 2 +
        (topMiddle.y - topWall.y) ** 2 +
        (topMiddle.z - topWall.z) ** 2)
    const bottomDistance = bottomMiddle && bottomWall &&
      Math.sqrt((bottomMiddle.x - bottomWall.x) ** 2 +
        (bottomMiddle.y - bottomWall.y) ** 2 +
        (bottomMiddle.z - bottomWall.z) ** 2)
    return {
      leftDistance,
      rightDistance,
      topDistance,
      bottomDistance,
    }
  }, [elementInfo])

  return {
    wallId: elementInfo?.wallId || '',
    assetUuid: elementInfo?.assetUuid,
    leftDistance: derivedInfo.leftDistance || 0.0,
    rightDistance: derivedInfo.rightDistance || 0.0,
    topDistance: derivedInfo.topDistance || 0.0,
    bottomDistance: derivedInfo.bottomDistance || 0.0,
    currentSizeX: elementInfo?.currentSize.x,
    currentSizeY: elementInfo?.currentSize.y,
    currenSizeIndex: elementInfo?.sizeMetadata?.sizeIndex || -1,
  }
}