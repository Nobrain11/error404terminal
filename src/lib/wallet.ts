import { ethers } from "ethers";
import { encrypt, decrypt } from "./encryption";

export function createWallet() {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    encryptedKey: encrypt(wallet.privateKey),
    encryptedPhrase: wallet.mnemonic?.phrase
      ? encrypt(wallet.mnemonic.phrase)
      : null,
  };
}

export function importFromPhrase(phrase: string) {
  const wallet = ethers.Wallet.fromPhrase(phrase);
  return {
    address: wallet.address,
    encryptedKey: encrypt(wallet.privateKey),
    encryptedPhrase: encrypt(phrase),
  };
}

export function importFromKey(privateKey: string) {
  const wallet = new ethers.Wallet(privateKey);
  return {
    address: wallet.address,
    encryptedKey: encrypt(privateKey),
    encryptedPhrase: null,
  };
}

export function getWalletSigner(encryptedKey: string) {
  const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
  const privateKey = decrypt(encryptedKey);
  return new ethers.Wallet(privateKey, provider);
}
