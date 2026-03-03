import {
  createActionGate,
  jsonResult,
  readReactionParams,
  readStringParam,
  resolveIMessageAccount,
  type ChannelMessageActionAdapter,
  type ChannelMessageActionName,
} from "openclaw/plugin-sdk";
import { getIMessageRuntime } from "./runtime.js";

const SUPPORTED_ACTIONS = new Set<ChannelMessageActionName>(["react"]);

export const imessageMessageActions: ChannelMessageActionAdapter = {
  listActions: ({ cfg }) => {
    const account = resolveIMessageAccount({ cfg });
    if (!account.enabled || !account.configured) {
      return [];
    }
    const gate = createActionGate((cfg.channels?.imessage as any)?.actions);
    if (gate("reactions")) {
      return ["react"];
    }
    return [];
  },
  supportsAction: ({ action }) => SUPPORTED_ACTIONS.has(action),
  extractToolSend: () => null,
  handleAction: async ({ action, params, cfg, accountId }) => {
    if (action === "react") {
      const { emoji, remove, isEmpty } = readReactionParams(params, {
        removeErrorMessage: "Emoji is required to remove an iMessage reaction.",
      });
      if (isEmpty && !remove) {
        throw new Error(
          "iMessage react requires emoji parameter. Use action=react with emoji=<emoji> and messageId=<message_id>.",
        );
      }
      const messageId = readStringParam(params, "messageId");
      if (!messageId) {
        throw new Error(
          "iMessage react requires messageId parameter (the message ID to react to).",
        );
      }
      const to = readStringParam(params, "to") ?? readStringParam(params, "target");
      if (!to) {
        throw new Error("iMessage react requires to or target parameter.");
      }

      // imsg CLI uses the name itself (love, like, etc.) or -name for removal
      // We'll normalize slightly to match what imsg expects if needed, 
      // but usually the connector handles the string.
      // For now, we'll pass the emoji/name through.
      const reaction = remove ? `-${emoji}` : emoji;

      await (getIMessageRuntime().channel.imessage as any).sendIMessageReaction(to, messageId, reaction, {
        cfg,
        accountId: accountId ?? undefined,
      });

      return jsonResult({ ok: true, ...(remove ? { removed: true } : { added: emoji }) });
    }

    throw new Error(`Action ${action} is not supported for iMessage.`);
  },
};
