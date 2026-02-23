'use client';

import type { SensorPermission } from '@/types/sky';

type PermissionGateProps = {
  isMobile: boolean;
  permission: SensorPermission;
  sensorAvailable: boolean;
  onRequestPermission: () => void | Promise<void>;
};

function permissionText(permission: SensorPermission, available: boolean): string {
  if (permission === 'unsupported') {
    return '이 브라우저는 자이로 센서를 지원하지 않아 수동 탐색 모드로 동작합니다.';
  }

  if (permission === 'denied') {
    return '센서 권한이 거부되었습니다. 수동 모드로 계속 사용할 수 있습니다.';
  }

  if (permission === 'granted' && available) {
    return '센서가 활성화되었습니다. 실제 디바이스 방향을 추적합니다.';
  }

  if (permission === 'granted' && !available) {
    return '권한은 허용됐지만 센서 데이터를 아직 받지 못했습니다. 잠시 기다려 주세요.';
  }

  return '모바일 방향 추적을 사용하려면 센서 권한이 필요합니다.';
}

export function PermissionGate({
  isMobile,
  permission,
  sensorAvailable,
  onRequestPermission
}: PermissionGateProps): JSX.Element | null {
  if (!isMobile) {
    return null;
  }

  if (permission === 'granted' && sensorAvailable) {
    return null;
  }

  const message = permissionText(permission, sensorAvailable);
  const needsAction = permission === 'unknown' || permission === 'denied';

  return (
    <div className="permission-gate" role="status" aria-live="polite">
      <p>{message}</p>
      {needsAction && (
        <button type="button" className="btn-primary" onClick={() => void onRequestPermission()}>
          센서 권한 요청
        </button>
      )}
    </div>
  );
}
