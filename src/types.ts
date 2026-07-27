export enum RequestStatus {
  PENDING_RECEIPT = "PENDING_RECEIPT", // Menunggu Penerimaan oleh Pengurus Barang
  PENDING_APPROVAL = "PENDING_APPROVAL", // Menunggu Persetujuan Kasubag TU
  PENDING_VALIDATION = "PENDING_VALIDATION", // Menunggu Validasi Bagian Gudang
  VALIDATED = "VALIDATED", // Selesai / Divalidasi Gudang
  REJECTED = "REJECTED" // Ditolak oleh Kasubag TU
}

export interface InventoryRequest {
  id: string;
  requesterName: string;
  requesterRole: string;
  requesterNrk?: string;
  itemName: string;
  quantity: number;
  unit: string;
  purpose: string;
  requestDate: string;
  status: RequestStatus;
  notes?: string;
  photoUrl?: string; // Base64 image uploaded by Gudang
  
  // Workflow logs
  receivedBy?: string;
  receivedDate?: string;
  approvedBy?: string;
  approvedDate?: string;
  validatedBy?: string;
  validatedDate?: string;
}

export interface AppConfig {
  gasUrl: string;
  isDemoMode: boolean;
}
