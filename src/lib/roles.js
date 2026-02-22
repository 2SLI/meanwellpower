export const USER_ROLES = {
  ADMIN: 'admin',
  PENDING: 'pending',
  ENTERPRISE: 'enterprise'
};

export function resolveRole(profileData) {
  if (profileData?.role === USER_ROLES.ADMIN) {
    return USER_ROLES.ADMIN;
  }
  if (profileData?.role === USER_ROLES.ENTERPRISE) {
    return USER_ROLES.ENTERPRISE;
  }
  if (profileData?.role === USER_ROLES.PENDING) {
    return USER_ROLES.PENDING;
  }
  if (profileData?.approved) {
    return USER_ROLES.ENTERPRISE;
  }
  return USER_ROLES.PENDING;
}

export function roleLabel(role) {
  if (role === USER_ROLES.ADMIN) return '관리자';
  if (role === USER_ROLES.ENTERPRISE) return '기업 회원';
  return '승인 대기중';
}

export function canLogin(role) {
  return role === USER_ROLES.ADMIN || role === USER_ROLES.ENTERPRISE || role === USER_ROLES.PENDING;
}

export function canViewWholesalePrice(role) {
  return role === USER_ROLES.ADMIN || role === USER_ROLES.ENTERPRISE;
}
