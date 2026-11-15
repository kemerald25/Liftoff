import { defineConfig, devices } from "@playwright/test";
import { E2E_CONFIG_STRING, E2E_HOLDER_STRING, PORTS, SERVER_BALANCES, urlFor } from "./e2e/fixtures";

/**
 * Three copies of the production build run side by side:
 *   kit      no config (Liftoff's own site)
 *   project  config + holder content set (a builder's site)
 *   outage   config set, explorer failing
 * The explorer and RPC are mocked for both the server and the browser.
 */
const project = {
  NEXT_PUBLIC_LIFTOFF_CONFIG: E2E_CONFIG_STRING,
  MOCK_BALANCES: JSON.stringify(SERVER_BALANCES),
};

const servers: { name: keyof typeof PORTS; env: Record<string, string> }[] = [
  { name: "kit", env: { NEXT_PUBLIC_LIFTOFF_CONFIG: "", LIFTOFF_HOLDER_CONTENT: "" } },
  { name: "project", env: { ...project, LIFTOFF_HOLDER_CONTENT: E2E_HOLDER_STRING } },
  { name: "outage", env: { ...project, LIFTOFF_HOLDER_CONTENT: "", MOCK_EXPLORER_DOWN: "1" } },
];

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: servers.map(({ name, env }) => ({
    command: `node e2e/support/serve.cjs ${name} ${PORTS[name]}`,
    url: urlFor(name),
    env,
    timeout: 1_500_000,
    reuseExistingServer: false,
    stdout: "pipe" as const,
  })),
});
