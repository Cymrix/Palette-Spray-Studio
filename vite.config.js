import { defineConfig } from 'vite';

export default defineConfig(({ command }) => {
  return {
    base: command === 'build' ? '/palette-spray-studio/' : '/',
  };
});
