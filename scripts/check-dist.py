#!/usr/bin/env python3
import argparse,json
from pathlib import Path
from artifact_checks import verify_dist
p=argparse.ArgumentParser();p.add_argument('--dist',default='dist');p.add_argument('--base',default='/');p.add_argument('--output')
a=p.parse_args();result=verify_dist(a.dist,a.base)
if a.output:Path(a.output).write_text(json.dumps(result,indent=2)+'\n')
print('PASS static artifact integrity:',json.dumps({k:v for k,v in result.items() if k!='inventory'}))
