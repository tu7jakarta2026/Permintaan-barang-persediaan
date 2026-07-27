import React, { useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { InventoryRequest } from "../types";
import { BarChart3, Info, Calendar, ChevronRight, TrendingUp } from "lucide-react";

interface DashboardBarChartProps {
  requests: InventoryRequest[];
}

interface MonthlyBreakdown {
  [monthYear: string]: number;
}

interface BarChartItem {
  itemName: string;
  totalQuantity: number;
  requestCount: number;
  unit: string;
  monthlyBreakdown: MonthlyBreakdown;
}

const INDO_MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export default function DashboardBarChart({ requests }: DashboardBarChartProps) {
  const [limit, setLimit] = useState<number>(8);

  const totalRequestsCount = requests.length;

  // Process data to group by item name
  const itemMap: { [name: string]: BarChartItem } = {};

  requests.forEach((req) => {
    if (!req.itemName) return;

    const nameTrimmed = req.itemName.trim();
    // Normalize key to merge duplicates with slight spacing/casing differences
    const nameKey = nameTrimmed.toLowerCase().replace(/\s+/g, " ");

    let monthLabel = "Lainnya";
    if (req.requestDate) {
      try {
        const d = new Date(req.requestDate);
        if (!isNaN(d.getTime())) {
          monthLabel = `${INDO_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
        } else {
          const parts = req.requestDate.split("-");
          if (parts.length >= 2) {
            const mIdx = parseInt(parts[1], 10) - 1;
            const yr = parts[0];
            if (mIdx >= 0 && mIdx < 12) {
              monthLabel = `${INDO_MONTHS[mIdx]} ${yr}`;
            }
          }
        }
      } catch (e) {
        // Fallback
      }
    }

    if (!itemMap[nameKey]) {
      itemMap[nameKey] = {
        itemName: nameTrimmed,
        totalQuantity: 0,
        requestCount: 0,
        unit: req.unit || "Unit",
        monthlyBreakdown: {}
      };
    }

    const qty = Number(req.quantity) || 0;
    itemMap[nameKey].totalQuantity += qty;
    itemMap[nameKey].requestCount += 1;
    itemMap[nameKey].monthlyBreakdown[monthLabel] = (itemMap[nameKey].monthlyBreakdown[monthLabel] || 0) + qty;
  });

  // Convert map to array and sort descending by totalQuantity
  const allItems = Object.values(itemMap).sort((a, b) => b.totalQuantity - a.totalQuantity);
  
  // Slice to active limit
  const displayedItems = allItems.slice(0, limit);

  // Gradient colors for Bars
  const colors = [
    "#4f46e5", // Indigo
    "#3b82f6", // Blue
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#ec4899", // Pink
    "#8b5cf6", // Violet
    "#06b6d4", // Cyan
    "#14b8a6", // Teal
  ];

  // Custom Tooltip component depicting "notes gelembung rincian perbulan"
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: BarChartItem = payload[0].payload;
      
      return (
        <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-2xl max-w-xs text-xs animate-fade-in relative z-50">
          {/* Header */}
          <div className="border-b border-slate-800 pb-2 mb-2.5">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-indigo-400">Barang Terpopuler</span>
            <h4 className="font-bold text-sm text-slate-100 truncate mt-0.5">{data.itemName}</h4>
            <div className="flex justify-between items-center mt-1.5 text-slate-300 font-mono text-[11px]">
              <span>Total Kebutuhan:</span>
              <span className="font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">
                {data.totalQuantity} {data.unit}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Diajukan sebanyak {data.requestCount} kali</p>
          </div>

          {/* Monthly breakdown gelembung/pills container */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wide">
              <Calendar className="w-3 h-3 text-indigo-400" />
              Rincian Tiap Bulan (Gelembung)
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {Object.entries(data.monthlyBreakdown).map(([month, qty]) => (
                <div 
                  key={month} 
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-755 border border-slate-700/50 rounded-full transition-colors shrink-0"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8]" />
                  <span className="text-[10px] font-medium text-slate-300">{month}:</span>
                  <span className="text-[10px] font-bold text-indigo-200 font-mono">{qty} {data.unit}</span>
                </div>
              ))}
              {Object.keys(data.monthlyBreakdown).length === 0 && (
                <span className="text-[10px] text-slate-500 italic">Tidak ada data bulanan</span>
              )}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 animate-fade-in">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-6 gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Permintaan Barang Paling Banyak Dibutuhkan</h3>
            <p className="text-[11px] text-slate-500">
              Analisis kebutuhan tertinggi dengan notes gelembung rincian jumlah per bulan
            </p>
          </div>
        </div>

        {/* Limit filter */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Tampilkan</span>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
          >
            <option value={5}>Top 5 Barang</option>
            <option value={8}>Top 8 Barang</option>
            <option value={12}>Top 12 Barang</option>
            <option value={20}>Top 20 Barang</option>
          </select>
        </div>
      </div>

      {totalRequestsCount === 0 ? (
        <div className="py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
          <Info className="w-6 h-6 text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-600">Belum ada data barang untuk divisualisasikan.</p>
          <p className="text-[10px] text-slate-400 mt-1">Masukkan pengajuan barang persediaan baru untuk memicu analisis grafik.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Bar Chart Graphics */}
          <div className="col-span-1 lg:col-span-8">
            <div className="w-full h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={displayedItems}
                  margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="itemName" 
                    tick={{ fill: "#64748b", fontSize: 9, fontWeight: 500 }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                    interval={0}
                    tickFormatter={(value) => value.length > 12 ? `${value.slice(0, 10)}...` : value}
                  />
                  <YAxis 
                    tick={{ fill: "#64748b", fontSize: 9, fontWeight: 500 }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
                  <Bar 
                    dataKey="totalQuantity" 
                    radius={[6, 6, 0, 0]}
                    barSize={28}
                  >
                    {displayedItems.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-center">
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                <Info className="w-3 h-3 text-indigo-400 shrink-0" />
                Sorot atau ketuk pada batang untuk menampilkan notes gelembung rincian bulanan
              </span>
            </div>
          </div>

          {/* Quick List Rank */}
          <div className="col-span-1 lg:col-span-4 bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 tracking-wide uppercase flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                  Peringkat Kebutuhan
                </h4>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded-md">
                  Top {limit}
                </span>
              </div>

              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {displayedItems.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200/60 shadow-sm hover:border-indigo-200 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs font-bold text-slate-400 shrink-0 w-4">
                        {(idx + 1).toString().padStart(2, "0")}
                      </span>
                      <p className="text-xs font-semibold text-slate-700 truncate">{item.itemName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-slate-800 font-mono">
                        {item.totalQuantity}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 ml-0.5">{item.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/60 flex justify-between items-center text-[11px] text-slate-500">
              <span>Keberagaman Jenis Barang:</span>
              <span className="font-extrabold text-slate-800">{allItems.length} Jenis</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
