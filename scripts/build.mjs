import { build } from 'esbuild';
await build({ entryPoints:['app.jsx'], bundle:true, minify:true, outfile:'public/app.js', jsx:'automatic', define:{'process.env.NODE_ENV':'"production"'}, target:['es2020'] });
