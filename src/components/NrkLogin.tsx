import React, { useState, useEffect } from "react";
import { Employee, EMPLOYEES } from "../lib/employees";
import { UserCheck, ShieldAlert, LogOut, Key, ArrowRight, User, RefreshCw, CheckCircle2 } from "lucide-react";
import { fetchLiveEmployees } from "../lib/sheetsSync";

interface NrkLoginProps {
  currentEmployee: Employee | null;
  onLogin: (employee: Employee) => void;
  onLogout: () => void;
}

export default function NrkLogin({ currentEmployee, onLogin, onLogout }: NrkLoginProps) {
  const [nrkInput, setNrkInput] = useState("");
  const [error, setError] = useState("");
  const [employeesList, setEmployeesList] = useState<Employee[]>(EMPLOYEES);
  const [isLoading, setIsLoading] = useState(false);
  const [source, setSource] = useState("Bawaan Sistem");

  // Fetch live employees list
  useEffect(() => {
    setIsLoading(true);
    fetchLiveEmployees()
      .then(resData => {
        if (resData && resData.success && Array.isArray(resData.data)) {
          setEmployeesList(resData.data);
          setSource(resData.source || "Google Sheets (Live)");
        }
      })
      .catch(err => {
        console.error("Gagal mengambil data pegawai secara live:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanInput = nrkInput.trim();
    if (!cleanInput) {
      setError("Mohon masukkan NRK / NIKKI Anda.");
      return;
    }

    const found = employeesList.find(
      emp => emp.nrk.trim() === cleanInput || emp.nrk.trim().toLowerCase() === cleanInput.toLowerCase()
    );

    if (found) {
      onLogin(found);
      setNrkInput("");
    } else {
      setError("NRK / NIKKI tidak terdaftar pada database pegawai SMKN 7 Jakarta.");
    }
  };

  // Pre-fill samples for easier testing/demonstration
  const sampleEmployees = [
    { nrk: "161485", label: "Dra. Wahyu Idawati" },
    { nrk: "189128", label: "Dwi Ratih" },
    { nrk: "1019925", label: "Slamet" }
  ];

  if (currentEmployee) {
    return (
      <div className="bg-white border border-emerald-100 p-5 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-100 animate-pulse">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-600 block">
                Sesi Pegawai Aktif (Tersinkron)
              </span>
              <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
                <CheckCircle2 className="w-2.5 h-2.5" /> Live Sheets
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-800 mt-0.5">
              {currentEmployee.name}
            </h4>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono font-semibold text-slate-600">
                NRK: {currentEmployee.nrk}
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-medium text-slate-500">{currentEmployee.role || "Staf"}</span>
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 border border-slate-200 rounded-xl transition-all cursor-pointer text-xs font-semibold flex items-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" />
          Keluar Sesi
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100">
        <div className="flex items-center gap-2 text-slate-700">
          <Key className="w-4 h-4 text-blue-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Akses Pegawai: Masukkan NRK/NIKKI Anda
          </h3>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all flex items-center gap-1 ${
          isLoading
            ? "text-blue-600 bg-blue-50 border-blue-200 animate-pulse"
            : source.includes("Live")
            ? "text-emerald-600 bg-emerald-50 border-emerald-200"
            : "text-amber-600 bg-amber-50 border-amber-200"
        }`}>
          {isLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
          {isLoading
            ? "Mensinkronkan data pegawai..."
            : `${employeesList.length} Pegawai Terdaftar • ${source.includes("Live") ? "Live Spreadsheet" : "Database Lokal"}`
          }
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Login Form */}
        <div className="md:col-span-2 space-y-3">
          <form onSubmit={handleVerify} className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Masukkan NRK Pegawai (Contoh: 161485 atau NIKKI)..."
                value={nrkInput}
                onChange={(e) => {
                  setNrkInput(e.target.value);
                  setError("");
                }}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer flex items-center gap-1 shrink-0"
            >
              Verifikasi
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-[11px] font-semibold rounded-xl flex items-center gap-2 animate-fade-in">
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Demo Samples */}
        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 space-y-2">
          <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">
            Pilih Cepat untuk Simulasi (Data Spreadsheet):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {sampleEmployees.map((emp) => (
              <button
                key={emp.nrk}
                onClick={() => {
                  const found = employeesList.find(e => e.nrk.trim() === emp.nrk);
                  if (found) onLogin(found);
                }}
                className="px-2.5 py-1 bg-white hover:bg-blue-50 text-[10px] font-semibold text-slate-600 hover:text-blue-600 border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                {emp.label} ({emp.nrk})
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
