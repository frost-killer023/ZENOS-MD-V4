#!/bin/bash
# Script pour pousser ZENOS-MD-V1 vers GitHub
# Usage: GITHUB_TOKEN=ton_token bash push-to-github.sh

GITHUB_USER="frost-killer023"
REPO_NAME="ZENOS-MD-V3"
TOKEN="${GITHUB_TOKEN}"

if [ -z "$TOKEN" ]; then
  echo "❌ Token manquant. Mets GITHUB_TOKEN dans les secrets Replit."
  exit 1
fi

cd "$(dirname "$0")"

# Créer le dépôt s'il n'existe pas
echo "🔍 Vérification du dépôt GitHub..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: token $TOKEN" \
  "https://api.github.com/repos/$GITHUB_USER/$REPO_NAME")

if [ "$HTTP_STATUS" = "404" ]; then
  echo "📦 Création du dépôt $REPO_NAME..."
  curl -s -X POST \
    -H "Authorization: token $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$REPO_NAME\",\"description\":\"Bot WhatsApp multiservices - ZENOS-MD\",\"private\":true}" \
    "https://api.github.com/user/repos" > /dev/null
  echo "✅ Dépôt créé (privé)"
else
  echo "✅ Dépôt existant trouvé"
fi

# Init git si nécessaire
if [ ! -d ".git" ]; then
  git init
  git branch -M main
fi

git config user.email "bot@zenos-md.com"
git config user.name "$GITHUB_USER"

# Configurer l'origine
git remote remove origin 2>/dev/null || true
git remote add origin "https://$TOKEN@github.com/$GITHUB_USER/$REPO_NAME.git"

# Ajouter et committer
git add .
git diff --cached --quiet || git commit -m "🚀 ZENOS-MD-V1 - Bot WhatsApp complet (245 commandes)"

# Pousser
echo "📤 Push vers GitHub..."
git push -u origin main --force 2>&1

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ CODE PUSHÉ AVEC SUCCÈS!"
  echo "🔗 https://github.com/$GITHUB_USER/$REPO_NAME"
else
  echo "❌ Erreur lors du push"
fi
