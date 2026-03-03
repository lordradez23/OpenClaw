import { DisconnectReason } from "@whiskeysockets/baileys";
import { formatCliCommand } from "../cli/command-format.js";
import { loadConfig } from "../config/config.js";
import { danger, info, success } from "../globals.js";
import { logInfo } from "../logger.js";
import { defaultRuntime, type RuntimeEnv } from "../runtime.js";
import { resolveWhatsAppAccount } from "./accounts.js";
import { createWaSocket, formatError, logoutWeb, waitForWaConnection } from "./session.js";

export async function loginWeb(
  verbose: boolean,
  waitForConnection?: typeof waitForWaConnection,
  runtime: RuntimeEnv = defaultRuntime,
  accountId?: string,
) {
  const wait = waitForConnection ?? waitForWaConnection;
  const cfg = loadConfig();
  const account = resolveWhatsAppAccount({ cfg, accountId });
  const sock = await createWaSocket(true, verbose, {
    authDir: account.authDir,
  });
  logInfo("Waiting for WhatsApp connection...", runtime);
  try {
    await wait(sock);
    console.log(success("✅ Linked! Credentials saved for future sends."));
  } catch (err) {
    const code =
      (err as { error?: { output?: { statusCode?: number } } })?.error?.output?.statusCode ??
      (err as { output?: { statusCode?: number } })?.output?.statusCode;
    if (code === 515) {
      let retrySock = sock;
      let attempts = 1;
      const maxAttempts = 5;
      while (attempts <= maxAttempts) {
        console.log(
          info(
            `WhatsApp asked for a restart after pairing (code 515); retry attempt ${attempts}/${maxAttempts}...`,
          ),
        );
        try {
          retrySock.ws?.close();
        } catch {
          // ignore
        }
        // Quadratic backoff with some jitter.
        const delayMs = 1000 * Math.pow(attempts, 1.5) + Math.random() * 1000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        
        const nextSock = await createWaSocket(false, verbose, {
          authDir: account.authDir,
        });
        try {
          await wait(nextSock);
          console.log(success("✅ Linked after restart; web session ready."));
          // Let Baileys flush any final events before closing the socket.
          setTimeout(() => {
            try {
              nextSock.ws?.close();
            } catch {
              // ignore
            }
          }, 1000);
          return;
        } catch (retryErr) {
          const nextCode =
            (retryErr as { error?: { output?: { statusCode?: number } } })?.error?.output?.statusCode ??
            (retryErr as { output?: { statusCode?: number } })?.output?.statusCode;
          if (nextCode === 515 && attempts < maxAttempts) {
            retrySock = nextSock;
            attempts++;
            continue;
          }
          throw retryErr;
        }
      }
    }
    if (code === DisconnectReason.loggedOut) {
      await logoutWeb({
        authDir: account.authDir,
        isLegacyAuthDir: account.isLegacyAuthDir,
        runtime,
      });
      console.error(
        danger(
          `WhatsApp reported the session is logged out. Cleared cached web session; please rerun ${formatCliCommand("openclaw channels login")} and scan the QR again.`,
        ),
      );
      throw new Error("Session logged out; cache cleared. Re-run login.", { cause: err });
    }
    const formatted = formatError(err);
    console.error(danger(`WhatsApp Web connection ended before fully opening. ${formatted}`));
    throw new Error(formatted, { cause: err });
  } finally {
    // Let Baileys flush any final events before closing the socket.
    setTimeout(() => {
      try {
        sock.ws?.close();
      } catch {
        // ignore
      }
    }, 500);
  }
}
