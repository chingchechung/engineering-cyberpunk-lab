import test from 'node:test';
import assert from 'node:assert/strict';
import { appAsset } from '../src/platform/appAsset.js';

test('runtime assets follow the configured root, course and user-directory bases', () => {
  for(const base of ['/','/course/cyberpunk-lab/','/~username/cyberpunk-lab/']) {
    for(const path of ['models/cyberpunk_compressed.glb','textures/water-splash.webp','libs/draco/','libs/basis/','engine.mp3','video/imagine-art-feed-item.mp4','custom_noise.webp']) {
      assert.equal(appAsset(path,base),base+path);
      assert.equal(appAsset('/'+path,base),base+path);
    }
  }
  assert.equal(appAsset('models/plane.glb'),'/models/plane.glb');
  assert.equal(appAsset('models/plane.glb','/course/lab'),'/course/lab/models/plane.glb');
});
