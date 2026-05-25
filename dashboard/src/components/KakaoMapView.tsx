import React, { useEffect, useRef, useState } from 'react';
import { getDefaultCenter, loadKakaoMaps } from '../kakao/loadKakaoMaps';

export interface MapMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status?: 'normal' | 'warning' | 'emergency';
  subtitle?: string;
}

interface KakaoMapViewProps {
  markers: MapMarker[];
  height?: number;
  emptyMessage?: string;
}

/** 정상=초록, 주의=노랑, 응급=빨강 */
const STATUS_COLOR: Record<string, string> = {
  emergency: '#dc2626',
  warning: '#eab308',
  normal: '#16a34a',
};

const APP_KEY = process.env.REACT_APP_KAKAO_MAP_KEY || '';

function markerImage(kakao: typeof window.kakao, color: string): kakao.maps.MarkerImage {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"><circle cx="14" cy="14" r="11" fill="${color}" stroke="#fff" stroke-width="2.5"/></svg>`;
  const src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  return new kakao.maps.MarkerImage(
    src,
    new kakao.maps.Size(28, 28),
    { offset: new kakao.maps.Point(14, 14) }
  );
}

export function KakaoMapView({ markers, height = 300, emptyMessage }: KakaoMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const infoRef = useRef<kakao.maps.InfoWindow | null>(null);
  const markersRef = useRef<kakao.maps.Marker[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!APP_KEY) {
      setError('dashboard/.env 에 REACT_APP_KAKAO_MAP_KEY (JavaScript 키)를 설정하세요.');
      return;
    }

    let cancelled = false;

    loadKakaoMaps(APP_KEY)
      .then((kakao) => {
        if (cancelled || !containerRef.current) return;

        const center = getDefaultCenter();
        const map = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(center.lat, center.lng),
          level: markers.length <= 1 ? 5 : 8,
        });
        mapRef.current = map;
        infoRef.current = new kakao.maps.InfoWindow({ content: '' });
        setReady(true);
        setError(null);
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

    markers.forEach((m) => {
      const pos = new kakao.maps.LatLng(m.lat, m.lng);
      const color = STATUS_COLOR[m.status || 'normal'] || STATUS_COLOR.normal;
      const content = `
        <div style="padding:8px 10px;font-size:13px;line-height:1.4;min-width:140px;">
          <strong style="color:${color}">${m.name}</strong>
          ${m.subtitle ? `<div style="color:#64748b;margin-top:4px;font-size:12px">${m.subtitle}</div>` : ''}
          <div style="color:#94a3b8;margin-top:4px;font-size:11px">${m.lat.toFixed(4)}, ${m.lng.toFixed(4)}</div>
        </div>`;

      const marker = new kakao.maps.Marker({
        map,
        position: pos,
        title: m.name,
        image: markerImage(kakao, color),
      });
      kakao.maps.event.addListener(marker, 'click', () => {
        infoRef.current?.setContent(content);
        infoRef.current?.open(map, marker);
      });
      markersRef.current.push(marker);
    });

    const placed = markersRef.current;
    if (placed.length === 1) {
      map.setCenter(placed[0].getPosition());
      map.setLevel(5);
    } else if (placed.length > 1) {
      const bounds = new kakao.maps.LatLngBounds();
      markers.forEach((m) => bounds.extend(new kakao.maps.LatLng(m.lat, m.lng)));
      map.setBounds(bounds);
    } else {
      const c = getDefaultCenter();
      map.setCenter(new kakao.maps.LatLng(c.lat, c.lng));
      map.setLevel(8);
    }
  }, [ready, markers]);

  if (error) {
    return (
      <div
        style={{
          height,
          borderRadius: 12,
          border: '1px solid #fecaca',
          background: '#fef2f2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center',
          color: '#b91c1c',
          fontSize: 14,
        }}
      >
        <div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>카카오맵을 불러올 수 없습니다</div>
          <div style={{ color: '#991b1b', fontSize: 13 }}>{error}</div>
          <div style={{ marginTop: 12, color: '#64748b', fontSize: 12 }}>
            developers.kakao.com → Web 플랫폼에 <code>http://localhost:3000</code> 등록 · JavaScript 키 사용
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', marginBottom: 24 }}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height,
          borderRadius: 12,
          border: '1px solid #cbd5e1',
          overflow: 'hidden',
        }}
      />
      {ready && markers.length === 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            right: 12,
            background: 'rgba(255,255,255,0.92)',
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: 13,
            color: '#64748b',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
        >
          {emptyMessage || 'GPS 위치가 있는 농업인이 없습니다. 헬스 데이터 전송 후 마커가 표시됩니다.'}
        </div>
      )}
    </div>
  );
}
