import {
  CreateStoreDto,
  PHONE_REGEX,
  POSTAL_CODE_REGEX,
} from './dto/create-store.dto';

export const STORE_IMPORT_COLUMNS = [
  'name',
  'region',
  'brand',
  'channel',
  'classification',
  'address',
  'city',
  'postal_code',
  'opening_date',
  'section_manager_name',
  'section_manager_phone',
  'department_manager_name',
  'department_manager_phone',
  'gds_name',
  'gds_phone',
  'latitude',
  'longitude',
  'google_maps_url',
  'is_active',
] as const;

const REQUIRED_TEXT_FIELDS: Record<string, string> = {
  name: 'name',
  region: 'region',
  brand: 'brand',
  address: 'address',
  city: 'city',
  postal_code: 'postal_code',
  section_manager_name: 'section_manager_name',
};

const OPTIONAL_TEXT_FIELDS: Record<string, string> = {
  department_manager_name: 'department_manager_name',
  gds_name: 'gds_name',
};

const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'y', 'oui', 'vrai', 'x']);
const FALSY_VALUES = new Set(['0', 'false', 'no', 'n', 'non', 'faux']);

function toText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value).trim();
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return '';
}

function toBoolean(value: unknown): boolean | undefined {
  const text = toText(value).toLowerCase();
  if (TRUTHY_VALUES.has(text)) return true;
  if (FALSY_VALUES.has(text)) return false;
  return undefined;
}

export interface ParsedStoreRow {
  data?: CreateStoreDto;
  error?: string;
}

/**
 * Turns one raw spreadsheet row into a validated CreateStoreDto, or an error message.
 * Every column is mandatory except department_manager_name/phone and gds_name/phone.
 */
export function parseStoreRow(
  raw: Record<string, unknown>,
  regionsByName: Map<string, string>,
): ParsedStoreRow {
  const texts: Record<string, string> = {};
  for (const key of Object.keys(REQUIRED_TEXT_FIELDS)) {
    texts[key] = toText(raw[key]);
  }
  for (const key of Object.keys(OPTIONAL_TEXT_FIELDS)) {
    texts[key] = toText(raw[key]);
  }

  const channelText = toText(raw.channel).toLowerCase();
  const classificationText = toText(raw.classification).toUpperCase();
  const openingDateText = toText(raw.opening_date);
  const sectionManagerPhoneText = toText(raw.section_manager_phone);
  const departmentManagerPhoneText = toText(raw.department_manager_phone);
  const gdsPhoneText = toText(raw.gds_phone);
  const latitudeText = toText(raw.latitude);
  const longitudeText = toText(raw.longitude);
  const googleMapsUrlText = toText(raw.google_maps_url);
  const isActive = toBoolean(raw.is_active);

  const missing = Object.entries(REQUIRED_TEXT_FIELDS)
    .filter(([key]) => !texts[key])
    .map(([, label]) => label);

  if (!channelText) missing.push('channel');
  if (!classificationText) missing.push('classification');
  if (!openingDateText) missing.push('opening_date');
  if (!sectionManagerPhoneText) missing.push('section_manager_phone');
  if (!latitudeText) missing.push('latitude');
  if (!longitudeText) missing.push('longitude');
  if (!googleMapsUrlText) missing.push('google_maps_url');
  if (isActive === undefined) missing.push('is_active');

  if (missing.length) {
    return { error: `Missing required field(s): ${missing.join(', ')}` };
  }

  const region_id = regionsByName.get(texts.region.toLowerCase());
  if (!region_id) {
    return { error: `Region not found: "${texts.region}"` };
  }

  if (channelText !== 'gms' && channelText !== 'ls') {
    return { error: `Invalid channel "${channelText}" (expected gms or ls)` };
  }

  if (!['A', 'B', 'C', 'D'].includes(classificationText)) {
    return {
      error: `Invalid classification "${classificationText}" (expected A, B, C or D)`,
    };
  }

  if (!POSTAL_CODE_REGEX.test(texts.postal_code)) {
    return { error: `Invalid postal_code "${texts.postal_code}"` };
  }

  if (Number.isNaN(Date.parse(openingDateText))) {
    return { error: `Invalid opening_date "${openingDateText}"` };
  }

  if (!PHONE_REGEX.test(sectionManagerPhoneText)) {
    return { error: `Invalid section_manager_phone "${sectionManagerPhoneText}"` };
  }
  if (departmentManagerPhoneText && !PHONE_REGEX.test(departmentManagerPhoneText)) {
    return { error: `Invalid department_manager_phone "${departmentManagerPhoneText}"` };
  }
  if (gdsPhoneText && !PHONE_REGEX.test(gdsPhoneText)) {
    return { error: `Invalid gds_phone "${gdsPhoneText}"` };
  }

  const latitude = Number(latitudeText);
  if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
    return { error: `Invalid latitude "${latitudeText}"` };
  }

  const longitude = Number(longitudeText);
  if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
    return { error: `Invalid longitude "${longitudeText}"` };
  }

  if (!/^https?:\/\/.+/i.test(googleMapsUrlText)) {
    return { error: `Invalid google_maps_url "${googleMapsUrlText}"` };
  }

  const data: CreateStoreDto = {
    name: texts.name,
    region_id,
    brand: texts.brand,
    channel: channelText as CreateStoreDto['channel'],
    classification: classificationText as CreateStoreDto['classification'],
    address: texts.address,
    city: texts.city,
    postal_code: texts.postal_code,
    opening_date: openingDateText,
    section_manager_name: texts.section_manager_name,
    section_manager_phone: sectionManagerPhoneText,
    department_manager_name: texts.department_manager_name,
    department_manager_phone: departmentManagerPhoneText,
    gds_name: texts.gds_name,
    gds_phone: gdsPhoneText,
    latitude,
    longitude,
    google_maps_url: googleMapsUrlText,
    is_active: isActive,
  };

  return { data };
}
