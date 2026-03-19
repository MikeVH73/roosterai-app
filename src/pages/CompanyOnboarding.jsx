import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { 
  Building2, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Users, 
  MapPin,
  Briefcase,
  Loader2,
  Calendar
} from 'lucide-react';
import { Button } from "@/components/ui/button";

const steps = [
  { id: 'company', title: 'Organisatie', icon: Building2 },
  { id: 'industry', title: 'Branche', icon: Briefcase },
  { id: 'size', title: 'Teamgrootte', icon: Users },
];

const industries = [
  { value: 'healthcare', label: 'Zorg', description: 'Ziekenhuizen, klinieken, thuiszorg' },
  { value: 'retail', label: 'Retail', description: 'Winkels, supermarkten' },
  { value: 'hospitality', label: 'Horeca', description: 'Restaurants, hotels, cafés' },
  { value: 'logistics', label: 'Logistiek', description: 'Magazijnen, transport' },
  { value: 'manufacturing', label: 'Productie', description: 'Fabrieken, assemblage' },
  { value: 'other', label: 'Anders', description: 'Andere branche' },
];

const teamSizes = [
  { value: 'small', label: '1-10', description: 'Klein team', plan: 'starter' },
  { value: 'medium', label: '11-25', description: 'Groeiend team', plan: 'pro' },
  { value: 'large', label: '26-100', description: 'Groot team', plan: 'pro' },
  { value: 'enterprise', label: '100+', description: 'Enterprise', plan: 'enterprise' },
];

export default function CompanyOnboarding() {
  const navigate = useNavigate();
  const { selectCompany, user } = useCompany();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    industry: '',
    teamSize: '',
    address: '',
    phone: ''
  });

  const updateFormData = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Auto-generate slug from name
      if (field === 'name') {
        newData.slug = value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      }
      
      return newData;
    });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.name.length >= 2 && formData.slug.length >= 2;
      case 1:
        return formData.industry !== '';
      case 2:
        return formData.teamSize !== '';
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate(createPageUrl('CompanySelect'));
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const selectedSize = teamSizes.find(s => s.value === formData.teamSize);
      const plan = selectedSize?.plan || 'starter';
      
      const planLimits = {
        starter: { max_users: 10, ai_actions_limit: 300 },
        pro: { max_users: 25, ai_actions_limit: 1500 },
        enterprise: { max_users: 999, ai_actions_limit: 5000 }
      };

      // Create company
      const company = await base44.entities.Company.create({
        name: formData.name,
        slug: formData.slug,
        subscription_plan: plan,
        subscription_status: 'trial',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        max_users: planLimits[plan].max_users,
        ai_actions_limit: planLimits[plan].ai_actions_limit,
        ai_actions_used: 0,
        billing_email: user?.email,
        address: formData.address,
        phone: formData.phone
      });

      // Create company settings
      await base44.entities.CompanySettings.create({
        companyId: company.id,
        planning_rules: {
          min_rest_hours: 11,
          max_hours_per_week: 40,
          max_consecutive_days: 6,
          min_break_duration: 30
        },
        ai_preferences: {
          auto_suggest: true,
          prefer_fulltime_first: true,
          consider_travel_time: false,
          balance_workload: true
        },
        notification_settings: {
          email_new_schedule: true,
          email_shift_changes: true,
          email_vacation_updates: true
        }
      });

      // Create company membership for current user as admin
      await base44.entities.CompanyMember.create({
        companyId: company.id,
        userId: user?.id,
        email: user?.email,
        company_role: 'company_admin',
        status: 'active',
        joined_at: new Date().toISOString()
      });

      // Create employee profile for current user
      await base44.entities.EmployeeProfile.create({
        companyId: company.id,
        userId: user?.id,
        first_name: user?.full_name?.split(' ')[0] || 'Admin',
        last_name: user?.full_name?.split(' ').slice(1).join(' ') || '',
        email: user?.email,
        contract_type: 'fulltime',
        status: 'active'
      });

      // Select the new company and navigate
      await selectCompany(company.id);
      navigate(createPageUrl('Dashboard'));
    } catch (error) {
      console.error('Error creating company:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #1e1b2e 0%, #262344 50%, #2d2a3e 100%)' }}>
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <Calendar className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#ffffff' }}>Organisatie aanmaken</h1>
          <p style={{ color: '#94a3b8' }}>Start met het instellen van je werkruimte</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <React.Fragment key={step.id}>
                <div 
                  className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
                  style={{
                    backgroundColor: isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                    color: isActive ? '#60a5fa' : isCompleted ? '#4ade80' : '#64748b'
                  }}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className="w-8 h-0.5" style={{ backgroundColor: index < currentStep ? '#4ade80' : '#334155' }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Form Card */}
        <div className="rounded-xl p-8 shadow-xl" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
            {/* Step 1: Company Details */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1.5" style={{ color: '#cbd5e1' }}>Organisatienaam *</label>
                  <input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    placeholder="Bijv. Zorgcentrum De Horizon"
                    className="w-full h-12 px-4 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: '#334155', color: '#f1f5f9', border: '1px solid #475569' }}
                  />
                </div>
                <div>
                  <label htmlFor="slug" className="block text-sm font-medium mb-1.5" style={{ color: '#cbd5e1' }}>URL-naam *</label>
                  <div className="flex items-center">
                    <span className="text-sm mr-2" style={{ color: '#64748b' }}>roosterai.nl/</span>
                    <input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => updateFormData('slug', e.target.value)}
                      placeholder="organisatie-naam"
                      className="flex-1 h-12 px-4 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ backgroundColor: '#334155', color: '#f1f5f9', border: '1px solid #475569' }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium mb-1.5" style={{ color: '#cbd5e1' }}>Telefoonnummer</label>
                    <input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => updateFormData('phone', e.target.value)}
                      placeholder="+31 6 12345678"
                      className="w-full h-12 px-4 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ backgroundColor: '#334155', color: '#f1f5f9', border: '1px solid #475569' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium mb-1.5" style={{ color: '#cbd5e1' }}>Adres</label>
                    <input
                      id="address"
                      value={formData.address}
                      onChange={(e) => updateFormData('address', e.target.value)}
                      placeholder="Straatnaam 123, Stad"
                      className="w-full h-12 px-4 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ backgroundColor: '#334155', color: '#f1f5f9', border: '1px solid #475569' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Industry */}
            {currentStep === 1 && (
              <div>
                <p className="mb-4 text-sm font-medium" style={{ color: '#cbd5e1' }}>In welke branche werk je?</p>
                <div className="grid grid-cols-2 gap-3">
                  {industries.map((industry) => (
                    <button
                      key={industry.value}
                      type="button"
                      onClick={() => updateFormData('industry', industry.value)}
                      className="flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all text-left"
                      style={{
                        backgroundColor: formData.industry === industry.value ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                        borderColor: formData.industry === industry.value ? '#3b82f6' : '#475569'
                      }}
                    >
                      <span className="font-medium" style={{ color: '#f1f5f9' }}>{industry.label}</span>
                      <span className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{industry.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Team Size */}
            {currentStep === 2 && (
              <div>
                <p className="mb-4 text-sm font-medium" style={{ color: '#cbd5e1' }}>Hoe groot is je team?</p>
                <div className="grid grid-cols-2 gap-3">
                  {teamSizes.map((size) => (
                    <button
                      key={size.value}
                      type="button"
                      onClick={() => updateFormData('teamSize', size.value)}
                      className="flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all text-left"
                      style={{
                        backgroundColor: formData.teamSize === size.value ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                        borderColor: formData.teamSize === size.value ? '#3b82f6' : '#475569'
                      }}
                    >
                      <span className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>{size.label}</span>
                      <span className="text-xs" style={{ color: '#94a3b8' }}>{size.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="ghost"
            onClick={handleBack}
            style={{ color: '#94a3b8' }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed() || isSubmitting}
            className="min-w-32"
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#ffffff', border: 'none' }}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : currentStep === steps.length - 1 ? (
              <>
                Voltooien
                <Check className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Volgende
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}