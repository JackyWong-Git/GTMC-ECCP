#!/bin/bash
set -Eeuo pipefail


PORT=5000
COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
DEPLOY_RUN_PORT="${DEPLOY_RUN_PORT:-${PORT}}"


cd "${COZE_WORKSPACE_PATH}"

kill_port_if_listening() {
    local pids
    if command -v ss &>/dev/null; then
      # Linux: use ss
      pids=$(ss -H -lntp 2>/dev/null | awk -v port="${DEPLOY_RUN_PORT}" '$4 ~ ":"port"$"' | grep -o 'pid=[0-9]*' | cut -d= -f2 | paste -sd' ' - || true)
    elif command -v lsof &>/dev/null; then
      # macOS: use lsof
      pids=$(lsof -ti:"${DEPLOY_RUN_PORT}" 2>/dev/null | paste -sd' ' - || true)
    else
      echo "Warning: neither ss nor lsof available, skipping port check"
      return
    fi
    if [[ -z "${pids}" ]]; then
      echo "Port ${DEPLOY_RUN_PORT} is free."
      return
    fi
    echo "Port ${DEPLOY_RUN_PORT} in use by PIDs: ${pids} (SIGKILL)"
    echo "${pids}" | xargs -I {} kill -9 {} 2>/dev/null || true
    sleep 1
    echo "Port ${DEPLOY_RUN_PORT} cleared."
}

echo "Clearing port ${DEPLOY_RUN_PORT} before start."
kill_port_if_listening
echo "Starting HTTP service on port ${DEPLOY_RUN_PORT} for dev..."

PORT=${DEPLOY_RUN_PORT} pnpm tsx watch src/server.ts
