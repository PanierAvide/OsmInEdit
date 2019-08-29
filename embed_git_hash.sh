#!/bin/bash

# This script changes config.json file to include last Git hash (for client-side display)
# This should be run only on production pipelines
# config.json source file should have a "GIT_HASH" label properly defined

sed -i "s/GIT_HASH/`git rev-parse --short HEAD`/g" src/config/config.json
