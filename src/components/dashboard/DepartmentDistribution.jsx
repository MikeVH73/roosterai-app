import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ['#38bdf8', '#6366f1', '#8b5cf6', '#a78bfa', '#60a5fa', '#93c5fd', '#c4b5fd'];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="px-3 py-2 rounded-lg shadow-lg text-sm" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{payload[0].name}</p>
        <p style={{ color: payload[0].payload.fill }}>{payload[0].value} medewerkers</p>
      </div>
    );
  }
  return null;
};

export default function DepartmentDistribution({ employees, departments }) {
  const data = departments
    .map((dept, i) => ({
      name: dept.name,
      value: employees.filter(e => e.departmentIds?.includes(dept.id)).length,
      fill: COLORS[i % COLORS.length]
    }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  if (data.length === 0) return null;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Medewerkers per afdeling</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.fill} stroke="none" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-2 mt-1">
          {data.map((entry, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.fill }} />
                <span style={{ color: 'var(--color-text-secondary)' }} className="truncate max-w-[160px]">{entry.name}</span>
              </div>
              <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{entry.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}