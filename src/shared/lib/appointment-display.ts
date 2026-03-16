type ProviderLike = {
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
};

const APPOINTMENT_TYPE_TRANSLATIONS: Record<string, { en: string; es: string }> = {
  checkup: { en: 'Checkup', es: 'Chequeo' },
  cleaning: { en: 'Cleaning', es: 'Limpieza' },
  consultation: { en: 'Consultation', es: 'Consulta' },
  crown: { en: 'Crown', es: 'Corona' },
  emergency: { en: 'Emergency', es: 'Emergencia' },
  extraction: { en: 'Extraction', es: 'Extraccion' },
  filling: { en: 'Filling', es: 'Empaste' },
  'root canal': { en: 'Root Canal', es: 'Endodoncia' },
  whitening: { en: 'Whitening', es: 'Blanqueamiento' },
};

export function localizeAppointmentTypeName(name: string | null | undefined, locale: string) {
  if (!name) {
    return locale === 'es' ? 'General' : 'General';
  }

  const normalized = name.trim().toLowerCase();
  const translation = APPOINTMENT_TYPE_TRANSLATIONS[normalized];

  if (!translation) {
    return name;
  }

  return locale === 'es' ? translation.es : translation.en;
}

export function getProviderDisplayName(provider: ProviderLike | null | undefined, locale: string) {
  if (!provider) {
    return locale === 'es' ? 'Sin asignar' : 'Unassigned';
  }

  const lastName = provider.last_name?.trim();
  const firstName = provider.first_name?.trim();
  const fallbackName = [firstName, lastName].filter(Boolean).join(' ').trim() || (locale === 'es' ? 'Sin nombre' : 'No name');

  if (provider.role === 'dentist') {
    const prefix = locale === 'es' ? 'Dr./Dra.' : 'Dr.';
    return lastName ? `${prefix} ${lastName}` : `${prefix} ${fallbackName}`;
  }

  if (provider.role === 'hygienist') {
    const prefix = locale === 'es' ? 'Hig.' : 'Hyg.';
    return lastName ? `${prefix} ${lastName}` : `${prefix} ${fallbackName}`;
  }

  return fallbackName;
}