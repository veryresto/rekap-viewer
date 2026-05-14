# Overview
Measuring latency between architecture v1 and v2.

# Commands
## multiple variable
 curl -o /dev/null -s -w "
DNS: %{time_namelookup}
Connect: %{time_connect}
TLS: %{time_appconnect}
TTFB: %{time_starttransfer}
Total: %{time_total}
\n" https://rekap.veryresto.com 

# Results

## First - Before Cache Implementation
a@as-MacBook-Pro rekap-viewer % date && curl -I https://rekap.veryresto.com
Thu May 14 14:17:03 WIB 2026
HTTP/2 200 
x-powered-by: Express
accept-ranges: bytes
cache-control: public, max-age=0
last-modified: Wed, 13 May 2026 16:38:22 GMT
etag: W/"a08-19e22342030"
content-type: text/html; charset=utf-8
content-length: 2568
date: Thu, 14 May 2026 07:17:07 GMT
server: Fly/8829d9560 (2026-05-12)
via: 2 fly.io
fly-request-id: 01KRJNH89DJMF7G7QW476MYGAR-sin

a@as-MacBook-Pro rekap-viewer % curl -o /dev/null -s -w "                  
DNS: %{time_namelookup}
Connect: %{time_connect}
TLS: %{time_appconnect}
TTFB: %{time_starttransfer}
Total: %{time_total}
\n" https://rekap.veryresto.com

DNS: 0.001197
Connect: 0.611256
TLS: 1.130201
TTFB: 1.634878
Total: 1.685033

a@as-MacBook-Pro rekap-viewer % 

## Second - After Cache Implementation
a@as-MacBook-Pro rekap-viewer % curl -I https://rekap.veryresto.com/api/rekap
HTTP/2 200 
x-powered-by: Express
x-fly-region: sin
x-cache-updated-at: 2026-05-14T07:50:55.778Z
x-cache-age: 250
content-type: application/json; charset=utf-8
content-length: 134362
etag: W/"20cda-SrSXA8iWz7HLtvcVnIcNZmx64S0"
date: Thu, 14 May 2026 07:55:06 GMT
server: Fly/8829d9560 (2026-05-12)
via: 2 fly.io
fly-request-id: 01KRJQPTXE41RPXDC29W1H9J79-sin

a@as-MacBook-Pro rekap-viewer %  curl -o /dev/null -s -w "
DNS: %{time_namelookup}
Connect: %{time_connect}
TLS: %{time_appconnect}
TTFB: %{time_starttransfer}
Total: %{time_total}
\n" https://rekap.veryresto.com

DNS: 0.001176
Connect: 0.047394
TLS: 0.378947
TTFB: 0.440732
Total: 0.450328

## Third