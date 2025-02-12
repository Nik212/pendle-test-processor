import { AccountSnapshot } from "../schema/schema.js";
import { PendleYieldTokenContext, TransferEvent } from "../types/eth/pendleyieldtoken.js";
import { updatePoints } from "../position.js";
import { MISC_CONSTS } from "../config.js";
import {
  getUnixTimestamp,
  isPendleAddress,
  getAllAddresses,
} from "../helper.js";
import { readAllUserERC20Balances, readAllYTPositions } from "../multicall.js";
import { EVENT_POSITION, POINT_SOURCE_YT } from "../types.js";
import { toEvmAddress } from "@resolv/common/dist/util.js";

/**
 * @dev 1 YT USDE is entitled to yields and points
 */

export async function handleYTTransfer(
  evt: TransferEvent,
  ctx: PendleYieldTokenContext
) {
  //@ts-ignore
  await processAllYTAccounts(
    ctx,
    //@ts-ignore
    [evt.args[0], evt.args[1]],
    false
  );
}

export async function processAllYTAccounts(
  ctx: PendleYieldTokenContext,
  addressesToAdd: EvmAddress[] = [],
  shouldIncludeDb: boolean = true
) {
  if (await ctx.contract.isExpired()) {
    return;
  }

  const allAddresses = shouldIncludeDb ? await getAllAddresses(ctx) : [];
  for (let address of addressesToAdd) {
    if (!allAddresses.includes(address) && !isPendleAddress(address)) {
      allAddresses.push(address);
    }
  }

  const timestamp = getUnixTimestamp(ctx.timestamp);
  const allYTBalances = await readAllUserERC20Balances(
    ctx,
    allAddresses,
    ctx.contract.address
  );
  const allYTPositions = await readAllYTPositions(ctx, allAddresses);

  for (let i = 0; i < allAddresses.length; i++) {
    const address = allAddresses[i];
    const balance = allYTBalances[i];
    const interestData = allYTPositions[i];

    const accountId = toEvmAddress(address + POINT_SOURCE_YT);
    const snapshot = await ctx.store.get(AccountSnapshot, accountId);
    const ts: bigint = BigInt(timestamp).valueOf();
    let promises = [];
    if (snapshot && snapshot.lastUpdatedAt < ts) {
      promises.push(updatePoints(
        ctx,
        POINT_SOURCE_YT,
        address,
        BigInt(snapshot.lastImpliedHolding),
        BigInt(ts.valueOf() - snapshot.lastUpdatedAt.valueOf()),
        timestamp
      ));
    }
    await Promise.all(promises);

    if (interestData.lastPYIndex == 0n) continue;

    const impliedHolding =
      (balance * MISC_CONSTS.ONE_E18) / interestData.lastPYIndex +
      interestData.accruedInterest;

    const newSnapshot = new AccountSnapshot({
      id: accountId,
      lastUpdatedAt: BigInt(timestamp),
      lastImpliedHolding: impliedHolding.toString()
    });

    if (BigInt(snapshot ? snapshot.lastImpliedHolding : 0) != impliedHolding) {
      ctx.eventLogger.emit(EVENT_POSITION, {
        label: POINT_SOURCE_YT,
        account: address,
        balance: impliedHolding.scaleDown(18).toString()
      });
    }

    await ctx.store.upsert(newSnapshot);
  }
}
