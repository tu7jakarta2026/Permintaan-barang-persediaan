import React, { useState } from "react";
import { RequestStatus, InventoryRequest } from "../types";
import { Role } from "./RoleSwitcher";
import { Employee, isAuthorizedToSeeAll } from "../lib/employees";
import {
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Truck,
  ArrowRight,
  ClipboardCheck,
  UserCheck,
  AlertCircle,
  User,
  ShoppingBag,
  Plus,
  Calendar
} from "lucide-react";

interface RequestListProps {
  requests: InventoryRequest[];
  currentRole: Role;
  onViewDetails: (request: InventoryRequest) => void;
  onAction: (id: string, actionType: "receive" | "approve" | "reject", operatorName: string, notes: string) => void;
  onOpenValidate: (request: InventoryRequest) => void;
  onOpenCreate: () => void;
  currentEmployee?: Employee | null;
}

export default function RequestList({
  requests,
  currentRole,
  onViewDetails,
  onAction,
  onOpenValidate,
  onOpenCreate,
  currentEmployee,
}: RequestListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [actionNotes, setActionNotes] = useState<{ [key: string]: string }>({});
  const [actionNames, setActionNames] = useState<{ [key: string]: string }>({});
  const [showActionForm, setShowActionForm] = useState<{ [key: string]: "receive" | "approve" | "reject" | null }>({});
  const [onlyMyRequests, setOnlyMyRequests] = useState(true);

  // Status mappings for tabs
  const filterTabs = [
    { value: "ALL", label: "Semua Pengajuan" },
    { value: RequestStatus.PENDING_RECEIPT, label: "Menunggu Persetujuan" },
    { value: RequestStatus.PENDING_VALIDATION, label: "Menunggu Validasi (Tahap 2)" },
    { value: RequestStatus.VALIDATED, label: "Selesai" },
    { value: RequestStatus.REJECTED, label: "Ditolak" },
  ];

  // Filtering logic
  const isAuthorized = isAuthorizedToSeeAll(currentEmployee);

  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      r.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
    
    let matchesEmployee = true;
    if (!isAuthorized) {
      if (currentEmployee) {
        // Non-authorized employees can ONLY see their own requests
        const matchesNrk = r.requesterNrk === currentEmployee.nrk;
        const matchesName = r.requesterName.toLowerCase().includes(currentEmployee.name.toLowerCase());
        matchesEmployee = matchesNrk || matchesName;
      } else {
        // If not logged in at all, and they are not authorized, they see nothing
        matchesEmployee = false;
      }
    } else {
      // Authorized staff can see all requests, but if they check "onlyMyRequests" in PEMOHON role, filter it
      if (currentRole === "PEMOHON" && onlyMyRequests) {
        const matchesNrk = r.requesterNrk === currentEmployee?.nrk;
        const matchesName = r.requesterName.toLowerCase().includes(currentEmployee?.name?.toLowerCase() || "");
        matchesEmployee = matchesNrk || matchesName;
      }
    }

    return matchesSearch && matchesStatus && matchesEmployee;
  });

  // Assign sequential number starting from 1 based on requestDate (ascending)
  const getRequestSequenceNumber = (id: string) => {
    const sortedAll = [...requests].sort((a, b) => {
      const dateA = new Date(a.requestDate).getTime();
      const dateB = new Date(b.requestDate).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return a.id.localeCompare(b.id);
    });
    const index = sortedAll.findIndex((r) => r.id === id);
    return index !== -1 ? index + 1 : 1;
  };

  // Sort filtered requests by requestDate ascending so they are chronological
  const sortedFilteredRequests = [...filteredRequests].sort((a, b) => {
    const dateA = new Date(a.requestDate).getTime();
    const dateB = new Date(b.requestDate).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return a.id.localeCompare(b.id);
  });

  // Helpers for step status rendering
  const getStepStatus = (request: InventoryRequest, stepIndex: number) => {
    // Step 0: Diajukan (always done)
    // Step 1: Disetujui & Selesai (done if status is VALIDATED)
    
    if (request.status === RequestStatus.REJECTED) {
      if (stepIndex === 0) return "done";
      if (stepIndex === 1) return "rejected";
      return "skipped";
    }

    switch (stepIndex) {
      case 0:
        return "done";
      case 1:
        return request.status === RequestStatus.VALIDATED
          ? "done"
          : request.status === RequestStatus.PENDING_RECEIPT
          ? "active"
          : "pending";
      default:
        return "pending";
    }
  };

  const stepLabels = [
    "Diajukan",
    "Selesai / Dikeluarkan"
  ];

  const handleActionSubmit = (id: string, actionType: "receive" | "approve" | "reject") => {
    const name = actionNames[id] || "";
    const notes = actionNotes[id] || "";

    if (!name.trim()) {
      alert("Mohon isi nama pelaku verifikasi!");
      return;
    }

    onAction(id, actionType, name, notes);
    
    // Clear state
    setActionNames((prev) => ({ ...prev, [id]: "" }));
    setActionNotes((prev) => ({ ...prev, [id]: "" }));
    setShowActionForm((prev) => ({ ...prev, [id]: null }));
  };

  const handleOpenActionForm = (id: string, actionType: "receive" | "approve" | "reject") => {
    setShowActionForm((prev) => ({ ...prev, [id]: actionType }));
    if (currentEmployee) {
      setActionNames((prev) => ({ ...prev, [id]: currentEmployee.name }));
    }
  };

  return (
    <div id="request-list-container" className="space-y-6">
      {/* Search & Tabs Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Cari kode pengajuan, nama barang, atau pemohon..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {currentEmployee ? (
              isAuthorized ? (
                currentRole === "PEMOHON" && (
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors select-none">
                    <input
                      type="checkbox"
                      checked={onlyMyRequests}
                      onChange={(e) => setOnlyMyRequests(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 border-slate-300"
                    />
                    Hanya Permintaan Saya
                  </label>
                )
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-amber-700 bg-amber-50/60 border border-amber-200/80 rounded-xl" title="Hanya Pengurus Barang Turimin, Maya, Kasubag TU Dwi Ratih, dan Bagian Gudang Sunaryo yang berwenang melihat semua list permintaan.">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  Hanya Permintaan Anda (Terkunci)
                </div>
              )
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
                <AlertCircle className="w-4 h-4 text-rose-500 animate-pulse shrink-0" />
                Sesi Belum Terverifikasi
              </div>
            )}

            {currentRole === "PEMOHON" && (
              <button
                onClick={onOpenCreate}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Buat Permintaan
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="flex gap-1.5">
            {filterTabs.map((tab) => {
              const isActive = statusFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? "bg-slate-800 text-white shadow-xs"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Grid List */}
      {sortedFilteredRequests.length === 0 ? (
        !currentEmployee ? (
          <div className="bg-white rounded-2xl shadow-sm border border-rose-100 p-12 text-center max-w-xl mx-auto">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <User className="w-6 h-6 text-rose-500 animate-pulse" />
            </div>
            <h3 className="text-base font-display font-bold text-slate-800">
              Sesi Pegawai Belum Terverifikasi
            </h3>
            <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
              Silakan masukkan dan verifikasi NRK/NIKKI Anda terlebih dahulu di atas pada menu <strong>Pemohon (Guru/Staf)</strong> untuk dapat mengakses daftar permintaan barang Gudang SMKN 7 Jakarta.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center max-w-xl mx-auto">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Search className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-base font-display font-semibold text-slate-800">
              Tidak Ada Pengajuan Ditemukan
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
              {isAuthorized 
                ? "Tidak dapat menemukan pengajuan yang cocok dengan pencarian atau filter Anda. Silakan ubah filter atau segarkan data." 
                : "Anda belum memiliki riwayat pengajuan barang persediaan. Silakan buat pengajuan baru jika diperlukan."
              }
            </p>
            {currentRole === "PEMOHON" && (
              <button
                onClick={onOpenCreate}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Buat Permintaan Sekarang
              </button>
            )}
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sortedFilteredRequests.map((req) => {
            // Check status styling
            let statusBadgeColor = "bg-slate-50 text-slate-700 border-slate-200";
            if (req.status === RequestStatus.PENDING_RECEIPT) statusBadgeColor = "bg-blue-50 text-blue-700 border-blue-100";
            else if (req.status === RequestStatus.PENDING_APPROVAL) statusBadgeColor = "bg-purple-50 text-purple-700 border-purple-100";
            else if (req.status === RequestStatus.PENDING_VALIDATION) statusBadgeColor = "bg-amber-50 text-amber-700 border-amber-100";
            else if (req.status === RequestStatus.VALIDATED) statusBadgeColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
            else if (req.status === RequestStatus.REJECTED) statusBadgeColor = "bg-rose-50 text-rose-700 border-rose-100";

            return (
              <div
                key={req.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col justify-between hover:border-slate-200 transition-all duration-200"
              >
                {/* Card Top: ID and Status */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-extrabold px-2 py-0.5 bg-blue-600 text-white rounded shadow-xs shrink-0">
                        No. {getRequestSequenceNumber(req.id)}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                        {req.id}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${statusBadgeColor} max-w-[200px] truncate`} title={req.status === RequestStatus.PENDING_VALIDATION ? "Menunggu Validasi Tahap 2 (Pengurus Barang & Bagian Gudang)" : ""}>
                      {req.status === RequestStatus.PENDING_RECEIPT && "Menunggu Persetujuan"}
                      {req.status === RequestStatus.PENDING_APPROVAL && "Menunggu Persetujuan"}
                      {req.status === RequestStatus.PENDING_VALIDATION && "Menunggu Validasi Tahap 2"}
                      {req.status === RequestStatus.VALIDATED && "Selesai / Dikeluarkan"}
                      {req.status === RequestStatus.REJECTED && "Ditolak"}
                    </span>
                  </div>

                  {/* Requester Profile */}
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg mt-0.5 shrink-0">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-800 leading-tight">
                        {req.itemName}
                      </h4>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">
                        {req.quantity} {req.unit}
                      </p>
                    </div>
                  </div>

                  {/* Requester Info & Date */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">Oleh: <strong>{req.requesterName}</strong> ({req.requesterRole})</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-medium text-slate-500 shrink-0">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{req.requestDate}</span>
                    </div>
                  </div>

                  {/* Workflow Steps Tracker */}
                  <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                      Proses Verifikasi Bertahap
                    </span>
                    <div className="flex items-center justify-between gap-1">
                      {stepLabels.map((lbl, sIdx) => {
                        const stepStat = getStepStatus(req, sIdx);
                        let barBg = "bg-slate-200";
                        let textClass = "text-slate-400 font-medium";

                        if (stepStat === "done") {
                          barBg = "bg-blue-600";
                          textClass = "text-blue-700 font-bold";
                        } else if (stepStat === "active") {
                          barBg = "bg-amber-500 animate-pulse";
                          textClass = "text-amber-600 font-bold";
                        } else if (stepStat === "rejected") {
                          barBg = "bg-rose-500";
                          textClass = "text-rose-600 font-bold";
                        } else if (stepStat === "skipped") {
                          barBg = "bg-slate-200";
                          textClass = "text-slate-300 font-normal line-through";
                        }

                        return (
                          <div key={sIdx} className="flex-1 flex flex-col items-center min-w-0">
                            <div className={`h-1 w-full rounded-full ${barBg} mb-1`} />
                            <span className={`text-[9px] text-center leading-none truncate w-full ${textClass}`}>
                              {lbl}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col gap-3">
                  {/* Inline Action Form Triggered */}
                  {showActionForm[req.id] ? (
                    <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {showActionForm[req.id] === "receive" && "Form Persetujuan & Pengeluaran Barang"}
                          {showActionForm[req.id] === "reject" && "Form Penolakan Pengajuan"}
                        </span>
                        <button
                          onClick={() => setShowActionForm((prev) => ({ ...prev, [req.id]: null }))}
                          className="text-[10px] text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>

                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Nama Anda (Pelaku Tindakan)"
                          value={actionNames[req.id] || ""}
                          onChange={(e) =>
                            setActionNames((prev) => ({ ...prev, [req.id]: e.target.value }))
                          }
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                        />
                        <textarea
                          placeholder="Ketik catatan tindak lanjut..."
                          rows={2}
                          value={actionNotes[req.id] || ""}
                          onChange={(e) =>
                            setActionNotes((prev) => ({ ...prev, [req.id]: e.target.value }))
                          }
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white resize-none"
                        />
                        <button
                          onClick={() => handleActionSubmit(req.id, showActionForm[req.id]!)}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs cursor-pointer"
                        >
                          Kirim Verifikasi
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      {/* Contextual Action Buttons depending on role */}
                      <div className="flex gap-2">
                        {/* 1. Pengurus Barang Actions */}
                        {currentRole === "PENGURUS_BARANG" && req.status === RequestStatus.PENDING_RECEIPT && (
                          <>
                            <button
                              onClick={() => handleOpenActionForm(req.id, "receive")}
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                            >
                              <ClipboardCheck className="w-3.5 h-3.5" />
                              Setujui & Keluarkan
                            </button>
                            <button
                              onClick={() => handleOpenActionForm(req.id, "reject")}
                              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-semibold rounded-lg border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Tolak
                            </button>
                          </>
                        )}

                        {/* Stage 2 Validation Button */}
                        {req.status === RequestStatus.PENDING_VALIDATION && (() => {
                          const isOwnRequest = currentEmployee && (
                            req.requesterNrk === currentEmployee.nrk ||
                            req.requesterName.toLowerCase().includes(currentEmployee.name.toLowerCase())
                          );
                          const isAuthorizedGudang = currentEmployee && (
                            ["187281", "222538", "1025366"].includes(currentEmployee.nrk.trim()) ||
                            currentEmployee.name.toLowerCase().includes("turimin") ||
                            currentEmployee.name.toLowerCase().includes("maya permatasari") ||
                            currentEmployee.name.toLowerCase().includes("sunaryo") ||
                            (currentEmployee.role || "").toLowerCase().includes("pengurus") ||
                            (currentEmployee.role || "").toLowerCase().includes("gudang")
                          );

                          const canValidate = 
                            currentRole === "PENGURUS_BARANG" || 
                            isAuthorizedGudang || 
                            (currentRole === "PEMOHON" && isOwnRequest);

                          if (!canValidate) return null;

                          return (
                            <button
                              onClick={() => onOpenValidate(req)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              {currentRole === "PEMOHON" ? "Selesaikan Penerimaan & Foto" : "Validasi & Serah Terima"}
                            </button>
                          );
                        })()}

                        {/* Role-Incompatibility Notice */}
                        {currentRole === "PENGURUS_BARANG" && 
                         req.status !== RequestStatus.PENDING_RECEIPT && 
                         req.status !== RequestStatus.PENDING_VALIDATION && (
                          <span className="text-[10px] text-slate-400 italic flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-slate-300" />
                            Sudah diproses / Selesai
                          </span>
                        )}
                      </div>

                      {/* Detail Link always visible */}
                      <button
                        onClick={() => onViewDetails(req)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 text-xs font-semibold rounded-lg transition-colors cursor-pointer ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Rincian
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
