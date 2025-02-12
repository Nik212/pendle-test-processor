import { PENDLE_POOL_ADDRESSES } from "./config.js";
import { EthContext } from "@sentio/sdk/eth";
import { AccountSnapshot } from "./schema/schema.js";
import { toEvmAddress } from "@resolv/common/dist/util.js";

export function isPendleAddress(addr: string) {
  addr = addr.toLowerCase();
  return (
    addr == PENDLE_POOL_ADDRESSES.SY ||
    addr == PENDLE_POOL_ADDRESSES.YT ||
    addr == PENDLE_POOL_ADDRESSES.LP
  );
}

export function getUnixTimestamp(date: Date) {
  return Math.floor(date.getTime() / 1000);
}

// returns all addresses in the storage
export async function getAllAddresses(ctx: EthContext): Promise<EvmAddress[]> {
  // removes the suffix comprised of two letters coming from POINT_SOURCE
  const addresses = (await ctx.store.list(AccountSnapshot, []))
    .map((snapshot) => snapshot.id.slice(0, -2))
    .map((address) => toEvmAddress(address));
  return [...new Set(addresses)];
}
