import { build } from 'esbuild';
import {mkdir,cp,copyFile} from 'node:fs/promises';
await mkdir('public/vision',{recursive:true});
await cp('node_modules/@mediapipe/tasks-vision/wasm','public/vision/wasm',{recursive:true});
await copyFile('models/mediapipe/face_landmarker.task','public/vision/face_landmarker.task');
await copyFile('models/mediapipe/selfie_segmenter.tflite','public/vision/selfie_segmenter.tflite');
await build({ entryPoints:['app.jsx'], bundle:true, minify:true, outfile:'public/app.js', jsx:'automatic', define:{'process.env.NODE_ENV':'"production"'}, target:['es2020'] });
