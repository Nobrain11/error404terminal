import { ethers } from "ethers";
import { getWalletSigner } from "@/lib/wallet";
import { prisma } from "@/lib/prisma";

const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);

export async function buyToken({
  walletId,
  encryptedKey,
  tokenAddress,
  amountEth,
  slippage,
}: {
  walletId: string;
  encryptedKey: string;
  tokenAddress: string;
  amountEth: string;
  slippage: string;
}) {
  const signer = getWalletSigner(encryptedKey);

  // Build swap transaction — replace with actual DEX router
  const tx = await signer.sendTransaction({
    to: tokenAddress,
    value: ethers.parseEther(amountEth),
  });

  await prisma.transaction.create({
    data: {
      userId: "", // set from context
      walletId,
      hash: tx.hash,
      type: "buy",
      tokenOut: tokenAddress,
      amountIn: amountEth,
      status: "pending",
    },
  });

  const receipt = await tx.wait();

  await prisma.transaction.update({
    where: { hash: tx.hash },
    data: { status: receipt?.status === 1 ? "completed" : "failed" },
  });

  return { hash: tx.hash, status: receipt?.status === 1 ? "success" : "failed" };
}

export async function estimateGas(to: string, value: string) {
  const estimate = await provider.estimateGas({ to, value: ethers.parseEther(value) });
  const feeData = await provider.getFeeData();
  const total = estimate * (feeData.gasPrice ?? 0n);
  return ethers.formatEther(total);
}
