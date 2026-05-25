export default {
  getCurrentPosition: (success: any) => {
    success({ coords: { latitude: 35.6478, longitude: 128.7341, accuracy: 10 } });
  },
  clearWatch: () => {},
};
