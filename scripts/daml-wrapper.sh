#!/bin/bash
# Find the root directory by looking for Makefile
root_dir="$PWD"
while [ "$root_dir" != "/" ] && [ ! -f "$root_dir/Makefile" ]; do
  root_dir="$(dirname "$root_dir")"
done

if [ ! -f "$root_dir/Makefile" ]; then
  root_dir="$PWD"
fi

# Mount the root and workspace, keeping cwd relative to the mounted root
exec docker run --rm \
  -v /mnt/c:/mnt/c \
  -v "$root_dir:/workspace" \
  -w "/workspace/$(pwd | sed "s|^$root_dir||")" \
  --user daml \
  digitalasset/daml-sdk:3.4.0-rc2 \
  /home/daml/.daml/bin/daml "$@"
