import { runBenchmark, EVMConfig } from './evm.js';

// https://blog.chainlight.io/patch-thursday-risks-on-cexs-confirmation-on-arbitrum-and-optimism-7ee25a1d58bf
const config: EVMConfig = {
  rpc: "https://sepolia-rollup.arbitrum.io/rpc",
  confirmation: 1,
  name: "arbitrum",
};

runBenchmark(config);
