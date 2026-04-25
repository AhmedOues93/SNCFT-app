export const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const calculateDuration = (start: string, end: string): number => {
  const diff = toMinutes(end) - toMinutes(start);
  return diff >= 0 ? diff : diff + 24 * 60;
};

export const dateToMinuteOfDay = (date: Date): number => date.getHours() * 60 + date.getMinutes();

export const formatDateFr = (date: Date): string =>
  date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
