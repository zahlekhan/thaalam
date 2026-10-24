#!/bin/sh
# Local dev: ./dev.sh [jev|vegaml]  (the default model; the other one stays selectable in ?dev mode)
# The Jev key comes from the environment, or from SeeFood's .dev.vars as a fallback.
cd "$(dirname "$0")"
export THAALAM_PROVIDER="${1:-jev}"
[ -z "$TYPESAFE_API_KEY" ] && export $(grep '^TYPESAFE_API_KEY=' ../../seefood/.dev.vars | tr -d '"')
if [ -x .venv/bin/python ] && .venv/bin/python -c 'import vegaml' 2>/dev/null; then
  exec .venv/bin/uvicorn app:app --port 8000
fi
exec .venv-lite/bin/uvicorn app:app --port 8000
