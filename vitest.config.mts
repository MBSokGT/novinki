import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    // От текущей папки, а не от места файла настроек, и без разворота
    // симлинков: так тесты видят именно ту копию кода, в которой запущены.
    // Иначе mutator (он запускает тесты в папке-«наложении» из симлинков)
    // тестирует оригинал, а не мутант, и ни один мутант не обнаруживается.
    alias: { '@': process.cwd() },
    preserveSymlinks: true,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
