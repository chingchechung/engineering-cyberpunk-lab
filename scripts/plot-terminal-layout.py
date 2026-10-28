#!/usr/bin/env python3
"""Generate the report's top-down diagram/table from recorded geometry evidence."""
import json
import math
import os
from pathlib import Path

os.environ.setdefault("MPLCONFIGDIR", "/tmp/engineering-lab-matplotlib")
os.environ.setdefault("XDG_CACHE_HOME", "/tmp/engineering-lab-plot-cache")
Path(os.environ["XDG_CACHE_HOME"]).mkdir(parents=True, exist_ok=True)
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
matplotlib.rcParams["svg.hashsalt"] = "engineering-cyberpunk-lab-phase-3"

ROOT = Path(__file__).resolve().parents[1]
survey = json.loads((ROOT / "tests/fixtures/terminal-survey.json").read_text(encoding="utf-8"))
metrics = json.loads((ROOT / "tests/fixtures/terminal-route-metrics.json").read_text(encoding="utf-8"))
nodes = survey["nodes"]
positions = {key: nodes[index]["position"] for key, index in survey["terminalNodes"].items()}
fig, axis = plt.subplots(figsize=(13.5, 5), layout="constrained")
fig.patch.set_facecolor("#f7fafb")
axis.set_facecolor("#f7fafb")
axis.scatter([node["position"][0] for node in nodes], [node["position"][2] for node in nodes],
             s=9, color="#c2d0d5", label="Surveyed connected street-level nodes (2 m grid)")
colors = ["#265b8d", "#9b5348", "#698433", "#7765a5", "#26888c"]
for index, (key, position) in enumerate(positions.items()):
    points = [nodes[i]["position"] for i in survey["routes"][key]]
    axis.plot([point[0] for point in points], [point[2] for point in points],
              color=colors[index], linewidth=1.5, alpha=0.85, label=f"Spawn → {key} ({metrics['spawn-'+key]:.1f} m)")
    x, _, z = position
    axis.scatter(x, z, s=115, color="#ffdf24", edgecolor="#24313a", zorder=5)
    offset = (-12, 13) if key == "Q04" else (6, -22) if key == "Q05" else (6, 12)
    axis.annotate(key, (x, z), xytext=offset, textcoords="offset points", weight="bold", color="#1c303b")
axis.scatter(survey["start"][0], survey["start"][2], color="#172f43", marker="*", s=180, zorder=6, label="Original grounded spawn")
axis.set_aspect("equal")
axis.set_xlabel("World X (m)  ·  −X west / +X east in this diagram")
axis.set_ylabel("World Z (m)  ·  +Z up")
axis.set_title("Phase 3 terminal distribution — original reachable city, no city expansion", fontsize=13)
axis.grid(alpha=0.22)
axis.legend(loc="upper center", bbox_to_anchor=(0.5, -0.26), ncol=3, fontsize=8, frameon=False)
diagram = ROOT / "docs/phase-3-terminal-layout.svg"
fig.savefig(diagram, metadata={"Date": None})
# Matplotlib emits trailing blanks inside multiline path attributes. Newlines
# already separate SVG tokens; trim them for clean, stable repository diffs.
diagram.write_text("\n".join(line.rstrip() for line in diagram.read_text(encoding="utf-8").splitlines()) + "\n", encoding="utf-8")
plt.close(fig)
ids = list(positions)
print("| Pair | Straight-line centers (m) | Measured walking route between approaches (m) |")
print("| --- | ---: | ---: |")
for index, a in enumerate(ids):
    for b in ids[index + 1:]:
        distance = math.hypot(positions[a][0] - positions[b][0], positions[a][2] - positions[b][2])
        print(f"| {a}–{b} | {distance:.1f} | {metrics[a+'-'+b]:.1f} |")
