import { ERC20, TransferEvent, TokenBalance } from "generated";
import { accountExists } from "./utils/account";

ERC20.Transfer.handlerWithLoader({
  loader: async ({ event, context }) => {
    const token = event.srcAddress;
    const fromTokenBalanceId = event.params.from + token;
    const toTokenBalanceId = event.params.to + token;
    const [fromTokenBalance, toTokenBalance] = await Promise.all([
      context.TokenBalance.get(fromTokenBalanceId),
      context.TokenBalance.get(toTokenBalanceId),
    ]);

    return {
      fromTokenBalance,
      toTokenBalance,
    };
  },
  handler: async ({ event, context, loaderReturn }) => {
    const { fromTokenBalance, toTokenBalance } = loaderReturn;

    let relevant = false;
    if (!fromTokenBalance) {
      const fromExists = await accountExists(event.params.from);
      if (fromExists) {
        relevant = true;
        const fromTokenBalance: TokenBalance = {
          id: event.params.from + event.srcAddress,
          account: event.params.from,
          token: event.srcAddress,
          balance: 0n - event.params.value,
        };
        context.TokenBalance.set(fromTokenBalance);
      }
    } else {
      relevant = true;
      const newTokenBalance: TokenBalance = {
        id: event.params.from + event.srcAddress,
        account: event.params.from,
        token: event.srcAddress,
        balance: fromTokenBalance.balance - event.params.value,
      };
      context.TokenBalance.set(newTokenBalance);
    }

    if (!toTokenBalance) {
      const toExists = await accountExists(event.params.to);
      if (toExists) {
        relevant = true;
        const toTokenBalance: TokenBalance = {
          id: event.params.to + event.srcAddress,
          account: event.params.to,
          token: event.srcAddress,
          balance: event.params.value,
        };
        context.TokenBalance.set(toTokenBalance);
      }
    } else {
      relevant = true;
      const newTokenBalance: TokenBalance = {
        id: event.params.to + event.srcAddress,
        account: event.params.to,
        token: event.srcAddress,
        balance: toTokenBalance.balance + event.params.value,
      };
      context.TokenBalance.set(newTokenBalance);
    }

    if (relevant) {
      const transferEvent: TransferEvent = {
        id: event.block.hash + "-" + event.logIndex.toString(),
        from: event.params.from,
        to: event.params.to,
        value: event.params.value,
        date: event.block.timestamp,
      };
      context.TransferEvent.set(transferEvent);
    }
  },
  wildcard: true,
});
