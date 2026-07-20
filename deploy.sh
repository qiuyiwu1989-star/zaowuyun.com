#!/usr/bin/env bash
# 把 造物云/ 的 html/md/assets + v8-preview/(现役) + v7-preview/(存档) 子站发布到公网 https://zwy.alimq.com
# 裸域 index.html 现跳转 v8-preview/；v7-preview 保留但不对外导航（仅 log.html 可达）
# 用法: bash deploy.sh
set -e
SRC="$(cd "$(dirname "$0")" && pwd)"
DST=/var/www/zwy
# _archive/ 旧站与草稿：随站发布但只经 log.html 可达（不进任何对外导航），裸域已跳转 v7。
sudo rsync -a --delete --exclude='.git' --exclude='.gitignore' --exclude='deploy.sh' \
  --include='*.html' --include='*.md' --include='assets/***' \
  --include='v8-preview/***' --include='v7-preview/***' --include='_archive/***' \
  --exclude='*' \
  "$SRC"/ "$DST"/
sudo chown -R www-data:www-data "$DST"
echo "已发布 -> https://zwy.alimq.com  ($(date '+%F %T'))"
