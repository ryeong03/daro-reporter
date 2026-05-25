export function useNavigation() {
  return {
    navigate: (screen: string) => {
      console.log('[web-mock] navigate to', screen);
    },
    goBack: () => {
      console.log('[web-mock] goBack');
    },
  };
}

export function useRoute() {
  return { params: {} };
}

export function NavigationContainer({ children }: any) {
  return children;
}

export function createNativeStackNavigator() {
  return {
    Navigator: ({ children }: any) => children,
    Screen: () => null,
  };
}
