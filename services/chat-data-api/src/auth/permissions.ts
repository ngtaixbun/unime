export const applicationPermissions = Object.freeze({
  coverageStoreNationwideRead: "coverage_store:nationwide:read",
  coverageEmployeeNationwideRead: "coverage_employee:nationwide:read",
} as const);

export type ApplicationPermission = typeof applicationPermissions[keyof typeof applicationPermissions];

export const allApplicationPermissions = Object.freeze(
  Object.values(applicationPermissions) as readonly ApplicationPermission[],
);

export function isApplicationPermission(value: string): value is ApplicationPermission {
  return (allApplicationPermissions as readonly string[]).includes(value);
}
