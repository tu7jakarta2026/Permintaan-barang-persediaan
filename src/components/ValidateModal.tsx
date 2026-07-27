import React, { useState, useRef } from "react";
import { X, Upload, Check, Image as ImageIcon, AlertTriangle, MessageSquare } from "lucide-react";

import { Employee } from "../lib/employees";

interface ValidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onValidate: (id: string, validatorName: string, photoBase64: string, notes: string) => void;
  requestId: string;
  itemName: string;
  quantity: number;
  unit: string;
  currentEmployee: Employee | null;
}

export default function ValidateModal({
  isOpen,
  onClose,
  onValidate,
  requestId,
  itemName,
  quantity,
  unit,
  currentEmployee,
}: ValidateModalProps) {
  const [validatorName, setValidatorName] = useState(() => {
    if (currentEmployee) {
      return currentEmployee.name;
    }
    return "";
  });
  const [photo, setPhoto] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle file selection and conversion to Base64
  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Hanya berkas gambar yang diperbolehkan!");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setPhoto(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatorName.trim()) {
      alert("Mohon masukkan nama penerima!");
      return;
    }
    if (!photo) {
      alert("Mohon lampirkan foto penyerahan barang!");
      return;
    }

    onValidate(requestId, validatorName, photo, notes);
    onClose();
    // Reset state
    setValidatorName("");
    setPhoto(null);
    setNotes("");
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden transform transition-all animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
              {requestId}
            </span>
            <h3 className="text-base font-display font-semibold text-slate-800">
              Validasi & Serah Terima Barang
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-amber-50/50 border border-amber-100/60 rounded-xl text-xs text-slate-700">
            <span className="font-semibold block mb-0.5">Barang yang akan diserahkan:</span>
            <p className="font-bold text-slate-900">
              {itemName} — {quantity} {unit}
            </p>
          </div>

          {/* Name Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600">
              Nama Penerima / Pengurus Barang
            </label>
            <input
              type="text"
              required
              placeholder="Ketik nama lengkap Anda"
              value={validatorName}
              onChange={(e) => setValidatorName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>

          {/* File Upload Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600">
              Lampirkan Foto Serah Terima Fisik <span className="text-rose-500">*</span>
            </label>

            {photo ? (
              <div className="relative border border-slate-200 rounded-xl overflow-hidden group bg-slate-50">
                <img src={photo} alt="Preview serah terima" className="w-full h-40 object-cover" />
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  className="absolute top-2 right-2 p-1.5 bg-slate-900/70 hover:bg-slate-900/90 text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="absolute bottom-0 inset-x-0 bg-slate-900/60 backdrop-blur-xs text-white px-3 py-1 text-[10px] flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-400" />
                    Gambar terunggah
                  </span>
                  <button
                    type="button"
                    onClick={triggerFileInput}
                    className="underline hover:text-slate-200 cursor-pointer"
                  >
                    Ubah Foto
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileInput}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
                  dragActive
                    ? "border-indigo-500 bg-indigo-50/30"
                    : "border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50"
                }`}
              >
                <Upload className="w-8 h-8 text-slate-400" />
                <div>
                  <p className="text-xs font-semibold text-slate-700">
                    Tarik gambar ke sini, atau <span className="text-indigo-600 underline">klik untuk unggah</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Mendukung format PNG, JPG, JPEG (Maks. 5MB)
                  </p>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleChange}
              className="hidden"
            />
          </div>

          {/* Verification Notes */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              <label className="block text-xs font-semibold text-slate-600">
                Catatan Penyerahan (Opsional)
              </label>
            </div>
            <textarea
              rows={2}
              placeholder="Contoh: Barang diserahkan dalam kondisi tersegel..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 resize-none"
            />
          </div>

          <div className="flex gap-2 p-3 bg-amber-50 text-[10px] text-amber-800 rounded-xl border border-amber-100">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <p className="leading-relaxed font-medium">
              Aksi validasi ini bersifat final. Permintaan akan langsung bertanda{" "}
              <strong>Selesai</strong> dan tercatat permanen di sistem dan Google Sheets.
            </p>
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!photo || !validatorName.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Selesaikan Penyerahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
