#!/usr/bin/env bash
# Deploy Agent Promotion Line to OpenShift with Red Hat OAuth.
# Prerequisites: oc login, podman available.
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

NAMESPACE="agent-promotion"
REGISTRY=""
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${YELLOW}=== Agent Promotion Line: Deploy to OpenShift ===${NC}"
echo ""

# 1. Verify oc login
echo -e "${YELLOW}[1/6] Verifying OpenShift login...${NC}"
oc whoami || { echo -e "${RED}Not logged in. Run: oc login --web${NC}"; exit 1; }
echo ""

# 2. Create namespace
echo -e "${YELLOW}[2/6] Creating namespace...${NC}"
oc apply -f "$SCRIPT_DIR/namespace.yaml"
oc project "$NAMESPACE"
echo ""

# 3. Determine registry
echo -e "${YELLOW}[3/6] Determining image registry...${NC}"
REGISTRY=$(oc get route default-route -n openshift-image-registry -o jsonpath='{.spec.host}' 2>/dev/null || echo "")
if [ -z "$REGISTRY" ]; then
    echo "No external registry route found. Exposing internal registry..."
    oc patch configs.imageregistry.operator.openshift.io/cluster --type merge -p '{"spec":{"defaultRoute":true}}' 2>/dev/null || true
    sleep 5
    REGISTRY=$(oc get route default-route -n openshift-image-registry -o jsonpath='{.spec.host}' 2>/dev/null || echo "")
fi
if [ -z "$REGISTRY" ]; then
    echo -e "${RED}Could not determine registry route.${NC}"
    echo "Falling back to internal registry for BuildConfig-based builds."
    REGISTRY="image-registry.openshift-image-registry.svc:5000"
fi
echo "Registry: $REGISTRY"
echo ""

# 4. Build and push images
echo -e "${YELLOW}[4/6] Building and pushing images...${NC}"
if [[ "$REGISTRY" != *"svc:5000"* ]]; then
    podman login -u "$(oc whoami)" -p "$(oc whoami -t)" "$REGISTRY" --tls-verify=false 2>&1

    echo "  Building service image..."
    podman build --platform linux/amd64 -f "$REPO_DIR/Containerfile.service" -t "$REGISTRY/$NAMESPACE/apl-service:latest" "$REPO_DIR" 2>&1 | tail -3

    echo "  Building demo image..."
    podman build --platform linux/amd64 -f "$REPO_DIR/Containerfile.demo" -t "$REGISTRY/$NAMESPACE/apl-demo:latest" "$REPO_DIR" 2>&1 | tail -3

    echo "  Pushing service image..."
    podman push "$REGISTRY/$NAMESPACE/apl-service:latest" --tls-verify=false 2>&1 | tail -3

    echo "  Pushing demo image..."
    podman push "$REGISTRY/$NAMESPACE/apl-demo:latest" --tls-verify=false 2>&1 | tail -3
else
    echo "  Using OpenShift BuildConfigs (internal registry)..."
    oc new-build --name=apl-service --binary --strategy=docker -n "$NAMESPACE" 2>/dev/null || true
    oc start-build apl-service --from-dir="$REPO_DIR" --follow -n "$NAMESPACE" --build-arg DOCKERFILE=Containerfile.service

    oc new-build --name=apl-demo --binary --strategy=docker -n "$NAMESPACE" 2>/dev/null || true
    oc start-build apl-demo --from-dir="$REPO_DIR" --follow -n "$NAMESPACE" --build-arg DOCKERFILE=Containerfile.demo
fi
echo ""

# 5. Apply manifests
echo -e "${YELLOW}[5/6] Applying manifests...${NC}"
oc apply -f "$SCRIPT_DIR/service.yaml"
oc apply -f "$SCRIPT_DIR/nginx-configmap.yaml"
oc apply -f "$SCRIPT_DIR/demo-oauth.yaml"
echo ""

# 6. Wait for rollout
echo -e "${YELLOW}[6/6] Waiting for rollout...${NC}"
oc rollout status deployment/apl-service -n "$NAMESPACE" --timeout=120s
oc rollout status deployment/apl-demo -n "$NAMESPACE" --timeout=120s

ROUTE_URL=$(oc get route apl-demo -n "$NAMESPACE" -o jsonpath='{.spec.host}' 2>/dev/null || echo "")
echo ""
echo -e "${GREEN}=== Deployed ===${NC}"
echo ""
if [ -n "$ROUTE_URL" ]; then
    echo "  Demo:     https://$ROUTE_URL"
    echo "  Auth:     Red Hat OAuth (OpenShift SSO)"
fi
echo "  Service:  apl-service.$NAMESPACE.svc:8000"
echo ""
echo "  To tear down: oc delete namespace $NAMESPACE"
