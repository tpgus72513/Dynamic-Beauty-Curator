# Local skin multitask model

이 디렉터리의 런타임 원본은 `C:\Users\sunny\Downloads\backend_package.zip`입니다.

- 모델: `final_model.keras` (Git 추적 제외)
- SHA-256: `E835BB5686FF5C3DDF83BA92D52EB7CB4D2E100D1097178775B08A68F313EB15`
- 입력: `260×260 RGB`, `float32`, 외부 픽셀 범위 `0~255`
- 정규화: 모델 내부 Rescaling 사용. API에서 `/255`, `preprocess_input` 또는 추가 Rescaling을 적용하지 않습니다.
- 출력 순서: `pigmentation`, `dryness`, `pore`, `wrinkle`, `sensitivity`
- 검증 얼굴 이미지: `test_images/` (Git 추적 제외)

체크섬 확인:

```powershell
Get-FileHash backend\model\skin_multitask\final_model.keras -Algorithm SHA256
```

`inference_config.json`과 `expected_predictions.json`은 ZIP의 추론 계약을 그대로 추적합니다. 얼굴 검증 이미지는 로컬 테스트에만 사용하고 애플리케이션 저장소나 로그에 기록하지 않습니다.
