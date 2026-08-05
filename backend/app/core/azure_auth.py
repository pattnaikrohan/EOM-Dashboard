"""
Azure AD Token Validation & Group-Based Role Resolution for EOM Dashboard.

Validates Azure AD JWT tokens using Microsoft's JWKS endpoint and resolves
application roles from AD group memberships embedded in token claims.

Reuses existing AD groups from the Risk & Compliance Hub (Tiers 1, 3, 4)
and adds EOM-specific groups for Negative Movement Elevated and Settings Admin.

Tier 2 (functional department groups) are intentionally excluded per Joe's directive.
"""
import time
import requests
from jose import jwt, JWTError


# ── Azure AD Configuration ────────────────────────────────────────────────────
# EOM Dashboard app registration (separate from R&C Hub)
AZURE_AD_CLIENT_ID = 'baff8625-9a54-4a3e-861c-a924c6bb817c'
AZURE_AD_TENANT_ID = '9a3bb301-12fd-4106-a7f7-563f72cfdf69'
AZURE_AD_AUTHORITY = f'https://login.microsoftonline.com/{AZURE_AD_TENANT_ID}'
AZURE_AD_JWKS_URL = f'{AZURE_AD_AUTHORITY}/discovery/v2.0/keys'
AZURE_AD_ISSUER = f'https://login.microsoftonline.com/{AZURE_AD_TENANT_ID}/v2.0'


# ── JWKS Key Cache ────────────────────────────────────────────────────────────
_jwks_cache = {"keys": None, "expires_at": 0}
JWKS_CACHE_TTL = 86400  # 24 hours


def _get_jwks_keys():
    """Fetch and cache Microsoft's JWKS signing keys."""
    now = time.time()
    if _jwks_cache["keys"] and now < _jwks_cache["expires_at"]:
        return _jwks_cache["keys"]

    try:
        response = requests.get(AZURE_AD_JWKS_URL, timeout=10)
        response.raise_for_status()
        keys = response.json().get("keys", [])
        _jwks_cache["keys"] = keys
        _jwks_cache["expires_at"] = now + JWKS_CACHE_TTL
        return keys
    except Exception as e:
        print(f"[AzureAuth] Failed to fetch JWKS keys: {e}")
        # Return cached keys even if expired, as fallback
        if _jwks_cache["keys"]:
            return _jwks_cache["keys"]
        raise


def validate_azure_token(token: str) -> dict:
    """
    Validate an Azure AD JWT token.

    Returns the decoded token claims if valid.
    Raises JWTError if the token is invalid.
    """
    keys = _get_jwks_keys()

    # Try each key until one works (handles key rotation)
    for key in keys:
        try:
            claims = jwt.decode(
                token,
                key,
                algorithms=["RS256"],
                audience=AZURE_AD_CLIENT_ID,
                issuer=AZURE_AD_ISSUER,
                options={
                    "verify_exp": True,
                    "verify_aud": True,
                    "verify_iss": True,
                }
            )
            return claims
        except JWTError:
            continue

    raise JWTError("Token validation failed with all available keys")


# ══════════════════════════════════════════════════════════════════════════════
# AD GROUP → ROLE MAPPING
# ══════════════════════════════════════════════════════════════════════════════

# ── Tier 1: Full Access / Global Admin ────────────────────────────────────────
FULL_ACCESS_GROUP_ID = '893a070a-54ec-42fb-bdda-98066d3a7569'

# ── Tier 2: Functional Groups — INTENTIONALLY EXCLUDED ────────────────────────
# Per Joe (05/08): "For now, they can be excluded although this may change
# once we have the system embedded and learn new requirements."
# Risk & Compliance, People & Safety, IT & Security, Finance — not mapped.

# ── Tier 3: BU Manager Groups ────────────────────────────────────────────────
BU_MANAGER_GROUPS = {
    '38e4b0e2-ba59-4b60-8c61-8650509b1a70': 'BU Manager- AAW Group Holdings',
    '956cde96-2a25-4574-8e7b-fb0de9712c0d': 'BU Manager- AAW Global Logistics-AU',
    '5ba26317-0cfe-461a-a8ac-ee35ed50a7dc': 'BU Manager- AAW Global Logistics -NZ',
    '83c2912d-604a-4e3f-b79e-5500b040197d': 'BU Manager- Bulk Liquid Logistics',
    'e4fb09bd-ed76-4a1c-b964-396057c02de6': 'BU Manager- Hoyer Logistics Australia',
    '18444ce2-793a-485c-99d1-7d0a1073945d': 'BU Manager- Coastalbridge',
    '57b8fe69-df5e-441f-94ef-1adad5458d8e': 'BU Manager- PIL Logistics Australia',
}

# AD Group Name → Application Business Unit Name
BU_AD_TO_APP = {
    'BU Manager- AAW Group Holdings': 'AAW Group Holdings',
    'BU Manager- AAW Global Logistics-AU': 'AAW Global Logistics - AU',
    'BU Manager- AAW Global Logistics -NZ': 'AAW Global Logistics - NZ',
    'BU Manager- Bulk Liquid Logistics': 'AAW Bulk Liquid Logistics',
    'BU Manager- Hoyer Logistics Australia': 'Hoyer Logistics Australia',
    'BU Manager- Coastalbridge': 'Coastalbridge',
    'BU Manager- PIL Logistics Australia': 'Regional Shipping Services',
}

# ── Tier 4: Branch Groups ────────────────────────────────────────────────────
BRANCH_GROUPS = {
    # AAW Global Logistics - AU
    '7e72b9d7-0977-4d9f-83d0-f2c0f38beafb': 'AAW Global Logistics - Melbourne',
    '8e6d4f35-ec7f-4d9f-be44-f76bb4274d22': 'AAW Global Logistics - Sydney',
    'c98d0827-3c29-49cf-b466-fd6b3b4cd16b': 'AAW Global Logistics - Brisbane',
    '9f22fa97-0f1d-4136-89d8-8b9e4dc1ff2b': 'AAW Global Logistics - Adelaide',
    'fe5aecea-91c4-48ac-9038-f16edfd3cba6': 'AAW Global Logistics - Fremantle',
    'fa404616-cce0-4c8a-9e5d-a86919e4eac1': 'AAW Customs Brokerage',
    '99937019-ff28-4c3c-8de2-e5492638a233': 'AAW Project Logistics',
    # AAW Global Logistics - NZ
    'c14255e2-c4f0-459d-b889-f44938b0fd83': 'AAW Global Logistics - Auckland',
    # AAW Bulk Liquid Logistics
    'a960927f-14db-4632-ade6-56e9bc19213f': 'AAW Bulk Liquid Logistics Team',
    # Coastalbridge
    '6796ccfb-9ed2-484e-93b4-92c5d289c3a1': 'Coastalbridge',
    # PIL / Regional Shipping Services
    'c65d09a2-1b50-4adc-903b-4dc5da9dfa92': 'PIL Logistics Australia',

    # ── New branch groups (pending IT creation — replace placeholders) ────
    # TODO: Replace these placeholder UUIDs with actual Object IDs from IT
    'PLACEHOLDER-HOYER-BRANCH-GROUP-ID': 'Hoyer Logistics Australia',
    'PLACEHOLDER-CB-AGENCIES-BRANCH-GROUP-ID': 'Coastalbridge Agencies',
    'PLACEHOLDER-RSS-BRANCH-GROUP-ID': 'Regional Shipping Services',
}

# ── Branch → Business Unit Lookup ────────────────────────────────────────────
BRANCH_TO_BU = {
    'AAW Global Logistics - Melbourne': 'AAW Global Logistics - AU',
    'AAW Global Logistics - Sydney': 'AAW Global Logistics - AU',
    'AAW Global Logistics - Brisbane': 'AAW Global Logistics - AU',
    'AAW Global Logistics - Adelaide': 'AAW Global Logistics - AU',
    'AAW Global Logistics - Fremantle': 'AAW Global Logistics - AU',
    'AAW Customs Brokerage': 'AAW Global Logistics - AU',
    'AAW Project Logistics': 'AAW Global Logistics - AU',
    'AAW Global Logistics - Auckland': 'AAW Global Logistics - NZ',
    'AAW Bulk Liquid Logistics Team': 'AAW Bulk Liquid Logistics',
    'Coastalbridge': 'Coastalbridge',
    'Coastalbridge Agencies': 'Coastalbridge',
    'PIL Logistics Australia': 'Regional Shipping Services',
    'Regional Shipping Services': 'Regional Shipping Services',
    'Hoyer Logistics Australia': 'Hoyer Logistics Australia',
}

# ── EOM-Specific Groups ──────────────────────────────────────────────────────
# TODO: Replace these placeholder UUIDs with actual Object IDs from IT
EOM_NEG_MOVEMENT_ELEVATED_GROUP_ID = 'PLACEHOLDER-NEG-MOVEMENT-ELEVATED-ID'
EOM_SETTINGS_ADMIN_GROUP_ID = 'PLACEHOLDER-SETTINGS-ADMIN-ID'


def resolve_eom_role(group_ids: list) -> dict:
    """
    Resolve EOM Dashboard role from Azure AD group memberships.

    Accumulates ALL matching groups across all tiers so that a user in
    multiple groups sees the union of all their memberships.

    Returns dict with:
      role                     – 'full_access', 'bu_access', 'branch_access', or 'no_access'
      business_units           – list of matched BU names
      branch_names             – list of matched branch names
      is_bu_manager            – True if user has any BU Manager group
      is_neg_movement_elevated – True if user is in the Neg Movement Elevated group
      is_settings_admin        – True if user is in the Settings Admin group
      can_access_ops_manager   – True if full_access or bu_access (AND has branch groups)
      can_upload_data          – True if full_access or bu_access
      can_edit_settings        – True if full_access or is_settings_admin
    """
    group_set = {g.lower() for g in group_ids}

    is_full_access = False
    is_bu_manager = False
    is_neg_movement_elevated = False
    is_settings_admin = False
    business_units = []
    branch_names = []

    # ── Collect ALL matches across every tier ─────────────────────────────

    # Tier 1: Full Access / Global Admin
    if FULL_ACCESS_GROUP_ID and FULL_ACCESS_GROUP_ID.lower() in group_set:
        is_full_access = True

    # Tier 3: BU Manager groups
    for gid, ad_name in BU_MANAGER_GROUPS.items():
        if gid.lower() in group_set:
            is_bu_manager = True
            bu_name = BU_AD_TO_APP.get(ad_name, ad_name)
            if bu_name not in business_units:
                business_units.append(bu_name)

    # Tier 4: Branch groups
    for gid, branch_name in BRANCH_GROUPS.items():
        if gid.lower() in group_set:
            if branch_name not in branch_names:
                branch_names.append(branch_name)
            # Also add the parent BU
            bu = BRANCH_TO_BU.get(branch_name)
            if bu and bu not in business_units:
                business_units.append(bu)

    # EOM-specific groups
    if EOM_NEG_MOVEMENT_ELEVATED_GROUP_ID and \
       EOM_NEG_MOVEMENT_ELEVATED_GROUP_ID.lower() in group_set:
        is_neg_movement_elevated = True

    if EOM_SETTINGS_ADMIN_GROUP_ID and \
       EOM_SETTINGS_ADMIN_GROUP_ID.lower() in group_set:
        is_settings_admin = True

    # ── Determine the primary role (highest tier matched) ─────────────────
    if is_full_access:
        primary_role = 'full_access'
    elif is_bu_manager and not branch_names:
        # BU Manager without branch group — still gets bu_access for upload etc.
        # but data scope will be empty (no branch to show)
        primary_role = 'bu_access'
    elif is_bu_manager and branch_names:
        # BU Manager WITH branch group — gets elevated access + branch data scope
        primary_role = 'bu_access'
    elif branch_names:
        primary_role = 'branch_access'
    else:
        primary_role = 'no_access'

    # ── Derive capabilities from role ────────────────────────────────────
    # Ops Manager: full_access sees all; bu_access sees own branch (must have branch group)
    can_access_ops_manager = primary_role in ('full_access', 'bu_access')
    can_upload_data = primary_role in ('full_access', 'bu_access')
    can_edit_settings = is_full_access or is_settings_admin

    return {
        'role': primary_role,
        'business_units': business_units,
        'branch_names': branch_names,
        'is_bu_manager': is_bu_manager,
        'is_neg_movement_elevated': is_neg_movement_elevated,
        'is_settings_admin': is_settings_admin,
        'can_access_ops_manager': can_access_ops_manager,
        'can_upload_data': can_upload_data,
        'can_edit_settings': can_edit_settings,
        # Legacy single-value keys for convenience
        'business_unit': business_units[0] if business_units else None,
        'branch_name': branch_names[0] if branch_names else None,
    }
