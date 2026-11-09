// El formato se fija explícitamente (locale y zona horaria) para que el texto
// generado en el servidor y en el cliente sea idéntico y no rompa la hidratación.
const DATE_LOCALE = "es-AR";
const TIME_ZONE = "America/Argentina/Cordoba";

export function formatDate(value: string | Date) {
    return new Intl.DateTimeFormat(DATE_LOCALE, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: TIME_ZONE,
    }).format(new Date(value));
}
