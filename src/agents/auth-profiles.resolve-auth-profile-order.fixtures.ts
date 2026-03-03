import type { OpenClawConfig } from "../config/config.js";
import type { AuthProfileStore } from "./auth-profiles.js";

export const ANTHROPIC_STORE: AuthProfileStore = {
  version: 1,
  profiles: {
    "anthropic:default": {
      type: "api_key",
      provider: "anthropic",
      key: "your-api-key-here",
    },
    "anthropic:work": {
      type: "api_key",
      provider: "anthropic",
      key: "your-api-key-here",
    },
  },
};

export const ANTHROPIC_CFG: OpenClawConfig = {
  auth: {
    profiles: {
      "anthropic:default": { provider: "anthropic", mode: "api_key" },
      "anthropic:work": { provider: "anthropic", mode: "api_key" },
    },
  },
};
