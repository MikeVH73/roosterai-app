import React, { useState } from 'react';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  LogOut, Phone, Mail, Building2, Briefcase, Clock, 
  CheckCircle2, MessageCircle, ChevronRight, Calendar,
  XCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function ProfileRow({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: color || 'var(--color-text-muted)' }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{value || '-'}</p>
      </div>
    </div>
  );
}

export default function MobileProfielTab({ myProfile, departments = [], functions = [] }) {
  const { user, currentCompany, switchCompany } = useCompany();
  const navigate = useNavigate();
  const [whatsappToggling, setWhatsappToggling] = useState(false);

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getDeptNames = (ids) => {
    if (!ids?.length) return '-';
    return ids.map(id => departments.find(d => d.id === id)?.name).filter(Boolean).join(', ');
  };

  const getFunctionName = (id) => functions.find(f => f.id === id)?.name || '-';

  const contractLabels = {
    fulltime: 'Fulltime',
    parttime: 'Parttime',
    flex: 'Flex',
    oproep: 'Oproepkracht',
    stagiair: 'Stagiair',
  };

  const toggleWhatsApp = async () => {
    if (!myProfile) return;
    setWhatsappToggling(true);
    try {
      if (myProfile.whatsapp_opt_in) {
        await base44.entities.EmployeeProfile.update(myProfile.id, { whatsapp_opt_in: false });
        window.location.reload();
      } else {
        window.open(base44.agents.getWhatsAppConnectURL('planning_assistent'), '_blank');
      }
    } finally {
      setWhatsappToggling(false);
    }
  };

  const handleSwitchCompany = () => {
    switchCompany();
    navigate('/CompanySelect');
  };

  return (
    <div className="px-4 pb-4">
      {/* Profile header */}
      <div className="flex flex-col items-center py-6">
        <Avatar className="h-20 w-20 mb-3">
          <AvatarFallback className="text-xl text-white font-bold"
            style={{ background: 'linear-gradient(135deg, var(--color-accent), #6366f1)' }}>
            {getInitials(myProfile ? `${myProfile.first_name} ${myProfile.last_name}` : user?.full_name)}
          </AvatarFallback>
        </Avatar>
        <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
          {myProfile ? `${myProfile.first_name} ${myProfile.last_name}` : user?.full_name}
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{user?.email}</p>
        {myProfile?.employee_number && (
          <span className="text-xs mt-1 px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'var(--color-surface-light)', color: 'var(--color-text-muted)' }}>
            #{myProfile.employee_number}
          </span>
        )}
      </div>

      {/* Info cards */}
      <div className="rounded-xl overflow-hidden mb-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="px-4">
          <ProfileRow icon={Building2} label="Afdeling(en)" value={getDeptNames(myProfile?.departmentIds)} color="#6366f1" />
          <ProfileRow icon={Briefcase} label="Functie" value={getFunctionName(myProfile?.functionId)} color="#0ea5e9" />
          <ProfileRow icon={Clock} label="Contract" value={`${contractLabels[myProfile?.contract_type] || '-'} · ${myProfile?.contract_hours || '-'} uur/week`} color="#f59e0b" />
          <ProfileRow icon={Phone} label="Telefoon" value={myProfile?.phone} color="#22c55e" />
          <ProfileRow icon={Mail} label="E-mail" value={myProfile?.email || user?.email} color="#ef4444" />
        </div>
      </div>

      {/* WhatsApp section */}
      <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: myProfile?.whatsapp_opt_in ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.15)' }}>
              <MessageCircle className="w-4 h-4" style={{ color: myProfile?.whatsapp_opt_in ? '#22c55e' : '#94a3b8' }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>WhatsApp</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {myProfile?.whatsapp_opt_in ? 'Gekoppeld' : 'Niet gekoppeld'}
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={toggleWhatsApp} disabled={whatsappToggling}
            className="text-xs">
            {myProfile?.whatsapp_opt_in ? (
              <><XCircle className="w-3.5 h-3.5 mr-1" />Ontkoppelen</>
            ) : (
              <><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Koppelen</>
            )}
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button onClick={handleSwitchCompany}
          className="w-full flex items-center gap-3 p-3 rounded-xl text-left"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <Building2 className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
          <span className="text-sm flex-1" style={{ color: 'var(--color-text-primary)' }}>Wissel van bedrijf</span>
          <ChevronRight className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
        </button>

        <button onClick={() => base44.auth.logout()}
          className="w-full flex items-center gap-3 p-3 rounded-xl text-left"
          style={{ backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <LogOut className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-500 font-medium">Uitloggen</span>
        </button>
      </div>
    </div>
  );
}