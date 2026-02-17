import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStages, useLeads, useProfiles } from '@/hooks/useLeadData';
import AppSidebar from '@/components/layout/AppSidebar';
import KanbanBoard from '@/components/kanban/KanbanBoard';
import DashboardView from '@/components/dashboard/DashboardView';
import LeadModal from '@/components/leads/LeadModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Search, LayoutDashboard, Columns3, Loader2 } from 'lucide-react';

type View = 'board' | 'dashboard';

const Pipeline = () => {
  const { user } = useAuth();
  const { data: stages = [], isLoading: stagesLoading } = useStages();
  const { data: leads = [], isLoading: leadsLoading } = useLeads();
  const { data: profiles = [] } = useProfiles();
  const [view, setView] = useState<View>('board');
  const [search, setSearch] = useState('');
  const [showAddLead, setShowAddLead] = useState(false);

  const filteredLeads = useMemo(() => {
    if (!search.trim()) return leads;
    const q = search.toLowerCase();
    return leads.filter(l =>
      l.name.toLowerCase().includes(q) ||
      l.company?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q)
    );
  }, [leads, search]);

  if (stagesLoading || leadsLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-foreground">Pipeline</h1>
            <div className="flex items-center bg-secondary rounded-lg p-0.5">
              <button
                onClick={() => setView('board')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  view === 'board' ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Columns3 className="w-4 h-4" /> Board
              </button>
              <button
                onClick={() => setView('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  view === 'dashboard' ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Button onClick={() => setShowAddLead(true)} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Add Lead
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-hidden">
          {view === 'board' ? (
            <KanbanBoard stages={stages} leads={filteredLeads} profiles={profiles} />
          ) : (
            <DashboardView stages={stages} leads={leads} />
          )}
        </main>
      </div>

      {showAddLead && (
        <LeadModal
          stages={stages}
          profiles={profiles}
          onClose={() => setShowAddLead(false)}
        />
      )}
    </div>
  );
};

export default Pipeline;
