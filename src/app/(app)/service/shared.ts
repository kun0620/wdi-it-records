export type ServiceRow = {
  id: number;
  req_no: string;
  req_date: string;
  req_time: string | null;
  requester: string;
  dept: string | null;
  type: string;
  system: string | null;
  detail: string | null;
  priority: "P1" | "P2" | "P3" | "P4";
  action: string | null;
  status: string;
  close_date: string | null;
  close_time: string | null;
  hours: number | null;
  escalation: string | null;
  esc_ref: string | null;
  updated_at: string;
  asset_id: number | null;
  asset_tag?: string | null;      // from it.service_log_v
};

export const SERVICE_LISTS = ["status", "priority", "type", "system", "dept", "user", "escalation"];
export const OPEN_STATUSES = ["Open", "In Progress", "Waiting HQ/Vendor"];

export const STATUS_TONE: Record<string, string> = {
  Open: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100",
  "In Progress": "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  "Waiting HQ/Vendor": "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  Closed: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-100",
  Cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};

export const PRIORITY_TONE: Record<string, string> = {
  P1: "bg-red-600 text-white",
  P2: "bg-amber-500 text-white",
  P3: "bg-blue-600 text-white",
  P4: "bg-gray-400 text-white",
};

// Daily-check item -> Service Log "system" when opening an incident from an NG.
export const CHECK_SYSTEM: Record<string, string> = {
  firewall: "WatchGuard",
  wan: "Network/LAN",
  vpn: "VPN",
  core_switch: "Network/LAN",
  wifi: "Wi-Fi",
  cctv: "Dahua NVR",
  ups: "Other",
};
