# Blockchain Network Benchmark

Benchmarking finality times across different blockchain networks including NEAR, Sui, Solana, Aptos, Sepolia, and Arbitrum.

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Private keys for the blockchain networks you want to test

## Getting Started

### 1. Install Dependencies

```bash
npm install
# or
yarn install
```

### 2. Configure Environment Variables

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your private keys and account information:

```
NEAR_PRIVATE_KEY=your_near_private_key
NEAR_ACCOUNT_ID=your_near_account_id

SUI_PRIVATE_KEY=your_sui_private_key

SOL_PRIVATE_KEY=your_solana_private_key

APTOS_PRIVATE_KEY=your_aptos_private_key

ETH_PRIVATE_KEY=your_ethereum_private_key
```

### 3. Build the Project (Optional)

```bash
npm run build
```

## Running Benchmarks

Run benchmarks for specific networks using the following commands:

```bash
# NEAR Protocol
npm run near

# Sui Network
npm run sui

# Solana
npm run solana

# Aptos
npm run aptos

# Sepolia (Ethereum Testnet)
npm run sepolia

# Arbitrum
npm run arbitrum
```

## Project Structure

```
.
├── src/
│   ├── near.ts      # NEAR Protocol benchmark
│   ├── sui.ts       # Sui Network benchmark
│   ├── solana.ts    # Solana benchmark
│   ├── aptos.ts     # Aptos benchmark
│   ├── sepolia.ts   # Sepolia benchmark
│   ├── arbitrum.ts  # Arbitrum benchmark
│   └── evm.ts       # EVM utilities
├── results/         # Benchmark results
└── package.json
```

## Results

Benchmark results will be stored in the `results/` directory.
