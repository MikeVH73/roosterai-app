import React, { useState } from 'react';
import { useCompany } from '@/components/providers/CompanyProvider';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import TopBar from '@/components/layout/TopBar';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

const testCases = [
  {
    id: 1,
    category: 'Planning & Roosters',
    name: 'Automatisch rooster genereren',
    description: 'Test of AI een compleet rooster kan maken op basis van behoeftes',
    prompt: 'Genereer een rooster voor volgende week met alle beschikbare medewerkers. Houd rekening met contracturen en rusttijden.',
    expectedResult: 'Compleet rooster met alle diensten ingevuld'
  },
  {
    id: 2,
    category: 'Planning & Roosters',
    name: 'Vervangingen suggereren',
    description: 'Test vervanging bij uitval/ziekte',
    prompt: 'Medewerker {{employee}} is ziek op {{date}}. Wie kan vervangen?',
    expectedResult: 'Lijst met 3 geschikte vervangers met redenen'
  },
  {
    id: 3,
    category: 'Planning & Roosters',
    name: 'Rooster optimaliseren',
    description: 'Test rooster verbeteren qua efficiency',
    prompt: 'Analyseer rooster {{schedule}} en geef optimalisatie suggesties voor betere verdeling.',
    expectedResult: 'Concrete verbeteringsvoorstellen'
  },
  {
    id: 4,
    category: 'Planning & Roosters',
    name: 'Conflicten oplossen',
    description: 'Test detectie van dubbele boekingen en rusttijd schendingen',
    prompt: 'Check rooster {{schedule}} op conflicten: dubbele diensten, te weinig rust tussen diensten.',
    expectedResult: 'Lijst met gevonden conflicten en oplossingen'
  },
  {
    id: 5,
    category: 'Personeelsbeheer',
    name: 'Geschikte medewerkers vinden',
    description: 'Test skill matching voor specifieke dienst',
    prompt: 'Wie kan werken op {{date}} in afdeling {{department}} met vaardigheden {{skills}}?',
    expectedResult: 'Lijst medewerkers met juiste skills en beschikbaarheid'
  },
  {
    id: 6,
    category: 'Personeelsbeheer',
    name: 'Werkdruk analyseren',
    description: 'Test identificatie van over/onderbelasting',
    prompt: 'Analyseer de werkdruk van alle medewerkers deze maand. Wie werkt te veel of te weinig?',
    expectedResult: 'Overzicht met over- en onderbelaste medewerkers'
  },
  {
    id: 7,
    category: 'Personeelsbeheer',
    name: 'Vaardigheden matchen',
    description: 'Test skill-based planning',
    prompt: 'Voor functie {{function}} zijn deze vaardigheden nodig: {{skills}}. Wie voldoet?',
    expectedResult: 'Lijst gekwalificeerde medewerkers'
  },
  {
    id: 8,
    category: 'Verzoeken & Communicatie',
    name: 'Verlofverzoeken beoordelen',
    description: 'Test impact analyse verlof',
    prompt: 'Medewerker {{employee}} vraagt verlof van {{startDate}} tot {{endDate}}. Wat is de impact?',
    expectedResult: 'Impact analyse met goedkeuringsadvies'
  },
  {
    id: 9,
    category: 'Verzoeken & Communicatie',
    name: 'Ruilverzoeken verwerken',
    description: 'Test dienstruil geschiktheid',
    prompt: '{{employee1}} wil dienst ruilen met {{employee2}} op {{date}}. Is dit geschikt?',
    expectedResult: 'Geschiktheid check met alternatieven indien nodig'
  },
  {
    id: 10,
    category: 'Verzoeken & Communicatie',
    name: 'WhatsApp berichten opstellen',
    description: 'Test automatische berichtgeneratie',
    prompt: 'Stel een WhatsApp bericht op voor vervangingsverzoek aan {{employee}} voor dienst op {{date}}.',
    expectedResult: 'Professioneel WhatsApp bericht'
  },
  {
    id: 11,
    category: 'Analyse & Inzichten',
    name: 'Trends identificeren',
    description: 'Test patroonherkenning',
    prompt: 'Analyseer de laatste 3 maanden. Welke trends zie je in ziekteverzuim en dienstruilen?',
    expectedResult: 'Overzicht van geïdentificeerde trends'
  },
  {
    id: 12,
    category: 'Analyse & Inzichten',
    name: 'Kosten voorspellen',
    description: 'Test loonkosten berekening',
    prompt: 'Bereken de verwachte loonkosten voor rooster {{schedule}} op basis van uurtarieven.',
    expectedResult: 'Totale kosten met breakdown per medewerker'
  },
  {
    id: 13,
    category: 'Analyse & Inzichten',
    name: 'Bezetting voorspellen',
    description: 'Test toekomstige personeelsbehoefte',
    prompt: 'Op basis van historische data, hoeveel personeel hebben we nodig volgende maand?',
    expectedResult: 'Voorspelling met onderbouwing'
  },
  {
    id: 14,
    category: 'Analyse & Inzichten',
    name: 'Rapportages maken',
    description: 'Test data analyse en rapportage',
    prompt: 'Maak een maandrapport met: aantal diensten, ziekteverzuim, overuren, kosten.',
    expectedResult: 'Gestructureerd rapport met cijfers'
  },
  {
    id: 15,
    category: 'Strategische Planning',
    name: 'Alternatieve roosters vergelijken',
    description: 'Test scenario analyse',
    prompt: 'Vergelijk 2 roosteropties: optie A met meer parttime, optie B met meer fulltime. Wat is beter?',
    expectedResult: 'Vergelijking met voor- en nadelen'
  },
  {
    id: 16,
    category: 'Strategische Planning',
    name: 'Best practices suggereren',
    description: 'Test data-gedreven adviezen',
    prompt: 'Op basis van onze historische data, wat zijn best practices voor efficiënte roostering?',
    expectedResult: 'Concrete best practice adviezen'
  },
  {
    id: 17,
    category: 'Strategische Planning',
    name: 'Capaciteitsplanning',
    description: 'Test langetermijn personeelsbehoefte',
    prompt: 'We verwachten 20% groei volgend kwartaal. Hoeveel extra personeel nodig en welke functies?',
    expectedResult: 'Capaciteitsplan met aantallen en functies'
  }
];

export default function AITestSuite() {
  const { currentCompany, canUseAI } = useCompany();
  const companyId = currentCompany?.id;

  const [testResults, setTestResults] = useState({});
  const [currentTest, setCurrentTest] = useState(null);
  const [testInput, setTestInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules', companyId],
    queryFn: () => base44.entities.Schedule.filter({ companyId }),
    enabled: !!companyId
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => base44.entities.EmployeeProfile.filter({ companyId }),
    enabled: !!companyId
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments', companyId],
    queryFn: () => base44.entities.Department.filter({ companyId }),
    enabled: !!companyId
  });

  const runTest = async (testCase) => {
    if (!canUseAI()) {
      alert('AI limiet bereikt');
      return;
    }

    setCurrentTest(testCase.id);
    setIsRunning(true);

    try {
      // Replace placeholders in prompt
      let finalPrompt = testInput || testCase.prompt;
      finalPrompt = finalPrompt.replace('{{schedule}}', schedules[0]?.name || 'het rooster');
      finalPrompt = finalPrompt.replace('{{employee}}', employees[0]?.first_name || 'de medewerker');
      finalPrompt = finalPrompt.replace('{{employee1}}', employees[0]?.first_name || 'medewerker 1');
      finalPrompt = finalPrompt.replace('{{employee2}}', employees[1]?.first_name || 'medewerker 2');
      finalPrompt = finalPrompt.replace('{{department}}', departments[0]?.name || 'de afdeling');
      finalPrompt = finalPrompt.replace('{{date}}', new Date().toISOString().split('T')[0]);
      finalPrompt = finalPrompt.replace('{{startDate}}', new Date().toISOString().split('T')[0]);
      finalPrompt = finalPrompt.replace('{{endDate}}', new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]);
      finalPrompt = finalPrompt.replace('{{skills}}', 'BHV, EHBO');
      finalPrompt = finalPrompt.replace('{{function}}', 'Verpleegkundige');

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Je bent de AI Planning Assistent voor ${currentCompany?.name}.
        
Context:
- Aantal medewerkers: ${employees.length}
- Aantal afdelingen: ${departments.length}
- Actieve roosters: ${schedules.filter(s => s.status !== 'archived').length}

Test vraag: ${finalPrompt}

Geef een gedetailleerd antwoord met concrete informatie.`,
        response_json_schema: {
          type: "object",
          properties: {
            answer: { type: "string", description: "Het antwoord op de vraag" },
            success: { type: "boolean", description: "Of de test geslaagd is" },
            details: { type: "string", description: "Extra details of toelichting" }
          }
        }
      });

      setTestResults({
        ...testResults,
        [testCase.id]: {
          status: response.success ? 'passed' : 'failed',
          response: response.answer,
          details: response.details,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      setTestResults({
        ...testResults,
        [testCase.id]: {
          status: 'error',
          response: error.message,
          timestamp: new Date().toISOString()
        }
      });
    } finally {
      setIsRunning(false);
      setCurrentTest(null);
      setTestInput('');
    }
  };

  const categories = [...new Set(testCases.map(t => t.category))];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <TopBar 
        title="AI Test Suite" 
        subtitle="Test alle AI functionaliteiten"
      />

      <div className="p-6 max-w-7xl mx-auto">
        <Alert className="mb-6" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          <Sparkles className="h-4 h-4" style={{ color: 'var(--color-accent)' }} />
          <AlertDescription style={{ color: 'var(--color-text-secondary)' }}>
            Test alle 17 AI functionaliteiten systematisch. AI gebruik: {currentCompany?.ai_actions_used || 0} / {currentCompany?.ai_actions_limit || 300}
          </AlertDescription>
        </Alert>

        {categories.map((category) => (
          <div key={category} className="mb-8">
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              {category}
            </h2>
            
            <div className="space-y-3">
              {testCases.filter(t => t.category === category).map((test) => {
                const result = testResults[test.id];
                const isActive = currentTest === test.id;

                return (
                  <Card 
                    key={test.id} 
                    className="border-0 shadow-sm"
                    style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline" style={{ color: 'var(--color-text-secondary)' }}>
                              Test {test.id}
                            </Badge>
                            <CardTitle className="text-base" style={{ color: 'var(--color-text-primary)' }}>
                              {test.name}
                            </CardTitle>
                            {result && (
                              result.status === 'passed' ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                              ) : result.status === 'failed' ? (
                                <XCircle className="w-5 h-5 text-red-600" />
                              ) : (
                                <Clock className="w-5 h-5 text-orange-600" />
                              )
                            )}
                          </div>
                          <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                            {test.description}
                          </p>
                          <p className="text-xs font-mono rounded px-2 py-1 inline-block" style={{ backgroundColor: 'var(--color-surface-light)', color: 'var(--color-text-muted)' }}>
                            Verwacht: {test.expectedResult}
                          </p>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      {!result && !isActive && (
                        <div className="space-y-3">
                          <Textarea
                            placeholder={test.prompt}
                            value={testInput}
                            onChange={(e) => setTestInput(e.target.value)}
                            rows={2}
                            className="text-sm"
                          />
                          <Button 
                            onClick={() => runTest(test)}
                            disabled={isRunning || !canUseAI()}
                            size="sm"
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Test uitvoeren
                          </Button>
                        </div>
                      )}

                      {isActive && (
                        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Test wordt uitgevoerd...
                        </div>
                      )}

                      {result && (
                        <div className="space-y-3">
                          <div 
                            className="rounded-lg p-4"
                            style={{ backgroundColor: 'var(--color-surface-light)' }}
                          >
                            <p className="font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                              AI Antwoord:
                            </p>
                            <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>
                              {result.response}
                            </p>
                            {result.details && (
                              <p className="text-xs mt-2 pt-2" style={{ 
                                color: 'var(--color-text-muted)', 
                                borderTop: '1px solid var(--color-border)' 
                              }}>
                                {result.details}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const newResults = { ...testResults };
                                delete newResults[test.id];
                                setTestResults(newResults);
                              }}
                            >
                              Opnieuw testen
                            </Button>
                            <Badge 
                              className={
                                result.status === 'passed' 
                                  ? 'bg-green-100 text-green-700'
                                  : result.status === 'failed'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-orange-100 text-orange-700'
                              }
                            >
                              {result.status === 'passed' ? 'Geslaagd' : result.status === 'failed' ? 'Mislukt' : 'Fout'}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}

        {/* Summary */}
        <Card className="mt-8 border-0 shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              Test Resultaten
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>Geslaagd</p>
                <p className="text-2xl font-bold text-green-600">
                  {Object.values(testResults).filter(r => r.status === 'passed').length}
                </p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>Mislukt</p>
                <p className="text-2xl font-bold text-red-600">
                  {Object.values(testResults).filter(r => r.status === 'failed').length}
                </p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>Nog te testen</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {testCases.length - Object.keys(testResults).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}