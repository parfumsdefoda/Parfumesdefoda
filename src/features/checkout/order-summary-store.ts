"use client";

import { useSyncExternalStore } from "react";

export const ORDER_SUMMARY_STORAGE_KEY = "parfumsdefoda-last-order";
const ORDER_SUMMARY_EVENT = "parfumsdefoda:order-summary";

export interface OrderSummaryLine {
  name: string;
  sizeLabel: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderSummary {
  orderNumber: string;
  lines: OrderSummaryLine[];
  total: number;
  customerFirstName: string;
}

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedSummary: OrderSummary | null = null;

export function parseOrderSummary(raw: string | null): OrderSummary | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const candidate = value as Partial<OrderSummary>;
    if (
      typeof candidate.orderNumber !== "string" ||
      !/^PDF-\d{8}-\d{5}$/.test(candidate.orderNumber) ||
      typeof candidate.customerFirstName !== "string" ||
      !candidate.customerFirstName.trim() ||
      typeof candidate.total !== "number" ||
      !Number.isFinite(candidate.total) ||
      !Array.isArray(candidate.lines) ||
      candidate.lines.length > 30
    ) return null;

    const lines: OrderSummaryLine[] = [];
    for (const line of candidate.lines) {
      if (
        !line || typeof line !== "object" ||
        typeof line.name !== "string" || !line.name.trim() ||
        typeof line.sizeLabel !== "string" || !line.sizeLabel.trim() ||
        typeof line.quantity !== "number" || !Number.isInteger(line.quantity) || line.quantity < 1 ||
        typeof line.unitPrice !== "number" || !Number.isFinite(line.unitPrice) || line.unitPrice < 0
      ) return null;
      lines.push({
        name: line.name.slice(0, 200),
        sizeLabel: line.sizeLabel.slice(0, 40),
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      });
    }

    return {
      orderNumber: candidate.orderNumber,
      customerFirstName: candidate.customerFirstName.trim().slice(0, 80),
      total: candidate.total,
      lines,
    };
  } catch {
    return null;
  }
}

export function readOrderSummary(storage: Pick<Storage, "getItem">): OrderSummary | null {
  try {
    return parseOrderSummary(storage.getItem(ORDER_SUMMARY_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeOrderSummary(
  storage: Pick<Storage, "setItem">,
  summary: OrderSummary,
): boolean {
  try {
    const raw = JSON.stringify(summary);
    if (!parseOrderSummary(raw)) return false;
    storage.setItem(ORDER_SUMMARY_STORAGE_KEY, raw);
    return true;
  } catch {
    return false;
  }
}

export function getOrderSummarySnapshot(): OrderSummary | null {
  let summary: OrderSummary | null = null;
  try {
    summary = typeof window === "undefined"
      ? null
      : readOrderSummary(window.sessionStorage);
  } catch {
    summary = null;
  }
  let raw: string | null = null;
  try {
    raw = typeof window === "undefined"
      ? null
      : window.sessionStorage.getItem(ORDER_SUMMARY_STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSummary = summary;
  }
  return cachedSummary;
}

function notifySubscribers() {
  cachedRaw = undefined;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
    window.addEventListener(ORDER_SUMMARY_EVENT, handleCustomChange);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(ORDER_SUMMARY_EVENT, handleCustomChange);
    }
  };
}

function handleStorage(event: StorageEvent) {
  if (event.key === ORDER_SUMMARY_STORAGE_KEY || event.key === null) notifySubscribers();
}

function handleCustomChange() {
  notifySubscribers();
}

export function saveOrderSummary(summary: OrderSummary): boolean {
  try {
    if (typeof window === "undefined") return false;
    if (!writeOrderSummary(window.sessionStorage, summary)) return false;
    notifySubscribers();
    window.dispatchEvent(new Event(ORDER_SUMMARY_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function useOrderSummary(): OrderSummary | null {
  return useSyncExternalStore(subscribe, getOrderSummarySnapshot, () => null);
}
