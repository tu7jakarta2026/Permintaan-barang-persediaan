import React, { useState, useEffect, useRef } from "react";
import { RequestStatus, InventoryRequest } from "../types";
import { X, Calendar, User, ShoppingBag, Info, FileImage, ShieldCheck, Clock, Upload, Camera } from "lucide-react";
import { Employee } from "../lib/employees";

interface RequestDetailModalProps {
  request: InventoryRequest | null;
  isOpen: boolean;
  onClose: () => void;
  requestNumber?: number;
  currentEmployee?: Employee | null;
  onUploadPhoto?: (id: string, photoBase64: string, uploaderName: string) => void;
}

export default function RequestDetailModal({
  request,
  isOpen,
  onClose,
  requestNumber,
  currentEmployee,
  onUploadPhoto,
}: RequestDetailModalProps) {
  const [uploaderName, setUploaderName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentEmployee) {
      setUploaderName(currentEmployee.name);
    } else {
      setUploaderName("");
    }
  }, [currentEmployee, isOpen, request]);

  if (!isOpen || !request) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith("image/")) {
        alert("Hanya berkas gambar yang diperbolehkan!");
        return;
      }
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result && onUploadPhoto) {
          const nameToUse = uploaderName.trim() || currentEmployee?.name || "Petugas";
          onUploadPhoto(request.id, event.target.result as string, nameToUse);
        }
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper for Status Badge styling
  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.PENDING_RECEIPT:
        return { text: "Menunggu Penerimaan", bg: "bg-blue-50 text-blue-700 border-blue-100" };
      case RequestStatus.PENDING_APPROVAL:
        return { text: "Menunggu Persetujuan TU", bg: "bg-purple-50 text-purple-700 border-purple-100" };
      case RequestStatus.PENDING_VALIDATION:
        return { text: "Menunggu Validasi Gudang", bg: "bg-amber-50 text-amber-700 border-amber-100" };
      case RequestStatus.VALIDATED:
        return { text: "Selesai / Terkirim", bg: "bg-emerald-50 text-emerald-700 border-emerald-100" };
      case RequestStatus.REJECTED:
        return { text: "Ditolak", bg: "bg-rose-50 text-rose-700 border-rose-100" };
    }
  };

  const badge = getStatusBadge(request.status);

  // Workflow timeline steps
  const steps = [
    {
      label: "Diajukan Pemohon",
      name: request.requesterName,
      date: request.requestDate,
      isDone: true,
      color: "border-indigo-500 bg-indigo-500",
    },
    {
      label: "Diterima Pengurus Barang",
      name: request.receivedBy,
      date: request.receivedDate,
      isDone: !!request.receivedBy,
      color: request.receivedBy ? "border-blue-500 bg-blue-500" : "border-slate-200 bg-white",
    },
    {
      label: "Divalidasi Bagian Gudang",
      name: request.validatedBy,
      date: request.validatedDate,
      isDone: !!request.validatedBy,
      color: request.validatedBy ? "border-emerald-500 bg-emerald-500" : "border-slate-200 bg-white",
    },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {requestNumber && (
              <span className="text-xs font-bold text-white bg-blue-600 px-2 py-0.5 rounded shadow-xs">
                No. {requestNumber}
              </span>
            )}
            <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              {request.id}
            </span>
            <h3 className="text-base font-display font-semibold text-slate-800">
              Rincian Pengajuan Barang
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Top Info Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Status Permintaan
              </span>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${badge.bg}`}>
                  {badge.text}
                </span>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  Tanggal Pengajuan
                </span>
                <span className="text-xs font-semibold text-slate-700 flex items-center justify-end gap-1 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {request.requestDate}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: General Details */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5" />
                Detail Barang & Pemohon
              </h4>

              <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100/60">
                <div>
                  <span className="text-[10px] text-slate-400 block">Nama Barang</span>
                  <span className="text-sm font-semibold text-slate-800">{request.itemName}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Jumlah Kebutuhan</span>
                    <span className="text-sm font-bold text-slate-800">
                      {request.quantity} <span className="text-xs font-medium text-slate-500">{request.unit}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Nama Pemohon</span>
                    <span className="text-xs font-semibold text-slate-800 truncate block">
                      {request.requesterName}
                    </span>
                    {request.requesterNrk && (
                      <span className="inline-block mt-0.5 text-[9px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        NRK: {request.requesterNrk}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Jabatan / Unit</span>
                  <span className="text-xs font-medium text-slate-600 block">
                    {request.requesterRole}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Alasan / Keperluan</span>
                  <p className="text-xs text-slate-600 leading-relaxed mt-0.5 italic">
                    "{request.purpose}"
                  </p>
                </div>

                {request.notes && (
                  <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-lg">
                    <span className="text-[10px] text-amber-700 font-bold block flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Catatan Tindakan
                    </span>
                    <p className="text-xs text-amber-900 mt-1">{request.notes}</p>
                  </div>
                )}
              </div>

              {/* Photo Attachment if available */}
              {request.photoUrl && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FileImage className="w-3.5 h-3.5" />
                    Bukti Penyerahan Barang (Gudang)
                  </h4>
                  <div className="border border-slate-100 rounded-xl overflow-hidden shadow-xs bg-slate-50 relative group">
                    <img
                      src={request.photoUrl}
                      alt="Validasi Penyerahan Barang"
                      className="w-full h-48 object-cover object-center group-hover:scale-102 transition-transform duration-300"
                    />
                    <div className="absolute bottom-2 left-2 right-2 bg-slate-900/70 backdrop-blur-xs text-white p-2 rounded-lg text-[10px] flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        Divalidasi Gudang
                      </span>
                      <span>{request.validatedDate}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Photo Upload Section for Pemohon, Pengurus Barang, Bagian Gudang */}
              {onUploadPhoto && (request.status === RequestStatus.PENDING_VALIDATION || request.status === RequestStatus.VALIDATED) && (
                <div className="mt-4 p-4 bg-blue-50/40 border border-blue-100 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" />
                      Unggah / Ganti Foto Bukti Fisik
                    </h4>
                    <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">
                      Serah Terima
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Dapat dilakukan oleh <strong>Pemohon</strong>, <strong>Pengurus Barang</strong>, maupun <strong>Bagian Gudang</strong>.
                  </p>

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nama Pengunggah (Ketik jika berbeda)"
                        value={uploaderName}
                        onChange={(e) => setUploaderName(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer animate-pulse"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {isUploading ? "Mengonversi..." : "Pilih Foto"}
                      </button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right: Visual Stepper Timeline */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Riwayat Validasi Bertahap
              </h4>

              <div className="relative pl-6 space-y-6">
                {/* Timeline vertical bar */}
                <div className="absolute top-2 bottom-2 left-2.5 w-0.5 bg-slate-100" />

                {steps.map((step, idx) => {
                  return (
                    <div key={idx} className="relative flex items-start gap-4">
                      {/* Circle indicator */}
                      <div
                        className={`absolute -left-[20px] w-4.5 h-4.5 rounded-full border-2 z-10 flex items-center justify-center transition-colors ${
                          step.isDone
                            ? step.color
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        {step.isDone && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>

                      <div className="space-y-1 flex-1">
                        <h5
                          className={`text-xs font-bold leading-none ${
                            step.isDone ? "text-slate-800" : "text-slate-400"
                          }`}
                        >
                          {step.label}
                        </h5>
                        {step.isDone ? (
                          <div className="text-[11px] text-slate-500">
                            <p className="font-semibold">{step.name || "Sistem Otomatis"}</p>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              {step.date || "Selesai"}
                            </p>
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-300">Belum diproses</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Close */}
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Tutup Rincian
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
