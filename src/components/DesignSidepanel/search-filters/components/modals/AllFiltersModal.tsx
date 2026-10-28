import React, { useRef } from 'react'
import ReactDOM from 'react-dom'
import Modal, { ModalBody, ModalHeader, Sheets } from '@ingka/modal'
import Button from '@ingka/button'
import { useTranslation } from 'react-i18next'
import { useModalFocus } from 'hooks/aria/useModalFocus'
import { useDesignSidebarContext } from 'components/design/DesignSidepanelContext'
import { AllFiltersModalContent } from './AllFiltersModalContent'
import { useAllFiltersModal } from './hooks/useAllFiltersModal'
import { useProductSearch } from '../../hooks/useProductSearch'
import { FilterSelections } from '../../types/core'

require('./AllFiltersModal.scss')

export const AllFiltersModal = (): React.ReactElement => {
    const { t } = useTranslation()
    const { allFiltersModalOpen, closeAllFiltersModal } = useDesignSidebarContext()
    const {
        rawFilters,
        selectedFilterOptions,
        maxCount,
        sortState,
        updateSortOrder,
        updateSelectedFilterOptions,
        clearAllFilters,
    } = useProductSearch()

    const applyFilterSelections = (filterSelections: FilterSelections) => {
        updateSelectedFilterOptions(filterSelections)
    }

    const resetFilterSelections = () => {
        clearAllFilters()
    }
    const modalRef = useRef<HTMLDivElement>(null)

    // Use custom hook for filter logic
    const { hasActiveFilters, handleSelectionChange, getSelectedSortOptionName } = useAllFiltersModal({
        selectedFilterOptions,
        resultCount: maxCount,
        sortState,
        onApplyFilters: applyFilterSelections,
    })

    useModalFocus(allFiltersModalOpen, modalRef)

    // KLUDGE: to avoid dealing with z-index fighting w/ sidepanel we're rendering this in a portal.
    return ReactDOM.createPortal(
        <Modal visible={allFiltersModalOpen} handleCloseBtn={closeAllFiltersModal} className="AllFiltersModal">
            <Sheets
                alignment="left"
                header={<ModalHeader title={t('search.filters.title')} id="modal-title" />}
                footer={
                    <div className="AllFiltersModal__footer">
                        <Button
                            type="secondary"
                            onClick={resetFilterSelections}
                            text={t('search.filters.clearAll')}
                            disabled={!hasActiveFilters}
                            data-autofocus
                            aria-describedby="clear-all-description"
                        />
                        <Button
                            type="primary"
                            onClick={closeAllFiltersModal}
                            text={t('search.filters.viewResults', { number: maxCount })}
                            aria-describedby="view-results-description"
                        />
                    </div>
                }
            >
                <ModalBody>
                    <div
                        ref={modalRef}
                        className="AllFiltersModal__content"
                        id="modal-description"
                        aria-live="polite"
                        aria-atomic="false"
                    >
                        <AllFiltersModalContent
                            rawFilters={rawFilters}
                            selectedFilterOptions={selectedFilterOptions}
                            sortState={sortState}
                            getSelectedSortOptionName={getSelectedSortOptionName}
                            onSelectionChange={handleSelectionChange}
                            onSortChange={updateSortOrder}
                        />
                    </div>
                </ModalBody>
            </Sheets>
        </Modal>,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        document.getElementById('___gatsby')!,
    )
}
