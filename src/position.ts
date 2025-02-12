import { LogLevel } from "@sentio/sdk";
import { EthContext } from "@sentio/sdk/eth";
import { PENDLE_POOL_ADDRESSES } from "./config.js";
import {
  EVENT_POSITION,
  POINT_SOURCE,
  POINT_SOURCE_SY
} from "./types.js";

export async function updatePoints(
  ctx: EthContext,
  label: POINT_SOURCE,
  account: string,
  impliedAmountHolding: bigint,
  holdingPeriod: bigint,
  updatedAt: number
) {
  //Market Expires all SY points go to treasury
  if (label == POINT_SOURCE_SY
    && ctx.timestamp.getTime() > PENDLE_POOL_ADDRESSES.MARKET_EXPIRY) {
    logPosition(
      ctx,
      label,
      PENDLE_POOL_ADDRESSES.TREASURY,
      0n,
      holdingPeriod,
      updatedAt
    );
    return;
  }

  // Handle Treasury
  logPosition(
    ctx,
    label,
    account,
    impliedAmountHolding,
    holdingPeriod,
    updatedAt,
  );
}

function logPosition(
  ctx: EthContext,
  label: POINT_SOURCE,
  account: string,
  impliedAmountHolding: bigint,
  holdingPeriod: bigint,
  updatedAt: number
) {
  ctx.eventLogger.emit(EVENT_POSITION, {
    label,
    account: account.toLowerCase(),
    impliedBalance: impliedAmountHolding.scaleDown(18),
    holdingPeriod,
    updatedAt,
    severity: LogLevel.INFO
  });
}
