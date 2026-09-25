const dateTimeFormatter = new Intl.DateTimeFormat("en-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZoneName: "short",
});

const dayFormatter = new Intl.DateTimeFormat("en-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export const formatElectionDate = (value: string) =>
  dateTimeFormatter.format(new Date(value));

export const formatElectionDay = (value: string) =>
  dayFormatter.format(new Date(value));

export const isVotingTime = (
  startsAt: string,
  endsAt: string,
  now = Date.now(),
) => now >= new Date(startsAt).getTime() && now < new Date(endsAt).getTime();
