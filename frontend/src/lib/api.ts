const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** FastAPI's `detail` is a string for our own HTTPExceptions, but an array of
 * {msg, loc, ...} objects for pydantic validation (422) errors. */
function extractErrorMessage(body: unknown): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => (item as { msg?: string })?.msg)
      .filter((msg): msg is string => Boolean(msg));
    if (messages.length > 0) return messages.join("، ");
  }
  return "حصل خطأ، حاول تاني";
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
    throw new ApiError(extractErrorMessage(body), res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
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

export function deleteVehicle(vehicleId: number) {
  return api.delete<{ message: string }>(`/vehicles/${vehicleId}`);
}

export interface Me {
  id: number;
  phone: string;
  name: string | null;
  email: string | null;
  role: AuthRole;
}

export function getMe() {
  return api.get<Me>("/auth/me");
}

export function updateMe(data: { name?: string; email?: string }) {
  return api.patch<Me>("/auth/me", data);
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
  access_code: string | null;
  total_price: number;
  total_minutes: number;
}

export interface BookingDetail extends Booking {
  wash_name: string;
  wash_address: string;
  vehicle_label: string | null;
  rated: boolean;
}

export function createBooking(data: {
  wash_id: number;
  appointment_time: string;
  vehicle_id?: number;
  service_ids?: number[];
}) {
  return api.post<Booking>("/bookings/", data);
}

export function joinWaitlist(washId: number, appointmentTimeIso: string) {
  return api.post<{ message: string; id: number }>("/waitlist/", {
    wash_id: washId,
    appointment_time: appointmentTimeIso,
  });
}

export function myBookings() {
  return api.get<BookingDetail[]>("/bookings/my");
}

export function cancelBooking(bookingId: number) {
  return api.patch<Booking>(`/bookings/${bookingId}/status`, { status: "cancelled" });
}

export interface Rating {
  id: number;
  booking_id: number;
  wash_id: number;
  stars: number;
  comment: string | null;
  created_at: string;
}

export function rateBooking(bookingId: number, data: { stars: number; comment?: string }) {
  return api.post<Rating>(`/bookings/${bookingId}/rate`, data);
}

export function todayBookings() {
  return api.get<BookingDetail[]>("/bookings/today");
}

export function checkinBooking(bookingId: number, accessCode: string) {
  return api.post<Booking>(`/bookings/${bookingId}/checkin`, { access_code: accessCode });
}

export function createService(washId: number | string, data: {
  name: string;
  description?: string;
  price: number;
  duration_minutes: number;
  vehicle_type?: string;
}) {
  return api.post<Service>(`/washes/${washId}/services`, data);
}

export function listServicesForOwner(washId: number | string) {
  return api.get<Service[]>(`/washes/${washId}/services/manage`);
}

export function toggleService(washId: number | string, serviceId: number) {
  return api.patch<Service>(`/washes/${washId}/services/${serviceId}/toggle`, {});
}

export function myWash() {
  return api.get<Wash[]>("/washes/my");
}

export interface MyRevenue {
  wash_name: string;
  commission_percent: number;
  completed_bookings: number;
  upcoming_bookings: number;
  gross_revenue: number;
  commission_due: number;
  net_revenue: number;
}

export function myRevenue() {
  return api.get<MyRevenue>("/admin/my-revenue");
}

export interface StaffMember {
  id: number;
  phone: string;
  name: string | null;
  role: "employee" | "supervisor";
  is_active: boolean;
}

export function myEmployees() {
  return api.get<StaffMember[]>("/admin/my-employees");
}

export function addEmployee(data: { phone: string; name?: string; role: "employee" | "supervisor" }) {
  return api.post<{ message: string }>("/admin/add-employee", data);
}

export function removeEmployee(userId: number) {
  return api.delete<{ message: string }>(`/admin/remove-employee/${userId}`);
}

export function washBookings() {
  return api.get<BookingDetail[]>("/admin/my-bookings");
}

export interface LeaveRequestItem {
  id: number;
  employee_id: number;
  date: string;
  reason: string;
  status: string;
}

export function pendingLeaves() {
  return api.get<LeaveRequestItem[]>("/leave/pending");
}

export function respondLeave(leaveId: number, status: "approved" | "rejected") {
  return api.patch<{ message: string; status: string }>(`/leave/${leaveId}/respond?status=${status}`, {});
}

export function requestLeave(data: { date: string; reason: string }) {
  return api.post<LeaveRequestItem>("/leave/request", data);
}

export function myLeaves() {
  return api.get<LeaveRequestItem[]>("/leave/my");
}

export interface AdminWash {
  id: number;
  name: string;
  address: string;
  phone: string;
  is_active: boolean;
  is_open_now: boolean;
  opening_time: string;
  closing_time: string;
  commission_percent: number;
}

export function allWashes() {
  return api.get<AdminWash[]>("/admin/washes");
}

export function toggleWash(washId: number) {
  return api.patch<{ message: string; is_active: boolean }>(`/admin/washes/${washId}/toggle`, {});
}

export interface AdminUser {
  id: number;
  phone: string;
  name: string | null;
  role: AuthRole;
  is_active: boolean;
}

export function allUsers() {
  return api.get<AdminUser[]>("/admin/users");
}

export function toggleUser(userId: number) {
  return api.patch<{ message: string; is_active: boolean }>(`/admin/users/${userId}/toggle`, {});
}

export interface NetworkRevenue {
  total_commission_due: number;
  washes: {
    wash_id: number;
    wash_name: string;
    completed_bookings: number;
    total_revenue: number;
    commission_percent: number;
    commission_due: number;
  }[];
}

export function networkRevenue() {
  return api.get<NetworkRevenue>("/admin/revenue");
}

export const ROLE_HOME: Record<AuthRole, string> = {
  customer: "/",
  employee: "/employee",
  supervisor: "/supervisor",
  owner: "/owner",
  super_admin: "/admin",
};
