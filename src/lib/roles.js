export const USER_ROLES = {
  ADMIN: 'admin',
  ENTERPRISE: 'enterprise',
  GENERAL: 'general',
  PENDING: 'pending'
};

export function resolveRole(profileData) {
  if (profileData?.role === USER_ROLES.ADMIN) {
    return USER_ROLES.ADMIN;
  }
  if (profileData?.role === USER_ROLES.ENTERPRISE) {
    return USER_ROLES.ENTERPRISE;
  }
  if (profileData?.role === USER_ROLES.GENERAL) {
    return USER_ROLES.GENERAL;
  }
  if (profileData?.role === USER_ROLES.PENDING) {
    // Legacy pending users are treated as enterprise after approval flow removal.
    return USER_ROLES.ENTERPRISE;
  }
  return USER_ROLES.GENERAL;
}

export function roleLabel(role) {
  if (role === USER_ROLES.ADMIN) return '관리자';
  if (role === USER_ROLES.ENTERPRISE) return '기업 회원';
  if (role === USER_ROLES.GENERAL) return '일반 회원';
  if (role === USER_ROLES.PENDING) return '기업 회원';
  return '일반 회원';
}

export function canLogin(role) {
  return role === USER_ROLES.ADMIN || role === USER_ROLES.ENTERPRISE || role === USER_ROLES.GENERAL || role === USER_ROLES.PENDING;
}

export function canViewWholesalePrice(role) {
  return role === USER_ROLES.ADMIN || role === USER_ROLES.ENTERPRISE;
}

export function canUseQuoteFeatures(role) {
  return role === USER_ROLES.ADMIN || role === USER_ROLES.ENTERPRISE;
}
