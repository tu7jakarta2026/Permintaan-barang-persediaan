import { INVENTORY_ITEMS, InventoryItem } from "./items";
import { EMPLOYEES, Employee } from "./employees";

// Simple CSV parser that handles quotes properly
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row = [""];
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
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
}

// 1. Fetch Live Inventory Items from public Google Sheets CSV
export async function fetchLiveItems(): Promise<{ success: boolean; source: string; data: InventoryItem[]; warning?: string }> {
  try {
    const csvResponse = await fetch("https://docs.google.com/spreadsheets/d/1qsI0kowbn-swkpzbZjNxN1JCxACfQLH3lE8X80DWdIU/export?format=csv&gid=150480835");
    if (!csvResponse.ok) {
      throw new Error(`HTTP Error ${csvResponse.status}`);
    }
    const csvText = await csvResponse.text();
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

    items.sort((a, b) => a.name.localeCompare(b.name));

    return { success: true, source: "Google Sheets (Live)", data: items };
  } catch (error: any) {
    console.error("Failed to fetch live items, falling back to preloaded list:", error.message);
    return {
      success: true,
      source: "Preloaded List (Fallback)",
      warning: `Gagal mengambil data terupdate dari Google Sheets: ${error.message}. Menggunakan daftar bawaan.`,
      data: INVENTORY_ITEMS
    };
  }
}

// 2. Fetch Live Employees from public Google Sheets CSV
export async function fetchLiveEmployees(): Promise<{ success: boolean; source: string; data: Employee[]; warning?: string }> {
  try {
    const csvResponse = await fetch("https://docs.google.com/spreadsheets/d/1qsI0kowbn-swkpzbZjNxN1JCxACfQLH3lE8X80DWdIU/export?format=csv&gid=1223173252");
    if (!csvResponse.ok) {
      throw new Error(`HTTP Error ${csvResponse.status}`);
    }
    const csvText = await csvResponse.text();
    const rows = parseCSV(csvText);
    if (rows.length < 2) {
      throw new Error("No data found in Google Sheets CSV");
    }

    const header = rows[0];
    const nameIdx = header.findIndex(h => h.toLowerCase().includes("nama"));
    const nrkIdx = header.findIndex(h => h.toLowerCase().includes("nrk") || h.toLowerCase().includes("nikki"));

    const employeesList: Employee[] = [];
    const seenNrks = new Set<string>();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 2) continue;

      const name = row[nameIdx]?.trim() || "";
      const nrk = row[nrkIdx]?.trim() || "";

      if (!name || !nrk || name.toLowerCase() === "nama pegawai") continue;

      if (seenNrks.has(nrk)) continue;
      seenNrks.add(nrk);

      const matchedPreloaded = EMPLOYEES.find(emp => emp.nrk === nrk);
      const role = matchedPreloaded?.role || "Guru / Staf";

      employeesList.push({
        name,
        nrk,
        role
      });
    }

    return { success: true, source: "Google Sheets (Live)", data: employeesList };
  } catch (error: any) {
    console.error("Failed to fetch live employees, falling back to preloaded list:", error.message);
    return {
      success: true,
      source: "Preloaded List (Fallback)",
      warning: `Gagal mengambil data pegawai terupdate dari Google Sheets: ${error.message}. Menggunakan daftar bawaan.`,
      data: EMPLOYEES
    };
  }
}

// 3. Post data to GAS Web App URL directly (preflight CORS bypass using text/plain)
export async function postToGas(gasUrl: string, action: string, data: any): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch(gasUrl, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8" // Crucial for skipping preflight OPTIONS request
      },
      body: JSON.stringify({ action, data })
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      throw new Error("Respons dari Apps Script bukan format JSON valid.");
    }

    return result;
  } catch (error: any) {
    console.error("Post to GAS failed:", error);
    return { success: false, error: error.message };
  }
}

// 4. Fetch requests from GAS Web App URL directly
export async function fetchRequestsFromGas(gasUrl: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const response = await fetch(gasUrl);
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      throw new Error("Respons dari Apps Script bukan format JSON valid.");
    }

    return result;
  } catch (error: any) {
    console.error("Fetch requests from GAS failed:", error);
    return { success: false, error: error.message };
  }
}
