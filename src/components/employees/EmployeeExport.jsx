import React from 'react';
import { Download } from 'lucide-react';
import { Button } from "@/components/ui/button";

function idsToNames(ids, lookup) {
  if (!ids?.length) return '';
  return ids.map(id => lookup[id] || id).filter(Boolean).join('; ');
}

function escapeCsv(val) {
  if (val == null) return '';
  const str = String(val);
  if (str.includes(';') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function EmployeeExport({ employees, departments, functions }) {
  const handleExport = () => {
    const deptLookup = {};
    departments.forEach(d => { deptLookup[d.id] = d.name; });
    const funcLookup = {};
    functions.forEach(f => { funcLookup[f.id] = f.name; });

    const headers = [
      'Voornaam', 'Achternaam', 'Personeelsnummer', 'E-mail', 'Telefoon',
      'Status', 'Contracttype', 'Contracturen/week', 'Uurtarief',
      'Functie', 'Alle afdelingen', 'Voorkeursafdelingen', 'Back-up afdelingen',
      'Voorkeursdagen', 'Voorkeursshifts', 'Max uren/week (voorkeur)',
      'Niet beschikbare dagen', 'Opmerkingen voorkeuren',
      'Startdatum', 'Einddatum', 'WhatsApp opt-in'
    ];

    const rows = employees.map(e => {
      const prefs = e.preferences || {};
      return [
        e.first_name,
        e.last_name,
        e.employee_number,
        e.email,
        e.phone,
        e.status,
        e.contract_type,
        e.contract_hours,
        e.hourly_rate,
        funcLookup[e.functionId] || '',
        idsToNames(e.departmentIds, deptLookup),
        idsToNames(e.preferred_departmentIds, deptLookup),
        idsToNames(e.backup_departmentIds, deptLookup),
        (prefs.preferred_days || []).join('; '),
        (prefs.preferred_shifts || []).join('; '),
        prefs.max_hours_per_week,
        (prefs.unavailable_days || []).join('; '),
        prefs.notes,
        e.start_date,
        e.end_date,
        e.whatsapp_opt_in ? 'Ja' : 'Nee'
      ];
    });

    const BOM = '\uFEFF';
    const csv = BOM + [headers, ...rows].map(row => row.map(escapeCsv).join(';')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `medewerkers_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="w-4 h-4 mr-2" />
      Exporteren
    </Button>
  );
}