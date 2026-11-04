// Shared, client-safe constants and labels.

export const CITY = "Coimbatore";

export const AREAS = [
  { name: "Peelamedu", pincode: "641004" },
  { name: "RS Puram", pincode: "641002" },
  { name: "Gandhipuram", pincode: "641012" },
  { name: "Saibaba Colony", pincode: "641011" },
  { name: "Race Course", pincode: "641018" },
  { name: "Singanallur", pincode: "641005" },
  { name: "Saravanampatti", pincode: "641035" },
  { name: "Vadavalli", pincode: "641041" },
] as const;

export const AREA_NAMES = AREAS.map((a) => a.name) as unknown as [string, ...string[]];

export const CONDITIONS = ["NEW", "LIKE_NEW", "GOOD", "FAIR"] as const;
export const CONDITION_LABEL: Record<(typeof CONDITIONS)[number], string> = {
  NEW: "New",
  LIKE_NEW: "Like new",
  GOOD: "Good",
  FAIR: "Fair",
};

export const LISTING_STATUS_LABEL = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  SOLD_OUT: "Sold out",
  SUSPENDED: "Suspended",
} as const;

export const BOOKING_STATUS_LABEL = {
  PENDING_PAYMENT: "Awaiting payment",
  REQUESTED: "Awaiting seller",
  CONFIRMED: "Confirmed",
  ACTIVE: "Active rental",
  RETURN_PENDING: "Return in progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REJECTED: "Declined by seller",
  PAYMENT_FAILED: "Payment failed",
} as const;

export const PURCHASE_STATUS_LABEL = {
  PENDING_PAYMENT: "Awaiting payment",
  PLACED: "Order placed",
  ACCEPTED: "Ready for handover",
  HANDED_OVER: "Handed over",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  PAYMENT_FAILED: "Payment failed",
} as const;

export const PAYMENT_STATUS_LABEL = {
  CREATED: "Created",
  PENDING: "Pending",
  SUCCESS: "Paid",
  FAILED: "Failed",
  REFUND_PENDING: "Refund pending",
  REFUNDED: "Refunded",
} as const;

export const VERIFICATION_LABEL = {
  NOT_SUBMITTED: "Not submitted",
  PENDING: "Under review",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
} as const;

export const DISPUTE_CATEGORY_LABEL = {
  CONDITION_MISMATCH: "Product condition mismatch",
  NOT_RECEIVED: "Product not received",
  NOT_RETURNED: "Product not returned",
  DAMAGE: "Damage",
  INCORRECT_LISTING: "Incorrect listing",
  PAYMENT_ISSUE: "Payment issue",
  REFUND_ISSUE: "Refund issue",
} as const;

export const DISPUTE_STATUS_LABEL = {
  OPEN: "Open",
  UNDER_REVIEW: "Under review",
  RESOLVED: "Resolved",
  REJECTED: "Closed — no action",
} as const;

export const POPULAR_SEARCHES = ["DSLR Camera", "Projector", "Bicycle", "Power Tools"];

export const SORT_OPTIONS = [
  { value: "relevance", label: "Most relevant" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
] as const;

export const DEMO_PASSWORD_HINT = "Borrowly@Demo2026";
