// shadcn/ui patterns (MIT): Button, Input, NativeSelect and Radix Dialog.
import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cva } from 'class-variance-authority'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { X } from 'lucide-react'
export const cn = (...inputs) => twMerge(clsx(inputs))
const buttonVariants = cva('inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-200 disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4', { variants: { variant: { default: 'bg-blue-600 text-white hover:bg-blue-700', outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50', ghost: 'text-slate-600 hover:bg-slate-100', secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200' }, size: { default: 'h-9 px-3.5 py-2', sm: 'h-8 px-2.5 text-xs', icon: 'size-9' } }, defaultVariants: { variant: 'default', size: 'default' } })
export const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />)
export const Input = React.forwardRef(({ className, ...props }, ref) => <input ref={ref} className={cn('flex h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus-visible:border-blue-400 focus-visible:ring-3 focus-visible:ring-blue-100 disabled:opacity-50', className)} {...props} />)
export function NativeSelect({ className, children, ...props }) { return <select className={cn('h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 outline-none focus-visible:ring-3 focus-visible:ring-blue-100', className)} {...props}>{children}</select> }
export function Dialog({ open, onOpenChange, title, children, className }) { return <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}><DialogPrimitive.Portal><DialogPrimitive.Overlay className="dialog-overlay" /><DialogPrimitive.Content className={cn('dialog-content', className)} aria-describedby={undefined}><div className="dialog-heading"><DialogPrimitive.Title>{title}</DialogPrimitive.Title><DialogPrimitive.Close asChild><Button variant="ghost" size="icon" aria-label="关闭"><X /></Button></DialogPrimitive.Close></div>{children}</DialogPrimitive.Content></DialogPrimitive.Portal></DialogPrimitive.Root> }
