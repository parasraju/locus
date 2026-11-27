import { defaultUrlTransform } from "react-markdown";

export function noteUrlTransform(url: string): string {
  const allowed = defaultUrlTransform(url);
  if (allowed) return allowed;
  const colon = url.indexOf(":");
  if (colon > 0 && /^locus$/i.test(url.slice(0, colon))) return url;
  return "";
}
