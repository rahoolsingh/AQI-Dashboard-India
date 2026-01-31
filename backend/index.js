import express from "express";
import fs from "fs";
import { exec } from "child_process";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";

// ---------------------------------------------------------
// CONFIGURATION & PATH FIXES (Crucial for ESM)
// ---------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
const PORT = process.env.PORT || 3000;

// Resolve files relative to this script's location
const METADATA_FILE = path.join(__dirname, "metadata.json");
const FETCH_SCRIPT = path.join(__dirname, "fetch.js");
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

// ---------------------------------------------------------
// 1. THE API ENDPOINT
// ---------------------------------------------------------
app.get("/", (req, res) => {
    res.send("India AQI Backend is running.");
});

app.get("/api/get-aqi-data", (req, res) => {
    // Check if metadata exists
    if (!fs.existsSync(METADATA_FILE)) {
        return res.status(503).json({
            error: "Data not available yet. Server is fetching initial data.",
        });
    }

    try {
        // Read metadata to find the latest filename
        const meta = JSON.parse(fs.readFileSync(METADATA_FILE, "utf8"));

        // Fix: Ensure we look for the data file in the same directory as this script
        const latestFilePath = path.join(__dirname, meta.filename);

        // Check if the actual data file exists
        if (!fs.existsSync(latestFilePath)) {
            console.error(
                `[Error] File listed in metadata not found: ${latestFilePath}`,
            );
            return res.status(404).json({ error: "Data file missing." });
        }

        // Read and send the content
        const data = fs.readFileSync(latestFilePath, "utf8");
        res.setHeader("Content-Type", "application/json");
        res.send({
            ...JSON.parse(data),
            currentTime: new Date().toISOString(),
        });
    } catch (err) {
        console.error("Error serving data:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ---------------------------------------------------------
// 2. THE SCHEDULER (Runs fetch.js)
// ---------------------------------------------------------
function runFetcher() {
    console.log("[Scheduler] Triggering fetch.js...");

    // Fix:
    // 1. Use absolute path for the script
    // 2. Set 'cwd' (Current Working Directory) to __dirname so fetch.js finds node_modules correctly
    exec(
        `node "${FETCH_SCRIPT}"`,
        { cwd: __dirname },
        (error, stdout, stderr) => {
            if (error) {
                console.error(
                    `[Scheduler Error] Failed to run fetcher: ${error.message}`,
                );
                return;
            }

            // Log stdout (Success messages)
            if (stdout) {
                console.log(`[Fetcher] ${stdout.trim()}`);
            }

            // Only log stderr if it contains actual keywords, otherwise ignore Puppeteer noise
            if (
                stderr &&
                (stderr.includes("Error") || stderr.includes("Failed"))
            ) {
                console.warn(`[Fetcher Warning] ${stderr.trim()}`);
            }
        },
    );
}

// ---------------------------------------------------------
// 3. START SERVER
// ---------------------------------------------------------
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);

    // Run immediately on startup
    runFetcher();

    // Schedule to run every 6 hours
    setInterval(runFetcher, SIX_HOURS_MS);
});
