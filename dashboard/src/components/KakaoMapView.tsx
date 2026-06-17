import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getDefaultCenter, loadKakaoMaps, normalizeMapCoord } from '../kakao/loadKakaoMaps';

export interface MapMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status?: 'normal' | 'warning' | 'emergency' | 'resolved';
  subtitle?: string;
}

interface KakaoMapViewProps {
  markers: MapMarker[];
  height?: number;
  emptyMessage?: string;
}

const STATUS_COLOR: Record<string, string> = {
  emergency: '#dc2626',
  warning: '#eab308',
  resolved: '#3b82f6',
  normal: '#16a34a',
};

/** 카카오맵 level — 숫자 클수록 멀리(전국). 10 이상이면 타일이 비어 보이기 쉬움 */
const MAX_MAP_LEVEL = 9;

const APP_KEY = process.env.REACT_APP_KAKAO_MAP_KEY || '';

function markerImage(kakao: typeof window.kakao, color: string): kakao.maps.MarkerImage {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"><circle cx="14" cy="14" r="11" fill="${color}" stroke="#fff" stroke-width="2.5"/></svg>`;
  const src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  return new kakao.maps.MarkerImage(
    src,
    new kakao.maps.Size(28, 28),
    { offset: new kakao.maps.Point(14, 14) },
  );
}

function refreshMapLayout(map: kakao.maps.Map) {
  window.requestAnimationFrame(() => map.relayout());
  window.setTimeout(() => map.relayout(), 150);
}

function fitMapToMarkers(map: kakao.maps.Map, items: MapMarker[]) {
  const kakao = window.kakao;
  const defaultCenter = getDefaultCenter();

  if (items.length === 0) {
    map.setCenter(new kakao.maps.LatLng(defaultCenter.lat, defaultCenter.lng));
    map.setLevel(8);
    return;
  }

  if (items.length === 1) {
    const pos = new kakao.maps.LatLng(items[0].lat, items[0].lng);
    map.setCenter(pos);
    map.setLevel(5);
    return;
  }

  const bounds = new kakao.maps.LatLngBounds();
  items.forEach((m) => bounds.extend(new kakao.maps.LatLng(m.lat, m.lng)));

  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  const latSpan = Math.abs(ne.getLat() - sw.getLat());
  const lngSpan = Math.abs(ne.getLng() - sw.getLng());

  // 청도+서울처럼 너무 멀면 전국 줌 → 타일 깨짐. 기본 중심 유지.
  if (latSpan > 0.45 || lngSpan > 0.55) {
    map.setCenter(new kakao.maps.LatLng(defaultCenter.lat, defaultCenter.lng));
    map.setLevel(8);
    return;
  }

  map.setBounds(bounds);
  if (map.getLevel() > MAX_MAP_LEVEL) {
    const centerLat = (sw.getLat() + ne.getLat()) / 2;
    const centerLng = (sw.getLng() + ne.getLng()) / 2;
    map.setCenter(new kakao.maps.LatLng(centerLat, centerLng));
    map.setLevel(MAX_MAP_LEVEL);
  }
}

export function KakaoMapView({ markers, height = 300, emptyMessage }: KakaoMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const infoRef = useRef<kakao.maps.InfoWindow | null>(null);
  const markersRef = useRef<kakao.maps.Marker[]>([]);
  const labelsRef = useRef<kakao.maps.CustomOverlay[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const validMarkers = useMemo(
    () =>
      markers
        .map((m) => {
          const coord = normalizeMapCoord(m.lat, m.lng);
          if (!coord) return null;
          return { ...m, lat: coord.lat, lng: coord.lng };
        })
        .filter((m): m is MapMarker => m != null),
    [markers],
  );

  const markersKey = useMemo(
    () => validMarkers
      .map((m) => `${m.id}:${m.lat}:${m.lng}:${m.status ?? ''}:${m.subtitle ?? ''}`)
      .join('|'),
    [validMarkers],
  );

  useEffect(() => {
    if (!APP_KEY) {
      setError(
        'dashboard/.env 에 REACT_APP_KAKAO_MAP_KEY (JavaScript 키)를 넣은 뒤, ' +
          '터미널에서 Ctrl+C 로 서버를 끄고 npm start 를 다시 실행하세요.',
      );
      return;
    }

    let cancelled = false;

    loadKakaoMaps(APP_KEY)
      .then((kakao) => {
        if (cancelled || !containerRef.current) return;

        const center = getDefaultCenter();
        const map = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(center.lat, center.lng),
          level: 8,
        });
        mapRef.current = map;
        infoRef.current = new kakao.maps.InfoWindow({ content: '' });
        setReady(true);
        setError(null);
        refreshMapLayout(map);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !window.kakao?.maps) return;

    const kakao = window.kakao;
    const map = mapRef.current;

    markersRef.current.forEach((mk) => mk.setMap(null));
    markersRef.current = [];
    labelsRef.current.forEach((lb) => lb.setMap(null));
    labelsRef.current = [];
    infoRef.current?.close();

    validMarkers.forEach((m) => {
      const pos = new kakao.maps.LatLng(m.lat, m.lng);
      const color = STATUS_COLOR[m.status || 'normal'] || STATUS_COLOR.normal;

      const marker = new kakao.maps.Marker({
        map,
        position: pos,
        title: m.name,
        image: markerImage(kakao, color),
      });

      const label = new kakao.maps.CustomOverlay({
        position: pos,
        content: `<div style="background:${color};color:white;padding:3px 8px;border-radius:10px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.2);">${m.name}</div>`,
        yAnchor: 2.8,
      });
      label.setMap(map);
      labelsRef.current.push(label);

      const content = `
        <div style="padding:8px 10px;font-size:13px;line-height:1.4;min-width:140px;">
          <strong style="color:${color}">${m.name}</strong>
          ${m.subtitle ? `<div style="color:#64748b;margin-top:4px;font-size:12px">${m.subtitle}</div>` : ''}
        </div>`;

      kakao.maps.event.addListener(marker, 'click', () => {
        infoRef.current?.setContent(content);
        infoRef.current?.open(map, marker);
      });

      markersRef.current.push(marker);
    });

    fitMapToMarkers(map, validMarkers);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- markersKey로 동일 마커 재렌더 시 relayout 방지
  }, [ready, markersKey]);

  if (error) {
    return (
      <div style={{
        height, borderRadius: 12, border: '1px solid #fecaca', background: '#fef2f2',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, textAlign: 'center', color: '#b91c1c', fontSize: 14,
      }}>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>카카오맵을 불러올 수 없습니다</div>
          <div style={{ color: '#991b1b', fontSize: 13 }}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={containerRef}
        style={{ width: '100%', height, borderRadius: 12, border: '1px solid #cbd5e1', overflow: 'hidden' }}
      />
      {ready && validMarkers.length === 0 && (
        <div style={{
          position: 'absolute', bottom: 12, left: 12, right: 12,
          background: 'rgba(255,255,255,0.92)', padding: '8px 12px',
          borderRadius: 8, fontSize: 13, color: '#64748b',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}>
          {emptyMessage || 'GPS 위치가 있는 농업인이 없습니다.'}
        </div>
      )}
    </div>
  );
}
