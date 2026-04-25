const STATION_ALIASES: Record<string, string> = {
  'tunis ville': 'Tunis',
  tunis: 'Tunis',
  'saida manoubia': 'Sayda Manoubia',
  'sayda manoubia': 'Sayda Manoubia',
  ennajah: 'Ennajeh',
  ennajeh: 'Ennajeh',
  ezzouhour: 'Ezzouhour 2',
  'ezzouhour 2': 'Ezzouhour 2',
  elhryria: 'El Hrairia',
  'el hriairia': 'El Hrairia',
  etayaran: 'Ettayaran',
  'gobaa ville': 'Goubaa',
  goubaa: 'Goubaa',
};

export const normalizeStationName = (value: string): string => {
  const cleaned = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const canonical = STATION_ALIASES[cleaned.toLowerCase()];
  if (canonical) {
    return canonical;
  }

  if (!cleaned) {
    return value;
  }

  return cleaned
    .toLowerCase()
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};
