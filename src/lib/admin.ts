export const isAdminRole = (roles?: string[] | null) => {
  return Boolean(roles?.includes("admin"));
};
