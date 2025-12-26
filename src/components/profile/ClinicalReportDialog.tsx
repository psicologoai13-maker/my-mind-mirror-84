import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface ReportData {
  userName: string;
  periodDays: number;
  generatedAt: string;
  stats: {
    avgMood: string;
    avgAnxiety: string;
    totalSessions: number;
    totalCheckins: number;
    wellnessScore: number;
  };
  keyEvents: string[];
  topEmotions: string[];
  topThemes: string[];
  clinicalSummary: string;
}

const ClinicalReportDialog: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);

  const generatePDF = (report: ReportData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let yPos = 20;

    // Header
    doc.setFillColor(34, 139, 34); // Forest green
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Report Benessere', margin, 25);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`${report.userName} - ${format(new Date(report.generatedAt), 'd MMMM yyyy', { locale: it })}`, margin, 35);

    yPos = 55;

    // Period info
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.text(`Periodo analizzato: ultimi ${report.periodDays} giorni`, margin, yPos);
    yPos += 15;

    // Stats box
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin, yPos, contentWidth, 35, 3, 3, 'F');
    
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    
    const statsY = yPos + 12;
    const colWidth = contentWidth / 4;
    
    doc.text('Umore Medio', margin + 10, statsY);
    doc.text('Ansia Media', margin + colWidth + 10, statsY);
    doc.text('Sessioni', margin + colWidth * 2 + 10, statsY);
    doc.text('Check-in', margin + colWidth * 3 + 10, statsY);
    
    doc.setFontSize(14);
    doc.setTextColor(34, 139, 34);
    doc.text(`${report.stats.avgMood}/10`, margin + 10, statsY + 12);
    doc.text(`${report.stats.avgAnxiety}/10`, margin + colWidth + 10, statsY + 12);
    doc.text(`${report.stats.totalSessions}`, margin + colWidth * 2 + 10, statsY + 12);
    doc.text(`${report.stats.totalCheckins}`, margin + colWidth * 3 + 10, statsY + 12);

    yPos += 50;

    // Key emotions and themes
    if (report.topEmotions.length > 0 || report.topThemes.length > 0) {
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Emozioni e Temi Principali', margin, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      if (report.topEmotions.length > 0) {
        doc.text(`Emozioni: ${report.topEmotions.join(', ')}`, margin, yPos);
        yPos += 6;
      }
      if (report.topThemes.length > 0) {
        doc.text(`Temi: ${report.topThemes.join(', ')}`, margin, yPos);
        yPos += 6;
      }
      yPos += 10;
    }

    // Key events
    if (report.keyEvents.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Eventi Chiave', margin, yPos);
      yPos += 8;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      for (const event of report.keyEvents.slice(0, 5)) {
        const lines = doc.splitTextToSize(`• ${event}`, contentWidth - 10);
        doc.text(lines, margin + 5, yPos);
        yPos += lines.length * 5 + 2;
      }
      yPos += 10;
    }

    // Clinical Summary - main section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text('Analisi Clinica', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const summaryLines = doc.splitTextToSize(report.clinicalSummary, contentWidth);
    
    for (const line of summaryLines) {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, margin, yPos);
      yPos += 5;
    }

    // Footer disclaimer
    const footerY = 285;
    doc.setFillColor(245, 245, 245);
    doc.rect(0, footerY - 10, pageWidth, 20, 'F');
    
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'italic');
    const disclaimer = 'Questo report è generato da AI e non costituisce diagnosi medica. Consultare sempre un professionista.';
    doc.text(disclaimer, pageWidth / 2, footerY, { align: 'center' });

    // Save
    const fileName = `report_benessere_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
    toast.success('Report scaricato!');
  };

  const handleGenerateReport = async (days: number) => {
    setSelectedPeriod(days);
    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Devi effettuare il login');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-clinical-report`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ days }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Errore nella generazione');
      }

      const report: ReportData = await response.json();
      generatePDF(report);
      setIsOpen(false);

    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Errore nella generazione del report');
    } finally {
      setIsGenerating(false);
      setSelectedPeriod(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
        >
          <FileText className="w-5 h-5 mr-2" />
          Scarica Report per il tuo Terapeuta
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Report Clinico
          </DialogTitle>
          <DialogDescription>
            Genera un report professionale da mostrare al tuo psicologo o terapeuta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Seleziona il periodo da analizzare:
          </p>
          
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => handleGenerateReport(7)}
              disabled={isGenerating}
            >
              {isGenerating && selectedPeriod === 7 ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Calendar className="w-6 h-6" />
              )}
              <span className="text-sm font-medium">Ultimi 7 giorni</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => handleGenerateReport(30)}
              disabled={isGenerating}
            >
              {isGenerating && selectedPeriod === 30 ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Calendar className="w-6 h-6" />
              )}
              <span className="text-sm font-medium">Ultimi 30 giorni</span>
            </Button>
          </div>

          {isGenerating && (
            <div className="text-center text-sm text-muted-foreground">
              <p>Analisi dati e generazione report in corso...</p>
              <p className="text-xs mt-1">Potrebbero volerci alcuni secondi</p>
            </div>
          )}
          
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
            <p className="font-medium mb-1">Il report includerà:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Media umore e ansia del periodo</li>
              <li>Eventi chiave rilevati</li>
              <li>Temi più discussi</li>
              <li>Analisi clinica generata da AI</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClinicalReportDialog;
