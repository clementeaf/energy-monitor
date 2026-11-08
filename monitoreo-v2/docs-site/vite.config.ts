import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import tailwindcss from '@tailwindcss/vite';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import rehypeSlug from 'rehype-slug';

export default defineConfig({
  base: '/',
  plugins: [
    { enforce: 'pre', ...mdx({
      providerImportSource: '@mdx-js/react',
      remarkPlugins: [remarkGfm, remarkFrontmatter, [remarkMdxFrontmatter, { name: 'frontmatter' }]],
      rehypePlugins: [rehypeSlug],
    }) },
    react(),
    tailwindcss(),
  ],
});
