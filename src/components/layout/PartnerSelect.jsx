import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePartner } from '@/lib/PartnerContext';

export default function PartnerSelect({ onSelect }) {
  const { PARTNERS } = usePartner();
  const [selected, setSelected] = useState(null);

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center p-6 safe-area-top">
      <div className="w-full max-w-xs text-center space-y-6">
        <div>
          <img
            src="https://media.base44.com/images/public/69fc64a1b3cf2f52f788409b/675c8f4d4_ChatGPTImage7202614_48_13-fotor-bg-remover-2026050714553.png"
            alt="SCAB"
            className="h-14 object-contain mx-auto mb-4"
          />
          <h2 className="text-xl font-bold">Выберите проект</h2>
          <p className="text-sm text-muted-foreground mt-1">Будут показаны только бригады выбранного партнёра</p>
        </div>

        <div className="space-y-3">
          {PARTNERS.map(p => (
            <button
              key={p}
              onClick={() => setSelected(p)}
              className={`w-full rounded-xl border-2 px-4 py-4 text-left font-semibold text-base transition-all ${
                selected === p
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-foreground hover:border-primary/50'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <Button
          className="w-full h-12"
          disabled={!selected}
          onClick={() => onSelect(selected)}
        >
          Войти
        </Button>
      </div>
    </div>
  );
}