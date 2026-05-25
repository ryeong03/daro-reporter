# 카카오 REST 역지오코딩 테스트 (npm 불필요)
# 실행 (정책 오류 시): cd backend
#   powershell -ExecutionPolicy Bypass -File .\scripts\test-kakao.ps1
# 또는: scripts\test-kakao.cmd 더블클릭

$ErrorActionPreference = 'Stop'
$envFile = Join-Path (Join-Path $PSScriptRoot '..') '.env'
$envFile = (Resolve-Path $envFile -ErrorAction SilentlyContinue).Path
if (-not $envFile) {
  Write-Host '[test-kakao] backend/.env 가 없습니다.' -ForegroundColor Red
  exit 1
}

$line = Get-Content $envFile | Where-Object { $_ -match '^\s*KAKAO_MAP_API_KEY=' } | Select-Object -First 1
if (-not $line) {
  Write-Host '[test-kakao] KAKAO_MAP_API_KEY 가 .env 에 없습니다.' -ForegroundColor Red
  exit 1
}

$key = ($line -replace '^\s*KAKAO_MAP_API_KEY=', '').Trim()
if ($key -match 'your-kakao' -or [string]::IsNullOrWhiteSpace($key)) {
  Write-Host '[test-kakao] REST API 키를 .env 에 넣어 주세요.' -ForegroundColor Red
  exit 1
}

$lat = 35.6478
$lng = 128.7341
Write-Host "[test-kakao] coord2address ($lat, $lng) ..."

try {
  $uri = "https://dapi.kakao.com/v2/local/geo/coord2address.json?x=$lng&y=$lat"
  $r = Invoke-RestMethod -Uri $uri -Headers @{ Authorization = "KakaoAK $key" } -TimeoutSec 15
  $doc = $r.documents[0]
  if (-not $doc) {
    Write-Host '[test-kakao] FAIL — documents 비어 있음' -ForegroundColor Red
    exit 1
  }
  Write-Host '[test-kakao] OK' -ForegroundColor Green
  Write-Host ('  address: ' + $doc.address.address_name)
  if ($doc.road_address.address_name) {
    Write-Host ('  road:    ' + $doc.road_address.address_name)
  }
  exit 0
}
catch {
  $status = $_.Exception.Response.StatusCode.value__
  Write-Host "[test-kakao] FAIL HTTP $status" -ForegroundColor Red
  if ($status -eq 403) {
    Write-Host '  → REST API 키인지, 제품설정에서 로컬 API ON 인지 확인'
  }
  exit 1
}
