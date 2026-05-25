export {};

declare global {
  interface Window {
    kakao: typeof kakao;
  }

  namespace kakao {
    namespace maps {
      function load(callback: () => void): void;

      class LatLng {
        constructor(lat: number, lng: number);
      }

      class LatLngBounds {
        extend(latlng: LatLng): void;
      }

      class Map {
        constructor(container: HTMLElement, options: { center: LatLng; level: number });
        setCenter(latlng: LatLng): void;
        setLevel(level: number): void;
        setBounds(bounds: LatLngBounds): void;
      }

      class Size {
        constructor(width: number, height: number);
      }

      class Point {
        constructor(x: number, y: number);
      }

      class MarkerImage {
        constructor(src: string, size: Size, options?: { offset?: Point });
      }

      class Marker {
        constructor(options: {
          map?: Map;
          position: LatLng;
          title?: string;
          image?: MarkerImage;
        });
        setMap(map: Map | null): void;
        getPosition(): LatLng;
      }

      class InfoWindow {
        constructor(options: { content?: string | HTMLElement });
        setContent(content: string | HTMLElement): void;
        open(map: Map, marker: Marker): void;
        close(): void;
      }

      namespace event {
        function addListener(target: Marker, type: string, handler: () => void): void;
      }
    }
  }
}
