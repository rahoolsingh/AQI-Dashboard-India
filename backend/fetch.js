import puppeteer from "puppeteer";
import fs from "fs";

// Configuration
const METADATA_FILE = "metadata.json";
const SIX_HOURS_MS = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

// Helper: Generate a safe filename like "aqi_2024_01_01_12_30_05.json"
function getTimestampFilename() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    return `aqi_${year}_${month}_${day}_${hours}_${minutes}_${seconds}.json`;
}

(async () => {
    // ---------------------------------------------------------
    // STEP 0: Check Metadata (The "6-Hour Rule")
    // ---------------------------------------------------------
    if (fs.existsSync(METADATA_FILE)) {
        try {
            const meta = JSON.parse(fs.readFileSync(METADATA_FILE, "utf8"));
            const lastCaptured = new Date(meta.capturedAt).getTime();
            const now = Date.now();
            const diff = now - lastCaptured;

            if (diff < SIX_HOURS_MS) {
                const minutesLeft = Math.floor((SIX_HOURS_MS - diff) / 55000);
                console.log(
                    `[Skipped] Last capture was less than 6 hours ago.`,
                );
                console.log(
                    `Next run allowed in approx ${minutesLeft} minutes.`,
                );
                return; // STOP EXECUTION HERE
            }
        } catch (err) {
            console.warn(
                "[Warning] Metadata file corrupted or unreadable. Proceeding with new capture.",
            );
        }
    }

    // ---------------------------------------------------------
    // STEP 1: Launch Puppeteer (Only if check passed)
    // ---------------------------------------------------------
    const browser = await puppeteer.launch({
        headless: "new",
        defaultViewport: null,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
        ],
    });

    const page = await browser.newPage();
    const apiPattern = "getAirQualityRanklistCountryAndCity";

    console.log(`[Start] Waiting for API request: "${apiPattern}"...`);

    // ---------------------------------------------------------
    // STEP 2: The Capture Promise
    // ---------------------------------------------------------
    const captureData = new Promise((resolve, reject) => {
        page.on("response", async (response) => {
            const url = response.url();

            if (
                url.includes(apiPattern) &&
                response.request().method() === "GET"
            ) {
                console.log(`\n[Captured] Found target API: ${url}`);

                try {
                    const data = await response.json();

                    // Generate new filename
                    const newFilename = getTimestampFilename();
                    const captureTime = new Date().toISOString();

                    // 1. Save the actual data file
                    fs.writeFileSync(
                        newFilename,
                        JSON.stringify(
                            {
                                capturedAt: captureTime,
                                data: data,
                            },
                            null,
                            2,
                        ),
                    );
                    console.log(`[Success] Data saved to "${newFilename}"`);

                    // 2. Update metadata.json
                    const newMetadata = {
                        capturedAt: captureTime,
                        filename: newFilename,
                    };
                    fs.writeFileSync(
                        METADATA_FILE,
                        JSON.stringify(newMetadata, null, 2),
                    );
                    console.log(`[Metadata] Updated ${METADATA_FILE}`);

                    resolve(true);
                } catch (err) {
                    console.error("[Error] Failed to parse JSON:", err.message);
                    reject(err);
                }
            }
        });

        setTimeout(() => {
            reject(
                new Error("Timeout: API request was not detected within 30s."),
            );
        }, 30000);
    });

    // ---------------------------------------------------------
    // STEP 3: Navigate
    // ---------------------------------------------------------
    page.goto("https://www.aqi.in/in/real-time-most-polluted-city-ranking", {
        waitUntil: "domcontentloaded",
    });

    try {
        await captureData;
    } catch (error) {
        console.error(`\n[Failed] ${error.message}`);
    } finally {
        await browser.close();
    }
})();
