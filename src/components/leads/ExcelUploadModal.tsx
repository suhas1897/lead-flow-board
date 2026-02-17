import { useState, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import type { Stage } from '@/hooks/useLeadData';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, XCircle, Loader2, X } from 'lucide-react';

type Step = 'upload' | 'mapping' | 'preview' | 'result';

interface ParsedRow {
  [key: string]: string | number | null;
}

interface ColumnMapping {
  name: string;
  company: string;
  phone: string;
  email: string;
  source: string;
  value: string;
  notes: string;
}

interface ImportResult {
  inserted: number;
  duplicates: number;
  errors: number;
  details: string[];
}

const SYSTEM_FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: 'name', label: 'Lead Name', required: true },
  { key: 'company', label: 'Company' },
  { key: 'phone', label: 'Phone', required: true },
  { key: 'email', label: 'Email', required: true },
  { key: 'source', label: 'Source' },
  { key: 'value', label: 'Value ($)' },
  { key: 'notes', label: 'Notes' },
];

const UNMAPPED = '__unmapped__';

interface Props {
  stages: Stage[];
  onClose: () => void;
}

const ExcelUploadModal = ({ stages, onClose }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    name: UNMAPPED, company: UNMAPPED, phone: UNMAPPED, email: UNMAPPED,
    source: UNMAPPED, value: UNMAPPED, notes: UNMAPPED,
  });
  const [stageId, setStageId] = useState(stages[0]?.id || '');
  const [duplicateHandling, setDuplicateHandling] = useState<'skip' | 'overwrite'>('skip');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((file: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(file.type) && !['xlsx', 'xls', 'csv'].includes(ext || '')) {
      toast({ title: 'Invalid file', description: 'Please upload .xlsx, .xls, or .csv', variant: 'destructive' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 10MB', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<ParsedRow>(ws, { defval: '' });

        if (json.length === 0) {
          toast({ title: 'Empty file', description: 'No data found', variant: 'destructive' });
          return;
        }

        const hdrs = Object.keys(json[0]);
        setHeaders(hdrs);
        setRows(json.slice(0, 5000));
        setFileName(file.name);

        // Auto-map columns
        const autoMap: ColumnMapping = { ...mapping };
        const lowerMap: Record<string, string> = {};
        hdrs.forEach(h => { lowerMap[h.toLowerCase().trim()] = h; });

        const aliases: Record<string, string[]> = {
          name: ['name', 'lead name', 'full name', 'contact name', 'lead'],
          company: ['company', 'company name', 'organization', 'org'],
          phone: ['phone', 'phone number', 'mobile', 'tel', 'telephone', 'contact number'],
          email: ['email', 'email address', 'e-mail', 'mail'],
          source: ['source', 'lead source', 'origin', 'channel'],
          value: ['value', 'deal value', 'amount', 'deal amount', 'revenue', 'deal size'],
          notes: ['notes', 'note', 'comments', 'comment', 'description', 'remarks'],
        };

        for (const [field, aliasList] of Object.entries(aliases)) {
          for (const alias of aliasList) {
            if (lowerMap[alias]) {
              (autoMap as any)[field] = lowerMap[alias];
              break;
            }
          }
        }

        setMapping(autoMap);
        setStep('mapping');
      } catch {
        toast({ title: 'Parse error', description: 'Could not read file', variant: 'destructive' });
      }
    };
    reader.readAsArrayBuffer(file);
  }, [mapping]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const requiredMapped = mapping.name !== UNMAPPED && mapping.phone !== UNMAPPED && mapping.email !== UNMAPPED;

  const previewData = useMemo(() => {
    return rows.slice(0, 20).map(row => ({
      name: mapping.name !== UNMAPPED ? String(row[mapping.name] || '') : '',
      company: mapping.company !== UNMAPPED ? String(row[mapping.company] || '') : '',
      phone: mapping.phone !== UNMAPPED ? String(row[mapping.phone] || '') : '',
      email: mapping.email !== UNMAPPED ? String(row[mapping.email] || '') : '',
      source: mapping.source !== UNMAPPED ? String(row[mapping.source] || '') : '',
      value: mapping.value !== UNMAPPED ? String(row[mapping.value] || '0') : '0',
      notes: mapping.notes !== UNMAPPED ? String(row[mapping.notes] || '') : '',
    }));
  }, [rows, mapping]);

  const handleImport = async () => {
    setImporting(true);
    const importResult: ImportResult = { inserted: 0, duplicates: 0, errors: 0, details: [] };

    try {
      // Fetch existing leads for duplicate check
      const { data: existingLeads } = await supabase
        .from('leads')
        .select('phone, email');

      const existingPhones = new Set((existingLeads || []).map(l => l.phone?.toLowerCase().replace(/\s/g, '')).filter(Boolean));
      const existingEmails = new Set((existingLeads || []).map(l => l.email?.toLowerCase().trim()).filter(Boolean));

      const toInsert: any[] = [];
      const toUpdate: { phone?: string; email?: string; data: any }[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = mapping.name !== UNMAPPED ? String(row[mapping.name] || '').trim() : '';
        const phone = mapping.phone !== UNMAPPED ? String(row[mapping.phone] || '').trim() : '';
        const email = mapping.email !== UNMAPPED ? String(row[mapping.email] || '').trim() : '';

        if (!name) {
          importResult.errors++;
          importResult.details.push(`Row ${i + 2}: Missing name`);
          continue;
        }
        if (!phone && !email) {
          importResult.errors++;
          importResult.details.push(`Row ${i + 2}: Missing phone and email`);
          continue;
        }

        const normalPhone = phone.toLowerCase().replace(/\s/g, '');
        const normalEmail = email.toLowerCase().trim();
        const isDuplicate = (normalPhone && existingPhones.has(normalPhone)) || (normalEmail && existingEmails.has(normalEmail));

        const leadData = {
          name,
          company: mapping.company !== UNMAPPED ? String(row[mapping.company] || '') || null : null,
          phone: phone || null,
          email: email || null,
          source: mapping.source !== UNMAPPED ? String(row[mapping.source] || '') || null : null,
          value: mapping.value !== UNMAPPED ? parseFloat(String(row[mapping.value])) || 0 : 0,
          notes: mapping.notes !== UNMAPPED ? String(row[mapping.notes] || '') || null : null,
          stage_id: stageId,
          created_by: user?.id,
        };

        if (isDuplicate) {
          if (duplicateHandling === 'skip') {
            importResult.duplicates++;
            continue;
          }
          toUpdate.push({ phone: normalPhone || undefined, email: normalEmail || undefined, data: leadData });
        } else {
          toInsert.push(leadData);
          if (normalPhone) existingPhones.add(normalPhone);
          if (normalEmail) existingEmails.add(normalEmail);
        }
      }

      // Batch insert
      if (toInsert.length > 0) {
        const batchSize = 500;
        for (let i = 0; i < toInsert.length; i += batchSize) {
          const batch = toInsert.slice(i, i + batchSize);
          const { error } = await supabase.from('leads').insert(batch);
          if (error) {
            importResult.errors += batch.length;
            importResult.details.push(`Batch insert error: ${error.message}`);
          } else {
            importResult.inserted += batch.length;
          }
        }
      }

      // Handle overwrites
      for (const item of toUpdate) {
        let query = supabase.from('leads').update(item.data);
        if (item.email) query = query.eq('email', item.email);
        else if (item.phone) query = query.eq('phone', item.phone);

        const { error } = await query;
        if (error) {
          importResult.errors++;
          importResult.details.push(`Update error: ${error.message}`);
        } else {
          importResult.inserted++;
          importResult.duplicates++;
        }
      }

      setResult(importResult);
      setStep('result');
      qc.invalidateQueries({ queryKey: ['leads'] });
    } catch (err: any) {
      toast({ title: 'Import failed', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            {step === 'upload' && 'Upload Excel / CSV'}
            {step === 'mapping' && 'Map Columns'}
            {step === 'preview' && 'Preview Import'}
            {step === 'result' && 'Import Results'}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload a spreadsheet to bulk import leads'}
            {step === 'mapping' && 'Match your file columns to lead fields'}
            {step === 'preview' && `${rows.length} rows ready to import`}
            {step === 'result' && 'Import complete'}
          </DialogDescription>
        </DialogHeader>

        {/* Upload Step */}
        {step === 'upload' && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
              dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
            onClick={() => document.getElementById('excel-input')?.click()}
          >
            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              Drop your file here or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports .xlsx, .xls, .csv (max 10MB)
            </p>
            <input
              id="excel-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleInputChange}
            />
          </div>
        )}

        {/* Mapping Step */}
        {step === 'mapping' && (
          <div className="space-y-4 overflow-y-auto flex-1">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{fileName}</span>
              <Badge variant="secondary">{rows.length} rows</Badge>
              <Badge variant="secondary">{headers.length} columns</Badge>
            </div>

            <div className="grid gap-3">
              {SYSTEM_FIELDS.map(field => (
                <div key={field.key} className="flex items-center gap-3">
                  <Label className="w-28 text-sm flex items-center gap-1">
                    {field.label}
                    {field.required && <span className="text-destructive">*</span>}
                  </Label>
                  <Select
                    value={(mapping as any)[field.key]}
                    onValueChange={v => setMapping(m => ({ ...m, [field.key]: v }))}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNMAPPED}>— Not mapped —</SelectItem>
                      {headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Label className="w-28 text-sm">Import to Stage</Label>
              <Select value={stageId} onValueChange={setStageId}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Label className="w-28 text-sm">Duplicates</Label>
              <Select value={duplicateHandling} onValueChange={v => setDuplicateHandling(v as any)}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip">Skip duplicates</SelectItem>
                  <SelectItem value="overwrite">Overwrite duplicates</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!requiredMapped && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertTriangle className="w-4 h-4" />
                Name, Phone, and Email are required fields
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
              <Button onClick={() => setStep('preview')} disabled={!requiredMapped}>
                Preview Import
              </Button>
            </div>
          </div>
        )}

        {/* Preview Step */}
        {step === 'preview' && (
          <div className="flex flex-col flex-1 overflow-hidden gap-4">
            <ScrollArea className="flex-1 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Company</TableHead>
                    <TableHead className="text-xs">Phone</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{row.name}</TableCell>
                      <TableCell className="text-xs">{row.company}</TableCell>
                      <TableCell className="text-xs">{row.phone}</TableCell>
                      <TableCell className="text-xs">{row.email}</TableCell>
                      <TableCell className="text-xs">${row.value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              Showing {previewData.length} of {rows.length} rows
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('mapping')}>Back</Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Import {rows.length} Leads
              </Button>
            </div>
          </div>
        )}

        {/* Result Step */}
        {step === 'result' && result && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-lg bg-emerald-500/10 text-center">
                <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-500" />
                <p className="text-2xl font-bold text-emerald-500">{result.inserted}</p>
                <p className="text-xs text-muted-foreground">Inserted</p>
              </div>
              <div className="p-4 rounded-lg bg-amber-500/10 text-center">
                <AlertTriangle className="w-6 h-6 mx-auto mb-1 text-amber-500" />
                <p className="text-2xl font-bold text-amber-500">{result.duplicates}</p>
                <p className="text-xs text-muted-foreground">Duplicates</p>
              </div>
              <div className="p-4 rounded-lg bg-destructive/10 text-center">
                <XCircle className="w-6 h-6 mx-auto mb-1 text-destructive" />
                <p className="text-2xl font-bold text-destructive">{result.errors}</p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </div>
            </div>

            {result.details.length > 0 && (
              <ScrollArea className="max-h-32 border rounded-lg p-3">
                {result.details.map((d, i) => (
                  <p key={i} className="text-xs text-muted-foreground">{d}</p>
                ))}
              </ScrollArea>
            )}

            <div className="flex justify-end">
              <Button onClick={onClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExcelUploadModal;
