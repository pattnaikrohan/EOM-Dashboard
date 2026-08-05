/**
 * Azure AD Group → EOM Dashboard Role Mapping
 *
 * Maps Azure AD security group IDs to EOM application roles, branches, and capabilities.
 * Reuses existing groups from the Risk & Compliance Hub (Tiers 1, 3, 4).
 * Tier 2 (functional groups) are intentionally excluded per Joe's directive (05/08).
 */

// ── Tier 1: Full Access / Global Admin ──────────────────────────────────────
const FULL_ACCESS_GROUP_ID = '893a070a-54ec-42fb-bdda-98066d3a7569';

// ── Tier 3: BU Manager Groups ───────────────────────────────────────────────
const BU_MANAGER_GROUPS: Record<string, string> = {
  '38e4b0e2-ba59-4b60-8c61-8650509b1a70': 'BU Manager- AAW Group Holdings',
  '956cde96-2a25-4574-8e7b-fb0de9712c0d': 'BU Manager- AAW Global Logistics-AU',
  '5ba26317-0cfe-461a-a8ac-ee35ed50a7dc': 'BU Manager- AAW Global Logistics -NZ',
  '83c2912d-604a-4e3f-b79e-5500b040197d': 'BU Manager- Bulk Liquid Logistics',
  'e4fb09bd-ed76-4a1c-b964-396057c02de6': 'BU Manager- Hoyer Logistics Australia',
  '18444ce2-793a-485c-99d1-7d0a1073945d': 'BU Manager- Coastalbridge',
  '57b8fe69-df5e-441f-94ef-1adad5458d8e': 'BU Manager- PIL Logistics Australia',
};

// AD Group Name → Application Business Unit Name
const BU_AD_TO_APP: Record<string, string> = {
  'BU Manager- AAW Group Holdings': 'AAW Group Holdings',
  'BU Manager- AAW Global Logistics-AU': 'AAW Global Logistics - AU',
  'BU Manager- AAW Global Logistics -NZ': 'AAW Global Logistics - NZ',
  'BU Manager- Bulk Liquid Logistics': 'AAW Bulk Liquid Logistics',
  'BU Manager- Hoyer Logistics Australia': 'Hoyer Logistics Australia',
  'BU Manager- Coastalbridge': 'Coastalbridge',
  'BU Manager- PIL Logistics Australia': 'Regional Shipping Services',
};

// ── Tier 4: Branch Groups ───────────────────────────────────────────────────
const BRANCH_GROUPS: Record<string, string> = {
  // AAW Global Logistics - AU
  '7e72b9d7-0977-4d9f-83d0-f2c0f38beafb': 'AAW Global Logistics - Melbourne',
  '8e6d4f35-ec7f-4d9f-be44-f76bb4274d22': 'AAW Global Logistics - Sydney',
  'c98d0827-3c29-49cf-b466-fd6b3b4cd16b': 'AAW Global Logistics - Brisbane',
  '9f22fa97-0f1d-4136-89d8-8b9e4dc1ff2b': 'AAW Global Logistics - Adelaide',
  'fe5aecea-91c4-48ac-9038-f16edfd3cba6': 'AAW Global Logistics - Fremantle',
  'fa404616-cce0-4c8a-9e5d-a86919e4eac1': 'AAW Customs Brokerage',
  '99937019-ff28-4c3c-8de2-e5492638a233': 'AAW Project Logistics',
  // AAW Global Logistics - NZ
  'c14255e2-c4f0-459d-b889-f44938b0fd83': 'AAW Global Logistics - Auckland',
  // AAW Bulk Liquid Logistics
  'a960927f-14db-4632-ade6-56e9bc19213f': 'AAW Bulk Liquid Logistics Team',
  // Coastalbridge
  '6796ccfb-9ed2-484e-93b4-92c5d289c3a1': 'Coastalbridge',
  // PIL / Regional Shipping Services
  'c65d09a2-1b50-4adc-903b-4dc5da9dfa92': 'PIL Logistics Australia',

  // ── New branch groups (pending IT creation — replace placeholders) ────
  // TODO: Replace these placeholder UUIDs with actual Object IDs from IT
  'PLACEHOLDER-HOYER-BRANCH-GROUP-ID': 'Hoyer Logistics Australia',
  'PLACEHOLDER-CB-AGENCIES-BRANCH-GROUP-ID': 'Coastalbridge Agencies',
  'PLACEHOLDER-RSS-BRANCH-GROUP-ID': 'Regional Shipping Services',
};

// ── Branch → Business Unit Lookup ───────────────────────────────────────────
const BRANCH_TO_BU: Record<string, string> = {
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
};

// ── EOM-Specific Groups ─────────────────────────────────────────────────────
// TODO: Replace these placeholder UUIDs with actual Object IDs from IT
const EOM_NEG_MOVEMENT_ELEVATED_GROUP_ID = 'PLACEHOLDER-NEG-MOVEMENT-ELEVATED-ID';
const EOM_SETTINGS_ADMIN_GROUP_ID = 'PLACEHOLDER-SETTINGS-ADMIN-ID';


// ── Types ───────────────────────────────────────────────────────────────────

export interface EomResolvedRole {
  role: 'full_access' | 'bu_access' | 'branch_access' | 'no_access';
  branchNames: string[];
  businessUnits: string[];
  isBuManager: boolean;
  isNegMovementElevated: boolean;
  isSettingsAdmin: boolean;
  canAccessOpsManager: boolean;
  canUploadData: boolean;
  canEditSettings: boolean;
  matchedGroups: string[];
}


// ── Role Resolution ─────────────────────────────────────────────────────────

/**
 * Resolves the EOM Dashboard role from a list of Azure AD group IDs.
 * Accumulates ALL matching groups across all tiers for cross-tier access.
 * Primary role is set to the highest tier matched.
 */
export function resolveEomRole(groupIds: string[]): EomResolvedRole {
  const groupSet = new Set(groupIds.map(id => id.toLowerCase()));
  const matchedGroups: string[] = [];

  let isFullAccess = false;
  let isBuManager = false;
  let isNegMovementElevated = false;
  let isSettingsAdmin = false;
  const businessUnits: string[] = [];
  const branchNames: string[] = [];

  // ── Collect ALL matches across every tier ──────────────────────────────

  // Tier 1: Full Access
  if (FULL_ACCESS_GROUP_ID && groupSet.has(FULL_ACCESS_GROUP_ID.toLowerCase())) {
    isFullAccess = true;
    matchedGroups.push('Full Access / Global Admin');
  }

  // Tier 3: BU Manager groups
  for (const [groupId, adGroupName] of Object.entries(BU_MANAGER_GROUPS)) {
    if (groupSet.has(groupId.toLowerCase())) {
      isBuManager = true;
      matchedGroups.push(adGroupName);
      const bu = BU_AD_TO_APP[adGroupName] || adGroupName;
      if (!businessUnits.includes(bu)) businessUnits.push(bu);
    }
  }

  // Tier 4: Branch groups
  for (const [groupId, branchName] of Object.entries(BRANCH_GROUPS)) {
    if (groupSet.has(groupId.toLowerCase())) {
      matchedGroups.push(`Branch - ${branchName}`);
      if (!branchNames.includes(branchName)) branchNames.push(branchName);
      const bu = BRANCH_TO_BU[branchName];
      if (bu && !businessUnits.includes(bu)) businessUnits.push(bu);
    }
  }

  // EOM-specific groups
  if (EOM_NEG_MOVEMENT_ELEVATED_GROUP_ID &&
      groupSet.has(EOM_NEG_MOVEMENT_ELEVATED_GROUP_ID.toLowerCase())) {
    isNegMovementElevated = true;
    matchedGroups.push('EOM - Negative Movement Elevated');
  }

  if (EOM_SETTINGS_ADMIN_GROUP_ID &&
      groupSet.has(EOM_SETTINGS_ADMIN_GROUP_ID.toLowerCase())) {
    isSettingsAdmin = true;
    matchedGroups.push('EOM - Settings Admin');
  }

  // ── Determine the primary role (highest tier matched) ─────────────────
  let primaryRole: EomResolvedRole['role'];
  if (isFullAccess) {
    primaryRole = 'full_access';
  } else if (isBuManager) {
    primaryRole = 'bu_access';
  } else if (branchNames.length > 0) {
    primaryRole = 'branch_access';
  } else {
    primaryRole = 'no_access';
    if (matchedGroups.length === 0) matchedGroups.push('(no matching AD group)');
  }

  // ── Derive capabilities ───────────────────────────────────────────────
  const canAccessOpsManager = primaryRole === 'full_access' || primaryRole === 'bu_access';
  const canUploadData = primaryRole === 'full_access' || primaryRole === 'bu_access';
  const canEditSettings = isFullAccess || isSettingsAdmin;

  return {
    role: primaryRole,
    branchNames,
    businessUnits,
    isBuManager,
    isNegMovementElevated,
    isSettingsAdmin,
    canAccessOpsManager,
    canUploadData,
    canEditSettings,
    matchedGroups,
  };
}


// ── Token Helpers ───────────────────────────────────────────────────────────

/**
 * Extract group IDs from an Azure AD token's claims.
 */
export function extractGroupsFromToken(tokenClaims: any): string[] {
  if (Array.isArray(tokenClaims?.groups)) {
    return tokenClaims.groups;
  }

  // Overage indicator — too many groups to include in token
  if (tokenClaims?._claim_names?.groups) {
    console.warn('[EOM Auth] Token has group overage. Will fetch from Graph API.');
    return [];
  }

  return [];
}

/**
 * Fetch group memberships from Microsoft Graph API.
 * Used when groups are not included in the token (overage scenario).
 */
export async function fetchGroupsFromGraph(accessToken: string): Promise<string[]> {
  const endpoints = [
    'https://graph.microsoft.com/v1.0/me/transitiveMemberOf?$select=id,displayName&$top=999',
    'https://graph.microsoft.com/v1.0/me/memberOf?$select=id,displayName&$top=999',
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        console.warn(`[EOM Auth] ${endpoint.split('/v1.0/')[1]?.split('?')[0]} returned ${response.status}`);
        continue;
      }
      const data = await response.json();
      const groups = (data.value || [])
        .filter((item: any) => item['@odata.type'] === '#microsoft.graph.group')
        .map((group: any) => group.id);
      console.log(`[EOM Auth] Groups fetched from Graph API: ${groups.length} groups`);
      if (groups.length > 0) return groups;
    } catch (err) {
      console.warn('[EOM Auth] Graph endpoint failed:', err);
    }
  }

  console.error('[EOM Auth] All Graph group-fetch endpoints failed');
  return [];
}
