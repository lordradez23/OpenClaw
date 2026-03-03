import { describe, expect, it, vi } from "vitest";
import { sendIMessageReaction } from "./send.js";

describe("sendIMessageReaction", () => {
  it("should send a reaction successfully", async () => {
    const mockRequest = vi.fn().mockResolvedValue({ ok: "ok" });
    const mockClient = {
      request: mockRequest,
      stop: vi.fn(),
    };
    
    const result = await sendIMessageReaction(
      "test@example.com",
      "test-guid",
      "👍",
      {
        client: mockClient as any,
      }
    );
    
    expect(mockRequest).toHaveBeenCalledWith(
      "react",
      {
        to: "test@example.com",
        message_guid: "test-guid",
        reaction: "👍",
      },
      expect.any(Object)
    );
    expect(result.ok).toBe(true);
  });

  it("should handle failure to send a reaction", async () => {
    const mockRequest = vi.fn().mockResolvedValue({ error: "failed" });
    const mockClient = {
      request: mockRequest,
      stop: vi.fn(),
    };
    
    const result = await sendIMessageReaction(
      "test@example.com",
      "test-guid",
      "👍",
      {
        client: mockClient as any,
      }
    );
    
    expect(result.ok).toBe(false);
  });
});
