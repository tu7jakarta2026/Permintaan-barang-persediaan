import React, { useState } from "react";
import { Copy, Check, Settings, Server, Globe, ShieldAlert, Wifi, WifiOff, RefreshCw, Code, Layout, Smartphone, Layers } from "lucide-react";

interface SettingsPanelProps {
  gasUrl: string;
  onSaveUrl: (url: string) => void;
  isDemoMode: boolean;
  onToggleDemoMode: (isDemo: boolean) => void;
}

export default function SettingsPanel({
  gasUrl,
  onSaveUrl,
  isDemoMode,
  onToggleDemoMode,
}: SettingsPanelProps) {
  const [urlInput, setUrlInput] = useState(gasUrl);
  const [isCopied, setIsCopied] = useState(false);
  const [isIframeCopied, setIsIframeCopied] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");
  const [iframeHeight, setIframeHeight] = useState("850px");

  const currentAppUrl = typeof window !== "undefined" ? window.location.origin : "https://sipa-bandung.app";

  const iframeSnippet = `<iframe
  src="${currentAppUrl}"
  width="100%"
  height="${iframeHeight}"
  style="border: none; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);"
  allow="camera; microphone; geolocation"
  title="Aplikasi SIPABANDUNG Gudang Sekolah"
></iframe>`;

  const handleCopyIframe = async () => {
    try {
      await navigator.clipboard.writeText(iframeSnippet);
      setIsIframeCopied(true);
      setTimeout(() => setIsIframeCopied(false), 2000);
    } catch (err) {
      console.error("Gagal menyalin kode iframe:", err);
    }
  };

  const appsScriptCode = `// Kode Google Apps Script - Tempel di Ekstensi > Apps Script pada Google Sheet Anda
function doGet(e) {
  try {
    const sheet = getOrCreateSheet();
    const data = getSheetData(sheet);
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: data }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const sheet = getOrCreateSheet();
    const action = body.action;
    
    if (action === "create") {
      const item = body.data;
      let finalPhotoUrl = item.photoUrl || "";
      if (finalPhotoUrl && finalPhotoUrl.indexOf("data:image/") === 0) {
        const driveUrl = uploadPhotoToDrive(finalPhotoUrl, "permintaan-" + item.id + ".jpg");
        if (driveUrl) {
          finalPhotoUrl = driveUrl;
        }
      }

      sheet.appendRow([
        item.id,
        item.requesterName,
        item.requesterRole,
        item.itemName,
        Number(item.quantity),
        item.unit,
        item.purpose,
        item.requestDate,
        item.status,
        item.notes || "",
        finalPhotoUrl,
        item.receivedBy || "",
        item.receivedDate || "",
        item.approvedBy || "",
        item.approvedDate || "",
        item.validatedBy || "",
        item.validatedDate || "",
        item.requesterNrk || ""
      ]);
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Request created successfully" }))
        .setMimeType(ContentService.MimeType.JSON);
    } 
    
    if (action === "update") {
      const item = body.data;
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === item.id) {
          rowIndex = i + 1;
          break;
        }
      }
      
      if (rowIndex !== -1) {
        let finalPhotoUrl = item.photoUrl || "";
        if (finalPhotoUrl && finalPhotoUrl.indexOf("data:image/") === 0) {
          const driveUrl = uploadPhotoToDrive(finalPhotoUrl, "permintaan-" + item.id + ".jpg");
          if (driveUrl) {
            finalPhotoUrl = driveUrl;
          }
        }

        sheet.getRange(rowIndex, 9).setValue(item.status);
        sheet.getRange(rowIndex, 10).setValue(item.notes || "");
        if (finalPhotoUrl) {
          sheet.getRange(rowIndex, 11).setValue(finalPhotoUrl);
        }
        sheet.getRange(rowIndex, 12).setValue(item.receivedBy || "");
        sheet.getRange(rowIndex, 13).setValue(item.receivedDate || "");
        sheet.getRange(rowIndex, 14).setValue(item.approvedBy || "");
        sheet.getRange(rowIndex, 15).setValue(item.approvedDate || "");
        sheet.getRange(rowIndex, 16).setValue(item.validatedBy || "");
        sheet.getRange(rowIndex, 17).setValue(item.validatedDate || "");
        if (item.requesterNrk) {
          sheet.getRange(rowIndex, 18).setValue(item.requesterNrk);
        }
        
        return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Request updated successfully" }))
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Request ID not found" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Invalid action" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function uploadPhotoToDrive(base64Data, filename) {
  try {
    const splitData = base64Data.split(",");
    let contentType = "image/jpeg";
    let base64Str = splitData[0];
    
    if (splitData.length > 1) {
      base64Str = splitData[1];
      const match = splitData[0].match(/:(.*?);/);
      if (match && match.length > 1) {
        contentType = match[1];
      }
    }
    
    const decoded = Utilities.base64Decode(base64Str);
    const blob = Utilities.newBlob(decoded, contentType, filename);
    
    const folderName = "dokumentasi permintaan barang";
    const folders = DriveApp.getFoldersByName(folderName);
    let folder;
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }
    
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return file.getUrl();
  } catch (err) {
    return null;
  }
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Permintaan_Barang");
  if (!sheet) {
    sheet = ss.insertSheet("Permintaan_Barang");
    sheet.appendRow([
      "ID",
      "Nama Pemohon",
      "Jabatan",
      "Nama Barang",
      "Jumlah",
      "Satuan",
      "Keperluan",
      "Tanggal Permintaan",
      "Status",
      "Catatan",
      "Foto Validasi",
      "Diterima Oleh",
      "Tanggal Diterima",
      "Disetujui Oleh",
      "Tanggal Disetujui",
      "Divalidasi Oleh",
      "Tanggal Divalidasi",
      "NRK Pemohon"
    ]);
    sheet.getRange(1, 1, 1, 18).setFontWeight("bold").setBackground("#f3f4f6");
  }
  return sheet;
}

function getSheetData(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  
  const headers = values[0];
  const items = [];
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    items.push({
      id: row[0].toString(),
      requesterName: row[1],
      requesterRole: row[2],
      itemName: row[3],
      quantity: Number(row[4]),
      unit: row[5],
      purpose: row[6],
      requestDate: row[7] instanceof Date ? row[7].toISOString().split('T')[0] : row[7].toString(),
      status: row[8],
      notes: row[9],
      photoUrl: row[10],
      receivedBy: row[11],
      receivedDate: row[12],
      approvedBy: row[13],
      approvedDate: row[14],
      validatedBy: row[15],
      validatedDate: row[16],
      requesterNrk: row[17] ? row[17].toString() : ""
    });
  }
  return items;
}`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(appsScriptCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Gagal menyalin kode:", err);
    }
  };

  const handleTestConnection = async () => {
    if (!urlInput.trim()) {
      setTestStatus("error");
      setTestMessage("Mohon masukkan URL Apps Script Web App terlebih dahulu.");
      return;
    }

    setTestStatus("testing");
    setTestMessage("Sedang menghubungi Google Sheets via Web App...");

    try {
      const res = await fetch("/api/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ gasUrl: urlInput.trim() })
      });
      const result = await res.json();

      if (res.ok && result.success) {
        setTestStatus("success");
        setTestMessage("Koneksi berhasil! Google Sheets terhubung dengan sempurna.");
        onSaveUrl(urlInput.trim());
        onToggleDemoMode(false);
      } else {
        setTestStatus("error");
        setTestMessage(result.error || "Gagal menghubungkan. Pastikan URL valid dan Apps Script telah di-deploy sebagai Web App dengan akses 'Anyone'.");
      }
    } catch (err: any) {
      setTestStatus("error");
      setTestMessage(`Kesalahan: ${err.message || "Gagal menghubungi backend server untuk pengujian."}`);
    }
  };

  const handleSave = () => {
    onSaveUrl(urlInput);
    if (urlInput.trim()) {
      onToggleDemoMode(false);
    } else {
      onToggleDemoMode(true);
    }
  };

  return (
    <div id="settings-panel" className="space-y-6 max-w-5xl mx-auto my-4">
      {/* Top Banner: Mode Selector & Status */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-display font-bold text-slate-800">
                Pengaturan Database & Embed Iframe
              </h2>
              <p className="text-xs text-slate-500">
                Kelola sumber penyimpanan data dan kode embedding iframe untuk Google Sites / Website lain
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isDemoMode && gasUrl ? (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-100 animate-pulse">
                <Wifi className="w-3.5 h-3.5" />
                Google Sheets Aktif
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100">
                <Server className="w-3.5 h-3.5" />
                Database Server Terpusat
              </span>
            )}
          </div>
        </div>

        {/* Database Mode Switcher Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => onToggleDemoMode(true)}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
              isDemoMode || !gasUrl
                ? "border-blue-600 bg-blue-50/40 shadow-xs"
                : "border-slate-200 hover:border-slate-300 bg-white"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                  <Server className="w-4 h-4" /> Mode 1: Database Server Terpusat
                </span>
                {(isDemoMode || !gasUrl) && (
                  <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">
                    Aktif
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>Sangat Direkomendasikan untuk Iframe / Device Lain!</strong> Aplikasi otomatis menyimpan data secara terpusat di server backend. Pengguna di device lain atau pengunjung iframe <strong>TIDAK PERLU</strong> memasukkan URL Google Sheets sama sekali.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200/60 text-[11px] font-semibold text-blue-600 flex items-center gap-1">
              ✓ Tanpa Login Google Sheets
              ✓ Bebas Error CORS
              ✓ Berjalan Otomatis di Device Manapun
            </div>
          </div>

          <div
            onClick={() => {
              if (gasUrl) onToggleDemoMode(false);
            }}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
              !isDemoMode && gasUrl
                ? "border-emerald-600 bg-emerald-50/40 shadow-xs"
                : "border-slate-200 hover:border-slate-300 bg-white"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                  <Globe className="w-4 h-4" /> Mode 2: Integrasi Google Sheets
                </span>
                {!isDemoMode && gasUrl && (
                  <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full">
                    Aktif
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Menghubungkan data pengajuan langsung ke spreadsheet Google Sheets milik Anda via Apps Script Web App URL. Memungkinkan tim melihat rekap di Google Drive.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200/60 text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
              {gasUrl ? "✓ Google Apps Script Terkonfigurasi" : "⚠️ Perlu Memasukkan URL Web App"}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: Generator Kode Iframe */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
            <Code className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-display font-bold text-slate-800">
              Kode Iframe Embed (Untuk Disisipkan di Website Lain)
            </h3>
            <p className="text-xs text-slate-500">
              Gunakan kode di bawah ini untuk menampilkan aplikasi ini di Google Sites, WordPress, atau Portal Sekolah Anda
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Layout className="w-4 h-4 text-slate-500" />
              Tinggi Tampilan Iframe:
            </label>
            <div className="flex items-center gap-2">
              {["650px", "850px", "1000px"].map((h) => (
                <button
                  key={h}
                  onClick={() => setIframeHeight(h)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    iframeHeight === h
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {h === "650px" ? "Ringkas (650px)" : h === "850px" ? "Standar (850px)" : "Full (1000px)"}
                </button>
              ))}
            </div>
          </div>

          <div className="relative bg-slate-900 rounded-xl p-4 border border-slate-800 font-mono text-xs text-indigo-300 whitespace-pre-wrap overflow-x-auto select-all">
            {iframeSnippet}
            <button
              onClick={handleCopyIframe}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              {isIframeCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  Tersalin!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Salin Kode Iframe
                </>
              )}
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2 text-slate-700">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-indigo-600" />
              Cara Memasang Iframe di Google Sites / WordPress:
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-600 pl-1 leading-relaxed">
              <li>Salin kode iframe di atas dengan menekan tombol <strong>Salin Kode Iframe</strong>.</li>
              <li>Buka editor <strong>Google Sites</strong> atau website Anda.</li>
              <li>Pilih menu <strong>Sisipkan (Insert) &gt; Embed / Sematkan (&lt;/&gt;)</strong>.</li>
              <li>Pilih tab <strong>Embed Code (Kode Semat)</strong> lalu tempel (paste) kode yang telah disalin.</li>
              <li>Klik <strong>Berikutnya / Terapkan</strong> lalu simpan dan publikasikan website Anda!</li>
            </ol>
            <p className="text-[11px] text-blue-700 font-medium pt-1">
              💡 <strong>Tips Penting:</strong> Gunakan URL Aplikasi ini (bukan URL Apps Script `.exec`) untuk iframe agar antarmuka React lengkap (tombol, formulir, dashboard) tampil sempurna. URL Apps Script hanya berfungsi sebagai API backend data JSON.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION: Konfigurasi Google Sheets (GApps Script) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-display font-bold text-slate-800">
                Pengaturan Integrasi Google Sheets (Opsional)
              </h3>
              <p className="text-xs text-slate-500">
                Diperlukan HANYA jika Anda ingin data otomatis tercatat ke Spreadsheet milik sekolah
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Instructions and input */}
          <div className="space-y-6">
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Langkah Membuat Google Apps Script Web App:
              </h4>
              <ol className="list-decimal list-inside space-y-2.5 text-xs text-slate-600 pl-1 leading-relaxed">
                <li>
                  Buat Google Spreadsheet baru di Drive Anda, atau buka{" "}
                  <a
                    href="https://docs.google.com/spreadsheets/d/1qsI0kowbn-swkpzbZjNxN1JCxACfQLH3lE8X80DWdIU/edit?usp=sharing"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-0.5"
                  >
                    Spreadsheet Acuan ↗
                  </a>
                </li>
                <li>
                  Buka menu <strong className="text-slate-800">Ekstensi &gt; Apps Script</strong>.
                </li>
                <li>
                  Hapus semua kode bawaan, lalu salin dan tempelkan kode di kolom sebelah kanan.
                </li>
                <li>
                  Klik tombol <strong className="text-slate-800">Simpan (ikon disket)</strong>.
                </li>
                <li>
                  Klik tombol <strong className="text-blue-600">Terapkan &gt; Penerapan Baru</strong> (Deploy &gt; New Deployment).
                </li>
                <li>
                  Klik ikon gerigi di kiri atas tipe penerapan, pilih <strong className="text-slate-800">Aplikasi Web</strong>.
                </li>
                <li>
                  Konfigurasi Aplikasi Web:
                  <ul className="list-disc list-inside pl-4 mt-1 text-slate-500 space-y-1">
                    <li>Jalankan sebagai: <strong className="text-slate-700">Saya (email Anda)</strong></li>
                    <li>Siapa yang memiliki akses: <strong className="text-emerald-600 font-bold">Siapa saja (Anyone)</strong></li>
                  </ul>
                </li>
                <li>
                  Klik <strong className="text-blue-600">Terapkan</strong>, lalu berikan otorisasi akses (Authorize Access) jika diminta Google.
                </li>
                <li>
                  Salin <strong className="text-slate-800">URL Aplikasi Web</strong> yang dihasilkan dan tempel di bawah ini.
                </li>
              </ol>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                URL Google Apps Script Web App:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                />
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  Simpan URL
                </button>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleTestConnection}
                  disabled={testStatus === "testing"}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  {testStatus === "testing" ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                  ) : (
                    <Server className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  Uji Koneksi
                </button>
              </div>

              {testStatus !== "idle" && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-start gap-2 border ${
                    testStatus === "success"
                      ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                      : testStatus === "error"
                      ? "bg-rose-50 border-rose-100 text-rose-800"
                      : "bg-blue-50 border-blue-100 text-blue-800"
                  }`}
                >
                  <div className="mt-0.5">
                    {testStatus === "success" ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 block" />
                    ) : testStatus === "error" ? (
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-blue-500 block animate-ping" />
                    )}
                  </div>
                  <p className="leading-relaxed">{testMessage}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Copyable Apps Script Code */}
          <div className="flex flex-col bg-slate-900 rounded-xl overflow-hidden border border-slate-800 max-h-[460px]">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800">
              <span className="text-[11px] font-mono font-medium text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                GoogleAppsScript.gs
              </span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-200 rounded transition-colors cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    Tersalin
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-slate-400" />
                    Salin Kode Script
                  </>
                )}
              </button>
            </div>
            <div className="p-3 overflow-y-auto font-mono text-[10px] text-slate-300 leading-normal whitespace-pre-wrap select-all">
              {appsScriptCode}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
