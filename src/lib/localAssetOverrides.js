const STORAGE_KEY = 'scab_local_asset_location_overrides';

function readOverrides() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeOverrides(overrides) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export function applyLocalAssetOverrides(assets) {
  const overrides = readOverrides();
  return (Array.isArray(assets) ? assets : []).map(asset => ({
    ...asset,
    ...(overrides[String(asset.id)] || {}),
  }));
}

export function applyLocalAssetOverride(asset) {
  if (!asset) return asset;
  return { ...asset, ...(readOverrides()[String(asset.id)] || {}) };
}

export function saveLocalAssetLocationOverride(assetId, locationType, crewNumber, requestId) {
  const overrides = readOverrides();
  overrides[String(assetId)] = {
    location_type: locationType,
    crew_number: locationType === 'crew' ? crewNumber : '',
    _localLocationOverride: true,
    _movementRequestId: requestId,
  };
  writeOverrides(overrides);
}
