"""Release-content regressions: reject course data, tampering and private files."""
import importlib.util,shutil,tempfile,unittest
from contextlib import contextmanager
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('artifact_checks',ROOT/'scripts/artifact_checks.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class ReleaseArtifactTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not (ROOT/'dist/index.html').exists():raise RuntimeError('Run npm run build first')
        cls.temp=tempfile.TemporaryDirectory(prefix='lab-artifact-regression-')
        cls.site=Path(cls.temp.name)/'site';shutil.copytree(ROOT/'dist',cls.site)
    @classmethod
    def tearDownClass(cls):cls.temp.cleanup()
    @contextmanager
    def changed(self,name,data):
        path=self.site/name;previous=path.read_bytes() if path.exists() else None
        path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
        try:yield
        finally:
            if previous is None:path.unlink()
            else:path.write_bytes(previous)
    def test_clean_static_output(self):self.assertTrue(module.verify_dist(self.site,'/')['manifestEmpty'])
    def test_reject_course_or_test_files(self):
        for name in ['assignments/S01.json','tests/harness.html','.env','assets/private.txt']:
            with self.subTest(name=name),self.changed(name,b'TEST ONLY'):
                with self.assertRaises(AssertionError):module.verify_dist(self.site,'/')
    def test_reject_changed_assets_and_notices(self):
        for name in ['models/colider.glb','licenses/matrix-text/OFL.txt','assignments/manifest.json']:
            with self.subTest(name=name),self.changed(name,b'changed'):
                with self.assertRaises(AssertionError):module.verify_dist(self.site,'/')
    def test_reject_secret_in_hashed_bundle(self):
        with self.changed('assets/probe-12345678.js',b'-----BEGIN PRIVATE KEY-----'):
            with self.assertRaises(AssertionError):module.verify_dist(self.site,'/')
    def test_reject_unsafe_bases(self):
        for base in ['course/lab/','//example.com/','/a/../b/','/a','https://example.com/']:
            with self.subTest(base=base),self.assertRaises(ValueError):module.normalized_base(base)
