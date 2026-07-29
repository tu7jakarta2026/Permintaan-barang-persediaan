import React, { useState, useEffect } from "react";
import { RequestStatus, InventoryRequest } from "./types";
import RoleSwitcher, { Role } from "./components/RoleSwitcher";
import DashboardStats from "./components/DashboardStats";
import DashboardChart from "./components/DashboardChart";
import DashboardBarChart from "./components/DashboardBarChart";
import RequestList from "./components/RequestList";
import RequestForm from "./components/RequestForm";
import RequestDetailModal from "./components/RequestDetailModal";
import ValidateModal from "./components/ValidateModal";
import SettingsPanel from "./components/SettingsPanel";
import NrkLogin from "./components/NrkLogin";
import { Employee } from "./lib/employees";
import { fetchRequestsFromGas, postToGas } from "./lib/sheetsSync";
import {
  FileSpreadsheet,
  Settings,
  LayoutDashboard,
  RefreshCw,
  Info,
  Calendar,
  AlertTriangle,
  Sparkles,
  Plus,
  User,
  Package
} from "lucide-react";

export default function App() {
  // State variables
  const [requests, setRequests] = useState<InventoryRequest[]>([]);
  const [currentRole, setCurrentRole] = useState<Role>("PEMOHON");
  
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(() => {
    try {
      const saved = localStorage.getItem("currentEmployee");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLogin = (employee: Employee) => {
    setCurrentEmployee(employee);
    localStorage.setItem("currentEmployee", JSON.stringify(employee));
    triggerAlert("success", `Berhasil masuk sebagai ${employee.name}`);
  };

  const handleLogout = () => {
    setCurrentEmployee(null);
    localStorage.removeItem("currentEmployee");
    triggerAlert("info", "Sesi pegawai telah diakhiri.");
  };

  const handleOpenCreateRequest = () => {
    if (currentRole === "PEMOHON" && !currentEmployee) {
      triggerAlert("error", "Akses Ditolak: Anda harus memasukkan dan memverifikasi NRK Pegawai terlebih dahulu untuk mengajukan permintaan barang!");
      return;
    }
    setIsCreateOpen(true);
  };
  const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbyAravxJfFJkUqxUh3PaWRkLcFiBicnQfeDJqEwzadXKGOq0QxZeTcyRoeoiFeKKC09yw/exec";

  const [gasUrl, setGasUrl] = useState<string>(() => {
    return localStorage.getItem("gasUrl") || DEFAULT_GAS_URL;
  });
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("isDemoMode");
    return saved === "true"; // Defaults to false if not found, enabling direct sheet sync
  });
  const [activeTab, setActiveTab] = useState<"dashboard" | "settings">("dashboard");

  const canAccessSettings = !!(
    currentEmployee &&
    ["199606112025211126", "222538", "187281"].includes(currentEmployee.nrk.trim())
  );

  useEffect(() => {
    if (activeTab === "settings" && !canAccessSettings) {
      setActiveTab("dashboard");
    }
  }, [currentEmployee, activeTab, canAccessSettings]);

  // Load centralized configuration from backend server on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const result = await res.json();
          if (result.success && result.gasUrl) {
            setGasUrl(result.gasUrl);
            localStorage.setItem("gasUrl", result.gasUrl);
          }
        }
      } catch (err) {
        console.error("Gagal mengambil konfigurasi terpusat dari server:", err);
      }
    };
    fetchConfig();
  }, []);

  // Modals state
  const [activeRequest, setActiveRequest] = useState<InventoryRequest | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  const [validateTarget, setValidateTarget] = useState<InventoryRequest | null>(null);
  const [isValidateOpen, setIsValidateOpen] = useState(false);

  // Loading & alerts
  const [isLoading, setIsLoading] = useState(false);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [successAlert, setSuccessAlert] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>("Database Lokal");

  // Fetch requests on mount and when database mode / gasUrl changes
  useEffect(() => {
    fetchRequests();
  }, [gasUrl, isDemoMode]);

  const fetchRequests = async () => {
    setIsLoading(true);
    setErrorAlert(null);

    // 1. DEMO MODE / OFFLINE LOCALSTORAGE STORAGE
    if (isDemoMode || !gasUrl.trim()) {
      try {
        const savedRequests = localStorage.getItem("local_requests");
        if (savedRequests) {
          setRequests(JSON.parse(savedRequests));
        } else {
          // Default beautiful dummy data if clean slate
          const initialMock: InventoryRequest[] = [
            {
              id: "REQ-20260720-001",
              requesterName: "Dra. Wahyu Idawati",
              requesterRole: "Guru Kelas 1",
              requesterNrk: "161485",
              itemName: "AMPLOP KOP",
              quantity: 2,
              unit: "PACK",
              purpose: "Keperluan surat menyurat dinas sekolah semester ganjil",
              requestDate: "2026-07-20",
              status: RequestStatus.VALIDATED,
              notes: "Serah terima selesai secara fisik dengan dokumentasi foto lampiran.",
              photoUrl: "https://images.unsplash.com/photo-1586075010923-2dd45e9b2d4f?auto=format&fit=crop&q=80&w=300",
              receivedBy: "Slamet",
              receivedDate: "2026-07-20 09:30:00",
              approvedBy: "Dwi Ratih",
              approvedDate: "2026-07-20 11:00:00",
              validatedBy: "Slamet",
              validatedDate: "2026-07-20 13:15:00"
            }
          ];
          localStorage.setItem("local_requests", JSON.stringify(initialMock));
          setRequests(initialMock);
        }
        setDataSource("Penyimpanan Browser (Offline)");
      } catch (err: any) {
        console.error("Gagal membaca penyimpanan lokal:", err);
        setRequests([]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // 2. LIVE PRODUCTION FETCH VIA SERVER PROXY
    try {
      const headers: { [key: string]: string } = {};
      if (gasUrl.trim()) {
        headers["x-gas-url"] = gasUrl.trim();
      }
      
      const res = await fetch("/api/requests", {
        headers
      });
      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }
      const result = await res.json();

      if (result && result.success) {
        setRequests(result.data || []);
        setDataSource(result.source || "Google Sheets (Live)");
        if (result.warning) {
          setErrorAlert(result.warning);
        }
        // Update local requests cache for offline resilience
        if (result.data) {
          localStorage.setItem("local_requests", JSON.stringify(result.data));
        }
      } else {
        throw new Error(result.error || "Server backend mengembalikan status gagal.");
      }
    } catch (err: any) {
      console.error("Gagal memuat pengajuan dari GAS:", err);
      setErrorAlert(
        `Gagal sinkronisasi Google Sheets: ${err.message || "Masalah jaringan"}. Menggunakan data cadangan lokal browser.`
      );
      
      // Fallback to client localStorage cache
      const savedRequests = localStorage.getItem("local_requests");
      if (savedRequests) {
        setRequests(JSON.parse(savedRequests));
        setDataSource("Penyimpanan Browser (Cache Offline)");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const reqWarningMsg = (warn: string) => {
    return `${warn} Periksa status Web App Apps Script Anda di tab pengaturan.`;
  };

  // Save the GAS URL
  const handleSaveGasUrl = async (url: string) => {
    setGasUrl(url);
    localStorage.setItem("gasUrl", url);
    
    // Save to server config so that all users get synced automatically
    try {
      await fetch("/api/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ gasUrl: url })
      });
    } catch (err) {
      console.error("Gagal menyimpan konfigurasi GAS URL ke server:", err);
    }

    if (url.trim()) {
      setIsDemoMode(false);
      localStorage.setItem("isDemoMode", "false");
      triggerAlert("success", "URL Google Apps Script berhasil disimpan secara terpusat di server. Semua pemohon otomatis disinkronkan!");
    } else {
      setIsDemoMode(true);
      localStorage.setItem("isDemoMode", "true");
      triggerAlert("info", "Menghapus URL Google Apps Script. Sistem kembali ke Mode Demo (Lokal).");
    }
  };

  const handleToggleDemoMode = (isDemo: boolean) => {
    setIsDemoMode(isDemo);
    localStorage.setItem("isDemoMode", String(isDemo));
    if (isDemo) {
      triggerAlert("info", "Beralih ke Mode Demo. Data disimpan di penyimpanan lokal browser.");
    } else {
      if (!gasUrl) {
        triggerAlert("error", "Harap masukkan URL Google Apps Script terlebih dahulu!");
        setIsDemoMode(true);
        localStorage.setItem("isDemoMode", "true");
        setActiveTab("settings");
      } else {
        triggerAlert("success", "Sinkronisasi Google Sheets diaktifkan.");
      }
    }
  };

  // Handle Create Request
  const handleAddRequest = async (newRequest: InventoryRequest | InventoryRequest[]) => {
    setIsLoading(true);
    setErrorAlert(null);
    try {
      // 1. DEMO MODE / OFFLINE LOCALSTORAGE STORAGE
      if (isDemoMode || !gasUrl.trim()) {
        const requestsArray = Array.isArray(newRequest) ? newRequest : [newRequest];
        const savedRequests = localStorage.getItem("local_requests");
        const currentLocal = savedRequests ? JSON.parse(savedRequests) : [];
        const updatedLocal = [...requestsArray, ...currentLocal];
        localStorage.setItem("local_requests", JSON.stringify(updatedLocal));
        setRequests(updatedLocal);
        const countMsg = requestsArray.length > 1 ? `${requestsArray.length} barang` : `pengajuan ${requestsArray[0].id}`;
        triggerAlert("success", `Berhasil! ${countMsg} berhasil dikirim (Offline).`);
        setIsLoading(false);
        return;
      }

      // 2. LIVE PRODUCTION POST VIA SERVER PROXY
      const requestsArray = Array.isArray(newRequest) ? newRequest : [newRequest];
      const headers: { [key: string]: string } = {
        "Content-Type": "application/json"
      };
      if (gasUrl.trim()) {
        headers["x-gas-url"] = gasUrl.trim();
      }

      for (const reqItem of requestsArray) {
        const res = await fetch("/api/requests", {
          method: "POST",
          headers,
          body: JSON.stringify({ action: "create", data: reqItem })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP Error ${res.status}`);
        }
        const result = await res.json();
        if (!result.success) {
          throw new Error(result.error || "Gagal menyimpan pengajuan.");
        }
      }

      const countMsg = requestsArray.length > 1 ? `${requestsArray.length} barang` : `pengajuan ${requestsArray[0].id}`;
      triggerAlert("success", `Berhasil! ${countMsg} berhasil dikirim ke Google Sheets.`);
      fetchRequests(); // Refresh list
    } catch (err: any) {
      console.error("Gagal menambahkan pengajuan:", err);
      setErrorAlert(`Gagal menambahkan pengajuan: ${err.message}.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Workflow Action (Receive, Approve, Reject)
  const handleWorkflowAction = async (
    id: string,
    actionType: "receive" | "approve" | "reject",
    operatorName: string,
    notes: string
  ) => {
    setIsLoading(true);
    setErrorAlert(null);

    // Find current request
    const target = requests.find((r) => r.id === id);
    if (!target) return;

    let updatedStatus = target.status;
    const todayStr = new Date().toISOString().replace("T", " ").substring(0, 19);

    const updatedData: Partial<InventoryRequest> = { id };

    if (actionType === "receive") {
      updatedStatus = RequestStatus.PENDING_VALIDATION;
      updatedData.status = updatedStatus;
      updatedData.receivedBy = operatorName;
      updatedData.receivedDate = todayStr;
      updatedData.notes = notes || "Barang diterima pengurus, diteruskan ke Bagian Gudang untuk serah terima.";
    } else if (actionType === "approve") {
      updatedStatus = RequestStatus.PENDING_VALIDATION;
      updatedData.status = updatedStatus;
      updatedData.approvedBy = operatorName;
      updatedData.approvedDate = todayStr;
      updatedData.notes = notes || "Pengajuan disetujui penuh.";
    } else if (actionType === "reject") {
      updatedStatus = RequestStatus.REJECTED;
      updatedData.status = updatedStatus;
      updatedData.approvedBy = operatorName;
      updatedData.approvedDate = todayStr;
      updatedData.notes = notes || "Pengajuan ditolak.";
    }

    // 1. DEMO MODE / OFFLINE LOCALSTORAGE STORAGE
    if (isDemoMode || !gasUrl.trim()) {
      const savedRequests = localStorage.getItem("local_requests");
      const currentLocal: InventoryRequest[] = savedRequests ? JSON.parse(savedRequests) : [];
      const updatedLocal = currentLocal.map(item => {
        if (item.id === id) {
          return { ...item, ...updatedData };
        }
        return item;
      });
      localStorage.setItem("local_requests", JSON.stringify(updatedLocal));
      setRequests(updatedLocal);
      triggerAlert("success", `Status pengajuan ${id} berhasil diperbarui (Offline).`);
      setIsLoading(false);
      return;
    }

    // 2. LIVE PRODUCTION POST VIA SERVER PROXY
    try {
      const headers: { [key: string]: string } = {
        "Content-Type": "application/json"
      };
      if (gasUrl.trim()) {
        headers["x-gas-url"] = gasUrl.trim();
      }
      const res = await fetch("/api/requests", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "update", data: updatedData })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP Error ${res.status}`);
      }
      const result = await res.json();
      if (result.success) {
        triggerAlert("success", `Status pengajuan ${id} berhasil diperbarui di Google Sheets.`);
        fetchRequests();
      } else {
        throw new Error(result.error || "Gagal memperbarui status pengajuan.");
      }
    } catch (err: any) {
      console.error("Gagal melakukan aksi workflow:", err);
      setErrorAlert(`Gagal memperbarui pengajuan: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Warehouse Photo Validation Action
  const handlePhotoValidation = async (
    id: string,
    validatorName: string,
    photoBase64: string,
    notes: string
  ) => {
    setIsLoading(true);
    setErrorAlert(null);

    const todayStr = new Date().toISOString().replace("T", " ").substring(0, 19);
    const updatedData: Partial<InventoryRequest> = {
      id,
      status: RequestStatus.VALIDATED,
      validatedBy: validatorName,
      validatedDate: todayStr,
      photoUrl: photoBase64,
      notes: notes || "Barang diserahterimakan fisik secara penuh dengan dokumentasi foto lampiran."
    };

    const target = requests.find(r => r.id === id);
    const mergedData = target ? { ...target, ...updatedData } : updatedData;

    // 1. DEMO MODE / OFFLINE LOCALSTORAGE STORAGE
    if (isDemoMode || !gasUrl.trim()) {
      const savedRequests = localStorage.getItem("local_requests");
      const currentLocal: InventoryRequest[] = savedRequests ? JSON.parse(savedRequests) : [];
      const updatedLocal = currentLocal.map(item => {
        if (item.id === id) {
          return { ...item, ...updatedData };
        }
        return item;
      });
      localStorage.setItem("local_requests", JSON.stringify(updatedLocal));
      setRequests(updatedLocal);
      triggerAlert("success", `Validasi foto selesai (Offline)! Pengajuan ${id} ditandai sebagai SERAH TERIMA / SELESAI.`);
      setIsLoading(false);
      return;
    }

    // 2. LIVE PRODUCTION POST VIA SERVER PROXY
    try {
      const headers: { [key: string]: string } = {
        "Content-Type": "application/json"
      };
      if (gasUrl.trim()) {
        headers["x-gas-url"] = gasUrl.trim();
      }
      const res = await fetch("/api/requests", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "update", data: mergedData })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP Error ${res.status}`);
      }
      const result = await res.json();
      if (result.success) {
        triggerAlert("success", `Validasi foto selesai! Pengajuan ${id} ditandai sebagai SERAH TERIMA / SELESAI.`);
        fetchRequests();
      } else {
        throw new Error(result.error || "Gagal mengunggah validasi foto.");
      }
    } catch (err: any) {
      console.error("Gagal memvalidasi barang:", err);
      setErrorAlert(`Gagal memvalidasi barang dengan foto: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Direct upload photo action accessible from details modal by pemohon, pengurus, and warehouse
  const handleDirectPhotoUpload = async (id: string, photoBase64: string, uploaderName: string) => {
    setIsLoading(true);
    setErrorAlert(null);

    const target = requests.find((r) => r.id === id);
    if (!target) {
      setIsLoading(false);
      return;
    }

    const todayStr = new Date().toISOString().replace("T", " ").substring(0, 19);
    const updatedData: Partial<InventoryRequest> = {
      id,
      status: RequestStatus.VALIDATED,
      photoUrl: photoBase64,
      validatedBy: target.validatedBy || uploaderName,
      validatedDate: target.validatedDate || todayStr,
      notes: target.notes || `Foto serah terima diunggah/diperbarui oleh ${uploaderName}.`
    };

    const mergedData = { ...target, ...updatedData };

    try {
      const headers: { [key: string]: string } = {
        "Content-Type": "application/json",
      };
      if (!isDemoMode && gasUrl.trim() !== "") {
        headers["x-gas-url"] = gasUrl.trim();
      }

      const res = await fetch("/api/requests", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "update", data: mergedData }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        triggerAlert("success", `Foto serah terima untuk pengajuan ${id} berhasil diunggah.`);
        // Refresh activeRequest to instantly display the updated photo in the modal
        setActiveRequest((prev) => prev && prev.id === id ? { ...prev, ...updatedData } : prev);
        fetchRequests();
      } else {
        throw new Error(result.error || "Gagal mengunggah foto.");
      }
    } catch (err: any) {
      console.error("Gagal mengunggah foto serah terima:", err);
      setErrorAlert(`Gagal mengunggah foto: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Utility Alert Trigger
  const triggerAlert = (type: "success" | "error" | "info", msg: string) => {
    if (type === "success") {
      setSuccessAlert(msg);
      setTimeout(() => setSuccessAlert(null), 5000);
    } else {
      setErrorAlert(msg);
      setTimeout(() => setErrorAlert(null), 6000);
    }
  };

  const handleOpenDetails = (req: InventoryRequest) => {
    setActiveRequest(req);
    setIsDetailOpen(true);
  };

  const handleOpenValidate = (req: InventoryRequest) => {
    setValidateTarget(req);
    setIsValidateOpen(true);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-slate-50 font-sans text-slate-800 overflow-hidden">
      {/* Left Sidebar for Desktop */}
      <aside className="hidden md:flex w-64 bg-slate-900 flex-col text-slate-300 h-full border-r border-slate-800 shrink-0">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h1 className="text-base font-display font-bold tracking-tight text-white leading-none">
                  SIPABANDUNG
                </h1>
                <span className="px-1 py-0.5 bg-blue-500/10 text-blue-300 text-[8px] font-bold rounded border border-blue-500/20">
                  v1.0
                </span>
              </div>
              <p className="text-[9px] text-slate-500 mt-1 uppercase font-semibold">Gudang Sekolah</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full px-4 py-2.5 rounded-lg flex items-center gap-3 transition-colors cursor-pointer text-left ${
              activeTab === "dashboard"
                ? "bg-blue-600/10 text-blue-400 font-semibold"
                : "hover:bg-slate-800/60 text-slate-400 hover:text-slate-300"
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span className="text-xs font-medium">Dashboard Overview</span>
          </button>
          
          {canAccessSettings && (
            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full px-4 py-2.5 rounded-lg flex items-center gap-3 transition-colors cursor-pointer text-left ${
                activeTab === "settings"
                  ? "bg-blue-600/10 text-blue-400 font-semibold"
                  : "hover:bg-slate-800/60 text-slate-400 hover:text-slate-300"
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span className="text-xs font-medium">Pengaturan & Embed Iframe</span>
            </button>
          )}
        </nav>

        {/* Sidebar User / Role Simulation status */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 bg-slate-800/30 p-2.5 rounded-xl border border-slate-800/40">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs uppercase shrink-0">
              {currentRole.substring(0, 2)}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-white truncate leading-tight">
                {currentRole === "PEMOHON" && "Pemohon (Guru/Staf)"}
                {currentRole === "PENGURUS_BARANG" && "Pengurus Barang"}
              </p>
              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">Peran Simulasi</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Top Header for Mobile */}
      <header className="md:hidden bg-slate-900 text-white shadow-md border-b border-slate-800 shrink-0">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-sm font-bold text-white tracking-tight">SIPABANDUNG</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "dashboard" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
              title="Dashboard"
            >
              <LayoutDashboard className="w-4 h-4" />
            </button>
            {canAccessSettings && (
              <button
                onClick={() => setActiveTab("settings")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === "settings" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                }`}
                title="Integrasi"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto h-full">
        {/* Page Title & Status Header */}
        <header className="bg-white border-b border-slate-200 px-6 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight font-display">
              {activeTab === "dashboard" ? "Dashboard Overview Status" : "Pengaturan Database & Embed Iframe"}
            </h2>
            <div>
              {!isDemoMode && gasUrl ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase border border-emerald-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Google Sheets Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase border border-blue-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                  Database Server Terpusat
                </span>
              )}
            </div>
          </div>

          {currentRole === "PEMOHON" && activeTab === "dashboard" && (
            <button
              onClick={handleOpenCreateRequest}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shrink-0"
            >
              <Plus className="w-4 h-4" />
              Buat Permintaan
            </button>
          )}
        </header>

        {/* Scrollable Container Content */}
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 max-w-7xl w-full mx-auto pb-16">
          {/* Alerts Center */}
          {successAlert && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center justify-between shadow-xs animate-fade-in">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block animate-ping shrink-0" />
                {successAlert}
              </span>
              <button
                onClick={() => setSuccessAlert(null)}
                className="text-emerald-500 hover:text-emerald-700 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          )}

          {errorAlert && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 text-xs font-semibold rounded-2xl flex items-center justify-between shadow-xs animate-fade-in">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                {errorAlert}
              </span>
              <button
                onClick={() => setErrorAlert(null)}
                className="text-rose-500 hover:text-rose-700 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          )}

          {/* Database Connection / Sync Banner */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className={`p-2 rounded-xl border ${
                !isDemoMode && gasUrl ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-amber-50 border-amber-100 text-amber-600"
              }`}>
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">
                  Sumber Koneksi Data Aktif
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <h4 className="text-xs font-bold text-slate-800">
                    {dataSource}
                  </h4>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    !isDemoMode && gasUrl ? "bg-emerald-500" : "bg-amber-500"
                  }`} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="text-right hidden sm:block">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">
                  Pembaruan Terakhir
                </span>
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </div>

              <button
                onClick={fetchRequests}
                disabled={isLoading}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 disabled:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5 text-xs font-semibold"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? "animate-spin text-slate-400" : ""}`} />
                Segarkan Data
              </button>
            </div>
          </div>

          {/* Tab Routing */}
          {activeTab === "settings" ? (
            <SettingsPanel
              gasUrl={gasUrl}
              onSaveUrl={handleSaveGasUrl}
              isDemoMode={isDemoMode}
              onToggleDemoMode={handleToggleDemoMode}
            />
          ) : (
            <>
              {/* Role Simulation Switcher bar */}
              <RoleSwitcher currentRole={currentRole} onChangeRole={setCurrentRole} currentEmployee={currentEmployee} />

              {/* Employee NRK Login Section */}
              {currentRole === "PEMOHON" && (
                <NrkLogin
                  currentEmployee={currentEmployee}
                  onLogin={handleLogin}
                  onLogout={handleLogout}
                />
              )}

              {/* Metric Statistics */}
              <DashboardStats requests={requests} />

              {/* Status Visualisation (Pie Chart) */}
              <DashboardChart requests={requests} />

              {/* Demand Analytics (Bar Chart with Monthly Breakdown Bubbles) */}
              <DashboardBarChart requests={requests} />

              {/* List and Actions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm sm:text-base font-display font-bold text-slate-800">
                      Daftar Permintaan Barang Gudang
                    </h2>
                    <p className="text-xs text-slate-500">
                      Saring, cari, dan tindak lanjuti berkas permintaan sesuai kewenangan peran Anda
                    </p>
                  </div>
                </div>

                {/* Request grid */}
                {isLoading && requests.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                    <p className="text-xs font-semibold text-slate-500">Memuat berkas pengajuan barang...</p>
                  </div>
                ) : (
                  <RequestList
                    requests={requests}
                    currentRole={currentRole}
                    onViewDetails={handleOpenDetails}
                    onAction={handleWorkflowAction}
                    onOpenValidate={handleOpenValidate}
                    onOpenCreate={handleOpenCreateRequest}
                    currentEmployee={currentEmployee}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Modals Mounting */}
      <RequestForm
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onAddRequest={handleAddRequest}
        currentEmployee={currentEmployee}
      />

      <RequestDetailModal
        request={activeRequest}
        requestNumber={activeRequest ? [...requests].sort((a, b) => new Date(a.requestDate).getTime() - new Date(b.requestDate).getTime() || a.id.localeCompare(b.id)).findIndex(r => r.id === activeRequest.id) + 1 : undefined}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        currentEmployee={currentEmployee}
        onUploadPhoto={handleDirectPhotoUpload}
      />

      {validateTarget && (
        <ValidateModal
          isOpen={isValidateOpen}
          onClose={() => {
            setIsValidateOpen(false);
            setValidateTarget(null);
          }}
          onValidate={handlePhotoValidation}
          requestId={validateTarget.id}
          itemName={validateTarget.itemName}
          quantity={validateTarget.quantity}
          unit={validateTarget.unit}
          currentEmployee={currentEmployee}
        />
      )}
    </div>
  );
}
