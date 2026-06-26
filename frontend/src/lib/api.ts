const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.detail ?? "حصل خطأ، حاول تاني", res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
};

export type AuthRole = "customer" | "employee" | "supervisor" | "owner" | "super_admin";

export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: AuthRole;
  name: string | null;
}

export interface Wash {
  id: number;
  name: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  logo_url: string | null;
  rating: number;
  opening_time: string;
  closing_time: string;
  is_active: boolean;
  is_open_now: boolean;
}

export function sendOtp(phone: string) {
  return api.post<{ message: string }>("/auth/send-otp", { phone });
}

export function verifyOtp(phone: string, otp: string, name?: string) {
  return api.post<TokenResponse>("/auth/verify-otp", { phone, otp, name });
}

export interface Service {
  id: number;
  wash_id: number;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  vehicle_type: string;
  is_active: boolean;
}

export function listWashes() {
  return api.get<Wash[]>("/washes/");
}

export function getWash(washId: number | string) {
  return api.get<Wash>(`/washes/${washId}`);
}

export function listServices(washId: number | string) {
  return api.get<Service[]>(`/washes/${washId}/services`);
}

export interface Vehicle {
  id: number;
  customer_id: number;
  brand: string;
  model: string;
  year: number;
  plate_number: string;
  color: string | null;
}

export function listVehicles() {
  return api.get<Vehicle[]>("/vehicles/");
}

export function createVehicle(data: {
  brand: string;
  model: string;
  year: number;
  plate_number: string;
  color?: string;
}) {
  return api.post<Vehicle>("/vehicles/", data);
}

export interface Availability {
  available: boolean;
  booked: number;
  capacity: number;
}

export function checkAvailability(washId: number | string, appointmentTimeIso: string) {
  const params = new URLSearchParams({ wash_id: String(washId), appointment_time: appointmentTimeIso });
  return api.get<Availability>(`/bookings/availability?${params.toString()}`);
}

export type BookingStatus = "confirmed" | "checked_in" | "completed" | "no_show" | "cancelled";

export interface Booking {
  id: number;
  customer_id: number;
  wash_id: number;
  appointment_time: string;
  status: BookingStatus;
  vehicle_id: number | null;
}

export function createBooking(data: { wash_id: number; appointment_time: string; vehicle_id?: number }) {
  return api.post<Booking>("/bookings/", data);
}

export function joinWaitlist(washId: number, appointmentTimeIso: string) {
  return api.post<{ message: string; id: number }>("/waitlist/", {
    wash_id: washId,
    appointment_time: appointmentTimeIso,
  });
}

export const ROLE_HOME: Record<AuthRole, string> = {
  customer: "/",
  employee: "/employee",
  supervisor: "/supervisor",
  owner: "/owner",
  super_admin: "/admin",
};
