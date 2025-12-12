import { exportToCSV, TransactionResult } from "./utils/output.js";
import { sleep } from "./utils/common.js";
import { ethers } from "ethers";
import { JsonRpcProvider } from "ethers";
import { Wallet } from "ethers";

export type EVMConfig = {
  rpc: string;
  confirmation: number;
  name: string;
};

const ETH_PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || "";
const ETH_TO_ADDRESS = "0x7ba36126910c75b27363ecaa2a57033686c087fb";
const ETH_AMOUNT = "0.0001";
const ETH_FINALITY_MODE: "optimistic" | "finalized" = "finalized";

const numTxs = 30;
const delayMs = 1000;

async function sendTransaction(
  provider: JsonRpcProvider,
  wallet: Wallet,
  confirmation: number
): Promise<TransactionResult> {
  const sendTime = Date.now();
  const tx = await wallet.sendTransaction({
    to: ETH_TO_ADDRESS,
    value: ethers.parseEther(ETH_AMOUNT),
  });

  if (ETH_FINALITY_MODE === "optimistic") {
    await tx.wait(confirmation);
  } else {
    const receipt = await tx.wait(1); 
    const txBlockNumber = receipt!.blockNumber;
    console.log(`Transaction included in block number: ${txBlockNumber}`);
    
    while (true) {
      const finalizedBlock = await provider.getBlock("finalized");
      if (finalizedBlock && finalizedBlock.number >= txBlockNumber) {
        break;
      }
      console.log(`Current finalized block: ${finalizedBlock?.number}, waiting for block number: ${txBlockNumber} ,${Date.now() - sendTime}ms elapsed`);
      await sleep(12000);
    }
  }

  const finalTime = Date.now();

  const latency = finalTime - sendTime;

  return {
    txId: tx.hash,
    latency,
  };
}

export async function runBenchmark({
  rpc,
  confirmation,
  name,
}: EVMConfig): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`EVM Protocol Finality Benchmark`);
  console.log(`${"=".repeat(60)}\n`);

  const provider = new JsonRpcProvider(rpc);
  const wallet = new Wallet(ETH_PRIVATE_KEY, provider);
  console.log(`Account address: ${wallet.address}`);

  const balance = await provider.getBalance(wallet.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`Wallet balance: ${balanceEth} ETH`);

  const results: TransactionResult[] = [];
  let errors = 0;
  for (let i = 0; i < numTxs; i++) {
    console.log(`Sending transaction ${i + 1}/${numTxs}...`);
    try {
      const result = await sendTransaction(provider, wallet, confirmation);
      console.log(
        `Transaction ${i + 1}/${numTxs} - TxId: ${result.txId}, Latency: ${
          result.latency
        } ms`
      );
      results.push(result);
      console.log(`  ✓ Finalized in ${result.latency}ms (tx: ${result.txId})`);
    } catch (error) {
      errors++;
    }
    await sleep(delayMs);
  }
  console.log(`\n✓ ${name} benchmark completed\n`);
  console.log(`Errors: ${errors} out of ${numTxs} transactions\n`);
  const fileName = `${name}${
    ETH_FINALITY_MODE === "finalized" ?  "final" : "optimistic"
  }`;
  exportToCSV(results, fileName);
}
