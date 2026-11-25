export function pinMatchesPrefixes(pin: string, prefixes: string[]): boolean {
  const normalizedPin = pin.trim();
  return (
    /^\d{6}$/.test(normalizedPin) && prefixes.some((prefix) => normalizedPin.startsWith(prefix))
  );
}
