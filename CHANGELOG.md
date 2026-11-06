# Changelog

*Türkçe:* [*CHANGELOG.tr.md*](CHANGELOG.tr.md)*. On every release bump `VERSION` in `src/config.js`; the zip is named `vnls\\\\\\\_v<version>`.*

## 1.3.3

* Version numbering has been reset, starting again from 1.3.3. The preceding numbers (1.0 through 3.3) belong to the earlier prototype and are retained for historical reference.
* The 3D view now utilizes WebGPU directly, replacing three.js. This implementation includes custom matrix mathematics, three WGSL shaders, instanced spheres, pipelines for lines and textured surfaces, and a depth buffer. `vendor/third.min.js` has been removed.
* The "Retina" feature no longer reads pixels back from the GPU (an asynchronous operation in WebGPU). Instead, the board is viewed through the same perspective camera, and the board canvas is sampled on the CPU using 2x2 sub-sampling per pixel. Saccades and convergence continue to function as before.
* If WebGPU is unavailable or encounters an error, an on-screen notification is displayed (in both Turkish and English).
* The system has been renamed "Virtual Neuron Learning System" (Sanal Nöron Öğrenme Sistemi);
* The software is now licensed under PolyForm Strict 1.0.0; details are provided in `LICENSE-INFO.md` in both languages.
* Output: When a projection is selected while in "Stop" mode, the screen updates immediately.
* The software has been verified in a headless Chromium environment with GPU support: shaders compile correctly, there are no persistent errors, and features such as extended selection, selection lines, manual drawing while in "Stop" mode, language switching, and "Ultra" mode all function as expected.



# 3.3

* Project renamed to VNLS (Virtual Neuron Learning Simulation, now called Virtual Neuron Learning System).
* English and Turkish interface, chosen in Settings → Language and remembered in the browser. All panel texts, messages and neuron descriptions go through `src/i18n.js`.
* Code comments and docs are bilingual now. README and changelog exist in both languages.
* Saved settings moved from `gorus\\\\\\\_\\\\\\\*` to `vnls\\\\\\\_\\\\\\\*` keys, so settings saved by older versions are not picked up.

## 3.2

* Zoom (`ZOOM`): after the saccade the field of view is scaled so the long side of the shape is always about the same size. On handwriting-like distortion 41% to 51% (Node imitation).
* Rehearsal (`REHEARSE`): when a name is taught, the drawing is replayed a few times with small shifts, rotations and scales. In a small test one example gave 75%, six rehearsals 92%.
* Pooling was tried and did not help (55% to 56%), so it was left out. `analiz.js` gained `WARP`, `NORM`, `CEN`, `POOL` and `EV`.

## 3.1

* Saccade: the eye looks, finds the centroid of the bright shape, turns there and takes the second look from the middle. Name accuracy about 48% to 89% in Node. It can be switched off (`FIXATE`).
* `analiz.js`: a diagnostic that shows where errors pile up and what a supervised reader on the same cortex activity can reach.
* Findings: the limit was the representation, not the name binding; the Turkish diacritic letters were not the problem; loosening the competition did not help.

## 3.0

* Panel: drag, resize, collapse, remembered state. Settings section with sliders, saved in the browser.
* W/A/S/D (plus Q/E and Shift) to move around the scene.
* The brain redraws what it sees while you draw (`Brain.imagine`), and when you pause.

## 2.9

* `present` is about 4x faster (79 to 20 ms with 3000 neurons) thanks to a pixel-to-synapse index. Results are identical to the old code.
* Ultra mode uses a per-frame time budget and no longer freezes the page.

## 2.8

* Pause button, and a live look while drawing by hand.

## 2.7

* Name population 64 to 256 neurons, cortex 600 to 3000 neurons.
* Opposing (anti-Hebb) term in `teach()` keeps letter codes apart and stops weights from melting over long runs.

## 2.6

* The eye no longer sees the board frame and the eye sphere (decor moved to its own layer).
* Homeostatic threshold shift against dead neurons. Fixed the drawing normalization, the manual-mode key race, and the retina preview after `writeBack`. 29 Turkish letters in the test. three.js is now local in `vendor/`.

## 2.5 and earlier

* 2.5: fixed a comment that swallowed a line of code. 2.4: sharp retina surface, colored neurons, version numbers. 2.3: smaller spheres, visible synapses, gray-white-black theme. 2.2: flat retina, sphere neurons, click to see connections, distributed name code. 2.1: texture-refresh bug fixed, the brain learns to draw. 2.0: unsupervised spiking cortex, 16384 retina neurons, 29 letters.

## 1.0

* First version: one fixed brain, 4 letters, reward-modulated Hebb/delta rule.

