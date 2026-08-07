import { ethers } from "ethers";
import axios from "axios";

const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);

export async function scanContract(address: string) {
  const [code, holders] = await Promise.all([
    provider.getCode(address),
    getHolders(address),
  ]);

  const isContract = code !== "0x";
  const riskScore = calculateRisk({ isContract, holders });

  return {
    address,
    isContract,
    riskScore,
    holders,
    verified: riskScore > 70,
  };
}

async function getHolders(address: string) {
  try {
    const { data } = await axios.get(
      `${process.env.NEXT_PUBLIC_RPC_URL}/token/holders/${address}`
    );
    return data;
  } catch {
    return [];
  }
}

function calculateRisk({ isContract, holders }: { isContract: boolean; holders: unknown[] }) {
  let score = 100;
  if (!isContract) score -= 50;
  if (holders.length < 10) score -= 20;
  return Math.max(0, score);
}
