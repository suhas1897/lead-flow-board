import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, Users, TrendingUp, Target } from 'lucide-react';
import type { Stage, Lead } from '@/hooks/useLeadData';

interface Props {
  stages: Stage[];
  leads: Lead[];
}

const CHART_COLORS = ['#6366f1', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444', '#ec4899', '#14b8a6'];

const DashboardView = ({ stages, leads }: Props) => {
  const stats = useMemo(() => {
    const totalLeads = leads.length;
    const totalValue = leads.reduce((sum, l) => sum + Number(l.value || 0), 0);
    const wonStage = stages.find(s => s.name.toLowerCase().includes('won'));
    const wonLeads = wonStage ? leads.filter(l => l.stage_id === wonStage.id).length : 0;
    const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : '0';

    const byStage = stages.map((s, i) => ({
      name: s.name,
      count: leads.filter(l => l.stage_id === s.id).length,
      value: leads.filter(l => l.stage_id === s.id).reduce((sum, l) => sum + Number(l.value || 0), 0),
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));

    return { totalLeads, totalValue, conversionRate, wonLeads, byStage };
  }, [stages, leads]);

  return (
    <div className="p-6 overflow-y-auto h-full space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Leads" value={stats.totalLeads.toString()} color="primary" />
        <StatCard icon={DollarSign} label="Pipeline Value" value={`$${stats.totalValue.toLocaleString()}`} color="success" />
        <StatCard icon={TrendingUp} label="Conversion Rate" value={`${stats.conversionRate}%`} color="info" />
        <StatCard icon={Target} label="Won Deals" value={stats.wonLeads.toString()} color="warning" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="stat-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Leads by Stage</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.byStage}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {stats.byStage.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="stat-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Pipeline Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={stats.byStage.filter(s => s.count > 0)}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={50}
                paddingAngle={2}
              >
                {stats.byStage.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {stats.byStage.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const colorMap: Record<string, { bg: string; text: string }> = {
  primary: { bg: 'bg-primary/10', text: 'text-primary' },
  success: { bg: 'bg-success/10', text: 'text-success' },
  info: { bg: 'bg-info/10', text: 'text-info' },
  warning: { bg: 'bg-warning/10', text: 'text-warning' },
};

const StatCard = ({ icon: Icon, label, value, color }: {
  icon: any; label: string; value: string; color: string;
}) => {
  const c = colorMap[color] || colorMap.primary;
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
