"""
Flask Authentication Middleware for EOM Dashboard.

Provides decorators for route-level authentication and authorization:
  @require_auth          — Validates Azure AD JWT token, populates g.current_user
  @require_bu_manager    — Requires bu_access or full_access role
  @require_settings_admin — Requires Settings Admin group or full_access

In development mode (EOM_DEV_MODE=1), auth is bypassed with a mock full_access user.
"""
import os
from functools import wraps
from flask import request, jsonify, g
from jose import JWTError


# ── Development Mode ──────────────────────────────────────────────────────────
DEV_MODE = os.environ.get('EOM_DEV_MODE', '0') == '1'


class EomUser:
    """Represents an authenticated EOM Dashboard user."""

    def __init__(self, email, name, role, branch_names, business_units,
                 is_bu_manager=False, is_neg_movement_elevated=False,
                 is_settings_admin=False, can_access_ops_manager=False,
                 can_upload_data=False, can_edit_settings=False):
        self.email = email
        self.name = name
        self.role = role
        self.branch_names = branch_names or []
        self.business_units = business_units or []
        self.is_bu_manager = is_bu_manager
        self.is_neg_movement_elevated = is_neg_movement_elevated
        self.is_settings_admin = is_settings_admin
        self.can_access_ops_manager = can_access_ops_manager
        self.can_upload_data = can_upload_data
        self.can_edit_settings = can_edit_settings

    def get_allowed_branches(self):
        """
        Returns the list of branch names this user is allowed to see.
        For full_access users, returns None (no restriction).
        For branch_access / bu_access users, returns their branch_names.
        """
        if self.role == 'full_access':
            return None  # No restriction
        return self.branch_names if self.branch_names else []

    def get_neg_movement_branches(self):
        """
        Returns the branch scope for Negative Movement.
        Elevated users see all branches (returns None).
        Others see only their own branches.
        """
        if self.role == 'full_access' or self.is_neg_movement_elevated:
            return None  # No restriction
        return self.branch_names if self.branch_names else []

    def to_dict(self):
        """Serialize user info for the /api/me endpoint."""
        return {
            'email': self.email,
            'name': self.name,
            'role': self.role,
            'branch_names': self.branch_names,
            'business_units': self.business_units,
            'is_bu_manager': self.is_bu_manager,
            'is_neg_movement_elevated': self.is_neg_movement_elevated,
            'is_settings_admin': self.is_settings_admin,
            'can_access_ops_manager': self.can_access_ops_manager,
            'can_upload_data': self.can_upload_data,
            'can_edit_settings': self.can_edit_settings,
        }


def _get_dev_user():
    """Return a mock full_access user for development."""
    return EomUser(
        email='dev@aaw.com.au',
        name='Dev User',
        role='full_access',
        branch_names=[],
        business_units=[],
        is_bu_manager=True,
        is_neg_movement_elevated=True,
        is_settings_admin=True,
        can_access_ops_manager=True,
        can_upload_data=True,
        can_edit_settings=True,
    )


def _resolve_user_from_token():
    """
    Extract and validate the Azure AD token from the Authorization header.
    Returns an EomUser on success, or (error_response, status_code) on failure.
    """
    auth_header = request.headers.get('Authorization', '')

    if not auth_header.startswith('Bearer '):
        if not STRICT_AUTH:
            # Fallback to dev/demo full_access user if strict auth is not enforced
            return _get_dev_user()
        return jsonify({'error': 'Missing or invalid Authorization header'}), 401

    token = auth_header[7:]  # Strip 'Bearer '

    try:
        from app.core.azure_auth import validate_azure_token, resolve_eom_role

        claims = validate_azure_token(token)
        email = claims.get('preferred_username') or claims.get('email') or claims.get('upn', '')
        name = claims.get('name', email)
        group_ids = claims.get('groups', [])

        # Resolve role from AD group memberships in the token
        resolved = resolve_eom_role(group_ids)

        # If token had no groups (groupMembershipClaims not configured),
        # fall back to frontend-supplied headers (same pattern as R&C Hub)
        if resolved['role'] == 'no_access' and not group_ids:
            header_role = request.headers.get('X-User-Role', '')
            header_branches = request.headers.get('X-User-Branches', '')
            header_bu = request.headers.get('X-User-BU', '')

            if header_role and header_role != 'no_access':
                print(f"[Auth] No groups in token; using frontend-resolved role: {header_role}")
                resolved['role'] = header_role
                if header_branches:
                    resolved['branch_names'] = [b.strip() for b in header_branches.split(',') if b.strip()]
                if header_bu:
                    resolved['business_units'] = [b.strip() for b in header_bu.split(',') if b.strip()]
                # Re-derive capabilities
                resolved['can_access_ops_manager'] = resolved['role'] in ('full_access', 'bu_access')
                resolved['can_upload_data'] = resolved['role'] in ('full_access', 'bu_access')
                resolved['can_edit_settings'] = resolved['role'] == 'full_access' or resolved.get('is_settings_admin', False)

        # If after token validation & fallback, user still has no_access and strict auth is disabled, allow dev fallback
        if resolved['role'] == 'no_access' and not STRICT_AUTH:
            return _get_dev_user()

        return EomUser(
            email=email,
            name=name,
            role=resolved['role'],
            branch_names=resolved['branch_names'],
            business_units=resolved['business_units'],
            is_bu_manager=resolved.get('is_bu_manager', False),
            is_neg_movement_elevated=resolved.get('is_neg_movement_elevated', False),
            is_settings_admin=resolved.get('is_settings_admin', False),
            can_access_ops_manager=resolved.get('can_access_ops_manager', False),
            can_upload_data=resolved.get('can_upload_data', False),
            can_edit_settings=resolved.get('can_edit_settings', False),
        )

    except JWTError as e:
        print(f"[Auth] Azure AD token validation failed: {e}")
        if not STRICT_AUTH:
            return _get_dev_user()
        return jsonify({'error': 'Invalid or expired token'}), 401
    except Exception as e:
        print(f"[Auth] Unexpected error validating token: {e}")
        if not STRICT_AUTH:
            return _get_dev_user()
        return jsonify({'error': 'Authentication failed'}), 401


def require_auth(f):
    """
    Decorator: Requires a valid Azure AD token.
    Populates g.current_user with an EomUser object.

    In DEV_MODE, bypasses auth and uses a mock full_access user.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        if DEV_MODE:
            g.current_user = _get_dev_user()
            return f(*args, **kwargs)

        result = _resolve_user_from_token()
        if isinstance(result, tuple):
            # Error response
            return result

        if result.role == 'no_access':
            return jsonify({'error': 'Access denied. You are not assigned to any branch or role.'}), 403

        g.current_user = result
        return f(*args, **kwargs)

    return decorated


def require_bu_manager(f):
    """
    Decorator: Requires bu_access or full_access role.
    Used for: Ops Manager, Upload Data routes.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        if DEV_MODE:
            g.current_user = _get_dev_user()
            return f(*args, **kwargs)

        result = _resolve_user_from_token()
        if isinstance(result, tuple):
            return result

        if result.role not in ('full_access', 'bu_access'):
            return jsonify({
                'error': 'Access denied. This section requires Branch Manager or Operations Manager permissions.'
            }), 403

        g.current_user = result
        return f(*args, **kwargs)

    return decorated


def require_settings_admin(f):
    """
    Decorator: Requires Settings Admin group or full_access.
    Used for: Settings & Legend edit operations.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        if DEV_MODE:
            g.current_user = _get_dev_user()
            return f(*args, **kwargs)

        result = _resolve_user_from_token()
        if isinstance(result, tuple):
            return result

        if not result.can_edit_settings:
            return jsonify({
                'error': 'Access denied. Only designated administrators can modify settings.'
            }), 403

        g.current_user = result
        return f(*args, **kwargs)

    return decorated


def get_scoped_branches(user, ui_branches=None):
    """
    Intersect the user's allowed branches with any UI-selected branch filter.

    If user is full_access → return ui_branches as-is (or None for all).
    If user has branch restrictions → intersect with UI selection.
    """
    allowed = user.get_allowed_branches()

    if allowed is None:
        # Full access — respect the UI filter or show all
        return ui_branches

    if not ui_branches:
        # No UI filter — use user's allowed branches
        return allowed

    # Intersect: only show branches that are both allowed AND selected
    return [b for b in ui_branches if b in allowed]
