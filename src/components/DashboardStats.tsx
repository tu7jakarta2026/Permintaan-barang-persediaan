import React from "react";
import { RequestStatus, InventoryRequest } from "../types";
import { ClipboardList, Hourglass, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface DashboardStatsProps {
  requests: InventoryRequest[];
}

export default function DashboardStats({ requests }: DashboardStatsProps) {
  const total = requests.length;
  
  const pendingReceipt = requests.filter(
    (r) => r.status === RequestStatus.PENDING_RECEIPT
  ).length;
  
  const pendingValidation = requests.filter(
    (r) => r.status === RequestStatus.PENDING_VALIDATION
  ).length;
  
  const validated = requests.filter(
    (r) => r.status === RequestStatus.VALIDATED
  ).length;

  const stats = [
    {
      title: "Total Pengajuan",
      value: total,
      icon: <ClipboardList className="w-5 h-5 text-slate-500" />,
      bg: "bg-white border-slate-200",
      textColor: "text-slate-800",
      desc: "Semua pengajuan terdaftar",
      progressColor: "bg-slate-300",
      percentage: 100
    },
    {
      title: "Menunggu Validasi",
      value: pendingValidation,
      icon: <AlertCircle className="w-5 h-5 text-amber-500" />,
      bg: "bg-white border-slate-200",
      textColor: "text-amber-600",
      desc: "Tahap 2: Dilakukan oleh Pengurus Barang dan Bagian Gudang",
      progressColor: "bg-amber-500",
      percentage: total > 0 ? (pendingValidation / total) * 100 : 0
    },
    {
      title: "Serah Terima Selesai",
      value: validated,
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
      bg: "bg-white border-slate-200",
      textColor: "text-emerald-600",
      desc: "Barang sudah serah terima",
      progressColor: "bg-emerald-500",
      percentage: total > 0 ? (validated / total) * 100 : 0
    }
  ];

  return (
    <div id="dashboard-stats" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className={`p-5 rounded-xl border bg-white shadow-sm flex flex-col justify-between ${stat.bg}`}
        >
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.title}</span>
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100 shrink-0">
                {stat.icon}
              </div>
            </div>
            <h3 className={`text-2xl font-display font-bold ${stat.textColor} leading-tight`}>
              {stat.value.toString().padStart(2, "0")}
            </h3>
          </div>
          <div className="mt-4">
            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full ${stat.progressColor} transition-all duration-500`} 
                style={{ width: `${stat.percentage}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-2 truncate font-medium">{stat.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
