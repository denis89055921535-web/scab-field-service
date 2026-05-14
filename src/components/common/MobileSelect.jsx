import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

/**
 * On mobile: opens a bottom-sheet drawer.
 * On desktop: falls back to the standard Radix Select popover.
 *
 * Props mirror shadcn Select:
 *   value, onValueChange, placeholder, options: [{value, label}], className
 *   triggerClassName, children (optional — if provided, rendered inside trigger)
 */
export default function MobileSelect({ value, onValueChange, placeholder, options = [], className, triggerClassName, disabled }) {
  const [open, setOpen] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  const selectedLabel = options.find(o => o.value === value)?.label;

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={triggerClassName}>
          <SelectValue placeholder={placeholder}>{selectedLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent className={className}>
          {options.map(o => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          'flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          triggerClassName
        )}
      >
        <span className={cn('flex-1 text-left truncate', !selectedLabel && 'text-muted-foreground')}>
          {selectedLabel || placeholder || 'Выберите...'}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
      </button>

      <Drawer open={open} onOpenChange={setOpen} shouldScaleBackground={false}>
        <DrawerContent>
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-base">{placeholder || 'Выберите'}</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto max-h-[60vh] px-2 pb-6 safe-area-bottom">
            {options.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onValueChange(o.value); setOpen(false); }}
                className={cn(
                  'flex items-center w-full px-4 py-3.5 rounded-lg text-sm text-left gap-3 transition-colors',
                  o.value === value ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                )}
              >
                <span className="flex-1">{o.label}</span>
                {o.value === value && <Check className="w-4 h-4 shrink-0" />}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}