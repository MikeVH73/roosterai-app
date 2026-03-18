import React from 'react';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Eye, Building2, Check, MapPin } from 'lucide-react';

export default function ColleagueRosterSettings({ settingsData, onSettingsChange }) {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;

  const { data: departments = [] } = useQuery({
    queryKey: ['departments', companyId],
    queryFn: () => base44.entities.Department.filter({ companyId, status: 'active' }),
    enabled: !!companyId,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations', companyId],
    queryFn: () => base44.entities.Location.filter({ companyId, status: 'active' }),
    enabled: !!companyId,
  });

  const roster = settingsData.colleague_roster_settings || { enabled: false, visibility_mode: 'custom', visible_departmentIds: [] };
  const mode = roster.visibility_mode || 'custom';

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

  // Group departments by location for preview
  const locationMap = Object.fromEntries(locations.map(l => [l.id, l]));
  const deptsByLocation = {};
  departments.forEach(dept => {
    const locIds = dept.locationIds || [];
    if (locIds.length === 0) {
      if (!deptsByLocation['_none']) deptsByLocation['_none'] = { location: null, departments: [] };
      deptsByLocation['_none'].departments.push(dept);
    } else {
      locIds.forEach(lid => {
        if (!deptsByLocation[lid]) deptsByLocation[lid] = { location: locationMap[lid], departments: [] };
        deptsByLocation[lid].departments.push(dept);
      });
    }
  });

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

        {/* Visibility mode selection */}
        {roster.enabled && (
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Zichtbaarheid instellen
            </Label>

            {/* Mode cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Own location */}
              <button
                onClick={() => updateRoster({ visibility_mode: 'own_location' })}
                className="flex flex-col gap-2 p-4 rounded-xl border text-left transition-all"
                style={{
                  backgroundColor: mode === 'own_location' ? 'rgba(14,165,233,0.08)' : 'var(--color-surface)',
                  borderColor: mode === 'own_location' ? '#0ea5e9' : 'var(--color-border)',
                }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center border-2"
                    style={{
                      borderColor: mode === 'own_location' ? '#0ea5e9' : 'var(--color-border)',
                      backgroundColor: mode === 'own_location' ? '#0ea5e9' : 'transparent',
                    }}
                  >
                    {mode === 'own_location' && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <MapPin className="w-4 h-4" style={{ color: mode === 'own_location' ? '#0ea5e9' : 'var(--color-text-muted)' }} />
                  <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                    Eigen locatie
                  </span>
                </div>
                <p className="text-xs ml-7" style={{ color: 'var(--color-text-muted)' }}>
                  Medewerkers zien alleen afdelingen die bij hun eigen locatie horen
                </p>
              </button>

              {/* Option 2: Custom selection */}
              <button
                onClick={() => updateRoster({ visibility_mode: 'custom' })}
                className="flex flex-col gap-2 p-4 rounded-xl border text-left transition-all"
                style={{
                  backgroundColor: mode === 'custom' ? 'rgba(14,165,233,0.08)' : 'var(--color-surface)',
                  borderColor: mode === 'custom' ? '#0ea5e9' : 'var(--color-border)',
                }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center border-2"
                    style={{
                      borderColor: mode === 'custom' ? '#0ea5e9' : 'var(--color-border)',
                      backgroundColor: mode === 'custom' ? '#0ea5e9' : 'transparent',
                    }}
                  >
                    {mode === 'custom' && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <Building2 className="w-4 h-4" style={{ color: mode === 'custom' ? '#0ea5e9' : 'var(--color-text-muted)' }} />
                  <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                    Handmatig selecteren
                  </span>
                </div>
                <p className="text-xs ml-7" style={{ color: 'var(--color-text-muted)' }}>
                  Kies zelf welke afdelingen alle medewerkers mogen bekijken
                </p>
              </button>
            </div>

            {/* Own location preview */}
            {mode === 'own_location' && (
              <div className="space-y-3 p-4 rounded-xl border" style={{ backgroundColor: 'var(--color-surface-light)', borderColor: 'var(--color-border)' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  Overzicht: afdelingen per locatie
                </p>
                {Object.entries(deptsByLocation).map(([key, group]) => (
                  <div key={key} className="space-y-1">
                    <p className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                      <MapPin className="w-3 h-3" />
                      {group.location?.name || 'Geen locatie'}
                    </p>
                    <div className="flex flex-wrap gap-1.5 ml-5">
                      {group.departments.map(dept => (
                        <span
                          key={dept.id}
                          className="text-[11px] px-2 py-0.5 rounded-full border"
                          style={{
                            borderColor: dept.color || 'var(--color-border)',
                            color: 'var(--color-text-secondary)',
                            backgroundColor: 'var(--color-surface)',
                          }}
                        >
                          {dept.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {Object.keys(deptsByLocation).length === 0 && (
                  <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>
                    Geen afdelingen met locaties gevonden. Koppel eerst locaties aan afdelingen.
                  </p>
                )}
              </div>
            )}

            {/* Custom department selection */}
            {mode === 'custom' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Zichtbare afdelingen</Label>
                  <button
                    onClick={toggleAll}
                    className="text-xs font-medium px-2 py-1 rounded"
                    style={{ color: 'var(--color-accent)', backgroundColor: 'var(--color-surface-light)' }}
                  >
                    {allSelected ? 'Alles deselecteren' : 'Alles selecteren'}
                  </button>
                </div>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Selecteer welke afdelingen alle medewerkers mogen bekijken
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}