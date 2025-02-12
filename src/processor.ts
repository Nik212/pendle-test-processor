import { ERC20Processor } from "@sentio/sdk/eth/builtin";
import { PENDLE_POOL_ADDRESSES, CONFIG } from "./config.js";
import { handleSYTransfer } from "./handlers/SY.js";
import { PendleYieldTokenProcessor } from "./types/eth/pendleyieldtoken.js";
import { handleYTTransfer } from "./handlers/YT.js";
import { PendleMarketProcessor } from "./types/eth/pendlemarket.js";
import { handleLPTransfer, handleMarketRedeemReward, handleMarketSwap } from "./handlers/LP.js";
import { GLOBAL_CONFIG } from "@sentio/runtime";

GLOBAL_CONFIG.execution = {
  sequential: false
};

ERC20Processor.bind({
  address: PENDLE_POOL_ADDRESSES.SY,
  startBlock: PENDLE_POOL_ADDRESSES.SY_START_BLOCK,
  name: "Pendle Pool SY",
  network: CONFIG.BLOCKCHAIN,
}).onEventTransfer(async (evt, ctx) => {
  await handleSYTransfer(evt, ctx);
});

PendleYieldTokenProcessor.bind({
  address: PENDLE_POOL_ADDRESSES.YT,
  startBlock: PENDLE_POOL_ADDRESSES.START_BLOCK,
  name: "Pendle Pool YT",
  network: CONFIG.BLOCKCHAIN,
})
  .onEventTransfer(async (evt, ctx) => {
    await handleYTTransfer(evt, ctx);
  })

PendleMarketProcessor.bind({
  address: PENDLE_POOL_ADDRESSES.LP,
  startBlock: PENDLE_POOL_ADDRESSES.START_BLOCK,
  name: "Pendle Pool LP",
  network: CONFIG.BLOCKCHAIN,
})
  .onEventTransfer(async (evt, ctx) => {
    await handleLPTransfer(evt, ctx);
  })
  .onEventRedeemRewards(async (evt, ctx) => {
    await handleMarketRedeemReward(evt, ctx);
  })
  .onEventSwap(async (evt, ctx) => {
    await handleMarketSwap(evt, ctx);
  });
