import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useCompany } from '@/components/providers/CompanyProvider';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Trash2, Loader2 } from 'lucide-react';
import { toast } from "sonner";

export default function CompanyLogoUpload() {
  const { currentCompany, refreshCompany } = useCompany();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecteer een afbeelding (PNG, JPG, etc.)');
      return;
    }

    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.Company.update(currentCompany.id, { logo_url: file_url });
    await refreshCompany();
    setUploading(false);
    toast.success('Logo opgeslagen');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = async () => {
    await base44.entities.Company.update(currentCompany.id, { logo_url: null });
    await refreshCompany();
    toast.success('Logo verwijderd');
  };

  return (
    <div className="space-y-2">
      <Label>Bedrijfslogo</Label>
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        Dit logo wordt getoond in de mobiele app en navigatie
      </p>
      <div className="flex items-center gap-4 pt-2">
        {currentCompany?.logo_url ? (
          <img src={currentCompany.logo_url} alt="Logo" className="h-14 w-14 rounded-lg object-cover border" style={{ borderColor: 'var(--color-border)' }} />
        ) : (
          <div className="h-14 w-14 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface-light)', border: '2px dashed var(--color-border)' }}>
            <Upload className="w-5 h-5" style={{ color: 'var(--color-text-muted)' }} />
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            {currentCompany?.logo_url ? 'Wijzigen' : 'Uploaden'}
          </Button>
          {currentCompany?.logo_url && (
            <Button variant="outline" size="sm" onClick={handleRemove}>
              <Trash2 className="w-4 h-4 mr-2" />
              Verwijderen
            </Button>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </div>
    </div>
  );
}