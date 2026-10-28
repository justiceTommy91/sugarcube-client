/* eslint-disable i18next/no-literal-string */
import React from 'react'
import classNames from 'classnames'

import SSRIcon from '@ingka/ssr-icon'
import crossCircle from '@ingka/ssr-icon/paths/cross-circle'
import arrowDownToBase from '@ingka/ssr-icon/paths/arrow-down-to-base'

import { usePlannerApi } from 'Planner/ui/hooks/usePlannerApi'

require('./PlannerDebugPanel.scss')
require('components/DesignSidepanel/tabs/DebugTab/Debug.scss')

type PlannerDebugPanelProps = {
  viewerId: string
}

export const PlannerDebugPanel = ({ viewerId }: PlannerDebugPanelProps) => {
  const { plannerApi } = usePlannerApi()

  return (
    <div className={classNames('PlannerDebugPanel', 'Debug')}>
      <section>
        <h2>Tools</h2>
        <div className="toolRow">
            <p>Lose webgl context</p>
            <button onClick={() => plannerApi.debugForceWebglContextLoss(viewerId)}>
                <SSRIcon paths={crossCircle} />
            </button>
        </div>
        <div className="toolRow">
          <p>Download current cubemap</p>
          <button onClick={() => plannerApi.exportCurrentRoomEnvMap(viewerId, true, true)}>
              <SSRIcon paths={arrowDownToBase} />
          </button>
        </div>
      </section>
    </div>
  )
}
