import '@sentio/sdk/store'

declare global {
    export type EvmAddress = Lowercase<`0x${string}`>;
}

declare module '@sentio/sdk/store' {
    export type ID = EvmAddress;
}
