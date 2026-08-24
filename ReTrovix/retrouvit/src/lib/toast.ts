/**
 * Simple toast event bus.
 * Components can call showToast() to trigger a toast notification.
 *
 * Usage:
 *   import { showToast } from "@/lib/toast";
 *   showToast({ title: "Succès", description: "Objet publié !", type: "SUCCESS" });
 */

type ToastType = "MATCH" | "NOTIFICATION" | "MESSAGE" | "CLAIM" | "ADMIN_ALERT" | "SUCCESS";

interface ToastEvent {
  id: number;
  title: string;
  description: string;
  type: ToastType;
}

type ToastHandler = (toast: ToastEvent) => void;

let handlers: ToastHandler[] = [];
let counter = 0;

export function showToast(toast: Omit<ToastEvent, "id">) {
  const event: ToastEvent = { ...toast, id: ++counter };
  handlers.forEach((h) => h(event));
}

export function onToast(handler: ToastHandler): () => void {
  handlers.push(handler);
  return () => {
    handlers = handlers.filter((h) => h !== handler);
  };
}
