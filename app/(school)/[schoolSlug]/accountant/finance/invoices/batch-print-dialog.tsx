"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2, Printer, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import dynamic from "next/dynamic";
import { BatchInvoicePDF } from "./batch-invoice-pdf";
import { formatStudentName } from "@/lib/utils/name-formatter";

// Dynamically import PDFDownloadLink safely for Next.js
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  {
    ssr: false,
    loading: () => (
      <Button disabled variant="outline">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Preparing PDF Engine...
      </Button>
    ),
  },
);

interface BatchPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BatchPrintDialog({ open, onOpenChange }: BatchPrintDialogProps) {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [school, setSchool] = useState<any>(null);

  useEffect(() => {
    if (!open) return;
    const fetchClasses = async () => {
      setError(null);
      try {
        const res = await fetch(`/api/schools/${schoolSlug}/classes`);
        if (res.ok) setClasses(await res.json());
        
        const schoolRes = await fetch(`/api/schools/${schoolSlug}`);
        if (schoolRes.ok) {
          setSchool(await schoolRes.json());
        } else {
          setError("Failed to load school information. Please check your permissions.");
        }
      } catch (e) {
        console.error("Failed to load classes", e);
        setError("Network error occurred while fetching school settings.");
      }
    };
    fetchClasses();
  }, [open, schoolSlug]);

  const handleFetchInvoices = async () => {
    if (!selectedClassId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/schools/${schoolSlug}/finance/invoices?classId=${selectedClassId}`
      );
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((inv: any) => ({
          billNumber: inv.billNumber,
          studentName: formatStudentName(
            inv.student.profile.firstName,
            inv.student.profile.lastName,
            inv.student.profile.otherNames
          ),
          studentId: inv.student.studentId || "N/A",
          className: inv.student.class?.name || "N/A",
          issuedAt: inv.createdAt,
          dueDate: inv.dueDate,
          feeStructureName: inv.feeStructure?.name,
          items: inv.items.map((it: any) => ({
            description: it.description,
            amount: Number(it.amount),
            quantity: it.quantity,
            totalAmount: Number(it.totalAmount),
          })),
          totalAmount: Number(inv.totalAmount),
          paidAmount: Number(inv.paidAmount),
          balanceAmount: Number(inv.balanceAmount),
          notes: inv.notes,
        }));
        setInvoices(mapped);
      } else {
        setError(`Failed to load invoices (Status: ${res.status})`);
      }
    } catch (e) {
      console.error("Failed to load invoices", e);
      setError("An error occurred while fetching invoices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClassId) {
      handleFetchInvoices();
    } else {
      setInvoices([]);
    }
  }, [selectedClassId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Print Class Invoices</DialogTitle>
          <DialogDescription>
            Generate a combined PDF of all active invoices for a specific class. 
            Each student's invoice will start on a new page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <Field>
            <FieldLabel>Select Class</FieldLabel>
            <Select onValueChange={setSelectedClassId} value={selectedClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a class to print" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <p className="font-semibold">Error</p>
              <p>{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center p-8 space-y-2 border-2 border-dashed rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground italic">Fetching invoices for class...</p>
            </div>
          ) : selectedClassId && invoices.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed rounded-lg bg-muted/20">
              <p className="text-sm text-muted-foreground">No invoices found for this class in the current period.</p>
            </div>
          ) : selectedClassId && invoices.length > 0 ? (
            <div className="p-6 border rounded-lg bg-primary/5 border-primary/20 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Invoices found:</span>
                <span className="font-bold text-primary">{invoices.length}</span>
              </div>
              
              {school && school.name ? (
                <PDFDownloadLink
                  document={
                    <BatchInvoicePDF
                      invoices={invoices}
                      schoolName={school.name}
                      schoolAddress={school.address}
                      schoolEmail={school.email}
                      schoolPhone={school.phone}
                      currency={school.currency === "GH₵" ? "GHS" : (school.currency || "GHS")}
                      logoUrl={school.logo}
                    />
                  }
                  fileName={`Invoices_${classes.find(c => c.id === selectedClassId)?.name}_${new Date().toLocaleDateString()}.pdf`}
                >
                  {({ loading, url, error }) => (
                    <Button className="w-full shadow-lg" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating PDF...
                        </>
                      ) : (
                        <>
                          <Printer className="mr-2 h-4 w-4" />
                          Download Bundle ({invoices.length} pages)
                        </>
                      )}
                    </Button>
                  )}
                </PDFDownloadLink>
              ) : (
                <Button className="w-full" disabled>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading School Info...
                </Button>
              )}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
