import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import KanbanColumn from './KanbanColumn';
import LeadCard from './LeadCard';
import { useMoveLead, type Stage, type Lead, type Profile } from '@/hooks/useLeadData';

interface Props {
  stages: Stage[];
  leads: Lead[];
  profiles: Profile[];
}

const KanbanBoard = ({ stages, leads, profiles }: Props) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const moveLead = useMoveLead();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const activeLead = activeId ? leads.find(l => l.id === activeId) : null;

  const getLeadsForStage = useCallback(
    (stageId: string) => leads.filter(l => l.stage_id === stageId).sort((a, b) => a.position - b.position),
    [leads]
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const leadId = active.id as string;
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    // Determine target stage - over could be a lead or a stage column
    let toStageId: string;
    const overLead = leads.find(l => l.id === over.id);
    if (overLead) {
      toStageId = overLead.stage_id!;
    } else {
      toStageId = over.id as string;
    }

    if (lead.stage_id === toStageId) return;

    const stageLeads = leads.filter(l => l.stage_id === toStageId);
    moveLead.mutate({
      leadId,
      fromStageId: lead.stage_id,
      toStageId,
      position: stageLeads.length,
    });
  };

  return (
    <div className="flex-1 overflow-x-auto p-6">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 h-full">
          {stages.map(stage => {
            const stageLeads = getLeadsForStage(stage.id);
            return (
              <KanbanColumn key={stage.id} stage={stage} count={stageLeads.length}>
                <SortableContext items={stageLeads.map(l => l.id)} strategy={verticalListSortingStrategy}>
                  {stageLeads.map(lead => (
                    <LeadCard key={lead.id} lead={lead} profiles={profiles} />
                  ))}
                </SortableContext>
              </KanbanColumn>
            );
          })}
        </div>

        <DragOverlay>
          {activeLead ? (
            <div className="kanban-card dragging">
              <LeadCard lead={activeLead} profiles={profiles} isOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default KanbanBoard;
