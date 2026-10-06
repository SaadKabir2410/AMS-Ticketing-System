import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import { jobsheetsApi } from "./api/jobsheets";

const HUB_URL = "/ams-ticket-detail-hub";

export const JOBSHEET_SIGNALR_EVENTS = {
  reloadJobsheets: "ReloadJobsheets",
  updateTicketDetails: "UpdateAMSTicketsOfJobsheetDetails",
};

let connection;
let startPromise;
const pendingTicketUpdates = new Map();

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

export function normalizeTicketDetailsUpdate(firstArgument, secondArgument) {
  let affectedDates = firstArgument;
  let affectedUserIds = secondArgument;

  // The backend event is a .NET ValueTuple. Depending on the SignalR JSON
  // protocol/version it arrives either as one { item1, item2 } argument, a
  // two-element tuple array, or as two separate arguments.
  if (firstArgument && !Array.isArray(firstArgument) && typeof firstArgument === "object") {
    affectedDates = firstArgument.item1 ?? firstArgument.Item1 ?? firstArgument.dates;
    affectedUserIds = firstArgument.item2 ?? firstArgument.Item2 ?? firstArgument.userIds;
  } else if (
    Array.isArray(firstArgument)
    && firstArgument.length === 2
    && Array.isArray(firstArgument[0])
    && Array.isArray(firstArgument[1])
    && secondArgument === undefined
  ) {
    [affectedDates, affectedUserIds] = firstArgument;
  }

  return {
    affectedDates: asArray(affectedDates).filter(Boolean),
    affectedUserIds: asArray(affectedUserIds).filter(Boolean),
  };
}

export function processTicketDetailsUpdate(firstArgument, secondArgument) {
  const update = normalizeTicketDetailsUpdate(firstArgument, secondArgument);
  if (update.affectedDates.length === 0) return Promise.resolve(update);

  const payload = {
    item1: update.affectedDates,
    item2: update.affectedUserIds,
  };
  const updateKey = JSON.stringify(payload);

  // The page and an open modal both observe this event. Share one backend
  // update so the same ticket cannot be inserted twice by concurrent handlers.
  if (!pendingTicketUpdates.has(updateKey)) {
    const request = jobsheetsApi
      .updateJobsheetDetailsAfterAMSTicketDetailsUpdateIsDone(payload)
      .then(() => update)
      .finally(() => pendingTicketUpdates.delete(updateKey));
    pendingTicketUpdates.set(updateKey, request);
  }

  return pendingTicketUpdates.get(updateKey);
}

function getAccessToken() {
  try {
    return JSON.parse(localStorage.getItem("tokenAuth:session"))?.access_token || "";
  } catch {
    return "";
  }
}

function getConnection() {
  if (!connection) {
    connection = new HubConnectionBuilder()
      .withUrl(HUB_URL, { accessTokenFactory: getAccessToken })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();
  }

  return connection;
}

function startConnection() {
  const hub = getConnection();

  if (hub.state !== HubConnectionState.Disconnected) {
    return Promise.resolve(hub);
  }

  if (!startPromise) {
    startPromise = hub
      .start()
      .then(() => hub)
      .finally(() => {
        startPromise = null;
      });
  }

  return startPromise;
}

export function subscribeToJobsheetEvent(eventName, handler) {
  const hub = getConnection();
  hub.on(eventName, handler);

  startConnection().catch((error) => {
    console.error(`[SignalR] Could not connect to ${HUB_URL}:`, error);
  });

  return () => hub.off(eventName, handler);
}
