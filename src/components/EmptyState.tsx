'use client'

import * as React from 'react'

export type EmptyStateProps = {
  title?: string
  message?: string
  icon?: React.ReactNode
  /**
   * Primary action button. Provide a full <a> or <button> element.
   */
  primaryAction?: React.ReactNode
  /**
   * Secondary actions rendered to the right of the primary action.
   */
  secondaryActions?: React.ReactNode
  /**
   * Optional extra content shown below actions (e.g., tips, links).
   */
  footer?: React.ReactNode
  className?: string
}

export default function EmptyState({
  title = 'Nothing here yet',
  message = 'There is no content to display.',
  icon,
  primaryAction,
  secondaryActions,
  footer,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={
        'rounded-2xl border border-gray-200 bg-white p-6 text-center ' +
        (className ? className : '')
      }
      role="status"
      aria-live="polite"
    >
      {icon && <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center">{icon}</div>}
      <h2 className="text-base font-medium">{title}</h2>
      <p className="mt-1 text-sm text-gray-600">{message}</p>

      {(primaryAction || secondaryActions) && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {primaryAction}
          {secondaryActions}
        </div>
      )}

      {footer && <div className="mt-3 text-xs text-gray-500">{footer}</div>}
    </div>
  )}