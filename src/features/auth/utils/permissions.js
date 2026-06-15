export function hasPermission(permissions, permission) {
    return permissions.includes(permission);
}
export function hasRole(roles, roleName) {
    return roles.some((r) => r.name.toLowerCase() === roleName.toLowerCase());
}
export function hasAnyRole(roles, roleNames) {
    return roleNames.some((name) => hasRole(roles, name));
}
export function can(permissions, permission) {
    return hasPermission(permissions, permission);
}
export function canAll(permissions, required) {
    return required.every((p) => permissions.includes(p));
}
export function canAny(permissions, required) {
    return required.some((p) => permissions.includes(p));
}
