#!/usr/bin/env bash
set -euo pipefail

# Keep tools and caches outside the checkout. Never write credentials here.
lab_repo="${ENGINEERING_LAB_REPO:-/workspace/engineering-cyberpunk-lab}"
lab_tools=/workspace/.engineering-cyberpunk-tools
lab_node_version=22.23.4
case "$(uname -s)/$(uname -m)" in
  Linux/x86_64)
    lab_node_platform=linux-x64
    lab_node_sha256=1805bcd35e6815559bd2eb97db438d3fdb0eb3a5e6a977b7c1badca76337e9ce
    ;;
  Linux/aarch64)
    lab_node_platform=linux-arm64
    lab_node_sha256=6287aa46b6c375d816e63ae66d024fbbfd70404825aabdfdf898a970871d2f4b
    ;;
  *) printf 'Unsupported cloud platform: %s/%s\n' "$(uname -s)" "$(uname -m)" >&2; exit 1 ;;
esac
lab_node_name="node-v${lab_node_version}-${lab_node_platform}"
lab_node_dir="${lab_tools}/${lab_node_name}"
mkdir -p "$lab_tools"

if [[ ! -x "$lab_node_dir/bin/node" ]] || [[ "$("$lab_node_dir/bin/node" --version)" != "v${lab_node_version}" ]]; then
  lab_download_dir="$(mktemp -d "${lab_tools}/node-download.XXXXXX")"
  trap 'rm -rf -- "$lab_download_dir"' EXIT
  curl --fail --silent --show-error --location --retry 2 \
    "https://nodejs.org/dist/v${lab_node_version}/${lab_node_name}.tar.xz" \
    --output "${lab_download_dir}/${lab_node_name}.tar.xz"
  printf '%s  %s\n' "$lab_node_sha256" "${lab_download_dir}/${lab_node_name}.tar.xz" | sha256sum --check --status
  tar -xJf "${lab_download_dir}/${lab_node_name}.tar.xz" -C "$lab_tools"
fi

export PATH="${lab_node_dir}/bin:${PATH}"
cd "$lab_repo"
test "$(node --version)" = "v${lab_node_version}"
test -f package-lock.json
node --version
npm --version
npm ci --cache "${lab_tools}/npm-cache" --no-audit --no-fund
npm run build
