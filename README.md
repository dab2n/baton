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
| 3 | `wave` | 하단에서 빛의 파동이 위로 밀려 올라감 | 2.2s |
| 4 | `connecting` | 중심 원은 물러나고 가장자리(`.rim`)를 밝은 호가 훑음 | 3.6s |
| 5 | `connected` | `A Hospital / B-19` 칩이 상단에서 내려오고 → `Hello, Somi.` | 4.6s |
| 6 | `message` | 본문 등장 | 4.2s |
| 7 | `doctor` | 사진 + `Dr. Sophia` + 예약시간/방문목적 | 5.2s |
| 8 | `guide` | `I'll take you to the waiting area.` | 유지 |

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
