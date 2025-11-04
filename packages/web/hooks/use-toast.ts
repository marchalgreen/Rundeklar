"use client";

import { useCallback } from "react";
import { toast } from "sonner";

type ToastOptions = {
  description?: string;
};

export type ToastApi = {
  message: (title: string, options?: ToastOptions) => void;
  success: (title: string, options?: ToastOptions) => void;
  error: (title: string, options?: ToastOptions) => void;
  warning: (title: string, options?: ToastOptions) => void;
  info: (title: string, options?: ToastOptions) => void;
};

export function useToast(): ToastApi {
  const message = useCallback((title: string, options?: ToastOptions) => {
    toast(title, options);
  }, []);

  const success = useCallback((title: string, options?: ToastOptions) => {
    toast.success(title, options);
  }, []);

  const error = useCallback((title: string, options?: ToastOptions) => {
    toast.error(title, options);
  }, []);

  const warning = useCallback((title: string, options?: ToastOptions) => {
    toast.warning(title, options);
  }, []);

  const info = useCallback((title: string, options?: ToastOptions) => {
    toast.info(title, options);
  }, []);

  return { message, success, error, warning, info };
}
