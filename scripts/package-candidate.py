#!/usr/bin/env python3
"""Create a reproducible PRIVATE INTERNAL candidate. Never uploads or publishes."""
import argparse,hashlib,json,shutil,subprocess,zipfile
from pathlib import Path
from artifact_checks import ROOT,verify_dist
p=argparse.ArgumentParser();p.add_argument('--dist',default='dist');p.add_argument('--base',default='/');p.add_argument('--output',required=True);p.add_argument('--zip',action='store_true')
a=p.parse_args();dist=Path(a.dist).resolve();target=Path(a.output).resolve()
assert not target.exists(),'Use a new candidate directory; existing content is never overwritten'
assert dist not in target.parents and target not in dist.parents and target!=dist,'Candidate and build directories must be separate'
result=verify_dist(dist,a.base)
# Metadata is outside site/, so only site/ is eventually copied to Apache.
result['publicationStatus']='INTERNAL VALIDATION ONLY — RELEASE BLOCKED — ASSET RIGHTS PENDING'
result['sourceCommit']=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
result['sourceDirty']=bool(subprocess.check_output(['git','status','--porcelain'],cwd=ROOT,text=True).strip())
target.mkdir(parents=True);shutil.copytree(dist,target/'site')
(target/'candidate.json').write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
(target/'INTERNAL-ONLY.txt').write_text(result['publicationStatus']+'\nNo upload, public distribution, deployment or release is authorized.\n')
if a.zip:
    archive=target.with_suffix('.internal.zip');assert not archive.exists(),'Archive exists'
    with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for path in sorted(target.rglob('*')):
            if path.is_file():
                item=zipfile.ZipInfo(path.relative_to(target).as_posix(),date_time=(1980,1,1,0,0,0));item.external_attr=0o100644<<16;item.compress_type=zipfile.ZIP_DEFLATED
                z.writestr(item,path.read_bytes())
    print('PRIVATE INTERNAL ZIP',archive,'sha256',hashlib.sha256(archive.read_bytes()).hexdigest())
print('PRIVATE INTERNAL candidate',target,'files',result['files'])
