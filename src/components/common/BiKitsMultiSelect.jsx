import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// value: comma-separated string, e.g. "БИ-1, БИ-2"
export default function BiKitsMultiSelect({ value = '', onChange, options = [] }) {
  const kits = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];
  const [inputVal, setInputVal] = useState('');

  const addKit = (kit) => {
    const trimmed = kit.trim();
    if (!trimmed || kits.includes(trimmed)) return;
    onChange([...kits, trimmed].join(', '));
    setInputVal('');
  };

  const removeKit = (kit) => {
    onChange(kits.filter(k => k !== kit).join(', '));
  };

  const availableOptions = options.filter(o => !kits.includes(o));

  return (
    <div className="space-y-2">
      {/* Selected kits as tags */}
      {kits.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {kits.map(kit => (
            <span key={kit} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-full break-all">
              {kit}
              <button type="button" onClick={() => removeKit(kit)} className="hover:text-destructive transition-colors shrink-0">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown from warehouse list */}
      {availableOptions.length > 0 && (
        <Select onValueChange={addKit} value="">
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Выбрать из списка..." />
          </SelectTrigger>
          <SelectContent>
            {availableOptions.map(kit => (
              <SelectItem key={kit} value={kit} className="break-all whitespace-normal">{kit}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Manual input — always visible */}
      <div className="flex gap-2 items-end">
        <Textarea
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          placeholder="Или введите номер вручную..."
          rows={2}
          className="resize-none flex-1"
        />
        <Button type="button" variant="outline" size="icon" onClick={() => addKit(inputVal)} disabled={!inputVal.trim()}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}