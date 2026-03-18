import React from 'react';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Eye, Building2, Check } from 'lucide-react';

export default function ColleagueRosterSettings({ settingsData, onSettingsChange }) {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;

  const { data: departments = [] } = useQuery({
    queryKey: ['departments', companyId],
    queryFn: () => base44.entities.Department.filter({ companyId, status: 'active' }),
    enabled: !!companyId,
  });

  const roster = settingsData.colleague_roster_settings || { enabled: false, visible_departmentIds: [] };

  const updateRoster = (patch) => {
    onSettingsChange({
      ...settingsData,
      colleague_roster_settings: { ...roster, ...patch },
    });
  };

  const toggleDepartment = (deptId) => {
    const current = roster.visible_departmentIds || [];
    const next = current.includes(deptId)
      ? current.filter(id => id !== deptId)
      : [...current, deptId];
    updateRoster({ visible_departmentIds: next });
  };

  const allSelected = departments.length > 0 && departments.every(d => (roster.visible_departmentIds || []).includes(d.id));

  const toggleAll = () => {
    if (allSelected) {
      updateRoster({ visible_departmentIds: [] });
    } else {
      updateRoster({ visible_departmentIds: departments.map(d => d.id) });
    }
  };

  return (
    <Card className="border-0 shadow-sm settings-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Collega-rooster inzage
        </CardTitle>
        <CardDescription>
          Bepaal of medewerkers het rooster van collega's kunnen bekijken in de mobiele app
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label>Collega-rooster inschakelen</Label>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Medewerkers kunnen in de app zien wie er wanneer werkt
            </p>
          </div>
          <Switch
            checked={roster.enabled}
            onCheckedChange={(checked) => updateRoster({ enabled: checked })}
          />
        </div>

        {/* Department selection */}
        {roster.enabled && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Zichtbare afdelingen
              </Label>
              <button
                onClick={toggleAll}
                className="text-xs font-medium px-2 py-1 rounded"
                style={{ color: 'var(--color-accent)', backgroundColor: 'var(--color-surface-light)' }}
              >
                {allSelected ? 'Alles deselecteren' : 'Alles selecteren'}
              </button>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Selecteer welke afdelingen medewerkers mogen bekijken
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {departments.map(dept => {
                const selected = (roster.visible_departmentIds || []).includes(dept.id);
                return (
                  <button
                    key={dept.id}
                    onClick={() => toggleDepartment(dept.id)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all text-sm"
                    style={{
                      backgroundColor: selected ? 'rgba(14,165,233,0.1)' : 'var(--color-surface)',
                      borderColor: selected ? '#0ea5e9' : 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border"
                      style={{
                        backgroundColor: selected ? '#0ea5e9' : 'transparent',
                        borderColor: selected ? '#0ea5e9' : 'var(--color-border)',
                      }}
                    >
                      {selected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    {dept.color && (
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: dept.color }} />
                    )}
                    <span className="flex-1 truncate">{dept.name}</span>
                  </button>
                );
              })}
            </div>
            {departments.length === 0 && (
              <p className="text-sm italic" style={{ color: 'var(--color-text-muted)' }}>
                Geen afdelingen gevonden. Maak eerst afdelingen aan.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}