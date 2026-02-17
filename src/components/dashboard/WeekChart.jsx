import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from 'lucide-react';

const DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="px-3 py-2 rounded-lg shadow-lg text-sm" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
        <p style={{ color: 'var(--color-accent)' }}>{payload[0].value} diensten</p>
      </div>
    );
  }
  return null;
};

export default function WeekChart({ shifts, weekStart }) {
  const today = new Date();

  const data = DAYS.map((day, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const dateStr = date.toISOString().split('T')[0];
    const count = shifts.filter(s => s.date === dateStr).length;
    const isToday = date.toDateString() === today.toDateString();
    return { day, count, isToday };
  });

  const totalHours = shifts.length;
  const peakDay = data.reduce((max, d) => d.count > max.count ? d : max, data[0]);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Diensten deze week</CardTitle>
          <div className="flex items-center gap-1 text-green-500 text-sm font-medium">
            <TrendingUp className="w-4 h-4" />
            <span>Drukste dag: {peakDay?.day}</span>
          </div>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {totalHours} diensten totaal
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} barSize={28} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(56,189,248,0.07)' }} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.isToday ? '#38bdf8' : entry.count === peakDay?.count && entry.count > 0 ? '#6366f1' : 'var(--color-surface-light)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{backgroundColor:'#38bdf8'}} /> Vandaag</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{backgroundColor:'#6366f1'}} /> Drukste dag</span>
        </div>
      </CardContent>
    </Card>
  );
}