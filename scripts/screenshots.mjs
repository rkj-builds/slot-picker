// Renders the README pictures with headless Chrome against `vite preview`,
// with the clock pinned so the seeded demo data is the same on every run.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 4173;
const NOW = "2026-10-17T05:30:00Z"; // Sat 17 Oct 2026, 11:00 AM in Kolkata
const SHOTS = [
  { name: "book", hash: "#/book/when", size: "520,1200" },
  { name: "desk", hash: "#/desk", size: "1280,1000" },
  { name: "insights", hash: "#/desk/insights", size: "1280,1000" },
];

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
  for (const shot of SHOTS) {
    for (const theme of ["light", "dark"]) {
      const out = resolve(`docs/${shot.name}-${theme}.png`);
      const url = `http://localhost:${PORT}/slot-picker/?now=${NOW}&theme=${theme}${shot.hash}`;
      await run(CHROME, [
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--lang=en-IN",
        "--force-device-scale-factor=2",
        `--window-size=${shot.size}`,
        "--virtual-time-budget=4000",
        `--screenshot=${out}`,
        url,
      ]);
      console.log(`wrote ${out}`);
    }
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
