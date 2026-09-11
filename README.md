# baton

7인치 원형 디스플레이(1080×1080)용 인터랙션 프로토타입.
피그마 디자인을 웹으로 구현한 것으로, 의존성 없는 단일 HTML 파일이다.

**데모 → https://dab2n.github.io/baton/**

## 시퀀스

화면을 한 번 탭하면 끝까지 자동 재생되고, 다시 탭하면 처음으로 돌아간다.

| | 상태 | 화면 | 머무는 시간 |
|---|---|---|---|
| 1 | `idle` | 검정 + 중앙 원이 배회 | **얼굴 근접** 또는 탭 |
| 2 | `fill` | 원이 커져 화면을 채움 + `Hello, do you need help?` | **엄지척** 또는 탭 |
| 3 | `connecting` | 중심 원은 물러나고 가장자리가 숨쉬듯 밝아졌다 잦아듦 | 4.2s |
| 4 | `connected` | `A Hospital / B-19` 칩이 상단에서 내려오고 → `Hello, Somi.` | 4.3s |
| 5 | `message` | 본문 등장 | 6.4s |
| 6 | `doctor` | 사진 + `Dr. Sophia` + 예약시간/방문목적 | 7.2s |
| 7 | `guide` | `I'll take you to the waiting area.` | 유지 |

`fill` 의 문장만 `mix-blend-mode:normal` 단색 — 엄지척 이전/이후를 시각적으로 구분한다.

## 카메라 (MediaPipe Tasks Vision, CDN)

`idle` 에서 FaceDetector, `fill` 에서 GestureRecognizer 를 10fps 로 번갈아 돌린다.
근접 판정은 `얼굴 폭 ÷ 프레임 폭 ≥ NEAR`. 웹캠 화각마다 다르니 실기기에서 `NEAR`(기본 .34 ≈ 30cm)
와 `HITS`(연속 프레임 수) 두 상수만 보정하면 된다. https 또는 localhost 필요.
카메라/권한이 없으면 조용히 꺼지고 탭 조작만 남는다. 오른쪽 아래 작은 글씨가 인식 상태.

타이밍은 `index.html` 하단의 `HOLD` 배열에서 조정한다.

## 구조

피그마의 6개 프레임은 전부 **같은 배경 레이어 4장을 좌표만 바꿔 쓴 것**이라,
화면을 갈아끼우지 않고 하나의 DOM에서 좌표만 보간한다. 그래서 전 구간이 컷 없이 이어진다.

```
A .field  Ellipse 59    큰 그라디언트 필드 (idle 에선 중앙의 작은 원)
B .sheen  Ellipse 58    424×420 #DEF2FF  — 전 구간 좌표 고정
C .core   Ellipse 31229 332×328 #FDFFDE  — connecting 에서 켜지고 doctor 에서 꺼짐
D .cyan   Ellipse 60    시안 블롭         — 본문 장면에서만 크게
```

좌표는 피그마 1080 단위를 그대로 CSS px 로 쓰고, 마지막에 `.device` 를 통째로 `scale()` 한다.
(피그마 좌표 − 20px 보더 = padding box 기준)

주의할 점 두 가지:

- **blur 는 래퍼(`.blur39`)에 건다.** 요소에 직접 걸면 `scale()` 할 때 흐림 반경이 같이 커져,
  작을 땐 딱딱한 점이 되고 클 땐 뭉개진다.
- **상태 전환은 `transform`, 일렁임은 `translate`/`scale`/`rotate` 개별 속성**으로 분리한다.
  둘 다 `transform` 을 쓰면 서로 덮어쓴다.

## 실기기 배포

```
https://dab2n.github.io/baton/#screen
```

`#screen` 을 붙이면 제품 목업 테두리와 토글 버튼이 사라지고 스크린이 `100vmin` 을 꽉 채운다.
브라우저에서는 우측 토글 버튼으로도 목업을 끄고 켤 수 있다.

키오스크 재생은 Fully Kiosk Browser(안드로이드) 또는
라즈베리파이 + `chromium-browser --kiosk` 오토스타트를 쓴다.

## 폰트

디자인 원본은 **Delight** 지만 웹폰트 파일이 없어 **Inter**(Google Fonts)로 대체했다.
전시장이 오프라인이면 `.woff2` 를 받아 `@font-face` 로 로컬에 넣어야 한다.

## 파일

```
index.html   전체 (CSS·JS·아이콘 마스크 인라인)
doctor.png   의료진 사진
spark.svg    Connecting 아이콘
```

## 모션 원본

- 연결 인식 모션(`connecting`)의 별 애니메이션 : After Effects `~/Desktop/grad_motion1.aep`
  - 엄지척 구 : `~/Desktop/grad_motion.aep_AME/별_3.mp4` 0~2.6s
  - 스트로크 : `~/Desktop/grad_motion.aep_AME/별_2.mp4` (27s, AE 프로젝트명 별_4)
  - `star.*` : 0~2.6s 를 `scale=2248:1264,crop=1080:1080:602:94` (절정 글로우 약 888 → 1034, 스크린 지름 1040 을 거의 채움. 실측 중심 541,541)
  - `stroke.*` : 별_2.mp4 를 0.9s 부터 `scale=2322:1306,crop=1080:1080:628:104`
    (링 중심 (965.5,532.3)·안쪽 경계 413.6 → 500. 밝은 띠 505~517 이 스크린 가장자리 520 에 붙는다.
    27s 라 왕복 없이 connecting 2.9s 부터 I'll take you 까지(약 18s) 한 번에 재생)
  - 인코딩 : VP9 `-crf 14 -b:v 0 -aq-mode 2` / H.264 `-crf 14 -preset slow -x264-params aq-mode=3`.
    화면 대부분이 검정이라 전체 PSNR 은 높게 나와도 어두운 글로우가 먼저 깨진다. 비트레이트를 아끼지 말 것
  - 자잘한 타이밍·색 수정은 aep 에서 하고 다시 내보내 같은 crop 으로 갈아끼운다
- 기본 화면 키 비주얼 : 피그마 `node-id=3124-17775`
- Hello! Somi : 피그마 `node-id=3139-207`
- 기록 카드(병원·의사·"You had-" 통합) : 피그마 `node-id=3142-299`
  - `card-hospital.webp` / `card-doctor.webp` 는 그 프레임의 이미지 애셋

## 로컬 확인

`python -m http.server` 는 Range 요청을 200 으로 답해서 크롬이 영상을 못 읽는다.
Range 를 지원하는 서버로 띄워야 `star.*` 가 재생된다.

## 피그마 대조에서 걸린 함정

- **프레임 테두리**: 링크 프레임은 `border:20px solid #000` 이다. `.screen` 클립을
  `circle(520px at 540px 540px)` 로 맞춰야 베젤 두께가 같아진다.
  배경 그라디언트 정지점 %도 1080 이 아니라 20px 안쪽 1040 기준이라
  `no-repeat 0 20px / 100% 1040px` 로 박스를 잡아야 한다.
- **그라디언트 보간**: 피그마는 알파를 곱하지 않고(non-premultiplied) 색을 섞고
  CSS 는 곱한 채 섞는다. `rgba(10,24,63,0) → rgba(125,143,193,.83)` 처럼
  투명한 쪽 색이 어두우면 CSS 에선 그 색이 무시돼 20 정도 밝아진다.
  중간 정지점을 직접 계산해 박아야 같아진다.
- **Progressive blur**: 코드젠은 균일 `backdrop-blur` 로 납작하게 내보낸다.
  흐린 판을 여러 장 겹쳐 마스크로 아래에서부터 드러내야 한다.
- 대조 방법: `?s=N` (한 장면 정지, 1080 1:1) 을 헤드리스로 렌더해
  `get_screenshot` 로 받은 피그마 PNG 와 픽셀을 직접 비교한다.

## 한국어 폰트

`fonts/SFProKR-Semibold.otf`, `fonts/SFProKR-Bold.otf` (원본 `~/Downloads/SFProKR_OTF.zip`).
Apple SF Pro KR 은 재배포할 수 없는 라이선스라 **공개 저장소에 올리지 않는다** (`.gitignore`).
로컬 키오스크에서만 적용되고, 배포본(GitHub Pages)에서는 Pretendard 로 떨어진다.

## follow-up 장면 (피그마 3153:214)

- `message` 다음 `followup` : "Today is your 2nd follow-up." + Samsung Medical Center 카드
- 지난 카드(Northgate)는 왼쪽으로 밀리며 작아지고(0.86) 어두워진 뒤(밝기 .45) 사라지고, 새 카드가 오른쪽에서 같은 곡선으로 들어온다
- `card-samsung.webp` 는 피그마처럼 **늘려 채운다(object-fit: fill)**. 코드젠에 `object-cover` 가 빠져 있는 게 실제 디자인이다 (PNG 대조 오차 0.8/255, cover 로는 21.4)
- 카드 글자는 알파벳이 무작위 순서로 다다닥, 그 중간에 의사 사진이 제자리에서 나타난다
- 강조어 글리밍 : 같은 글자를 #FEFFF9 로 한 겹 더, 오른쪽으로 갈수록 흐리게 (피그마 progressive blur 를 코드젠이 균일 blur 5.95 로 내보냄)
