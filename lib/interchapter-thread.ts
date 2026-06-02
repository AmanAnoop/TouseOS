/** Stable thread key for interchapter DMs between two orgs. */
export function interchapterThreadId(orgA: string, orgB: string): string {
  const [a, b] = [orgA, orgB].sort();
  return `interchapter:${a}:${b}`;
}
