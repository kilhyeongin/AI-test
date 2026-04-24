#!/bin/bash
set -euo pipefail

cd /var/app/staging

# EB가 --omit=dev로 깔았더라도 devDependencies까지 포함해서 다시 설치
npm ci --include=dev || npm install --include=dev
