// Core types for the Water Tanker Booking App

/**
 * User role types in the system
 */
export type UserRole = 'customer' | 'driver' | 'admin';

/**
 * Address information for deliveries and user saved addresses
 */
export interface Address {
  id?: string;
  address: string; // Single address field containing full address
  latitude: number;
  longitude: number;
  isDefault?: boolean;
}

/**
 * Base user properties shared across all user roles
 * Email is the primary identifier for authentication
 */
interface BaseUser {
  id: string;
  email: string; // Required: primary identifier for authentication
  password: string; // hashed
  name: string;
  phone?: string; // Optional: kept for contact purposes
  createdAt: Date;
}

/**
 * Customer-specific user properties
 */
export interface CustomerUser extends BaseUser {
  role: 'customer';
  savedAddresses?: Address[];
}

/**
 * Driver-specific user properties
 */
export interface DriverUser extends BaseUser {
  role: 'driver';
  vehicleNumber?: string;
  licenseNumber?: string;
  licenseExpiry?: Date;
  driverLicenseImage?: string;
  vehicleRegistrationImage?: string;
  totalEarnings?: number;
  completedOrders?: number;
  createdByAdmin?: boolean; // Track if driver was created by admin
  createdByAdminId?: string; // User ID of the admin who created this driver (scopes visibility)
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

/**
 * Admin-specific user properties
 */
export interface AdminUser extends BaseUser {
  role: 'admin';
  businessName?: string;
}

/**
 * Discriminated union type for all user roles
 * Use type guards (isCustomerUser, isDriverUser, isAdminUser) to narrow the type
 */
export type User = CustomerUser | DriverUser | AdminUser;

/**
 * Booking status values
 */
export type BookingStatus = 'pending' | 'accepted' | 'in_transit' | 'delivered' | 'cancelled';

/**
 * Booking entity representing a water tanker delivery order
 */
export interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  // Optional agency information for the booking
  agencyId?: string;
  agencyName?: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  status: BookingStatus;
  tankerSize: number; // in liters
  quantity?: number; // number of tankers (defaults to 1 if not provided)
  basePrice: number;
  distanceCharge: number;
  totalPrice: number;
  deliveryAddress: Address;
  distance: number; // in km
  scheduledFor?: Date; // scheduled delivery date/time
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentId?: string;
  cancellationReason?: string;
  canCancel: boolean; // false once driver accepts
  createdAt: Date;
  updatedAt: Date;
  acceptedAt?: Date;
  deliveredAt?: Date;
}

/**
 * Tanker size configuration with pricing
 */
export interface TankerSize {
  id: string;
  size: number; // in liters
  basePrice: number;
  isActive: boolean;
  displayName: string; // e.g., "1000 Liters", "Small Tanker"
}

/**
 * Pricing configuration for distance-based charges
 */
export interface Pricing {
  pricePerKm: number;
  minimumCharge: number;
  updatedAt: Date;
  updatedBy: string; // admin id
}

/**
 * Driver application/registration request
 */
export interface DriverApplication {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicleNumber: string;
  licenseNumber: string;
  driverLicenseImage: string;
  vehicleRegistrationImage: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: Date;
  reviewedBy?: string; // admin id
  reviewedAt?: Date;
  rejectionReason?: string;
}

/**
 * Vehicle information managed by admin agencies
 */
export interface Vehicle {
  id: string;
  agencyId: string; // Admin user id (agency)
  vehicleNumber: string;
  insuranceCompanyName: string;
  insuranceExpiryDate: Date;
  vehicleCapacity: number; // in liters
  amount?: number; // in rupees (optional - set by driver at delivery time)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Bank account information for admin
 */
export interface BankAccount {
  id: string;
  adminId: string; // ID of the admin user who owns this bank account
  bankName: string; // Name of the bank
  qrCodeImageUrl: string; // URL of the QR code image for payment collection
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Expense type values
 */
export type ExpenseType = 'diesel' | 'maintenance';

/**
 * Expense entity for tracking admin expenses
 */
export interface Expense {
  id: string;
  adminId: string; // ID of the admin user who owns this expense
  expenseType: ExpenseType; // Type of expense: diesel or maintenance
  amount: number; // Expense amount in rupees
  description?: string; // Optional description of the expense
  expenseDate: Date; // Date when the expense occurred
  receiptImageUrl?: string; // Optional URL of the receipt image
  createdAt: Date;
  updatedAt: Date;
}

// Navigation types
/**
 * Authentication stack navigation parameters
 */
export interface AuthStackParamList {
  RoleEntry: undefined;
  Login: { preferredRole?: UserRole } | undefined;
  Register: { preferredRole?: UserRole } | undefined;
  [key: string]:
    | undefined
    | { preferredRole?: UserRole };
}

// Customer navigation types moved to CustomerNavigator.tsx

export interface DriverTabParamList {
  Orders: undefined;
  Earnings: undefined;
}

export interface DriverStackParamList {
  DriverTabs: undefined;
  CollectPayment: { orderId: string };
}

// AdminStackParamList is now exported from AdminNavigator.tsx

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

/**
 * User registration form data
 */
export interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  role: UserRole;
  phone: string; // Required: for contact purposes
  businessName?: string; // Optional: for admin registration
}

export interface BookingForm {
  tankerSize: number;
  deliveryAddress: Address;
  scheduledFor?: Date;
  specialInstructions?: string;
}

export interface AddressForm {
  address: string; // Single address field containing full address
  latitude: number;
  longitude: number;
  isDefault?: boolean;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: unknown;
}

// Location types
export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface DistanceResult {
  distance: number; // in kilometers
  duration?: number; // in minutes (if available)
}

// Payment types
export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  error?: string;
}

// Analytics types
export interface DashboardStats {
  totalBookings: number;
  pendingBookings: number;
  completedBookings: number;
  totalRevenue: number;
  activeDrivers: number;
  totalCustomers: number;
}

export interface DriverEarnings {
  driverId: string;
  driverName: string;
  totalEarnings: number;
  completedOrders: number;
  averageEarningPerOrder: number;
  period: 'daily' | 'weekly' | 'monthly';
}

// Driver Dashboard specific types
export interface DriverDashboardStats {
  totalEarnings: number;
  completedOrders: number;
  pendingOrders: number;
  activeOrders: number;
  todayEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  averageRating: number;
  totalRatings: number;
  isOnline: boolean;
  lastActiveAt: Date;
}

export interface DriverQuickAction {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  onPress: () => void;
}

export interface DriverRecentOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  tankerSize: number;
  totalPrice: number;
  status: BookingStatus;
  deliveryAddress: string;
  distance: number;
  createdAt: Date;
  scheduledFor?: Date;
}

// Reports and Analytics types
export interface ReportData {
  totalBookings: number;
  totalRevenue: number;
  completedBookings: number;
  cancelledBookings: number;
  pendingBookings: number;
  activeDrivers: number;
  totalCustomers: number;
  averageOrderValue: number;
  topDrivers: Array<{
    name: string;
    earnings: number;
    orders: number;
  }>;
  topCustomers: Array<{
    name: string;
    orders: number;
    totalSpent: number;
  }>;
  bookingsByStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
  }>;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    data: number[];
    color?: string;
    label?: string;
  }>;
}

// ============================================================================
// Type Guards and Utility Types
// ============================================================================

/**
 * Type guard to check if a user is a CustomerUser
 * @param user - The user to check
 * @returns True if the user is a CustomerUser
 */
export function isCustomerUser(user: User): user is CustomerUser {
  return user.role === 'customer';
}

/**
 * Type guard to check if a user is a DriverUser
 * @param user - The user to check
 * @returns True if the user is a DriverUser
 */
export function isDriverUser(user: User): user is DriverUser {
  return user.role === 'driver';
}

/**
 * Type guard to check if a user is an AdminUser
 * @param user - The user to check
 * @returns True if the user is an AdminUser
 */
export function isAdminUser(user: User): user is AdminUser {
  return user.role === 'admin';
}

/**
 * Utility type to extract user type by role
 */
export type UserByRole<T extends UserRole> = T extends 'customer'
  ? CustomerUser
  : T extends 'driver'
  ? DriverUser
  : T extends 'admin'
  ? AdminUser
  : never;

/**
 * Utility type to get role-specific properties from a user
 */
export type UserRoleProperties<T extends UserRole> = Omit<UserByRole<T>, keyof BaseUser>;

/**
 * Helper type for filtering users by role
 */
export type UsersByRole<T extends UserRole> = UserByRole<T>[];