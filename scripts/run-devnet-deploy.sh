#!/bin/bash
set -euo pipefail

repo_root="/mnt/c/Users/HP/Desktop/Rentyvest"
cd "$repo_root"

# Make the daml wrapper executable and link it on /tmp
chmod +x scripts/daml-exec.sh
rm -f /tmp/daml
ln -s "$repo_root/scripts/daml-exec.sh" /tmp/daml

# Use the Docker-specific Makefile that hardcodes /tmp/daml
make -f Makefile.docker deploy-devnet deploy-contracts