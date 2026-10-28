"""Real autocrlf checkout and CP950-default validation/packaging regressions."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class WindowsCompatibilityTests(unittest.TestCase):
    def test_autocrlf_checkout_preserves_all_approved_artifacts(self):
        references = json.loads((ROOT/'docs/assignment-reuse-files.json').read_text(encoding='utf-8'))
        public = json.loads((ROOT/'docs/assets-inventory.json').read_text(encoding='utf-8'))['assets']
        self.assertEqual(len(references), 15)
        self.assertEqual(len(public), 54)
        with tempfile.TemporaryDirectory(prefix='lab-autocrlf-') as directory:
            checkout = Path(directory)
            def git(*args):
                return subprocess.run(['git', *args], cwd=checkout, check=True,
                                      capture_output=True, encoding='utf-8').stdout
            git('init', '-q')
            shutil.copyfile(ROOT/'.gitattributes', checkout/'.gitattributes')
            for entry in references + public:
                path = checkout/entry['path']
                path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(ROOT/entry['path'], path)
            git('-c', 'core.autocrlf=false', 'add', '--all')
            git('-c', 'user.name=Compatibility test', '-c', 'user.email=test@example.invalid',
                '-c', 'commit.gpgsign=false', 'commit', '-qm', 'Byte-exact checkout fixture')
            git('config', 'core.autocrlf', 'true')
            git('config', 'core.eol', 'crlf')
            for entry in references + public:
                (checkout/entry['path']).unlink()
            git('checkout', '--', '.')
            self.assertEqual(git('config', 'core.autocrlf').strip(), 'true')
            for entry in references + public:
                with self.subTest(path=entry['path']):
                    self.assertEqual(hashlib.sha256((checkout/entry['path']).read_bytes()).hexdigest(), entry['sha256'])
        print('Windows-style checkout: all 15 reference and 54 original public hashes preserved')

    def cp950(self, *args):
        result = subprocess.run([sys.executable, '-X', 'utf8=0',
            str(ROOT/'tests/helpers/cp950_defaults.py'), *args], cwd=ROOT,
            env={**os.environ, 'PYTHONUTF8': '0'}, capture_output=True, encoding='utf-8')
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        return result

    def test_artifact_and_packaging_cli_with_cp950_defaults(self):
        with tempfile.TemporaryDirectory(prefix='lab-cp950-release-') as directory:
            output = Path(directory)
            self.cp950('scripts/check-dist.py', '--dist', 'dist', '--base', '/',
                       '--output', str(output/'integrity.json'))
            integrity = json.loads((output/'integrity.json').read_text(encoding='utf-8'))
            self.assertEqual(integrity['originalPublicHashes'], 54)
            candidate = output/'candidate'
            self.cp950('scripts/package-candidate.py', '--dist', 'dist', '--base', '/',
                       '--output', str(candidate))
            metadata = json.loads((candidate/'candidate.json').read_text(encoding='utf-8'))
            self.assertEqual(metadata['publicationStatus'],
                'INTERNAL VALIDATION ONLY — RELEASE BLOCKED — ASSET RIGHTS PENDING')
            self.assertIn('— RELEASE BLOCKED —', (candidate/'INTERNAL-ONLY.txt').read_text(encoding='utf-8'))
            self.assertEqual(metadata['inventory'], integrity['inventory'])
            self.assertFalse(list(output.glob('*.zip')), 'No distribution archive is needed by this test')

    def test_existing_contract_and_artifact_suites_with_cp950_defaults(self):
        result = self.cp950('-m', 'unittest', 'tests.test_assignment_contract',
                            'tests.test_release_artifacts', '-v')
        self.assertIn('Ran 10 tests', result.stderr)
        self.assertIn('OK', result.stderr)
        print('CP950 defaults / UTF-8 mode disabled: all 10 existing Python tests passed')


if __name__ == '__main__':
    unittest.main()
