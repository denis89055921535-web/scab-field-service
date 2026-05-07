import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * BiKitsInput — управление номерами комплектов БИ в виде тегов.
 * value: строка через запятую (хранится в БД как раньше)
 * onChange: (newStringValue) => void
 */
export default function BiKitsInput({ value = '', onChange }) {
  const [inputVal, setInputVal] = useState('');

  const tags = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];

  const addTag = () => {
    const trimmed = inputVal.trim();
    if (!trimmed || tags.includes(trimmed)) { setInputVal(''); return; }
    onChange([...tags, trimmed].join(', '));
    setInputVal('');
  };

  const removeTag = (tag) => {
    onChange(tags.filter(t => t !== tag).join(', '));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addTag(); }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="например: БИ-001"
          className="flex-1"
        />
        <Button type="button" variant="outline" size="icon" onClick={addTag}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1 pr-1">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-0.5 hover:text-destructive transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}