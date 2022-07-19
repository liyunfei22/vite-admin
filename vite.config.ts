import type { UserConfig, ConfigEnv } from 'vite';
import pkg from './package.json';
import moment from 'moment';
import { loadEnv } from 'vite';
import { resolve } from 'path';
import { generateModifyVars } from './build/generate/generateModifyVars';
import { createProxy } from './build/vite/proxy';
import { wrapperEnv } from './build/utils';
import { createVitePlugins } from './build/vite/plugin';
import { OUTPUT_DIR } from './build/constant';

function pathResolve(dir: string) {
  return resolve(process.cwd(), '.', dir);
}

const { dependencies, devDependencies, name, version } = pkg;
const __APP_INFO__ = {
  pkg: { dependencies, devDependencies, name, version },
  lastBuildTime: moment().format('YYYY-MM-DD HH:mm:ss'),
};

export default ({ command, mode }: ConfigEnv): UserConfig => {
  const root = process.cwd();

  const env = loadEnv(mode, root);

  // The boolean type read by loadEnv is a string. This function can be converted to boolean type
  const viteEnv = wrapperEnv(env);

  const { VITE_PORT, VITE_PUBLIC_PATH, VITE_PROXY, VITE_DROP_CONSOLE } = viteEnv;

  const isBuild = command === 'build';

  return {
    base: VITE_PUBLIC_PATH, // 开发或生产环境服务的公共基础路径 1.绝对 URL 路径名，例如 /foo/ 2.完整的 URL，例如 https://foo.com/ 3.空字符串或 ./（用于开发环境）
    root, // 项目根目录（index.html 文件所在的位置）
    resolve: {
      // 当使用文件系统路径的别名时，请始终使用绝对路径。相对路径的别名值会原封不动地被使用，因此无法被正常解析。
      alias: [
        {
          find: 'vue-i18n',
          replacement: 'vue-i18n/dist/vue-i18n.cjs.js',
        },
        // /@/xxxx => src/xxxx
        {
          find: /\/@\//,
          replacement: pathResolve('src') + '/',
        },
        // /#/xxxx => types/xxxx
        {
          find: /\/#\//,
          replacement: pathResolve('types') + '/',
        },
      ],
    },
    server: {
      // Listening on all local IPs
      host: true,
      port: VITE_PORT,
      // Load proxy configuration from .env
      proxy: createProxy(VITE_PROXY),
    },
    build: {
      target: 'es2015', // 设置最终构建的浏览器兼容目标
      outDir: OUTPUT_DIR, // 指定输出路径（相对于 项目根目录).
      terserOptions: {
        compress: {
          keep_infinity: true,
          // Used to delete console in production environment
          drop_console: VITE_DROP_CONSOLE,
        },
      },
      // Turning off brotliSize display can slightly reduce packaging time
      brotliSize: false,
      chunkSizeWarningLimit: 2000,
    },
    define: {
      // 定义全局常量替换方式。其中每项在开发环境下会被定义在全局，而在构建时被静态替换。
      // setting vue-i18-next
      // Suppress warning
      __INTLIFY_PROD_DEVTOOLS__: false,
      __APP_INFO__: JSON.stringify(__APP_INFO__),
    },

    css: {
      preprocessorOptions: {
        // 指定传递给 CSS 预处理器的选项。文件扩展名用作选项的键，例如：`$injectedColor: orange;`
        less: {
          modifyVars: generateModifyVars(),
          javascriptEnabled: true,
        },
      },
    },

    // The vite plugin used by the project. The quantity is large, so it is separately extracted and managed
    plugins: createVitePlugins(viteEnv, isBuild),

    optimizeDeps: {
      // @iconify/iconify: The dependency is dynamically and virtually loaded by @purge-icons/generated, so it needs to be specified explicitly
      include: [
        '@iconify/iconify',
        'ant-design-vue/es/locale/zh_CN',
        'moment/dist/locale/zh-cn',
        'ant-design-vue/es/locale/en_US',
        'moment/dist/locale/eu',
      ],
      exclude: ['vue-demi', 'consolidate'],
    },
  };
};
