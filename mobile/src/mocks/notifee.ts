export const AndroidImportance = { LOW: 2 };
export const AndroidForegroundServiceType = {
  FOREGROUND_SERVICE_TYPE_HEALTH: 1,
  FOREGROUND_SERVICE_TYPE_LOCATION: 8,
};

const notifee = {
  createChannel: async () => {},
  displayNotification: async () => {},
  stopForegroundService: async () => {},
  registerForegroundService: (_runner: () => Promise<void>) => {},
};

export default notifee;
