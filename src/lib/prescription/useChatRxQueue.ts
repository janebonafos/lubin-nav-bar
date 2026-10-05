import { useEffect, useState } from "react";
import { countWaitingRequests, loadResponses, subscribeResponses, type ChatRxResponse } from "./chatRequests";

export function useChatRxQueue() {
  const [responses, setResponses] = useState<Record<string, ChatRxResponse>>({});
  useEffect(() => {
    const sync = () => setResponses(loadResponses());
    sync();
    return subscribeResponses(sync);
  }, []);
  return { responses, waitingCount: countWaitingRequests(responses) };
}