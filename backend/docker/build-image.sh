#!/bin/bash
echo "🐳 Building sandbox images..."

docker build -t sandbox-node   -f Dockerfile.node   .
docker build -t sandbox-python -f Dockerfile.python  .
docker build -t sandbox-cpp    -f Dockerfile.cpp     .
docker build -t sandbox-java   -f Dockerfile.java    .

echo "✅ All sandbox images built!"
echo ""
echo "Verify with: docker images | grep sandbox"