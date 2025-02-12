import { AccountSnapshot } from "../schema/schema.js";
import {
  PendleMarketContext,
  RedeemRewardsEvent,
  SwapEvent,
  TransferEvent,
  getPendleMarketContractOnContext,
} from "../types/eth/pendlemarket.js";
import { updatePoints } from "../position.js";
import { getUnixTimestamp, getAllAddresses } from "../helper.js";
import { PENDLE_POOL_ADDRESSES } from "../config.js";
import { EthContext } from "@sentio/sdk/eth";
import { readAllUserActiveBalances } from "../multicall.js";
import { EVENT_POSITION, POINT_SOURCE_LP } from "../types.js";
import { toEvmAddress } from "@resolv/common/dist/util.js";

/**
 * @dev 1 LP = (X PT + Y SY) where X and Y are defined by market conditions
 * So same as Balancer LPT, we need to update all positions on every swap
 */

export async function handleLPTransfer(
  evt: TransferEvent,
  ctx: PendleMarketContext
) {
  await processAllLPAccounts(ctx, [
    toEvmAddress(evt.args.from),
    toEvmAddress(evt.args.to),
  ], false);
}

export async function handleMarketRedeemReward(
  evt: RedeemRewardsEvent,
  ctx: PendleMarketContext
) {
  await processAllLPAccounts(ctx,);
}

export async function handleMarketSwap(_: SwapEvent, ctx: PendleMarketContext) {
  await processAllLPAccounts(ctx);
}

export async function processAllLPAccounts(
  ctx: EthContext,
  addressesToAdd: EvmAddress[] = [],
  shouldIncludeDb: boolean = true
) {
  // might not need to do this on interval since we are doing it on every swap
  const allAddresses = shouldIncludeDb ? await getAllAddresses(ctx) : [];

  for (let address of addressesToAdd) {
    if (!allAddresses.includes(address)
      // && !isLiquidLockerAddress(address)
    ) {
      allAddresses.push(address);
    }
  }
  const marketContract = getPendleMarketContractOnContext(
    ctx,
    PENDLE_POOL_ADDRESSES.LP
  );

  const [allUserShares, totalShare, state] = await Promise.all([
    readAllUserActiveBalances(ctx, allAddresses),
    marketContract.totalActiveSupply(),
    marketContract.readState(marketContract.address),
  ]);

  const timestamp = getUnixTimestamp(ctx.timestamp);
  let promises = [];
  for (let i = 0; i < allAddresses.length; i++) {
    const account = allAddresses[i];
    const impliedSy = (allUserShares[i] * state.totalSy) / totalShare;
    promises.push(updateAccount(ctx, account, impliedSy, timestamp));
  }
  await Promise.all(promises);
}

async function updateAccount(
  ctx: EthContext,
  account: EvmAddress,
  impliedSy: bigint,
  timestamp: number
) {
  const accountId = toEvmAddress(account + POINT_SOURCE_LP);
  const snapshot = await ctx.store.get(AccountSnapshot, accountId);
  const ts: bigint = BigInt(timestamp).valueOf();

  const newSnapshot = new AccountSnapshot({
    id: accountId,
    lastUpdatedAt: ts,
    lastImpliedHolding: impliedSy.toString()
  });

  ctx.eventLogger.emit(EVENT_POSITION, {
    label: POINT_SOURCE_LP,
    account: account,
    balance: impliedSy.scaleDown(18).toString()
  });

  await ctx.store.upsert(newSnapshot);
}
