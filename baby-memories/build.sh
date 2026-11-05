#!/bin/sh
# "Why can't you remember being a baby?" — rebuild the whole film:  sh build.sh [--vo]
#   --vo  re-synthesise the expressive narration (Kokoro, offline, moods from script/lines_el.json) and re-estimate word timings
set -e
LIB=${LIB:-/root/lemo-opuscar}
HERE=$(cd "$(dirname "$0")" && pwd)
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the lemo-opuscar library folder"; exit 1; }
PY="$LIB/.venv/bin/python"
cd "$LIB"
if [ "$1" = "--vo" ]; then
  LIB="$LIB" $PY "$HERE/tools/expressive_tts.py"
  $PY "$HERE/tools/align.py"
  $PY "$HERE/tools/envelope.py"
fi
mkdir -p "$HERE/out"
node core/render/events.mjs "$HERE"                       # strokes, wipes, magnets, cues → events.json
$PY "$HERE/music.py"                                      # original score → music/score.wav
$PY "$HERE/mix.py"                                        # foley + voice + score → out/mix.wav
node core/render/video.mjs "$HERE" --fps 24 --workers 4 --out "$HERE/out/video.mp4"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/baby-memories.mp4" 24 1
node "$HERE/tools/subs.mjs" && $PY core/render/srt.py "$HERE/out/subs.json" "$HERE/baby-memories.srt"
node core/render/still.mjs "$HERE" 26.5 --q nosubs=1 --prefix poster_ --out "$HERE/out" && cp "$HERE/out/poster_26.5.jpg" "$HERE/poster.jpg"
echo "built $HERE/baby-memories.mp4"
