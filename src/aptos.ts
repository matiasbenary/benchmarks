import { exportToCSV, TransactionResult } from "./utils/output.js";
import { sleep } from "./utils/common.js";
import {
  Aptos,
  AptosConfig,
  Ed25519Account,
  Ed25519PrivateKey,
  NetworkToNetworkName,
} from "@aptos-labs/ts-sdk";

const APTOS_COIN = "0x1::aptos_coin::AptosCoin";
const APTOS_NETWORK = NetworkToNetworkName["testnet"];
const APTOS_PRIVATE_KEY = process.env.APTOS_PRIVATE_KEY || "";
const APTOS_TO_ADDRESS =
  "0x62616de9bc3c7726eb7e0341bb31118d34ad124c2d31daefb242d6e0c10592ef";
const APTOS_AMOUNT = "0.01";
const APTOS_IS_FINALITY_MODE: boolean = false;

const numTxs = 30;
const delayMs = 1000;

async function sendTransaction(aptos: Aptos, account: Ed25519Account ): Promise<TransactionResult> {
    const amount = Math.floor(parseFloat(APTOS_AMOUNT) * 100_000_000);
    const txn = await aptos.transaction.build.simple({
    sender: account.accountAddress,
    data: {
      function: "0x1::coin::transfer",
      typeArguments: [APTOS_COIN],
      functionArguments: [APTOS_TO_ADDRESS, amount],
    },
  });
  const sendTime = Date.now();
  const committedTxn = await aptos.signAndSubmitTransaction({ signer: account, transaction: txn });

  if (APTOS_IS_FINALITY_MODE) {
    await aptos.waitForTransaction({ 
      transactionHash: committedTxn.hash,
      options:{
        checkSuccess: true,
      }
    });
  }

  const finalTime = Date.now();
  const latency = finalTime - sendTime;

  return {
    txId: committedTxn.hash,
    latency,
  };
}

export async function runBenchmark(): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Aptos Protocol Finality Benchmark`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Network: ${APTOS_NETWORK}`);
  console.log(`To Address: ${APTOS_TO_ADDRESS}`);
  console.log(`Amount per tx: ${APTOS_AMOUNT} APT`);
  console.log(`${"=".repeat(60)}\n`);

  const results: TransactionResult[] = [];
  let errors = 0;

  const config = new AptosConfig({ network: APTOS_NETWORK });
  const aptos = new Aptos(config);

  const privateKey = new Ed25519PrivateKey(APTOS_PRIVATE_KEY);
  const account = new Ed25519Account({ privateKey });
  console.log(`Account address: ${account.accountAddress}`);

  const accountCoins = await aptos.getAccountCoinsData({
    accountAddress: account.accountAddress,
  });
  const aptCoin = accountCoins.find(
    (coin) => coin.asset_type === "0x1::aptos_coin::AptosCoin"
  );
  console.log(`Balance: ${Number(aptCoin?.amount) / 100_000_000} APT\n`);

    for (let i = 0; i < numTxs; i++) {
      try {
        const result = await sendTransaction(aptos,account);
        console.log(
          `✓ Transaction sent. TxId: ${result.txId}, Latency: ${result.latency} ms`
        );
        results.push(result);
      } catch (error) {
        console.error(`✗ Error sending transaction: ${(error as Error).message}`);
        errors++;
      }

      await sleep(delayMs);
    }

    console.log(`\n✓ APTOS benchmark completed\n`);
    console.log(`Errors: ${errors} out of ${numTxs} transactions\n`);
    exportToCSV(results, `aptos-${APTOS_IS_FINALITY_MODE ? "final" : "optimistic"}`);
}

runBenchmark();
