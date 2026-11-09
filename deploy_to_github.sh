#!/bin/bash
# ==============================================================================
# NetAdmin OS - Automated GitHub & GitHub Pages Deployment Script
# Uses GitHub REST API v3 / v4 (No local git or Xcode CLI tools required!)
# ==============================================================================
set -e

TOKEN="$1"
REPO_NAME="${2:-netadmin-os}"

if [ -z "$TOKEN" ]; then
  echo "================================================================="
  echo "GitHub Deployment Tool"
  echo "================================================================="
  echo "Usage: ./deploy_to_github.sh <GITHUB_PERSONAL_ACCESS_TOKEN> [REPO_NAME]"
  echo ""
  echo "Need a token? Generate one in 30 seconds at:"
  echo "  https://github.com/settings/tokens/new?scopes=repo,workflow,write:packages"
  echo "================================================================="
  exit 1
fi

echo "==> 1. Verifying GitHub credentials..."
USER_JSON=$(curl -s -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json" https://api.github.com/user)
USERNAME=$(echo "$USER_JSON" | grep -o '"login": "[^"]*' | head -n 1 | cut -d'"' -f4)

if [ -z "$USERNAME" ]; then
  echo "[-] Error: Authentication failed. Please ensure your Personal Access Token is valid."
  echo "$USER_JSON"
  exit 1
fi

echo "[+] Authenticated as GitHub user: @$USERNAME"

echo "==> 2. Ensuring GitHub repository '$REPO_NAME' exists..."
CHECK_REPO=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json" "https://api.github.com/repos/$USERNAME/$REPO_NAME")

if [ "$CHECK_REPO" == "404" ]; then
  echo "    Creating new public repository '$REPO_NAME'..."
  CREATE_RESP=$(curl -s -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/vnd.github+json" \
    https://api.github.com/user/repos \
    -d "{\"name\":\"$REPO_NAME\",\"description\":\"NetAdmin OS - Network Administrator Handbook & Interactive Lab\",\"private\":false,\"auto_init\":false}")
  echo "    Repository created successfully."
else
  echo "    Repository '$REPO_NAME' already exists. Updating contents..."
fi

upload_file() {
  local FILE_PATH="$1"
  local DEST_PATH="$2"
  if [ -f "$FILE_PATH" ]; then
    printf "    -> Uploading %s... " "$DEST_PATH"
    
    # Check if file exists to get SHA for update
    local EXISTING_SHA=$(curl -s \
      -H "Authorization: Bearer $TOKEN" \
      -H "Accept: application/vnd.github+json" \
      "https://api.github.com/repos/$USERNAME/$REPO_NAME/contents/$DEST_PATH" | grep -o '"sha": "[^"]*' | head -n 1 | cut -d'"' -f4 || true)
    
    local B64=$(base64 -i "$FILE_PATH" | tr -d '\n')
    
    if [ -n "$EXISTING_SHA" ]; then
      local PAYLOAD="{\"message\":\"Update $DEST_PATH\",\"content\":\"$B64\",\"sha\":\"$EXISTING_SHA\",\"branch\":\"main\"}"
    else
      local PAYLOAD="{\"message\":\"Add $DEST_PATH\",\"content\":\"$B64\",\"branch\":\"main\"}"
    fi

    local HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT \
      -H "Authorization: Bearer $TOKEN" \
      -H "Accept: application/vnd.github+json" \
      "https://api.github.com/repos/$USERNAME/$REPO_NAME/contents/$DEST_PATH" \
      -d "$PAYLOAD")

    if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "201" ]; then
      echo "Done ($HTTP_CODE)"
    else
      echo "Status $HTTP_CODE"
    fi
  fi
}

echo "==> 3. Uploading site files to 'main' branch..."
upload_file "index.html" "index.html"
upload_file "style.css" "style.css"
upload_file "app.js" "app.js"
upload_file "README.md" "README.md"
upload_file ".gitignore" ".gitignore"
upload_file ".github/workflows/deploy.yml" ".github/workflows/deploy.yml"

echo "==> 4. Configuring GitHub Pages..."
PAGES_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$USERNAME/$REPO_NAME/pages" \
  -d '{"source":{"branch":"main","path":"/"}}')

if [ "$PAGES_HTTP" == "201" ]; then
  echo "    GitHub Pages successfully enabled on branch 'main'!"
elif [ "$PAGES_HTTP" == "409" ]; then
  echo "    GitHub Pages is already configured."
else
  echo "    GitHub Pages configuration response: HTTP $PAGES_HTTP"
fi

LIVE_URL="https://${USERNAME}.github.io/${REPO_NAME}/"

echo ""
echo "================================================================="
echo "  HOSTING COMPLETE!"
echo "================================================================="
echo "  Repository: https://github.com/${USERNAME}/${REPO_NAME}"
echo "  Live URL:   ${LIVE_URL}"
echo "================================================================="
echo "  Note: GitHub Pages takes about 60 to 90 seconds to deploy."
echo "================================================================="
