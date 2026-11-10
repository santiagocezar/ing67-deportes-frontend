import { DurationFormat } from "@formatjs/intl-durationformat";

const DATE_LOCALE = "es-AR";
const TIME_ZONE = "America/Argentina/Cordoba";

const dateFmt = new Intl.DateTimeFormat(DATE_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TIME_ZONE,
});

const dateTimeFmt = new Intl.DateTimeFormat(DATE_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIME_ZONE,
});

const timeDeltaFmt = new DurationFormat(DATE_LOCALE, {
    style: "narrow",
});

export function formatDate(value: string | Date) {
    return dateFmt.format(new Date(value));
}

export function formatDateTime(value: string | Date) {
    return dateTimeFmt.format(new Date(value));
}

export function formatTimeDelta(start: string | Date, end: string | Date) {
    const delta = Math.floor(
        new Date(end).getTime() - new Date(start).getTime(),
    );
    let seconds = Math.floor(delta / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);
    let days = Math.floor(hours / 24);

    hours %= 60;
    minutes %= 60;
    seconds %= 60;

    console.log({ delta });
    return timeDeltaFmt.format({ seconds, minutes, hours, days });
}
