#!/bin/bash
# Find the repo root (look for Makefile)
root_dir="$PWD"
while [ "$root_dir" != "/" ] && [ ! -f "$root_dir/Makefile" ]; do
  root_dir="$(dirname "$root_dir")"
done
[ ! -f "$root_dir/Makefile" ] && root_dir="$PWD"

# Calculate the relative path from root to current dir
rel_path=""
if [ "$PWD" != "$root_dir" ]; then
  rel_path="${PWD#$root_dir}"
fi

# Run daml in Docker with SDK version set so it doesn't complain about version mismatch
docker run --rm \
  -e DAML_SDK_VERSION=3.4.0-rc2 \
  -v /mnt/c:/mnt/c \
  -v "$root_dir:/workspace" \
  -w "/workspace$rel_path" \
  --user daml \
  digitalasset/daml-sdk:3.4.0-rc2 \
  /home/daml/.daml/bin/daml "$@"

