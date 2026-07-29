import express from "express";
import path from "path";
import fs from "fs/promises";
import { INVENTORY_ITEMS } from "./src/lib/items";
import { EMPLOYEES } from "./src/lib/employees";

const app = express();

// Allow iframe embedding & cross-origin requests for Google Sites, WordPress, etc.
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-gas-url");
  res.removeHeader("X-Frame-Options");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Setup standard JSON and body parsing middlewares
// Increased limit to support base64 validation photo uploads
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const localDbPath = path.join(process.cwd(), "src", "data", "requests.json");
const configPath = path.join(process.cwd(), "src", "data", "config.json");

let serverGasUrl = process.env.GAS_URL || "https://script.google.com/macros/s/AKfycbyAravxJfFJkUqxUh3PaWRkLcFiBicnQfeDJqEwzadXKGOq0QxZeTcyRoeoiFeKKC09yw/exec";

// Try to load centralized config on startup (non-blocking)
async function loadConfigOnStartup() {
  try {
    const configData = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(configData);
    if (config.gasUrl) {
      serverGasUrl = config.gasUrl;
      console.log("Centralized server GAS URL loaded:", serverGasUrl);
    }
  } catch (err) {
    console.log("Using default or environment-defined GAS URL:", serverGasUrl);
  }
}
loadConfigOnStartup();

// Helper to read local data safely
async function readLocalData() {
  try {
    await fs.mkdir(path.dirname(localDbPath), { recursive: true });
    try {
      const data = await fs.readFile(localDbPath, "utf-8");
      return JSON.parse(data);
    } catch (e) {
      // If file doesn't exist, return empty array
      return [];
    }
  } catch (error) {
    console.error("Error reading local DB:", error);
    return [];
  }
}

// Helper to write local data safely
async function writeLocalData(data: any) {
  try {
    await fs.mkdir(path.dirname(localDbPath), { recursive: true });
    await fs.writeFile(localDbPath, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error("Error writing local DB:", error);
    return false;
  }
}

  // API 0: Live Items from Google Spreadsheet (automatic sync)
  app.get("/api/items", async (req, res) => {
    try {
      console.log("Fetching live items from Google Sheets...");
      const csvResponse = await fetch("https://docs.google.com/spreadsheets/d/1qsI0kowbn-swkpzbZjNxN1JCxACfQLH3lE8X80DWdIU/export?format=csv&gid=150480835");
      if (!csvResponse.ok) {
        throw new Error(`HTTP Error ${csvResponse.status}`);
      }
      const csvText = await csvResponse.text();
      
      // Parse CSV rows
      const parseCSV = (text: string) => {
        const lines: string[][] = [];
        let row = [""];
        let inQuotes = false;
        
        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          const nextChar = text[i+1];
          
          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              row[row.length - 1] += '"';
              i++; // skip next quote
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            row.push("");
          } else if ((char === '\r' || char === '\n') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') {
              i++;
            }
            lines.push(row);
            row = [""];
          } else {
            row[row.length - 1] += char;
          }
        }
        if (row.length > 1 || row[0] !== "") {
          lines.push(row);
        }
        return lines;
      };

      const rows = parseCSV(csvText);
      if (rows.length < 2) {
        throw new Error("No data found in Google Sheets CSV");
      }

      const header = rows[0];
      const codeIdx = header.findIndex(h => h.toLowerCase().includes("kode"));
      const nameIdx = header.findIndex(h => h.toLowerCase().includes("nama"));
      const unitIdx = header.findIndex(h => h.toLowerCase().includes("satuan"));
      const brandIdx = header.findIndex(h => h.toLowerCase().includes("merk"));

      const itemMap = new Map<string, { name: string; code: string; unit: string; brands: Set<string> }>();

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 3) continue;

        const code = row[codeIdx]?.trim() || "";
        const name = row[nameIdx]?.trim() || "";
        const unit = row[unitIdx]?.trim() || "";
        const brand = row[brandIdx]?.trim() || "";

        if (!name || name.toLowerCase() === "nama barang") continue;

        const key = name.toLowerCase();
        if (!itemMap.has(key)) {
          itemMap.set(key, {
            name: name,
            code: code,
            unit: unit,
            brands: new Set<string>()
          });
        }
        if (brand) {
          itemMap.get(key)!.brands.add(brand);
        }
      }

      const items = Array.from(itemMap.values()).map(item => ({
        name: item.name,
        code: item.code,
        unit: item.unit,
        brands: Array.from(item.brands).filter(b => b.length > 0)
      }));

      // Sort alphabetically by name
      items.sort((a, b) => a.name.localeCompare(b.name));

      console.log(`Successfully fetched and parsed ${items.length} live items from Google Sheets!`);
      return res.json({ success: true, source: "Google Sheets (Live)", data: items });

    } catch (error: any) {
      console.error("Failed to fetch live items, falling back to preloaded list:", error.message);
      return res.json({
        success: true,
        source: "Preloaded List (Fallback)",
        warning: `Gagal mengambil data terupdate dari Google Sheets: ${error.message}. Menggunakan daftar bawaan.`,
        data: INVENTORY_ITEMS
      });
    }
  });

  // API 0.5: Live Employees from Google Spreadsheet (automatic sync)
  app.get("/api/employees", async (req, res) => {
    try {
      console.log("Fetching live employees from Google Sheets...");
      const csvResponse = await fetch("https://docs.google.com/spreadsheets/d/1qsI0kowbn-swkpzbZjNxN1JCxACfQLH3lE8X80DWdIU/export?format=csv&gid=1223173252");
      if (!csvResponse.ok) {
        throw new Error(`HTTP Error ${csvResponse.status}`);
      }
      const csvText = await csvResponse.text();

      // Simple CSV parser that handles quotes properly
      const parseCSV = (text: string) => {
        const lines: string[][] = [];
        let row = [""];
        let inQuotes = false;
        
        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          const nextChar = text[i+1];
          
          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              row[row.length - 1] += '"';
              i++; // skip next quote
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            row.push("");
          } else if ((char === '\r' || char === '\n') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') {
              i++;
            }
            lines.push(row);
            row = [""];
          } else {
            row[row.length - 1] += char;
          }
        }
        if (row.length > 1 || row[0] !== "") {
          lines.push(row);
        }
        return lines;
      };

      const rows = parseCSV(csvText);
      if (rows.length < 2) {
        throw new Error("No data found in Google Sheets CSV for employees");
      }

      const header = rows[0];
      const nameIdx = header.findIndex(h => h.toLowerCase().includes("nama"));
      const nrkIdx = header.findIndex(h => h.toLowerCase().includes("nrk") || h.toLowerCase().includes("nikki"));

      const employeesList: any[] = [];
      const seenNrks = new Set<string>();

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 2) continue;

        const name = row[nameIdx]?.trim() || "";
        const nrk = row[nrkIdx]?.trim() || "";

        if (!name || !nrk || name.toLowerCase() === "nama pegawai") continue;

        if (seenNrks.has(nrk)) continue;
        seenNrks.add(nrk);

        // Find existing preloaded role or match based on name/nrk
        const matchedPreloaded = EMPLOYEES.find(emp => emp.nrk === nrk);
        const role = matchedPreloaded?.role || "Guru / Staf";

        employeesList.push({
          name,
          nrk,
          role
        });
      }

      console.log(`Successfully fetched and parsed ${employeesList.length} live employees from Google Sheets!`);
      return res.json({ success: true, source: "Google Sheets (Live)", data: employeesList });

    } catch (error: any) {
      console.error("Failed to fetch live employees, falling back to preloaded list:", error.message);
      return res.json({
        success: true,
        source: "Preloaded List (Fallback)",
        warning: `Gagal mengambil data pegawai terupdate dari Google Sheets: ${error.message}. Menggunakan daftar bawaan.`,
        data: EMPLOYEES
      });
    }
  });

  // API 1.1: Get Centralized Config
  app.get("/api/config", (req, res) => {
    return res.json({ success: true, gasUrl: serverGasUrl });
  });

  // API 1.2: Save Centralized Config
  app.post("/api/config", async (req, res) => {
    const { gasUrl } = req.body;
    if (gasUrl !== undefined) {
      serverGasUrl = gasUrl;
      try {
        await fs.mkdir(path.dirname(configPath), { recursive: true });
        await fs.writeFile(configPath, JSON.stringify({ gasUrl }, null, 2), "utf-8");
        console.log("Centralized server GAS URL saved to config.json:", gasUrl);
      } catch (err) {
        console.error("Failed to write config.json:", err);
      }
      return res.json({ success: true, gasUrl });
    }
    return res.status(400).json({ success: false, error: "gasUrl is required." });
  });

  // API 1: Test Connection
  app.post("/api/test-connection", async (req, res) => {
    const { gasUrl } = req.body;
    if (!gasUrl) {
      return res.status(400).json({ success: false, error: "Apps Script Web App URL tidak boleh kosong." });
    }

    try {
      console.log(`Menghubungi Google Apps Script di: ${gasUrl}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(gasUrl, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const text = await response.text();
        try {
          const json = JSON.parse(text);
          return res.json({ success: true, message: "Koneksi Berhasil!", data: json });
        } catch {
          // If it returns HTML or other formats, we still succeeded in reaching it
          return res.json({ success: true, message: "Koneksi Berhasil (format teks received)." });
        }
      } else {
        return res.status(response.status).json({
          success: false,
          error: `Google Sheets merespon dengan status ${response.status}: ${response.statusText}`
        });
      }
    } catch (error: any) {
      console.error("Test connection failed:", error);
      return res.status(500).json({
        success: false,
        error: `Gagal terhubung ke Google Apps Script: ${error.message}. Pastikan URL valid dan Apps Script telah dideploy sebagai Web App dengan akses 'Anyone'.`
      });
    }
  });

  // API 2: Get Requests (Fetches either from GAS or Local File)
  app.get("/api/requests", async (req, res) => {
    const headerGasUrl = req.headers["x-gas-url"] as string;
    const gasUrl = (headerGasUrl && headerGasUrl.trim() !== "") ? headerGasUrl : serverGasUrl;

    if (gasUrl && gasUrl.trim() !== "") {
      try {
        console.log(`Mengambil data dari Google Sheets via GAS Web App...`);
        const response = await fetch(gasUrl);
        if (!response.ok) {
          throw new Error(`HTTP Error ${response.status}`);
        }
        
        const responseText = await response.text();
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (jsonErr: any) {
          const lowerText = responseText.trim().toLowerCase();
          if (lowerText.startsWith("<!doctype") || lowerText.startsWith("<html")) {
            throw new Error(
              "URL Google Apps Script mengembalikan halaman HTML. Ini biasanya terjadi karena Web App Anda belum dideploy dengan akses 'Anyone' (Siapa saja), atau URL yang dimasukkan salah."
            );
          } else {
            throw new Error(`Respons dari Apps Script bukan format JSON valid: ${jsonErr.message}`);
          }
        }

        if (result && result.success) {
          return res.json({ success: true, source: "Google Sheets", data: result.data });
        } else {
          return res.status(500).json({ success: false, error: result.error || "Gagal mengambil data dari Google Sheets." });
        }
      } catch (error: any) {
        console.error("Fetch from GAS failed, falling back to local server DB:", error.message);
        const localData = await readLocalData();
        return res.json({
          success: true,
          source: "Database Server (Terpusat)",
          data: localData
        });
      }
    } else {
      // Return local server database
      const localData = await readLocalData();
      return res.json({ success: true, source: "Database Server (Terpusat)", data: localData });
    }
  });

  // API 3: Create or Update Request
  app.post("/api/requests", async (req, res) => {
    const headerGasUrl = req.headers["x-gas-url"] as string;
    const gasUrl = (headerGasUrl && headerGasUrl.trim() !== "") ? headerGasUrl : serverGasUrl;
    const { action, data: requestItem } = req.body;

    if (!action || !requestItem) {
      return res.status(400).json({ success: false, error: "Action dan data harus disediakan." });
    }

    if (gasUrl && gasUrl.trim() !== "") {
      try {
        console.log(`Mengirim aksi '${action}' ke Google Sheets via GAS Web App...`);
        const response = await fetch(gasUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ action, data: requestItem })
          // Remove custom redirects manually or let Node fetch handle them
        });

        if (!response.ok) {
          throw new Error(`HTTP Error ${response.status}`);
        }

        const responseText = await response.text();
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (jsonErr: any) {
          const lowerText = responseText.trim().toLowerCase();
          if (lowerText.startsWith("<!doctype") || lowerText.startsWith("<html")) {
            throw new Error(
              "URL Google Apps Script mengembalikan halaman HTML. Ini biasanya terjadi karena Web App Anda belum dideploy dengan akses 'Anyone' (Siapa saja), atau URL yang dimasukkan salah."
            );
          } else {
            throw new Error(`Respons dari Apps Script bukan format JSON valid: ${jsonErr.message}`);
          }
        }

        if (result && result.success) {
          return res.json({ success: true, source: "Google Sheets", message: result.message });
        } else {
          throw new Error(result.error || "Gagal memperbarui Google Sheets.");
        }
      } catch (error: any) {
        console.error("Write to GAS failed, saving to server DB fallback:", error.message);
        const localData = await readLocalData();
        if (action === "create") {
          if (Array.isArray(requestItem)) {
            localData.unshift(...requestItem);
          } else {
            localData.unshift(requestItem);
          }
        } else if (action === "update") {
          const index = localData.findIndex((item: any) => item.id === requestItem.id);
          if (index !== -1) {
            localData[index] = { ...localData[index], ...requestItem };
          } else {
            localData.unshift(requestItem);
          }
        }
        await writeLocalData(localData);
        return res.json({
          success: true,
          source: "Database Server (Terpusat)",
          message: "Data berhasil disimpan di Database Server Terpusat."
        });
      }
    } else {
      // Local Server Database Operation
      const localData = await readLocalData();
      if (action === "create") {
        if (Array.isArray(requestItem)) {
          localData.unshift(...requestItem);
        } else {
          localData.unshift(requestItem);
        }
        const ok = await writeLocalData(localData);
        if (ok) {
          return res.json({ success: true, source: "Database Server (Terpusat)", message: "Permintaan baru berhasil dibuat di Database Server Terpusat." });
        }
      } else if (action === "update") {
        const index = localData.findIndex((item: any) => item.id === requestItem.id);
        if (index !== -1) {
          localData[index] = { ...localData[index], ...requestItem };
          const ok = await writeLocalData(localData);
          if (ok) {
            return res.json({ success: true, source: "Database Server (Terpusat)", message: "Permintaan berhasil diperbarui di Database Server Terpusat." });
          }
        } else {
          return res.status(404).json({ success: false, error: "ID Permintaan tidak ditemukan di database lokal." });
        }
      }
      return res.status(500).json({ success: false, error: "Gagal memproses aksi pada database lokal." });
    }
  });

  // Setup Vite Dev Server / Static files
  if (!process.env.VERCEL) {
    const startLocalServer = async () => {
      const PORT = 3000;
      if (process.env.NODE_ENV !== "production") {
        const { createServer: createViteServer } = await import("vite");
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: "spa",
        });
        app.use(vite.middlewares);
        console.log("Vite development middleware mounted.");
      } else {
        const distPath = path.join(process.cwd(), "dist");
        app.use(express.static(distPath));
        app.get("*", (req, res) => {
          res.sendFile(path.join(distPath, "index.html"));
        });
        console.log("Production static files mounted.");
      }

      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    };

    startLocalServer().catch((err) => {
      console.error("Failed to start server:", err);
    });
  }

  export default app;
