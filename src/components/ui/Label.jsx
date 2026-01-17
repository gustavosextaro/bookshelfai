import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '../../lib/utils'

export const Label = React.forwardRef(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn('muted', className)}
    style={{ fontSize: '12px', fontWeight: 500 }}
    {...props}
  />
))

Label.displayName = LabelPrimitive.Root.displayName
