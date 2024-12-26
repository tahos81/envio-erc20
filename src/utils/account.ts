import { AccountCache } from "./cache";

export async function accountExists(address: string): Promise<boolean> {
  return AccountCache.init().then((cache) => cache.exists(address));
}

export async function addAccount(address: string): Promise<boolean> {
  return AccountCache.init().then((cache) => cache.add(address));
}
