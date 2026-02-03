export {};

// Create a type for the Roles
export type Roles = "admin" | "hotel_owner" | "hotel_staff";

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: Roles;
    };
  }
}
