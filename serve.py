# 로컬 확인용 서버 : python3 serve.py [포트] (기본 8777)
# python -m http.server 는 Range 요청을 200 으로 답해서 크롬이 영상(star·stroke)을 못 읽는다 → Range 만 206 으로 답한다
import http.server, os, re, sys

class H(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        rng = self.headers.get('Range')
        path = self.translate_path(self.path)
        if not rng or not os.path.isfile(path):
            return super().send_head()
        size = os.path.getsize(path)
        m = re.match(r'bytes=(\d*)-(\d*)', rng)
        start = int(m.group(1)) if m and m.group(1) else 0
        end = min(int(m.group(2)) if m and m.group(2) else size - 1, size - 1)
        f = open(path, 'rb'); f.seek(start)
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(end - start + 1))
        self.send_header('Accept-Ranges', 'bytes')
        self.end_headers()
        self.remaining = end - start + 1
        return f

    def copyfile(self, src, dst):
        n = getattr(self, 'remaining', None)
        if n is None:
            return super().copyfile(src, dst)
        while n > 0:
            chunk = src.read(min(65536, n))
            if not chunk: break
            dst.write(chunk); n -= len(chunk)

    def log_message(self, *a): pass

http.server.ThreadingHTTPServer(('', int(sys.argv[1]) if len(sys.argv) > 1 else 8777), H).serve_forever()
