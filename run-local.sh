#!/usr/bin/env bash
# Run the Agent Promotion Line locally in a Podman pod.
# Service (FastAPI) on port 8000, Demo (React + nginx) on port 3000.
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

POD_NAME="apl-demo"
SERVICE_IMAGE="apl-service"
DEMO_IMAGE="apl-demo-ui"

echo -e "${YELLOW}=== Agent Promotion Line: Local Run ===${NC}"

# Cleanup any previous run
if podman pod exists "$POD_NAME" 2>/dev/null; then
    echo "Cleaning up previous pod..."
    podman pod rm -f "$POD_NAME" 2>/dev/null || true
fi

# Build images
echo -e "${YELLOW}[1/4] Building service image...${NC}"
podman build -f Containerfile.service -t "$SERVICE_IMAGE" . 2>&1 | tail -3

echo -e "${YELLOW}[2/4] Building demo image...${NC}"
podman build -f Containerfile.demo -t "$DEMO_IMAGE" . 2>&1 | tail -3

# Create pod with ports
echo -e "${YELLOW}[3/4] Creating pod and starting containers...${NC}"
podman pod create --name "$POD_NAME" -p 3000:3000 -p 8000:8000

podman run -d --pod "$POD_NAME" --name "${POD_NAME}-service" "$SERVICE_IMAGE"
podman run -d --pod "$POD_NAME" --name "${POD_NAME}-ui" "$DEMO_IMAGE"

# Wait for service health
echo -e "${YELLOW}[4/4] Waiting for service...${NC}"
for i in $(seq 1 15); do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/authority/health-probe 2>/dev/null | grep -q "200"; then
        echo -e "${GREEN}Service healthy.${NC}"
        break
    fi
    if [ "$i" -eq 15 ]; then
        echo -e "${RED}Service did not become healthy in 15 seconds.${NC}"
        echo "Check logs: podman logs ${POD_NAME}-service"
        exit 1
    fi
    sleep 1
done

echo ""
echo -e "${GREEN}=== Running ===${NC}"
echo "  Service:  http://localhost:8000"
echo "  Demo UI:  http://localhost:3000"
echo ""
echo "  Keyboard: 0-4 to jump layers, R to reset"
echo "  Cleanup:  podman pod rm -f $POD_NAME"
echo ""

# Open browser
if command -v open &>/dev/null; then
    open http://localhost:3000
elif command -v xdg-open &>/dev/null; then
    xdg-open http://localhost:3000
fi
