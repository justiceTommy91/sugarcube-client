export class SmartaMultiPlacementTracker {
    private successCount = 0

    private failureCount = 0

    private placementFailureReasons: string[] = []

    private placementFailureReasonsList: string[] = []

    private invalidLocalItemNumbers: string[] = []

    addSuccess() {
        this.successCount += 1
    }

    addFailure(localItemNumber: number | string, reason: string) {
        this.failureCount += 1
        this.placementFailureReasons.push(`${localItemNumber}-${reason}`)
        this.placementFailureReasonsList.push(reason)
    }

    addInvalidLocalItemNumbers(invalidNumbers: string[]) {
        this.invalidLocalItemNumbers = [...invalidNumbers]
        // Track each invalid number as a failure
        invalidNumbers.forEach((lin) => {
            this.addFailure(lin, 'Product data not found')
        })
    }

    getPlacementResult(): string {
        if (this.successCount > 0 && this.failureCount === 0) {
            return 'Success'
        }
        if (this.successCount === 0 && this.failureCount > 0) {
            return 'Failure'
        }
        if (this.successCount > 0 && this.failureCount > 0) {
            return 'Partial'
        }
        // Edge case: no items processed
        return 'Failure'
    }

    getTrackingData() {
        return {
            PlacementResult: this.getPlacementResult(),
            PlacementFailureReason: this.placementFailureReasons,
            MissingProducts: [...this.invalidLocalItemNumbers],
            PlacementFailureReasonList: this.placementFailureReasonsList,
        }
    }

    // For exception handling
    static getExceptionTrackingData(error: unknown, allLocalItemNumbers: string[]) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        return {
            PlacementResult: 'Failure',
            PlacementFailureReason: [`exception-${errorMessage || 'Unknown error'}`],
            MissingProducts: [...allLocalItemNumbers],
            PlacementFailureReasonList: [errorMessage || 'Unknown error'],
        }
    }
}
