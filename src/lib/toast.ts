// Simple toast wrapper using radix toast system
// Replaces sonner toast to avoid React #310 error

import { toast as radixToast } from "@/hooks/use-toast";

export const toast = {
  success: (message: string) => {
    radixToast({
      title: message,
    });
  },
  error: (message: string) => {
    radixToast({
      title: message,
      variant: "destructive",
    });
  },
  info: (message: string) => {
    radixToast({
      title: message,
    });
  },
  warning: (message: string) => {
    radixToast({
      title: message,
      variant: "destructive",
    });
  },
  message: (title: string, options?: { description?: string }) => {
    radixToast({
      title,
      description: options?.description,
    });
  },
};
