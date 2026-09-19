// Shim for sonner - replaces the sonner library to avoid React #310 error
// All imports from 'sonner' will be redirected here via Vite alias

import { toast as radixToast } from "@/hooks/use-toast";

export const toast = Object.assign(
  (message: string) => {
    radixToast({ title: message });
  },
  {
    success: (message: string, opts?: { description?: string }) => {
      radixToast({ title: message, description: opts?.description });
    },
    error: (message: string, opts?: { description?: string }) => {
      radixToast({ title: message, description: opts?.description, variant: "destructive" as const });
    },
    info: (message: string) => {
      radixToast({ title: message });
    },
    warning: (message: string) => {
      radixToast({ title: message, variant: "destructive" as const });
    },
    message: (message: string, opts?: { description?: string }) => {
      radixToast({ title: message, description: opts?.description });
    },
    promise: <T,>(promise: Promise<T>, opts: { loading: string; success: string; error: string }) => {
      radixToast({ title: opts.loading });
      return promise.then(
        (result) => { radixToast({ title: opts.success }); return result; },
        (err) => { radixToast({ title: opts.error, variant: "destructive" as const }); throw err; }
      );
    },
    dismiss: (_id?: string) => {},
    loading: (message: string) => {
      radixToast({ title: message });
      return "";
    },
  }
);

// Dummy Toaster component - no-op since we use radix Toaster
export const Toaster = () => null;
