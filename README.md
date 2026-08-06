# Dynamic Beauty Curator

얼굴 사진을 로컬 TensorFlow 모델로 분석하고, 색소침착·건조·모공·주름·민감 위험도와 현재 환경을 조합해 제품 순서와 추천 문구를 개인화하는 프로토타입입니다.

현재 구현 범위:

- 닉네임 로컬 로그인 및 로그아웃
- 브라우저 카메라 촬영과 JPG·PNG·WEBP 파일 선택
- `backend_package.zip`의 5출력 모델을 사용하는 실제 분석
- 5개 위험도, 상위 2개 우선 관리 항목, 위험도별 추천 문구
- 위험도·환경·성분 가중치에 따른 제품 정렬 및 제외 성분 안내

공개 배포는 포함하지 않았습니다. 현재는 로컬에서 백엔드와 프론트엔드를 각각 실행합니다.

## 1. 준비물

- Windows PowerShell
- Python과 Node.js/npm
- 모델 원본: `C:\Users\sunny\Downloads\backend_package.zip`

저장소 루트에서 아래 명령을 실행합니다.

```powershell
python -m venv .venv
& ".\.venv\Scripts\python.exe" -m pip install --upgrade pip
& ".\.venv\Scripts\python.exe" -m pip install -r backend\requirements.txt
Set-Location frontend
npm.cmd install
Set-Location ..
```

외부 환경 API 키는 선택 사항입니다. 키가 없거나 호출에 실패하면 발표용 fallback 환경 데이터를 사용합니다. 실제 키를 쓰려면 `backend\.env.example`을 `backend\.env`로 복사한 뒤 값을 입력하세요. `.env`는 Git에 올리지 않습니다.

## 2. ZIP 모델 설치

ZIP이 모델 계약의 기준입니다. 실제 계약은 `260×260 RGB`, 외부 입력 `float32 0~255`, 모델 내부 정규화, Sigmoid 5출력 `[색소침착, 건조, 모공, 주름, 민감]`입니다. API에서 이미지를 `/255`로 다시 나누지 않습니다.

```powershell
$packageZip = 'C:\Users\sunny\Downloads\backend_package.zip'
$extractDir = Join-Path $env:TEMP 'dbc_backend_package_install'
New-Item -ItemType Directory -Force -Path $extractDir | Out-Null
Expand-Archive -LiteralPath $packageZip -DestinationPath $extractDir -Force
New-Item -ItemType Directory -Force -Path 'backend\model\skin_multitask' | Out-Null
Copy-Item -LiteralPath "$extractDir\backend_package\final_model.keras" -Destination 'backend\model\skin_multitask\final_model.keras'
Copy-Item -LiteralPath "$extractDir\backend_package\inference_config.json" -Destination 'backend\model\skin_multitask\inference_config.json'
Copy-Item -LiteralPath "$extractDir\backend_package\expected_predictions.json" -Destination 'backend\model\skin_multitask\expected_predictions.json'
Copy-Item -LiteralPath "$extractDir\backend_package\test_images" -Destination 'backend\model\skin_multitask\test_images' -Recurse -Force
```

체크섬을 확인합니다.

```powershell
Get-FileHash backend\model\skin_multitask\final_model.keras -Algorithm SHA256
```

예상 SHA-256:

```text
E835BB5686FF5C3DDF83BA92D52EB7CB4D2E100D1097178775B08A68F313EB15
```

모델 파일과 얼굴 검증 이미지는 `.gitignore`로 제외되어 Git에 올라가지 않습니다.

## 3. 실행 방법

PowerShell 터미널 두 개를 엽니다.

터미널 1 — 백엔드:

```powershell
Set-Location backend
& "..\.venv\Scripts\python.exe" run.py
```

터미널 2 — 프론트엔드:

```powershell
Set-Location frontend
npm.cmd run dev -- --host 127.0.0.1
```

브라우저에서 다음 주소를 엽니다.

- 앱: `http://127.0.0.1:5173`
- API 상태: `http://127.0.0.1:8000`
- API 문서: `http://127.0.0.1:8000/docs`

카메라는 브라우저 보안 정책상 `localhost`/`127.0.0.1` 또는 HTTPS에서만 사용하세요. 권한이 없거나 카메라가 없는 경우 화면의 `사진 선택`을 사용할 수 있습니다.

## 4. 데이터 및 개인정보 처리

- 닉네임만 브라우저 `localStorage`에 `dbc.nickname`으로 저장합니다.
- 촬영·선택한 사진은 분석을 위해 로컬 백엔드로 전송됩니다.
- 백엔드는 이미지 바이트를 메모리에서만 디코딩·추론하고 파일이나 데이터베이스에 저장하지 않습니다.
- 성공 후 사진 참조를 즉시 해제하며, 실패 시에는 사용자가 재시도하는 동안에만 프론트 메모리에 유지합니다.
- 화면의 위험도는 화장품 추천을 위한 AI 결과이며 의료 진단이 아닙니다.

## 5. 검증

저장소 루트에서 백엔드 테스트:

```powershell
& ".\.venv\Scripts\python.exe" -m pytest backend\tests -q
```

프론트엔드 단위 테스트, 린트, 빌드:

```powershell
Set-Location frontend
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

전체 브라우저 흐름 테스트는 백엔드·프론트 서버를 자동으로 시작하고 Chromium의 가상 카메라로 실제 모델 추론까지 실행합니다.

```powershell
npm.cmd run e2e
```

처음 한 번 Playwright 브라우저가 없다면 설치합니다.

```powershell
npx.cmd playwright install chromium
```

Codex 관리 환경에서 한글 경로의 기존 `dist` 삭제가 차단되어 Vite가 오류 메시지 없이 종료되는 경우에만 다음 검증 명령을 사용합니다. 일반 개발 환경에서는 표준 `npm.cmd run build`를 사용하세요.

```powershell
npm.cmd run build -- --emptyOutDir=false
```

## 6. 주요 폴더

```text
backend/app/                         FastAPI, 모델 추론, 추천 규칙
backend/data/skin_risk_rules.json   5개 위험도별 카테고리·성분·제외 규칙
backend/model/skin_multitask/       모델 계약과 로컬 모델 위치
frontend/src/                       React 화면, 카메라, API 연결, 개인화 정렬
frontend/e2e/                       전체 사용자 흐름 테스트
```
