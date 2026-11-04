// 인식(얼굴·엄지척) 전용 워커.
// 이 기계에서 추론 한 번이 40~60ms 라, 메인 스레드에서 돌리면 10fps 틱마다 100ms 씩 묶여
// 화면이 4fps 로 더그덕거린다. 프레임을 ImageBitmap 으로 넘겨 여기서만 돌린다.
// 돌려 세우기(세로로 단 캠 보정)도 여기서 한다 — 메인 스레드는 그림 한 장 넘기는 일만.
// 모듈 워커에는 importScripts 가 없다("Module scripts don't support importScripts()").
// MediaPipe 가 wasm 글루를 그걸로 불러오므로, 워커에서만 허용되는 동기 XHR 로 같은 일을 해 준다
self.importScripts = (...urls) => {
  for (const u of urls) {
    const x = new XMLHttpRequest();
    x.open('GET', u, false);
    x.send();
    (0, eval)(x.responseText);
  }
};
import { FilesetResolver, FaceDetector, GestureRecognizer } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs';

const V = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18';
const M = 'https://storage.googleapis.com/mediapipe-models';

let fd, gr, cv, cx, ts = 0;

const ready = (async () => {
  const vision = await FilesetResolver.forVisionTasks(V + '/wasm');
  [fd, gr] = await Promise.all([
    FaceDetector.createFromOptions(vision, { runningMode: 'VIDEO',
      baseOptions: { modelAssetPath: M + '/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite' } }),
    GestureRecognizer.createFromOptions(vision, { runningMode: 'VIDEO', numHands: 1,
      minHandDetectionConfidence: .4, minHandPresenceConfidence: .4, minTrackingConfidence: .4,
      cannedGesturesClassifierOptions: { scoreThreshold: .2 },
      baseOptions: { modelAssetPath: M + '/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task' } }),
  ]);
  postMessage({ ready: true });
})().catch(e => postMessage({ error: String(e) }));

// 캠을 눕혀 달았을 때를 위해 프레임을 돌려 세운다
const upright = (bmp, rot) => {
  const side = (rot / 90) % 2 !== 0;
  const w = side ? bmp.height : bmp.width, h = side ? bmp.width : bmp.height;
  if (!cv || cv.width !== w || cv.height !== h) { cv = new OffscreenCanvas(w, h); cx = cv.getContext('2d'); }
  cx.setTransform(1, 0, 0, 1, 0, 0);
  cx.translate(w / 2, h / 2); cx.rotate(rot * Math.PI / 180);
  cx.drawImage(bmp, -bmp.width / 2, -bmp.height / 2);
  return cv;
};

const faceList = c => fd.detectForVideo(c, ++ts).detections.map(d => ({
  b: [d.boundingBox.originX, d.boundingBox.originY, d.boundingBox.width, d.boundingBox.height],
  k: (d.keypoints || []).slice(0, 4).map(p => [p.x, p.y]),   // 0 오른눈 1 왼눈 2 코 3 입
}));

onmessage = async e => {
  await ready;
  const { bmp, rot, rots, face, hand, gmin } = e.data;
  const out = { rot, faces: [], w: 0, h: 0, up: false, g: null };
  try {
    // 지금 각도로 먼저 보고, 못 찾으면 넘겨받은 후보 각도를 하나씩 시험한다
    for (const r of [rot, ...(rots || [])]) {
      const c = upright(bmp, r);
      out.rot = r; out.w = c.width; out.h = c.height;
      if (!face) break;
      out.faces = faceList(c);
      if (out.faces.length) break;
    }
    if (hand) {
      const c = out.rot === rot ? cv : upright(bmp, out.rot);
      const cats = (gr.recognizeForVideo(c, ++ts).gestures ?? []).flat();
      const best = cats.slice().sort((a, b) => b.score - a.score)[0];
      out.up = cats.some(k => k.categoryName === 'Thumb_Up' && k.score >= gmin);
      out.g = best ? best.categoryName + ' ' + best.score.toFixed(2) : null;
    }
  } catch (err) { out.err = String(err); }
  bmp.close();
  postMessage(out);
};
