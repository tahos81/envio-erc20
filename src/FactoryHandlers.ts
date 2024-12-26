import { AccountFactoryV2 } from "generated";
import { addAccount } from "./utils/account";

AccountFactoryV2.ClaveAccountDeployed.handler(async ({ event }) => {
  const address = event.params.accountAddress;
  await addAccount(address);
});
