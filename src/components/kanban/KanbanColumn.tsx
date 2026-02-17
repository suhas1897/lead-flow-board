import { useDroppable } from '@dnd-kit/core';
import type { Stage } from '@/hooks/useLeadData';

interface Props {
  stage: Stage;
  count: number;
  children: React.ReactNode;
}

const KanbanColumn = ({ stage, count, children }: Props) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div
      ref={setNodeRef}
      className={`kanban-column flex-shrink-0 transition-colors duration-200 ${
        isOver ? 'ring-2 ring-primary/30 bg-accent/50' : ''
      }`}
      style={{ width: 320 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
          <h3 className="text-sm font-semibold text-foreground">{stage.name}</h3>
        </div>
        <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
          {count}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin">
        {children}
        {count === 0 && (
          <div className="flex items-center justify-center h-24 text-sm text-muted-foreground/50">
            Drop leads here
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
