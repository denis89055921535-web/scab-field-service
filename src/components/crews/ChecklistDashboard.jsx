import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, MinusCircle, TrendingUp, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CHECKLIST_SECTIONS } from '@/components/trips/ChecklistSection';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * Aggregates checklist data from all completed trips for a crew
 * and renders a per-section health dashboard.
 * По клику на раздел разворачивается список выездов, где были ответы "Нет"
 * или пункт не был заполнен — для понимания причин проблем.
 */
export default function ChecklistDashboard({ tripHistory = [] }) {
  const navigate = useNavigate();
  const [expandedKey, setExpandedKey] = useState(null);
  const tripsWithSections = tripHistory.filter(t => t.sections && Object.keys(t.sections).length > 0);

  const stats = useMemo(() => {
    return CHECKLIST_SECTIONS.map(section => {
      let yes = 0, no = 0, total = 0;
      const issues = [];

      tripsWithSections.forEach(trip => {
        const sectionData = trip.sections?.[section.key];
        if (!sectionData) return;
        const answers = sectionData.answers || {};
        section.fields.forEach(field => {
          if (field.type !== 'yesno') return;
          const ans = answers[field.key];
          if (ans === 'yes') { yes++; total++; }
          else if (ans === 'no') {
            no++; total++;
            issues.push({ tripId: trip.id, tripDate: trip.trip_date, fieldLabel: field.label, status: 'no' });
          } else if (ans === undefined) {
            issues.push({ tripId: trip.id, tripDate: trip.trip_date, fieldLabel: field.label, status: 'missing' });
          }
        });
      });

      issues.sort((a, b) => new Date(b.tripDate || 0) - new Date(a.tripDate || 0));

      const score = total > 0 ? Math.round((yes / total) * 100) : null;
      return { section, yes, no, total, score, issues };
    });
  }, [tripsWithSections]);

  if (tripsWithSections.length === 0) {
    return (
      <div className="py-3 text-center text-xs text-muted-foreground">
        Нет данных чек-листов по выездам
      </div>
    );
  }

  const overallYes = stats.reduce((s, x) => s + x.yes, 0);
  const overallTotal = stats.reduce((s, x) => s + x.total, 0);
  const overallScore = overallTotal > 0 ? Math.round((overallYes / overallTotal) * 100) : null;

  const scoreColor = (score) => {
    if (score === null) return 'text-muted-foreground';
    if (score >= 80) return 'text-emerald-600';
    if (score >= 50) return 'text-amber-500';
    return 'text-red-500';
  };

  const barColor = (score) => {
    if (score === null) return 'bg-muted';
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 50) return 'bg-amber-400';
    return 'bg-red-400';
  };

  const formatDate = (d) => {
    if (!d) return '—';
    try { return format(new Date(d), 'd MMMM yyyy', { locale: ru }); } catch { return String(d); }
  };

  return (
    <div className="space-y-3">
      {/* Overall score */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Общий показатель</p>
              <p className="text-sm font-semibold">{tripsWithSections.length} выезд(ов) с чек-листами</p>
            </div>
          </div>
          <span className={cn('text-3xl font-bold', scoreColor(overallScore))}>
            {overallScore !== null ? `${overallScore}%` : '—'}
          </span>
        </CardContent>
      </Card>

      {/* Per-section rows */}
      <div className="space-y-2">
        {stats.map(({ section, yes, no, total, score, issues }) => {
          const isExpanded = expandedKey === section.key;
          const hasIssues = issues.length > 0;
          return (
            <div key={section.key} className="space-y-1">
              <button
                type="button"
                disabled={!hasIssues}
                onClick={() => setExpandedKey(isExpanded ? null : section.key)}
                className={cn(
                  'w-full text-left space-y-1',
                  hasIssues && 'cursor-pointer'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium truncate flex-1 mr-2 flex items-center gap-1">
                    {section.title}
                    {hasIssues && (isExpanded ? <ChevronUp className="w-3 h-3 shrink-0" /> : <ChevronDown className="w-3 h-3 shrink-0" />)}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="flex items-center gap-0.5 text-xs text-emerald-600">
                      <CheckCircle2 className="w-3 h-3" />{yes}
                    </span>
                    <span className="flex items-center gap-0.5 text-xs text-red-500">
                      <XCircle className="w-3 h-3" />{no}
                    </span>
                    <span className={cn('text-xs font-bold w-8 text-right', scoreColor(score))}>
                      {score !== null ? `${score}%` : '—'}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', barColor(score))}
                    style={{ width: score !== null ? `${score}%` : '0%' }}
                  />
                </div>
              </button>

              {isExpanded && hasIssues && (
                <div className="pl-2 border-l-2 border-red-200 space-y-1.5 mt-2 mb-3">
                  {issues.map((issue, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => navigate(`/trips/${issue.tripId}`)}
                      className="w-full flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {issue.status === 'no' ? (
                            <XCircle className="w-3 h-3 text-red-500 shrink-0" />
                          ) : (
                            <MinusCircle className="w-3 h-3 text-muted-foreground shrink-0" />
                          )}
                          <span className="text-xs font-medium">{formatDate(issue.tripDate)}</span>
                          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', issue.status === 'no' ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground')}>
                            {issue.status === 'no' ? 'Нет' : 'Не заполнено'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{issue.fieldLabel}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
