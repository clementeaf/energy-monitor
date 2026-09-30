import { build } from 'esbuild';

await build({
  entryPoints: ['dist/lambda.js'],
  bundle: true,
  platform: 'node',
  target: 'node24',
  outfile: 'dist-lambda/lambda.js',
  format: 'cjs',
  sourcemap: true,
  minify: false,
  external: [
    'class-transformer/storage',
    'pg-native',
    '@aws-sdk/*',
    '@nestjs/microservices',
    '@nestjs/websockets',
    '@nestjs/platform-socket.io',
    'cache-manager',
  ],
});

console.log('Lambda bundle built → dist-lambda/lambda.js');
