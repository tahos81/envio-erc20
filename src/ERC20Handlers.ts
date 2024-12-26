import { ERC20, TransferEvent } from "generated";
import { accountExists } from "./utils/account";

ERC20.Transfer.handler(async ({ event, context }) => {
  const from = event.params.from;
  const to = event.params.to;
  const exists = (await accountExists(from)) || (await accountExists(to));

  if (!exists) {
    return;
  }

  let transferEvent: TransferEvent = {
    id: event.block.hash + "-" + event.logIndex.toString(),
    from,
    to,
    value: event.params.value,
    date: event.block.timestamp,
  };

  context.TransferEvent.set(transferEvent);
});
