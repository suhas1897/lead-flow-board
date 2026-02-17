import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useCreateLead, useUpdateLead, useDeleteLead, type Lead, type Stage, type Profile } from '@/hooks/useLeadData';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Loader2, Trash2 } from 'lucide-react';

interface Props {
  lead?: Lead;
  stages: Stage[];
  profiles: Profile[];
  onClose: () => void;
}

const LeadModal = ({ lead, stages, profiles, onClose }: Props) => {
  const isEdit = !!lead;
  const { isAdmin, isManager } = useAuth();
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();

  const [form, setForm] = useState({
    name: lead?.name || '',
    company: lead?.company || '',
    phone: lead?.phone || '',
    email: lead?.email || '',
    source: lead?.source || '',
    assigned_to: lead?.assigned_to || '',
    value: lead?.value?.toString() || '0',
    notes: lead?.notes || '',
    stage_id: lead?.stage_id || stages[0]?.id || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        company: form.company || null,
        phone: form.phone || null,
        email: form.email || null,
        source: form.source || null,
        assigned_to: form.assigned_to || null,
        value: parseFloat(form.value) || 0,
        notes: form.notes || null,
        stage_id: form.stage_id || null,
      };

      if (isEdit) {
        await updateLead.mutateAsync({ id: lead.id, ...payload });
        toast({ title: 'Lead updated' });
      } else {
        await createLead.mutateAsync(payload);
        toast({ title: 'Lead created' });
      }
      onClose();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteLead.mutateAsync(lead!.id);
      toast({ title: 'Lead deleted' });
      onClose();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const loading = createLead.isPending || updateLead.isPending;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Stage</Label>
              <Select value={form.stage_id} onValueChange={v => setForm(f => ({ ...f, stage_id: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Value ($)</Label>
              <Input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Source</Label>
              <Input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="e.g. Website, Referral" />
            </div>
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <Select value={form.assigned_to} onValueChange={v => setForm(f => ({ ...f, assigned_to: v }))}>
                <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  {profiles.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || p.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
          </div>

          <div className="flex items-center justify-between pt-2">
            {isEdit && (isAdmin || isManager) && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Lead</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone. This will permanently delete this lead.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                {isEdit ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeadModal;
