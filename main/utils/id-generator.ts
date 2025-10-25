import { format } from "date-fns";

let counter = 0;

export function generateIssueId(): string {
  const now = new Date();
  const dateStr = format(now, "yyyyMMdd");
  const timeStr = format(now, "HHmmss");
  counter = (counter + 1) % 10000;
  const counterStr = counter.toString().padStart(4, "0");

  return `SF-${dateStr}-${timeStr}-${counterStr}`;
}

export function resetCounter(): void {
  counter = 0;
}
