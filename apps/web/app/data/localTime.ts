/** A deterministic slot in server-generated Markdown, filled when agent mode opens. */
export const MARKDOWN_TIME_TOKEN = "\u0000portfolio-local-time\u0000";

export function formatLocalTime(timezone: string, date = new Date()): string {
  return date.toLocaleTimeString("en-IN", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function stampMarkdown(template: string, time: string): string {
  return template.replace(MARKDOWN_TIME_TOKEN, time);
}
