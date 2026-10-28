type DependencyResolvedCallback = () => void

export class DependencyCreationQueue {
  private resolvedDependencies: Set<string> = new Set()
  private unresolvedDependencies: Map<string, DependencyResolvedCallback[]> = new Map()

  public create<T = unknown>(entryId: string, creationFunc: () => Promise<T>, dependsOn: string | undefined) {
    const prerequisite = dependsOn === undefined || this.resolvedDependencies.has(dependsOn)
      ? Promise.resolve()
      : new Promise<void>((resolve) => { this.addNewDependency(dependsOn, resolve) })
    return prerequisite
      .then(() => creationFunc())
      .then(() => this.onDependencyResolved(entryId))
  }

  private addNewDependency(dependencyId: string, callback: DependencyResolvedCallback) {
    const callbacks = this.unresolvedDependencies.get((dependencyId)) || []
    callbacks.push(callback)
    this.unresolvedDependencies.set(dependencyId, callbacks)
  }

  private onDependencyResolved(dependencyId: string) {
    const awaitingCallbacks = this.unresolvedDependencies.get((dependencyId))
    if (awaitingCallbacks) {
      awaitingCallbacks.forEach((cb) => cb())
      this.unresolvedDependencies.delete(dependencyId)
    }
    this.resolvedDependencies.add(dependencyId)
  }
}