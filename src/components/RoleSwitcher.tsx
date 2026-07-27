import React from "react";
import { User, ClipboardCheck, Key, Package, HelpCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { Employee } from "../lib/employees";

export type Role = "PEMOHON" | "PENGURUS_BARANG";

interface RoleSwitcherProps {
  currentRole: Role;
  onChangeRole: (role: Role) => void;
  currentEmployee: Employee | null;
}

export default function RoleSwitcher({ currentRole, onChangeRole, currentEmployee }: RoleSwitcherProps) {
  // Check authorization for roles
  const getRoleAuthorizationStatus = (role: Role) => {
    if (!currentEmployee) return { authorized: false, text: "Sesi Belum Login" };
    
    const nrk = currentEmployee.nrk.trim();
    const nameLower = currentEmployee.name.toLowerCase();

    if (role === "PEMOHON") {
      return { authorized: true, text: "Sesi Terverifikasi" };
    }
    
    if (role === "PENGURUS_BARANG") {
      const isAuth = ["187281", "222538"].includes(nrk) || nameLower.includes("turimin") || nameLower.includes("maya permatasari");
      return { 
        authorized: isAuth, 
        text: isAuth ? "Petugas Terverifikasi" : "Butuh Login Turimin / Maya" 
      };
    }
    
    if (role === "KASUBAG_TU") {
      const isAuth = nrk === "189128" || nameLower.includes("dwi ratih");
      return { 
        authorized: isAuth, 
        text: isAuth ? "Kasubag Terverifikasi" : "Butuh Login Dwi Ratih" 
      };
    }
    
    if (role === "BAGIAN_GUDANG") {
      const isAuth = nrk === "1025366" || nameLower.includes("sunaryo");
      return { 
        authorized: isAuth, 
        text: isAuth ? "Petugas Terverifikasi" : "Butuh Login Sunaryo" 
      };
    }

    return { authorized: false, text: "Tidak Berwenang" };
  };

  const roles: { 
    id: Role; 
    label: string; 
    sub: string; 
    officers: string; 
    icon: React.ReactNode; 
    color: string 
  }[] = [
    {
      id: "PEMOHON",
      label: "Pemohon (Guru/Staf)",
      sub: "Ajukan & Pantau Permintaan",
      officers: "Seluruh PTK SMKN 7",
      icon: <User className="w-4 h-4" />,
      color: "bg-indigo-50 text-indigo-700 border-indigo-100",
    },
    {
      id: "PENGURUS_BARANG",
      label: "Pengurus Barang",
      sub: "Persetujuan & Pengeluaran Barang",
      officers: "Turimin / Maya Permatasari",
      icon: <ClipboardCheck className="w-4 h-4" />,
      color: "bg-blue-50 text-blue-700 border-blue-100",
    },
  ];

  return (
    <div id="role-switcher" className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-1.5 text-slate-700">
          <HelpCircle className="w-4 h-4 text-slate-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Simulasi Alur Verifikasi (Pilih Peran Anda untuk Bertindak)
          </h3>
        </div>
        <div className="text-[10px] bg-slate-50 border border-slate-200 text-slate-500 font-semibold px-2.5 py-1 rounded-lg">
          Metode Login: Masukkan NRK Pegawai pada menu Pemohon
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {roles.map((r) => {
          const isActive = currentRole === r.id;
          const { authorized, text } = getRoleAuthorizationStatus(r.id);
          
          return (
            <button
              key={r.id}
              onClick={() => onChangeRole(r.id)}
              className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer min-h-[110px] ${
                isActive
                  ? `${r.color} ring-2 ring-offset-1 ring-current bg-white shadow-sm font-semibold`
                  : "bg-white hover:bg-slate-50 text-slate-600 border-slate-100"
              }`}
            >
              <div className="flex items-start gap-3 w-full">
                <div className={`p-2 rounded-lg ${isActive ? "bg-white" : "bg-slate-50"} shadow-sm shrink-0`}>
                  {r.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold leading-tight truncate">{r.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-none">{r.sub}</p>
                </div>
              </div>

              {/* Authorized officer badge */}
              <div className="mt-3 w-full pt-2 border-t border-slate-100/60 flex flex-col gap-1">
                <span className="text-[9px] text-slate-400 font-medium block truncate">
                  Petugas: <strong className="text-slate-600">{r.officers}</strong>
                </span>
                
                {/* Status Badge */}
                <span className={`inline-flex items-center gap-1 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md w-fit ${
                  authorized 
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                    : "bg-amber-50 text-amber-600 border border-amber-100"
                }`}>
                  {authorized ? (
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-2.5 h-2.5 text-amber-500" />
                  )}
                  {text}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
