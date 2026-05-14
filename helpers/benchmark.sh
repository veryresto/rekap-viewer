#!/usr/bin/env bash

URL="${1:-https://rekap.veryresto.com/api/rekap}"

echo "========================================"
echo "Benchmark"
echo "Time: $(date -u)"
echo "Host: $(hostname)"
echo "URL : $URL"
echo "========================================"

echo
echo "=== Response Headers ==="
curl -s -D - -o /dev/null "$URL" | grep -Ei '^(x-fly-region|x-cache|server|fly-request-id|date)'

echo
echo "=== Timing Metrics ==="

curl -o /dev/null -s -w "
DNS Lookup      : %{time_namelookup}s
TCP Connect     : %{time_connect}s
TLS Handshake   : %{time_appconnect}s
TTFB            : %{time_starttransfer}s
Total           : %{time_total}s
Download Speed  : %{speed_download} bytes/s
Remote IP       : %{remote_ip}
HTTP Version    : %{http_version}
Response Code   : %{response_code}

" "$URL"