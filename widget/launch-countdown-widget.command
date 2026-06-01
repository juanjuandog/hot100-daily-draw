#!/bin/zsh

set -e

cd "$(dirname "$0")"

mkdir -p .build
swiftc CountdownWidget.swift -o .build/hot100-countdown-widget
nohup ./.build/hot100-countdown-widget >/tmp/hot100-countdown-widget.log 2>&1 &
