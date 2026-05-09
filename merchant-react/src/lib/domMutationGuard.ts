let installed = false

export function installDomMutationGuard() {
  if (installed || typeof window === 'undefined' || typeof Node === 'undefined') return
  installed = true

  const originalRemoveChild = Node.prototype.removeChild

  Node.prototype.removeChild = function removeChildGuard<T extends Node>(child: T): T {
    try {
      return originalRemoveChild.call(this, child) as T
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotFoundError' && child.parentNode !== this) {
        return child
      }

      throw error
    }
  }
}
