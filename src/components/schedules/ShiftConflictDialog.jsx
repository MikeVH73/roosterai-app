import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Clock, MapPin, Building2, Trash2, Check } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';

export default function ShiftConflictDialog({
  open,
  onClose,
  conflicts,
  newShift,
  onResolve,
  employees,
  locations,
  departments
}) {
  const [selectedShifts, setSelectedShifts] = useState(new Set([newShift.id || 'new']));

  const toggleShift = (shiftId) => {
    setSelectedShifts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(shiftId)) {
        newSet.delete(shiftId);
      } else {
        newSet.add(shiftId);
      }
      return newSet;
    });
  };

  const handleResolve = () => {
    const shiftsToKeep = [];
    const shiftsToDelete = [];

    // New shift
    if (selectedShifts.has('new')) {
      shiftsToKeep.push(newShift);
    }

    // Existing shifts
    conflicts.forEach(shift => {
      if (selectedShifts.has(shift.id)) {
        shiftsToKeep.push(shift);
      } else {
        shiftsToDelete.push(shift.id);
      }
    });

    onResolve(shiftsToKeep, shiftsToDelete);
  };

  const employee = employees.find(e => e.id === newShift.employeeId);
  const allShifts = [
    { ...newShift, id: 'new', isNew: true },
    ...conflicts
  ];

  const getLocationName = (locationId) => {
    return locations.find(l => l.id === locationId)?.name || 'Onbekend';
  };

  const getDepartmentName = (departmentId) => {
    return departments.find(d => d.id === departmentId)?.name || 'Geen';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                Planning conflict gedetecteerd
              </DialogTitle>
              <p className="text-sm text-slate-600 mt-1">
                {employee?.first_name} {employee?.last_name} heeft overlappende diensten
                {newShift.date && ` op ${format(parseISO(newShift.date), 'EEEE d MMMM yyyy', { locale: nl })}`}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          <p className="text-sm text-slate-700 font-medium">
            Selecteer welke dienst(en) je wilt behouden:
          </p>

          {allShifts.map((shift) => {
            const isSelected = selectedShifts.has(shift.id);
            
            return (
              <Card 
                key={shift.id}
                className={`cursor-pointer transition-all border-2 ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => toggleShift(shift.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        {shift.isNew && (
                          <Badge className="bg-green-100 text-green-700">
                            Nieuwe dienst
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-slate-600">
                          {shift.shift_type === 'regular' ? 'Regulier' : 
                           shift.shift_type === 'overtime' ? 'Overwerk' : 
                           shift.shift_type === 'standby' ? 'Stand-by' : 
                           shift.shift_type === 'on_call' ? 'Bereikbaar' : 'Training'}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span className="font-medium text-slate-900">
                            {shift.start_time} - {shift.end_time}
                          </span>
                          {shift.break_duration > 0 && (
                            <span className="text-slate-500">
                              ({shift.break_duration} min pauze)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span>{getLocationName(shift.locationId)}</span>
                        </div>

                        {shift.departmentId && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Building2 className="w-4 h-4 text-slate-400" />
                            <span>{getDepartmentName(shift.departmentId)}</span>
                          </div>
                        )}

                        {shift.notes && (
                          <p className="text-sm text-slate-500 italic mt-2">
                            "{shift.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected 
                        ? 'bg-blue-600 border-blue-600' 
                        : 'border-slate-300'
                    }`}>
                      {isSelected && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-slate-600">
            {selectedShifts.size} van {allShifts.length} dienst(en) geselecteerd
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Annuleren
            </Button>
            <Button 
              onClick={handleResolve}
              disabled={selectedShifts.size === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Conflict oplossen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}