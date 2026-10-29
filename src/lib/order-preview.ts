import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { formatOrderNotification } from "@/lib/order-notification";
import type { Order } from "@/types/order";

/**
 * Server-only preview writer for `ORDER_CHANNELS_MODE=log`.
 *
 * It writes exactly what the owner would have received, so a QA run can read
 * the notification instead of sending it, and so the payload can be diffed
 * between two builds. The directory is git-ignored and never served.
 */

const PREVIEW_DIR = path.join(process.cwd(), ".tmp", "order-previews");

export type PreviewChannel = "email" | "whatsapp";

export interface WrittenPreview {
  path: string;
  channel: PreviewChannel;
}

function fileNameFor(order: Order, channel: PreviewChannel): string {
  // The order number is server-minted (PDF-YYYYMMDD-NNNNN) and safe for a path.
  return `${order.orderNumber}-${channel}.${channel === "email" ? "html" : "txt"}`;
}

export async function writeOrderPreview(
  channel: PreviewChannel,
  order: Order,
): Promise<WrittenPreview> {
  const notification = formatOrderNotification(order);
  const contents = channel === "email" ? notification.html : notification.text;
  const file = path.join(PREVIEW_DIR, fileNameFor(order, channel));

  await mkdir(PREVIEW_DIR, { recursive: true });
  await writeFile(file, contents, "utf8");

  return { path: file, channel };
}
