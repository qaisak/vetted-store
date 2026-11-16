#!/bin/bash
# Run headless Claude Code in the current folder with a clean config: no user-level skills, plugins or settings.
# Usage: cc.sh <model> <prompt> [extra claude args...]
SP=${DT_ROOT:?set DT_ROOT to a work folder}
mkdir -p "$SP/dt/home" "$SP/dt/cfg-$$"
model="$1"; prompt="$2"; shift 2
exec env -i PATH="$PATH" HOME="$SP/dt/home" CLAUDE_CONFIG_DIR="$SP/dt/cfg-$$" ANTHROPIC_BASE_URL="$ANTHROPIC_BASE_URL" \
  HTTPS_PROXY="$HTTPS_PROXY" HTTP_PROXY="$HTTP_PROXY" NO_PROXY="$NO_PROXY" NODE_EXTRA_CA_CERTS="$NODE_EXTRA_CA_CERTS" SSL_CERT_FILE="$SSL_CERT_FILE" \
  claude -p "$prompt" --model "$model" "$@" < /dev/null
