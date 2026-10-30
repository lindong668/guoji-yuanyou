#!/bin/bash
# 确保测试依赖存在（沙盒会周期性清空全局包，每次跑测试前先补）
need=0
[ -d /usr/local/lib/node_modules/jsdom ] || need=1
[ -d /usr/local/lib/node_modules/esbuild ] || need=1
if [ $need -eq 1 ]; then
  npm install -g jsdom esbuild >/dev/null 2>&1
fi
[ -d /usr/local/lib/node_modules/jsdom ] || { echo "jsdom 安装失败"; exit 9; }
[ -d /usr/local/lib/node_modules/esbuild ] || { echo "esbuild 安装失败"; exit 9; }
