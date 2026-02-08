import React, { useState } from 'react';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TopBar from '@/components/layout/TopBar';
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Briefcase,
  Award,
  Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const colorOptions = [
  { value: '#3B82F6', label: 'Blauw' },
  { value: '#10B981', label: 'Groen' },
  { value: '#8B5CF6', label: 'Paars' },
  { value: '#F59E0B', label: 'Oranje' },
  { value: '#EF4444', label: 'Rood' },
  { value: '#EC4899', label: 'Roze' },
];

const skillCategories = [
  { value: 'certification', label: 'Certificering' },
  { value: 'language', label: 'Taal' },
  { value: 'software', label: 'Software' },
  { value: 'medical', label: 'Medisch' },
  { value: 'other', label: 'Anders' },
];

export default function FunctionsSkills() {
  const { currentCompany, hasPermission } = useCompany();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('functions');
  const [functionDialogOpen, setFunctionDialogOpen] = useState(false);
  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [selectedFunction, setSelectedFunction] = useState(null);
  const [selectedSkill, setSelectedSkill] = useState(null);
  
  const [functionForm, setFunctionForm] = useState({
    name: '', code: '', description: '', color: '#3B82F6', required_skillIds: [], status: 'active'
  });
  
  const [skillForm, setSkillForm] = useState({
    name: '', code: '', description: '', category: 'other', expires: false, status: 'active'
  });

  const { data: functions = [], isLoading: functionsLoading } = useQuery({
    queryKey: ['functions', companyId],
    queryFn: () => base44.entities.Function.filter({ companyId }),
    enabled: !!companyId
  });

  const { data: skills = [], isLoading: skillsLoading } = useQuery({
    queryKey: ['skills', companyId],
    queryFn: () => base44.entities.Skill.filter({ companyId }),
    enabled: !!companyId
  });

  // Function mutations
  const createFunctionMutation = useMutation({
    mutationFn: (data) => base44.entities.Function.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['functions', companyId]);
      closeFunctionDialog();
    }
  });

  const updateFunctionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Function.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['functions', companyId]);
      closeFunctionDialog();
    }
  });

  const deleteFunctionMutation = useMutation({
    mutationFn: (id) => base44.entities.Function.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['functions', companyId])
  });

  // Skill mutations
  const createSkillMutation = useMutation({
    mutationFn: (data) => base44.entities.Skill.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['skills', companyId]);
      closeSkillDialog();
    }
  });

  const updateSkillMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Skill.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['skills', companyId]);
      closeSkillDialog();
    }
  });

  const deleteSkillMutation = useMutation({
    mutationFn: (id) => base44.entities.Skill.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['skills', companyId])
  });

  const openFunctionDialog = (func = null) => {
    if (func) {
      setSelectedFunction(func);
      setFunctionForm({
        name: func.name || '',
        code: func.code || '',
        description: func.description || '',
        color: func.color || '#3B82F6',
        required_skillIds: func.required_skillIds || [],
        status: func.status || 'active'
      });
    } else {
      setSelectedFunction(null);
      setFunctionForm({
        name: '', code: '', description: '', color: '#3B82F6', required_skillIds: [], status: 'active'
      });
    }
    setFunctionDialogOpen(true);
  };

  const closeFunctionDialog = () => {
    setFunctionDialogOpen(false);
    setSelectedFunction(null);
  };

  const openSkillDialog = (skill = null) => {
    if (skill) {
      setSelectedSkill(skill);
      setSkillForm({
        name: skill.name || '',
        code: skill.code || '',
        description: skill.description || '',
        category: skill.category || 'other',
        expires: skill.expires || false,
        status: skill.status || 'active'
      });
    } else {
      setSelectedSkill(null);
      setSkillForm({
        name: '', code: '', description: '', category: 'other', expires: false, status: 'active'
      });
    }
    setSkillDialogOpen(true);
  };

  const closeSkillDialog = () => {
    setSkillDialogOpen(false);
    setSelectedSkill(null);
  };

  const handleFunctionSubmit = async (e) => {
    e.preventDefault();
    const data = { ...functionForm, companyId };
    if (selectedFunction) {
      await updateFunctionMutation.mutateAsync({ id: selectedFunction.id, data });
    } else {
      await createFunctionMutation.mutateAsync(data);
    }
  };

  const handleSkillSubmit = async (e) => {
    e.preventDefault();
    const data = { ...skillForm, companyId };
    if (selectedSkill) {
      await updateSkillMutation.mutateAsync({ id: selectedSkill.id, data });
    } else {
      await createSkillMutation.mutateAsync(data);
    }
  };

  const toggleSkillInFunction = (skillId) => {
    setFunctionForm(prev => ({
      ...prev,
      required_skillIds: prev.required_skillIds.includes(skillId)
        ? prev.required_skillIds.filter(id => id !== skillId)
        : [...prev.required_skillIds, skillId]
    }));
  };

  const getSkillNames = (ids) => {
    if (!ids?.length) return [];
    return ids.map(id => skills.find(s => s.id === id)?.name).filter(Boolean);
  };

  const getCategoryLabel = (cat) => skillCategories.find(c => c.value === cat)?.label || cat;

  const isFunctionSubmitting = createFunctionMutation.isPending || updateFunctionMutation.isPending;
  const isSkillSubmitting = createSkillMutation.isPending || updateSkillMutation.isPending;

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar 
        title="Functies & Vaardigheden" 
        subtitle={`${functions.length} functies, ${skills.length} vaardigheden`}
      />

      <div className="p-6 max-w-7xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="functions" className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Functies
              </TabsTrigger>
              <TabsTrigger value="skills" className="flex items-center gap-2">
                <Award className="w-4 h-4" />
                Vaardigheden
              </TabsTrigger>
            </TabsList>
            
            {hasPermission('manage_schedules') && (
              <Button 
                onClick={() => activeTab === 'functions' ? openFunctionDialog() : openSkillDialog()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                {activeTab === 'functions' ? 'Functie toevoegen' : 'Vaardigheid toevoegen'}
              </Button>
            )}
          </div>

          <TabsContent value="functions">
            {functionsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="border-0 shadow-sm animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-6 bg-slate-200 rounded w-3/4 mb-4" />
                      <div className="h-4 bg-slate-200 rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : functions.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="font-medium text-slate-900 mb-2">Nog geen functies</h3>
                  <p className="text-slate-500 text-sm mb-6">
                    Definieer functies om medewerkers in te delen.
                  </p>
                  {hasPermission('manage_schedules') && (
                    <Button onClick={() => openFunctionDialog()}>
                      <Plus className="w-4 h-4 mr-2" />
                      Eerste functie toevoegen
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {functions.map((func) => (
                  <Card key={func.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${func.color}20` }}
                          >
                            <Briefcase className="w-5 h-5" style={{ color: func.color }} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">{func.name}</h3>
                            {func.code && (
                              <p className="text-sm text-slate-500">{func.code}</p>
                            )}
                          </div>
                        </div>
                        {hasPermission('manage_schedules') && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-slate-400">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openFunctionDialog(func)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Bewerken
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => deleteFunctionMutation.mutate(func.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Verwijderen
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      {func.description && (
                        <p className="text-sm text-slate-600 mb-4">{func.description}</p>
                      )}

                      {func.required_skillIds?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {getSkillNames(func.required_skillIds).map((name, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="skills">
            {skillsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="border-0 shadow-sm animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-6 bg-slate-200 rounded w-3/4 mb-4" />
                      <div className="h-4 bg-slate-200 rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : skills.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <Award className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="font-medium text-slate-900 mb-2">Nog geen vaardigheden</h3>
                  <p className="text-slate-500 text-sm mb-6">
                    Definieer vaardigheden en certificeringen voor je team.
                  </p>
                  {hasPermission('manage_schedules') && (
                    <Button onClick={() => openSkillDialog()}>
                      <Plus className="w-4 h-4 mr-2" />
                      Eerste vaardigheid toevoegen
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {skills.map((skill) => (
                  <Card key={skill.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                            <Award className="w-5 h-5 text-amber-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">{skill.name}</h3>
                            {skill.code && (
                              <p className="text-sm text-slate-500">{skill.code}</p>
                            )}
                          </div>
                        </div>
                        {hasPermission('manage_schedules') && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-slate-400">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openSkillDialog(skill)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Bewerken
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => deleteSkillMutation.mutate(skill.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Verwijderen
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{getCategoryLabel(skill.category)}</Badge>
                        {skill.expires && (
                          <Badge variant="outline" className="text-orange-600 border-orange-200">
                            Verloopt
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Function Dialog */}
      <Dialog open={functionDialogOpen} onOpenChange={closeFunctionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedFunction ? 'Functie bewerken' : 'Nieuwe functie'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleFunctionSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="func-name">Naam *</Label>
                <Input
                  id="func-name"
                  value={functionForm.name}
                  onChange={(e) => setFunctionForm({ ...functionForm, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="func-code">Code</Label>
                <Input
                  id="func-code"
                  value={functionForm.code}
                  onChange={(e) => setFunctionForm({ ...functionForm, code: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="func-desc">Beschrijving</Label>
              <Input
                id="func-desc"
                value={functionForm.description}
                onChange={(e) => setFunctionForm({ ...functionForm, description: e.target.value })}
              />
            </div>

            <div>
              <Label>Kleur</Label>
              <div className="flex gap-2 mt-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFunctionForm({ ...functionForm, color: color.value })}
                    className={`w-8 h-8 rounded-lg transition-all ${
                      functionForm.color === color.value ? 'ring-2 ring-offset-2 ring-slate-400' : ''
                    }`}
                    style={{ backgroundColor: color.value }}
                  />
                ))}
              </div>
            </div>

            {skills.length > 0 && (
              <div>
                <Label>Vereiste vaardigheden</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {skills.map((skill) => (
                    <div key={skill.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`func-skill-${skill.id}`}
                        checked={functionForm.required_skillIds.includes(skill.id)}
                        onCheckedChange={() => toggleSkillInFunction(skill.id)}
                      />
                      <Label htmlFor={`func-skill-${skill.id}`} className="text-sm font-normal cursor-pointer">
                        {skill.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={closeFunctionDialog}>
                Annuleren
              </Button>
              <Button type="submit" disabled={isFunctionSubmitting} className="bg-blue-600 hover:bg-blue-700">
                {isFunctionSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {selectedFunction ? 'Opslaan' : 'Toevoegen'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Skill Dialog */}
      <Dialog open={skillDialogOpen} onOpenChange={closeSkillDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedSkill ? 'Vaardigheid bewerken' : 'Nieuwe vaardigheid'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSkillSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="skill-name">Naam *</Label>
                <Input
                  id="skill-name"
                  value={skillForm.name}
                  onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="skill-code">Code</Label>
                <Input
                  id="skill-code"
                  value={skillForm.code}
                  onChange={(e) => setSkillForm({ ...skillForm, code: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="skill-desc">Beschrijving</Label>
              <Input
                id="skill-desc"
                value={skillForm.description}
                onChange={(e) => setSkillForm({ ...skillForm, description: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="skill-cat">Categorie</Label>
              <Select 
                value={skillForm.category} 
                onValueChange={(v) => setSkillForm({ ...skillForm, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {skillCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="skill-expires"
                checked={skillForm.expires}
                onCheckedChange={(checked) => setSkillForm({ ...skillForm, expires: checked })}
              />
              <Label htmlFor="skill-expires" className="text-sm font-normal cursor-pointer">
                Deze vaardigheid kan verlopen (bijv. certificeringen)
              </Label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={closeSkillDialog}>
                Annuleren
              </Button>
              <Button type="submit" disabled={isSkillSubmitting} className="bg-blue-600 hover:bg-blue-700">
                {isSkillSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {selectedSkill ? 'Opslaan' : 'Toevoegen'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}