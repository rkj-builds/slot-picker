// Renders docs/screenshot-light.png and docs/screenshot-dark.png with headless Chrome
// against `vite preview`, with the clock pinned so the pictures are repeatable.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 4173;
const NOW = "2026-10-17T03:30:00Z"; // Sat 17 Oct 2026, 9:00 AM in Kolkata
const QUERY = `now=${NOW}&locale=en-US&tz=America/New_York&slot=2026-10-17T20:00&duration=90`;
const SIZE = "1200,1120";

if (!existsSync(CHROME)) {
  console.error(`Chrome not found at ${CHROME}; set CHROME=/path/to/chrome`);
  process.exit(1);
}

mkdirSync(resolve("docs"), { recursive: true });

const preview = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "pipe" });
await new Promise((ok, fail) => {
  preview.stdout.on("data", (chunk) => chunk.toString().includes("http") && ok());
  preview.on("exit", (code) => fail(new Error(`vite preview exited with ${code}`)));
});

try {
  for (const theme of ["light", "dark"]) {
    const out = resolve(`docs/screenshot-${theme}.png`);
    const url = `http://localhost:${PORT}/?${QUERY}&theme=${theme}`;
    await run(CHROME, [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--lang=en-US",
      "--force-device-scale-factor=2",
      `--window-size=${SIZE}`,
      "--virtual-time-budget=3000",
      `--screenshot=${out}`,
      url,
    ]);
    console.log(`wrote ${out}`);
  }
} finally {
  preview.kill();
}

function run(cmd, args) {
  return new Promise((ok, fail) => {
    const child = spawn(cmd, args, { stdio: "ignore" });
    child.on("exit", (code) => (code === 0 ? ok() : fail(new Error(`${cmd} exited with ${code}`))));
  });
}
