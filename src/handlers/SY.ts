import { AccountSnapshot } from "../schema/schema.js";
import { TransferEvent } from "../types/eth/pendlemarket.js";
import { ERC20Context } from "@sentio/sdk/eth/builtin/erc20";
import { getUnixTimestamp, isPendleAddress } from "../helper.js";
import { updatePoints } from "../position.js";
import { EVENT_POSITION, POINT_SOURCE_SY } from "../types.js";
import { toEvmAddress } from "@resolv/common/dist/util.js";

export async function handleSYTransfer(evt: TransferEvent, ctx: ERC20Context) {
  await processAccount(toEvmAddress(evt.args.from), ctx);
  await processAccount(toEvmAddress(evt.args.to), ctx);
}

async function processAccount(account: EvmAddress, ctx: ERC20Context) {
  if (isPendleAddress(account)) return;
  const timestamp = getUnixTimestamp(ctx.timestamp);
  const ts: bigint = BigInt(timestamp).valueOf();

  const accountId = toEvmAddress(account + POINT_SOURCE_SY);

  const newBalance = await ctx.contract.balanceOf(account);

  const newSnapshot = new AccountSnapshot({
    id: accountId,
    lastUpdatedAt: BigInt(timestamp),
    lastImpliedHolding: newBalance.toString()
  });

    ctx.eventLogger.emit(EVENT_POSITION, {
      label: POINT_SOURCE_SY,
      account,
      balance: newBalance.scaleDown(18).toString()
    });

  await ctx.store.upsert(newSnapshot);
}
