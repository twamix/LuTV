type Address = { kind: () => 'ipv4' | 'ipv6'; toString: () => string; match: (network: Address, prefix: number) => boolean };
function normalize(value: string): string { return value.trim().replace(/^::ffff:/i, ''); }
function ipv4Number(value: string): number { return value.split('.').reduce((n, part) => ((n << 8) | Number(part)) >>> 0, 0); }
function parse(value: string): Address {
  const normalized = normalize(value);
  if (/^(\\d{1,3}\\.){3}\\d{1,3}$/.test(normalized)) {
    const number = ipv4Number(normalized);
    return { kind: () => 'ipv4', toString: () => normalized, match: (network, prefix) => ((number >>> (32 - prefix)) === (ipv4Number(network.toString()) >>> (32 - prefix))) };
  }
  const lowered = normalized.toLowerCase();
  return { kind: () => 'ipv6', toString: () => lowered, match: (network, prefix) => lowered === network.toString() || prefix === 128 };
}
export default { process: parse, parseCIDR(value: string): [Address, number] { const [ip, prefix] = value.split('/'); return [parse(ip), Number(prefix)]; } };
