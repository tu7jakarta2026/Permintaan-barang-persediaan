import React, { useState, useEffect } from "react";
import { RequestStatus, InventoryRequest } from "../types";
import { PlusCircle, X, Check, FileText, User, HelpCircle, Package, Search, Tag, Hash, Calendar } from "lucide-react";
import { Employee } from "../lib/employees";
import { INVENTORY_ITEMS, InventoryItem } from "../lib/items";
import { fetchLiveItems } from "../lib/sheetsSync";

interface RequestFormProps {
  onAddRequest: (request: InventoryRequest | InventoryRequest[]) => void;
  isOpen: boolean;
  onClose: () => void;
  currentEmployee: Employee | null;
}

const INDONESIAN_ROLES = [
  "Guru Kelas 1",
  "Guru Kelas 2",
  "Guru Kelas 3",
  "Guru Kelas 4",
  "Guru Kelas 5",
  "Guru Kelas 6",
  "Guru Bidang Studi (Fisika/Kimia/dll)",
  "Staf Tata Usaha (TU)",
  "Staf Perpustakaan",
  "Staf Sarana Prasarana (Sarpras)",
  "Staf Ekstrakurikuler"
];

const ITEM_UNITS = ["Pcs", "Rim", "Kotak", "Botol", "Unit", "Buku", "Pak", "Lusin", "Meter"];

interface AddedItem {
  itemName: string;
  quantity: number;
  unit: string;
  code?: string;
  brands?: string[];
}

export default function RequestForm({ onAddRequest, isOpen, onClose, currentEmployee }: RequestFormProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState(INDONESIAN_ROLES[0]);
  const [customRole, setCustomRole] = useState("");
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState(ITEM_UNITS[0]);
  const [customUnit, setCustomUnit] = useState("");
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [requestDate, setRequestDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  // State for multiple added items
  const [addedItems, setAddedItems] = useState<AddedItem[]>([]);

  // Live synced items state with fallback
  const [items, setItems] = useState<InventoryItem[]>(INVENTORY_ITEMS);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [itemsSource, setItemsSource] = useState<string>("Bawaan Sistem");

  // Autocomplete states for spreadsheet items
  const [isOpenDropdown, setIsOpenDropdown] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Fetch live items on open
  useEffect(() => {
    if (isOpen) {
      setIsLoadingItems(true);
      fetchLiveItems()
        .then(resData => {
          if (resData && resData.success && Array.isArray(resData.data)) {
            setItems(resData.data);
            setItemsSource(resData.source || "Google Sheets (Live)");
          }
        })
        .catch(err => {
          console.error("Gagal mengambil daftar barang secara live:", err);
        })
        .finally(() => {
          setIsLoadingItems(false);
        });
    }
  }, [isOpen]);

  // Filter items based on query
  const filteredItems = items.filter(item => {
    if (!itemName.trim()) return false;
    const q = itemName.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q)
    );
  }).slice(0, 8);

  const handleSelectItem = (item: InventoryItem) => {
    setItemName(item.name);
    setSelectedItem(item);
    
    // Auto fill unit
    const stdUnit = item.unit || "";
    if (stdUnit) {
      const idx = ITEM_UNITS.findIndex(u => u.toLowerCase() === stdUnit.toLowerCase());
      if (idx !== -1) {
        setUnit(ITEM_UNITS[idx]);
        setIsCustomUnit(false);
      } else {
        setCustomUnit(stdUnit);
        setIsCustomUnit(true);
      }
    }
    setIsOpenDropdown(false);
  };

  const handleItemNameChange = (val: string) => {
    setItemName(val);
    setIsOpenDropdown(true);

    const match = items.find(item => item.name.toLowerCase() === val.toLowerCase());
    if (match) {
      setSelectedItem(match);
    } else {
      setSelectedItem(null);
    }
  };

  // Sync state with logged-in employee when modal opens
  useEffect(() => {
    if (isOpen) {
      setAddedItems([]); // Clear list on open
      if (currentEmployee) {
        setName(currentEmployee.name);
        setIsCustomRole(true);
        setCustomRole(currentEmployee.role || "Guru / Staf");
      } else {
        setName("");
        setIsCustomRole(false);
        setRole(INDONESIAN_ROLES[0]);
        setCustomRole("");
      }
    }
  }, [isOpen, currentEmployee]);

  const handleAddItemToList = () => {
    if (!itemName.trim()) {
      alert("Mohon pilih atau masukkan nama barang terlebih dahulu!");
      return;
    }
    if (quantity < 1) {
      alert("Jumlah barang minimal 1!");
      return;
    }

    const itemUnit = isCustomUnit ? customUnit : unit;

    // Check for duplicates
    const isDuplicate = addedItems.some(
      (item) => item.itemName.toLowerCase() === itemName.trim().toLowerCase()
    );
    if (isDuplicate) {
      alert("Barang ini sudah ada di dalam daftar pengajuan Anda!");
      return;
    }

    const newItem: AddedItem = {
      itemName: itemName.trim(),
      quantity: Number(quantity),
      unit: itemUnit,
      code: selectedItem?.code,
      brands: selectedItem?.brands
    };

    setAddedItems([...addedItems, newItem]);

    // Reset single item inputs
    setItemName("");
    setQuantity(1);
    setSelectedItem(null);
    setIsOpenDropdown(false);
  };

  const handleRemoveItemFromList = (indexToRemove: number) => {
    setAddedItems(addedItems.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !purpose.trim()) {
      alert("Mohon lengkapi nama pemohon dan alasan keperluan!");
      return;
    }

    let finalItems = [...addedItems];

    // If list is empty but they typed an item, auto-add it (backward compatibility)
    if (finalItems.length === 0 && itemName.trim()) {
      const itemUnit = isCustomUnit ? customUnit : unit;
      finalItems.push({
        itemName: itemName.trim(),
        quantity: Number(quantity),
        unit: itemUnit,
        code: selectedItem?.code,
        brands: selectedItem?.brands
      });
    }

    if (finalItems.length === 0) {
      alert("Mohon tambahkan minimal 1 barang ke dalam daftar permintaan!");
      return;
    }

    // Generate requests for each item
    const baseRandom = Math.floor(100 + Math.random() * 900);
    const requestsToCreate: InventoryRequest[] = finalItems.map((item, index) => {
      const idSuffix = finalItems.length > 1 ? `-${index + 1}` : "";
      const uniqueId = `REQ-${baseRandom}${idSuffix}`;

      return {
        id: uniqueId,
        requesterName: name,
        requesterRole: isCustomRole ? customRole : role,
        requesterNrk: currentEmployee?.nrk || "",
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        purpose,
        requestDate: requestDate,
        status: RequestStatus.PENDING_RECEIPT,
      };
    });

    onAddRequest(requestsToCreate);
    
    // Reset form states
    setItemName("");
    setQuantity(1);
    setPurpose("");
    setAddedItems([]);
    setSelectedItem(null);
    setIsOpenDropdown(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full overflow-hidden transform transition-all animate-scale-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-display font-semibold text-slate-800">
                Formulir Permintaan Barang
              </h3>
              <p className="text-[10px] text-slate-400">
                Buat pengajuan kebutuhan barang persediaan sekolah
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Section: Pemohon */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1 space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-slate-600">
                  Nama Pemohon
                </label>
                {currentEmployee && (
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                    Sesuai NRK
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  required
                  disabled={!!currentEmployee}
                  placeholder="Nama Lengkap & Gelar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 ${
                    currentEmployee ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed font-medium" : ""
                  }`}
                />
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-slate-600">
                  Jabatan / Peran
                </label>
                {!currentEmployee && (
                  <button
                    type="button"
                    onClick={() => setIsCustomRole(!isCustomRole)}
                    className="text-[10px] text-indigo-600 hover:underline cursor-pointer"
                  >
                    {isCustomRole ? "Pilih Daftar" : "Ketik Manual"}
                  </button>
                )}
                {currentEmployee && (
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                    Terkunci
                  </span>
                )}
              </div>
              {isCustomRole ? (
                <input
                  type="text"
                  required
                  disabled={!!currentEmployee}
                  placeholder="Ketik Jabatan Anda"
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  className={`w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 ${
                    currentEmployee ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed font-medium" : ""
                  }`}
                />
              ) : (
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                >
                  {INDONESIAN_ROLES.map((r, i) => (
                    <option key={i} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Section: Tanggal Permintaan */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600">
              Tanggal Permintaan Barang
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
              </span>
              <input
                type="date"
                required
                value={requestDate}
                onChange={(e) => setRequestDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
              />
            </div>
          </div>

          {/* SECTION: INPUT BARANG */}
          <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/60 space-y-3.5">
            <span className="block text-[10px] font-bold tracking-wider uppercase text-slate-400">
              Langkah 1: Tambahkan Barang ke Daftar
            </span>

            {/* Sub-Section: Barang */}
            <div className="space-y-1.5 relative">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-slate-600">
                  Nama Barang Persediaan
                </label>
                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                  isLoadingItems
                    ? "text-blue-600 bg-blue-50 border-blue-200 animate-pulse"
                    : itemsSource.includes("Live")
                    ? "text-emerald-600 bg-emerald-50 border-emerald-200"
                    : "text-amber-600 bg-amber-50 border-amber-200"
                }`}>
                  {isLoadingItems 
                    ? "Mensinkronkan..." 
                    : `${items.length} Barang • ${itemsSource.includes("Live") ? "Live" : "Lokal"}`
                  }
                </span>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Package className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  placeholder="Cari atau ketik nama barang..."
                  value={itemName}
                  onChange={(e) => handleItemNameChange(e.target.value)}
                  onFocus={() => setIsOpenDropdown(true)}
                  onBlur={() => {
                    setTimeout(() => setIsOpenDropdown(false), 200);
                  }}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              {/* Suggestions Dropdown */}
              {isOpenDropdown && filteredItems.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-50 divide-y divide-slate-100 animate-fade-in">
                  {filteredItems.map((item, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelectItem(item)}
                      className="w-full text-left px-3.5 py-2 hover:bg-indigo-50/50 flex flex-col gap-0.5 transition-colors cursor-pointer"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-xs font-bold text-slate-800">
                          {item.name}
                        </span>
                        <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0 font-mono">
                          {item.unit}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1 font-mono text-slate-400">
                          <Hash className="w-3 h-3 shrink-0" />
                          {item.code}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Item Detail Feedback */}
              {selectedItem && (
                <div className="p-2.5 bg-emerald-50/75 border border-emerald-100 rounded-lg flex items-start gap-2 animate-fade-in">
                  <div className="w-5 h-5 bg-emerald-100 rounded-md flex items-center justify-center text-emerald-700 shrink-0 border border-emerald-200/50 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {selectedItem.name}
                    </p>
                    <div className="flex flex-wrap gap-x-2 mt-0.5 text-[9px] text-slate-500 font-medium">
                      <span className="font-mono bg-white px-1.5 py-0.2 rounded border border-emerald-200/40">
                        Kode: {selectedItem.code}
                      </span>
                      <span className="bg-white px-1.5 py-0.2 rounded border border-emerald-200/40">
                        Satuan: {selectedItem.unit}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sub-Section: Jumlah & Satuan */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600">
                  Jumlah
                </label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-slate-600">
                    Satuan
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomUnit(!isCustomUnit)}
                    className="text-[10px] text-indigo-600 hover:underline cursor-pointer"
                  >
                    {isCustomUnit ? "Pilih Daftar" : "Ketik Manual"}
                  </button>
                </div>
                {isCustomUnit ? (
                  <input
                    type="text"
                    placeholder="Ketik Satuan (pcs, kg, dll)"
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                ) : (
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {ITEM_UNITS.map((u, i) => (
                      <option key={i} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Add Item Button */}
            <button
              type="button"
              onClick={handleAddItemToList}
              className="w-full flex items-center justify-center gap-1.5 py-2 border border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-indigo-600 hover:text-indigo-700 text-xs font-semibold rounded-lg transition-all cursor-pointer bg-white"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              Tambahkan Barang ke Daftar
            </button>
          </div>

          {/* DISPLAY LIST OF ADDED ITEMS */}
          {addedItems.length > 0 && (
            <div className="space-y-1.5 animate-fade-in">
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Daftar Barang Permintaan Anda ({addedItems.length})
              </label>
              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-36 overflow-y-auto px-1">
                {addedItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {item.itemName}
                        </span>
                        {item.code && (
                          <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                            {item.code}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                        {item.quantity} {item.unit}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItemFromList(idx)}
                        className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title="Hapus barang"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Keperluan */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600">
              Alasan Keperluan / Tujuan Penggunaan
            </label>
            <textarea
              required
              rows={2}
              placeholder="Jelaskan kebutuhan penggunaan barang secara spesifik..."
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 resize-none"
            />
          </div>

          {/* Note Info */}
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] text-slate-500 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="leading-normal">
              Permintaan baru yang dibuat akan langsung masuk dengan status{" "}
              <strong className="text-slate-700">Menunggu Penerimaan</strong> dan
              harus disetujui bertahap oleh Pengurus Barang, Kasubag TU, serta Gudang.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Kirim Pengajuan {addedItems.length > 0 ? `(${addedItems.length} Barang)` : ""}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
