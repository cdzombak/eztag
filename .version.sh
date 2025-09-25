#!/usr/bin/env bash

set -euo pipefail

# Determine the version of this Git repository

# Check if there's a tag at the current HEAD
if git describe --exact-match --tags HEAD >/dev/null 2>&1; then
    # If there's a tag, use it (removing the 'v' prefix if present)
    git describe --exact-match --tags HEAD | sed 's/^v//'
else
    # If no tag at HEAD, use git describe to generate a version
    # This creates a version like "1.2.3-4-g1234567" where:
    # - 1.2.3 is the most recent tag
    # - 4 is the number of commits since that tag
    # - g1234567 is the abbreviated commit hash
    git describe --tags --always --dirty | sed 's/^v//'
fi