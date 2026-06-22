"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { cn } from "@/lib/utils";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  loading?: boolean;
  destructive?: boolean;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  onConfirm,
  loading = false,
  destructive = true,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <AlertDialog.Popup className="fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 rounded-2xl bg-[#F5F0E8] p-5 shadow-xl transition-all duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-sm sm:-translate-x-1/2">
          <AlertDialog.Title className="text-base font-semibold text-[#2C2420]">
            {title}
          </AlertDialog.Title>
          {description && (
            <AlertDialog.Description className="mt-1.5 text-sm text-[#8C7E72]">
              {description}
            </AlertDialog.Description>
          )}
          <div className="mt-5 flex gap-2">
            <AlertDialog.Close
              className="flex-1 rounded-xl border border-[#D4C8B4] py-2.5 text-sm font-semibold text-[#2C2420] transition-colors hover:bg-[#EDE6D8]"
              disabled={loading}
            >
              Cancel
            </AlertDialog.Close>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={cn(
                "flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50",
                destructive ? "bg-red-600 hover:bg-red-700" : "bg-[#D44C2A] hover:bg-[#C0412A]",
              )}
            >
              {loading ? "…" : confirmLabel}
            </button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
