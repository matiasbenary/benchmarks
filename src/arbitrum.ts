import { runBenchmark, EVMConfig } from './evm.js';


const config: EVMConfig = {
  rpc: "https://sepolia-rollup.arbitrum.io/rpc",
  confirmation: 2,
  name: "arbitrum",
};

runBenchmark(config);
