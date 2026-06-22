#!/usr/bin/env bash
# 把 造物云/ 的 html/md/assets + v7-preview/ 子站发布到公网 https://zwy.alimq.com
# 用法: bash deploy.sh
set -e
SRC="$(cd "$(dirname "$0")" && pwd)"
DST=/var/www/zwy
sudo rsync -a --delete --exclude='.git' --exclude='.gitignore' --exclude='deploy.sh' \
  --include='*.html' --include='*.md' --include='assets/***' --include='v7-preview/***' \
  --exclude='*' \
  "$SRC"/ "$DST"/
sudo chown -R www-data:www-data "$DST"
echo "已发布 -> https://zwy.alimq.com  ($(date '+%F %T'))"
