import React, { useState } from 'react';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit, Save, X, FileText, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

const DAYS = ['MA', 'DI', 'WO', 'DO', 'VR', 'ZA', 'ZO'];

export default function PlanningTemplates() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editWeeks, setEditWeeks] = useState(1);
  const [editHours, setEditHours] = useState({});

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['planning-templates', companyId],
    queryFn: () => base44.entities.AISuggestion.filter({ companyId, context_type: 'alternative_schedule' }),
    enabled: !!companyId,
  });

  const { data: dayparts = [] } = useQuery({
    queryKey: ['dayparts', companyId],
    queryFn: () => base44.entities.DepartmentDaypart.filter({ companyId, status: 'active' }),
    enabled: !!companyId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AISuggestion.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-templates', companyId] });
      setEditingId(null);
      toast.success('Template bijgewerkt');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AISuggestion.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-templates', companyId] });
      toast.success('Template verwijderd');
    },
  });

  const startEdit = (tpl) => {
    setEditingId(tpl.id);
    setEditName(tpl.description || '');
    setEditWeeks(tpl.suggested_patch?.repeatWeeks || 1);
    setEditHours(tpl.suggested_patch?.requiredHours || {});
  };

  const saveEdit = (tpl) => {
    updateMutation.mutate({
      id: tpl.id,
      data: {
        description: editName,
        suggested_patch: {
          ...tpl.suggested_patch,
          repeatWeeks: editWeeks,
          requiredHours: editHours,
        },
      },
    });
  };

  const handleDelete = (tpl) => {
    if (window.confirm(`Weet je zeker dat je "${tpl.description}" wilt verwijderen?`)) {
      deleteMutation.mutate(tpl.id);
    }
  };

  // Calculate total hours from a requiredHours object
  const getTotalHours = (requiredHours = {}) => {
    return Object.values(requiredHours).reduce((sum, v) => sum + parseFloat(v || 0), 0);
  };

  // Get daypart name by id
  const getDaypartName = (dpId) => dayparts.find(d => d.id === dpId)?.name || dpId;

  // Summarize required hours nicely per daypart
  const summarizeHours = (requiredHours = {}) => {
    const byDaypart = {};
    Object.entries(requiredHours).forEach(([key, val]) => {
      if (parseFloat(val) <= 0) return;
      const parts = key.split('_');
      const dayIndex = parseInt(parts[parts.length - 1], 10);
      const dpId = parts.slice(0, parts.length - 1).join('_');
      if (!byDaypart[dpId]) byDaypart[dpId] = {};
      byDaypart[dpId][dayIndex] = parseFloat(val);
    });
    return byDaypart;
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-6 h-6" style={{ color: 'var(--color-accent)' }} />
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Planning Templates</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Beheer je opgeslagen roostertemplates. Je kunt ze laden in het Planningshulpmiddel.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>Laden...</div>
        ) : templates.length === 0 ? (
          <div
            className="text-center py-16 rounded-xl border"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: 'var(--color-text-muted)' }} />
            <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Geen templates gevonden</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Sla een template op vanuit het Planningshulpmiddel om hier te beginnen.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {templates.map((tpl) => {
              const isEditing = editingId === tpl.id;
              const totalHours = getTotalHours(tpl.suggested_patch?.requiredHours);
              const byDaypart = summarizeHours(tpl.suggested_patch?.requiredHours);
              const repeatWeeks = tpl.suggested_patch?.repeatWeeks || 1;

              return (
                <div
                  key={tpl.id}
                  className="rounded-xl border p-4"
                  style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Naam</Label>
                          <Input
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Herhaal weken</Label>
                          <Input
                            type="number"
                            min={1}
                            max={52}
                            value={editWeeks}
                            onChange={e => setEditWeeks(Number(e.target.value))}
                            className="mt-1"
                          />
                        </div>
                      </div>

                      {/* Bewerkbaar urengrid */}
                      {(() => {
                        const byDaypart = summarizeHours(editHours);
                        const dpIds = Object.keys(byDaypart);
                        if (dpIds.length === 0) return null;
                        return (
                          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
                            <table className="text-xs w-full">
                              <thead>
                                <tr style={{ backgroundColor: 'var(--color-surface-light)' }}>
                                  <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Dagdeel</th>
                                  {DAYS.map(d => (
                                    <th key={d} className="text-center py-2 font-medium w-16" style={{ color: 'var(--color-text-secondary)' }}>{d}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {dpIds.map(dpId => (
                                  <tr key={dpId} style={{ borderTop: '1px solid var(--color-border)' }}>
                                    <td className="px-3 py-1.5 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                      {getDaypartName(dpId)}
                                    </td>
                                    {DAYS.map((_, dayIndex) => {
                                      const key = `${dpId}_${dayIndex}`;
                                      return (
                                        <td key={dayIndex} className="py-1.5 px-1 text-center">
                                          <input
                                            type="number"
                                            min="0"
                                            max="24"
                                            step="0.5"
                                            value={editHours[key] || ''}
                                            onChange={e => setEditHours(prev => ({ ...prev, [key]: e.target.value }))}
                                            placeholder="—"
                                            className="w-14 text-center rounded border px-1 py-1 text-xs font-mono focus:outline-none focus:ring-1"
                                            style={{
                                              backgroundColor: editHours[key] ? 'rgba(99,102,241,0.08)' : 'var(--color-surface-light)',
                                              borderColor: editHours[key] ? '#6366f1' : 'var(--color-border)',
                                              color: 'var(--color-text-primary)',
                                            }}
                                          />
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}

                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
                          <X className="w-3.5 h-3.5 mr-1" /> Annuleren
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveEdit(tpl)}
                          disabled={!editName.trim() || updateMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Save className="w-3.5 h-3.5 mr-1" /> Opslaan
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base" style={{ color: 'var(--color-text-primary)' }}>
                            {tpl.description}
                          </h3>
                          <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {totalHours.toFixed(1)}u totaal per week
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {repeatWeeks} {repeatWeeks === 1 ? 'week' : 'weken'} herhaling
                            </span>
                            {tpl.created_date && (
                              <span>Aangemaakt {format(new Date(tpl.created_date), 'd MMM yyyy', { locale: nl })}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button variant="ghost" size="icon" onClick={() => startEdit(tpl)} className="h-8 w-8">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(tpl)}
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Hours grid preview */}
                      {Object.keys(byDaypart).length > 0 && (
                        <div className="mt-3 overflow-x-auto">
                          <table className="text-xs w-full">
                            <thead>
                              <tr>
                                <th className="text-left pr-3 pb-1 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Dagdeel</th>
                                {DAYS.map(d => (
                                  <th key={d} className="text-center pb-1 font-medium w-10" style={{ color: 'var(--color-text-secondary)' }}>{d}</th>
                                ))}
                                <th className="text-center pb-1 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Totaal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(byDaypart).map(([dpId, days]) => {
                                const rowTotal = Object.values(days).reduce((s, v) => s + v, 0);
                                return (
                                  <tr key={dpId}>
                                    <td className="pr-3 py-0.5 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                      {getDaypartName(dpId)}
                                    </td>
                                    {DAYS.map((_, i) => (
                                      <td key={i} className="text-center py-0.5 w-10">
                                        {days[i] ? (
                                          <span
                                            className="inline-block px-1.5 py-0.5 rounded font-mono font-bold"
                                            style={{ backgroundColor: 'rgba(99,102,241,0.12)', color: '#6366f1' }}
                                          >
                                            {days[i]}
                                          </span>
                                        ) : (
                                          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                                        )}
                                      </td>
                                    ))}
                                    <td className="text-center py-0.5 font-mono font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                      {rowTotal}u
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}