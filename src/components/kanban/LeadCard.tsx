import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Building2, Mail, Phone, DollarSign, GripVertical } from 'lucide-react';
import type { Lead, Profile } from '@/hooks/useLeadData';
import LeadModal from '@/components/leads/LeadModal';
import { useStages } from '@/hooks/useLeadData';

interface Props {
  lead: Lead;
  profiles: Profile[];
  isOverlay?: boolean;
}

const LeadCard = ({ lead, profiles, isOverlay }: Props) => {
  const [showEdit, setShowEdit] = useState(false);
  const { data: stages = [] } = useStages();

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const assignee = profiles.find(p => p.user_id === lead.assigned_to);

  const content = (
    <>
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-semibold text-foreground leading-tight">{lead.name}</h4>
        {!isOverlay && (
          <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground">
            <GripVertical className="w-4 h-4" />
          </div>
        )}
      </div>

      {lead.company && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
          <Building2 className="w-3 h-3" />
          <span>{lead.company}</span>
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        {lead.value > 0 && (
          <span className="text-xs font-semibold text-success flex items-center gap-0.5">
            <DollarSign className="w-3 h-3" />
            {Number(lead.value).toLocaleString()}
          </span>
        )}
        {assignee && (
          <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-[10px] font-medium text-accent-foreground ml-auto">
            {assignee.full_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
        )}
      </div>
    </>
  );

  if (isOverlay) return <>{content}</>;

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`kanban-card ${isDragging ? 'opacity-30' : ''}`}
        onClick={() => setShowEdit(true)}
      >
        {content}
      </div>

      {showEdit && (
        <LeadModal
          lead={lead}
          stages={stages}
          profiles={profiles}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  );
};

export default LeadCard;
