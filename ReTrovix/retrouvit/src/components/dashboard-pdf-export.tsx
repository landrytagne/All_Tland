"use client";

import { useCallback, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Export the admin dashboard (or any ref'd element) to a multi-page PDF.
 *
 * Usage:
 *   const { exportPdf, isExporting } = useDashboardPdf();
 *   <div ref={dashboardRef}>...</div>
 *   <Button onClick={() => exportPdf(dashboardRef.current)}>Export</Button>
 */
export function useDashboardPdf() {
  const [isExporting, setIsExporting] = useState(false);

  const exportPdf = useCallback(async (element: HTMLElement | null) => {
    if (!element) return;
    setIsExporting(true);

    try {
      const html2canvas = (await import("html2canvas-pro")).default;
      const { jsPDF } = await import("jspdf");

      // Temporarily apply PDF-friendly styles
      const originalBg = document.body.style.backgroundColor;
      document.body.style.backgroundColor = "#ffffff";

      // Capture the dashboard
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        // Ignore non-visual elements
        ignoreElements: (el) => {
          return el.tagName === "BUTTON" && el.getAttribute("data-pdf-ignore") === "true";
        },
      });

      document.body.style.backgroundColor = originalBg;

      // A4 dimensions in points
      const pageWidth = 210; // mm
      const pageHeight = 297; // mm
      const margin = 10; // mm
      const contentWidth = pageWidth - margin * 2;

      // Calculate dimensions
      const imgRatio = canvas.width / canvas.height;
      const imgHeight = contentWidth / imgRatio;

      // Create PDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Header
      pdf.setFillColor(99, 102, 241); // indigo-500
      pdf.rect(0, 0, pageWidth, 28, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text("RetrouvIt - Dashboard Admin", margin, 12);

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      const now = new Date().toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      pdf.text(`Rapport genere le ${now}`, margin, 19);

      // Footer line
      pdf.setFillColor(255, 255, 255, 0.3);
      pdf.rect(0, 28, pageWidth, 0.5, "F");

      // Content area starts after header
      const startY = 32;

      // Add the dashboard image across pages
      const imgData = canvas.toDataURL("image/png");
      const totalImgHeight = imgHeight;

      if (totalImgHeight <= pageHeight - startY - margin) {
        // Fits on one page
        pdf.addImage(imgData, "PNG", margin, startY, contentWidth, imgHeight);
      } else {
        // Multi-page: slice the canvas
        const pageContentHeight = pageHeight - startY - margin;
        const sourceSliceHeight = (pageContentHeight / imgHeight) * canvas.height;
        let currentY = 0;
        let isFirstPage = true;

        while (currentY < canvas.height) {
          if (!isFirstPage) {
            pdf.addPage();
            // Page header
            pdf.setFillColor(99, 102, 241);
            pdf.rect(0, 0, pageWidth, 8, "F");
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(8);
            pdf.text("RetrouvIt - Dashboard Admin", margin, 5.5);
          }

          const sliceStartY = isFirstPage ? 0 : currentY;
          const remainingHeight = canvas.height - sliceStartY;
          const sliceH = Math.min(sourceSliceHeight, remainingHeight);
          const displayH = (sliceH / canvas.height) * imgHeight;

          // Create a temporary canvas for this slice
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceH;
          const ctx = sliceCanvas.getContext("2d")!;
          ctx.drawImage(
            canvas,
            0,
            sliceStartY,
            canvas.width,
            sliceH,
            0,
            0,
            canvas.width,
            sliceH
          );

          const sliceData = sliceCanvas.toDataURL("image/png");
          const yPos = isFirstPage ? startY : 12;

          pdf.addImage(sliceData, "PNG", margin, yPos, contentWidth, displayH);

          currentY += sliceH;
          isFirstPage = false;
        }
      }

      // Final page footer
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150);
        pdf.text(
          `Page ${i} / ${totalPages}  |  RetrouvIt Admin  |  Confidentiel`,
          pageWidth / 2,
          pageHeight - 5,
          { align: "center" }
        );
      }

      // Download
      const filename = `retrouvit_dashboard_${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { exportPdf, isExporting };
}

/**
 * Export button component for the dashboard PDF.
 */
export function DashboardPdfButton({
  targetRef,
  className,
}: {
  targetRef: React.RefObject<HTMLElement | null>;
  className?: string;
}) {
  const { exportPdf, isExporting } = useDashboardPdf();

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn("gap-2", className)}
      disabled={isExporting}
      onClick={() => exportPdf(targetRef.current)}
      data-pdf-ignore="true"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {isExporting ? "Export en cours..." : "Exporter PDF"}
    </Button>
  );
}
