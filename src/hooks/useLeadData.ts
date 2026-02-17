import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Stage {
  id: string;
  name: string;
  color: string;
  position: number;
}

export interface Lead {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  assigned_to: string | null;
  value: number;
  notes: string | null;
  stage_id: string | null;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  user_id: string;
  full_name: string;
  email: string;
}

export const useStages = () => {
  return useQuery({
    queryKey: ['stages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stages')
        .select('*')
        .order('position');
      if (error) throw error;
      return data as Stage[];
    },
  });
};

export const useLeads = () => {
  return useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('position');
      if (error) throw error;
      return data as Lead[];
    },
  });
};

export const useProfiles = () => {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email');
      if (error) throw error;
      return data as Profile[];
    },
  });
};

export const useCreateLead = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (lead: Partial<Lead>) => {
      const insertData = { ...lead, created_by: user?.id } as any;
      const { data, error } = await supabase
        .from('leads')
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
};

export const useUpdateLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Lead> & { id: string }) => {
      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
};

export const useDeleteLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
};

export const useMoveLead = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ leadId, fromStageId, toStageId, position }: {
      leadId: string; fromStageId: string | null; toStageId: string; position: number;
    }) => {
      const [leadRes] = await Promise.all([
        supabase.from('leads').update({ stage_id: toStageId, position }).eq('id', leadId).select().single(),
        supabase.from('activity_logs').insert({
          lead_id: leadId,
          user_id: user?.id,
          action: 'stage_change',
          from_stage_id: fromStageId,
          to_stage_id: toStageId,
        }),
      ]);
      if (leadRes.error) throw leadRes.error;
      return leadRes.data;
    },
    onMutate: async ({ leadId, toStageId, position }) => {
      await qc.cancelQueries({ queryKey: ['leads'] });
      const prev = qc.getQueryData<Lead[]>(['leads']);
      qc.setQueryData<Lead[]>(['leads'], (old) =>
        old?.map(l => l.id === leadId ? { ...l, stage_id: toStageId, position } : l)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['leads'], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
};
