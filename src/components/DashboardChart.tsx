import React, { useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { RequestStatus, InventoryRequest } from "../types";
import { PieChart as PieIcon, Info, ClipboardList, CheckCircle2, AlertCircle, Hourglass, XCircle, Calendar } from "lucide-react";

interface DashboardChartProps {
  requests: InventoryRequest[];
}

export default function DashboardChart({ requests }: DashboardChartProps) {
  const [chartMode, setChartMode] = useState<"status" | "month">("month");
  const total = requests.length;

  // Calculate status counts
  const pendingReceipt = requests.filter(
    (r) => r.status === RequestStatus.PENDING_RECEIPT
  ).length;

  const pendingApproval = requests.filter(
    (r) => r.status === RequestStatus.PENDING_APPROVAL
  ).length;

  const pendingValidation = requests.filter(
    (r) => r.status === RequestStatus.PENDING_VALIDATION
  ).length;

  const validated = requests.filter(
    (r) => r.status === RequestStatus.VALIDATED
  ).length;

  const rejected = requests.filter(
    (r) => r.status === RequestStatus.REJECTED
  ).length;

  // Status-based data array
  const statusData = [
    {
      name: "Menunggu Penerimaan",
      value: pendingReceipt,
      color: "#64748b", // Slate
      desc: "Menunggu pemeriksaan berkas oleh Pengurus Barang"
    },
    {
      name: "Menunggu Persetujuan",
      value: pendingApproval,
      color: "#f59e0b", // Amber
      desc: "Disetujui Pengurus, menunggu tanda tangan Kasubag TU"
    },
    {
      name: "Menunggu Validasi",
      value: pendingValidation,
      color: "#6366f1", // Indigo
      desc: "Barang sudah serah terima fisik awal, menunggu validasi & foto Gudang"
    },
    {
      name: "Serah Terima Selesai",
      value: validated,
      color: "#10b981", // Emerald
      desc: "Barang telah divalidasi dan serah terima selesai dilakukan dengan bukti foto"
    },
    {
      name: "Pengajuan Ditolak",
      value: rejected,
      color: "#ef4444", // Red
      desc: "Pengajuan ditolak oleh Kasubag TU"
    }
  ].filter(item => item.value > 0);

  // Month-based grouping logic
  const monthDataMap: { [key: string]: number } = {};
  
  const INDO_MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  requests.forEach((r) => {
    if (!r.requestDate) return;
    try {
      const d = new Date(r.requestDate);
      if (isNaN(d.getTime())) {
        const parts = r.requestDate.split("-");
        if (parts.length >= 2) {
          const mIdx = parseInt(parts[1], 10) - 1;
          const yr = parts[0];
          if (mIdx >= 0 && mIdx < 12) {
            const label = `${INDO_MONTHS[mIdx]} ${yr}`;
            monthDataMap[label] = (monthDataMap[label] || 0) + 1;
          }
        }
        return;
      }
      const label = `${INDO_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      monthDataMap[label] = (monthDataMap[label] || 0) + 1;
    } catch (e) {
      // fallback safe
    }
  });

  const monthColors = [
    "#6366f1", // Indigo
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#3b82f6", // Blue
    "#ec4899", // Pink
    "#8b5cf6", // Violet
    "#14b8a6", // Teal
    "#f43f5e", // Rose
    "#06b6d4"  // Cyan
  ];

  const monthData = Object.entries(monthDataMap).map(([name, value], idx) => ({
    name,
    value,
    color: monthColors[idx % monthColors.length],
    desc: `Total pengajuan pada bulan ${name}`
  }));

  // Sort months chronologically
  monthData.sort((a, b) => {
    const parseMonthYear = (str: string) => {
      const parts = str.split(" ");
      if (parts.length === 2) {
        const mIdx = INDO_MONTHS.indexOf(parts[0]);
        const yr = parseInt(parts[1], 10);
        return yr * 12 + mIdx;
      }
      return 0;
    };
    return parseMonthYear(a.name) - parseMonthYear(b.name);
  });

  // Fallback data if no requests exist
  const emptyData = [
    { name: "Tidak Ada Data", value: 1, color: "#e2e8f0" }
  ];

  // Selected dataset to display
  const activeDataset = chartMode === "month" ? monthData : statusData;
  const displayData = activeDataset.length > 0 ? activeDataset : emptyData;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 animate-fade-in">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-6 gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
            <PieIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Visualisasi Pengajuan</h3>
            <p className="text-[11px] text-slate-500">
              {chartMode === "month" 
                ? "Diagram lingkaran total permintaan berdasarkan tiap bulan" 
                : "Diagram lingkaran proporsi status alur kerja barang"
              }
            </p>
          </div>
        </div>

        {/* Chart Mode Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60 shrink-0 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setChartMode("month")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              chartMode === "month"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-800 hover:bg-white/50"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Tiap Bulan
          </button>
          <button
            type="button"
            onClick={() => setChartMode("status")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              chartMode === "status"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-800 hover:bg-white/50"
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            Status Alur
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Pie Chart Representation */}
        <div className="col-span-1 lg:col-span-5 flex justify-center relative">
          <div className="w-[180px] h-[180px] relative flex items-center justify-center">
            {total > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                <span className="text-2xl font-extrabold text-slate-800 font-mono leading-none">
                  {total}
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Berkas
                </span>
              </div>
            )}
            
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displayData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={activeDataset.length > 1 ? 3 : 0}
                  dataKey="value"
                >
                  {displayData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || "#cbd5e1"} />
                  ))}
                </Pie>
                {total > 0 && (
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const dataItem = payload[0].payload;
                        const percentage = ((dataItem.value / total) * 100).toFixed(1);
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-800 shadow-xl max-w-xs text-xs z-50">
                            <p className="font-bold flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full block" style={{ backgroundColor: dataItem.color }} />
                              {dataItem.name}
                            </p>
                            <p className="mt-1 font-mono font-medium text-[11px] text-slate-300">
                              Jumlah: {dataItem.value} berkas ({percentage}%)
                            </p>
                            {dataItem.desc && (
                              <p className="mt-1.5 text-[10px] text-slate-400 leading-relaxed border-t border-slate-800 pt-1">
                                {dataItem.desc}
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                )}
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Legend & Summary Detail */}
        <div className="col-span-1 lg:col-span-7 space-y-4">
          <h4 className="text-xs font-bold text-slate-700 tracking-wide uppercase">
            {chartMode === "month" ? "Rincian Permintaan Per Bulan" : "Rincian & Proporsi Status"}
          </h4>
          
          {total === 0 ? (
            <div className="py-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
              <Info className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
              <p className="text-xs font-semibold text-slate-500">Belum ada pengajuan terdaftar.</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Daftar statistik akan muncul setelah pengajuan pertama dikirim.</p>
            </div>
          ) : chartMode === "month" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {monthData.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg shrink-0 mt-0.5" style={{ color: item.color, backgroundColor: `${item.color}15` }}>
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.name}</p>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-sm font-extrabold text-slate-800 font-mono">
                        {item.value.toString().padStart(2, "0")}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Pengajuan ({((item.value / total) * 100).toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Menunggu Penerimaan */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5">
                <div className="p-1 bg-slate-200/50 text-slate-600 rounded-lg shrink-0 mt-0.5">
                  <Hourglass className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Menunggu Penerimaan</p>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-sm font-extrabold text-slate-800 font-mono">
                      {pendingReceipt.toString().padStart(2, "0")}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      ({((pendingReceipt / total) * 100).toFixed(0)}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Menunggu Persetujuan */}
              <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-100/50 flex items-start gap-2.5">
                <div className="p-1 bg-amber-100/50 text-amber-600 rounded-lg shrink-0 mt-0.5">
                  <Hourglass className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider font-display">Menunggu Persetujuan</p>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-sm font-extrabold text-amber-700 font-mono">
                      {pendingApproval.toString().padStart(2, "0")}
                    </span>
                    <span className="text-[10px] text-amber-500 font-medium">
                      ({((pendingApproval / total) * 100).toFixed(0)}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Menunggu Validasi */}
              <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100/50 flex items-start gap-2.5">
                <div className="p-1 bg-indigo-100/50 text-indigo-600 rounded-lg shrink-0 mt-0.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider font-display">Menunggu Validasi</p>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-sm font-extrabold text-indigo-700 font-mono">
                      {pendingValidation.toString().padStart(2, "0")}
                    </span>
                    <span className="text-[10px] text-indigo-500 font-medium">
                      ({((pendingValidation / total) * 100).toFixed(0)}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Serah Terima Selesai */}
              <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100/50 flex items-start gap-2.5">
                <div className="p-1 bg-emerald-100/50 text-emerald-600 rounded-lg shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Serah Terima Selesai</p>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-sm font-extrabold text-emerald-700 font-mono">
                      {validated.toString().padStart(2, "0")}
                    </span>
                    <span className="text-[10px] text-emerald-500 font-medium">
                      ({((validated / total) * 100).toFixed(0)}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Rejected if exists */}
              {rejected > 0 && (
                <div className="p-3 bg-rose-50/40 rounded-xl border border-rose-100/50 flex items-start gap-2.5 col-span-1 sm:col-span-2">
                  <div className="p-1 bg-rose-100/50 text-rose-600 rounded-lg shrink-0 mt-0.5">
                    <XCircle className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Pengajuan Ditolak</p>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-sm font-extrabold text-rose-700 font-mono">
                        {rejected.toString().padStart(2, "0")}
                      </span>
                      <span className="text-[10px] text-rose-500 font-medium">
                        ({((rejected / total) * 100).toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
