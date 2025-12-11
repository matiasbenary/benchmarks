import { runBenchmark, EVMConfig } from './evm.js';

const config: EVMConfig = {
  rpc: "https://ethereum-sepolia-rpc.publicnode.com",
  confirmation: 12,
  name: "sepolia",
};

runBenchmark(config);
