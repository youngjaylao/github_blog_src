<template>
  <div id="app" :class="global.mode + '-mode'">
    <div class="main-wrap">
      <div class="header">
        <template v-if="global.mode === 'pc'">
          <div class="navs flex">
            <div class="list flex flex-middle">
              <a class="nav-item normal-nav-item flex flex-middle flex-center" href="javascript:;" v-for="(nav, index) in navs" :key="index" @click="clickNavPC(nav.path)">
                <span v-text="nav.name"></span>
              </a>
              <a 
                v-if="!isLoggedIn"
                class="nav-item flex flex-middle flex-center login-btn" 
                :href="getLoginUrl()">
                <i class="iconfont"></i> 
              </a>
              <a 
                v-else
                class="nav-item flex flex-middle flex-center login-btn logged-in"
                href="javascript:;"
                @click="logout"
              >
                <i class="iconfont"></i> 
              </a>
              <template v-if="isLoggedIn && showModeToggle">
                <div 
                  class="mode-toggle capsule"
                  :class="{ 'private-mode': blogMode === 'private' }"
                  @click="toggleBlogMode"
                >
                  {{ blogMode === 'public' ? '公开' : '私密' }}
                </div>
              </template>
            </div>
          </div>
        </template>
        <div class="info" :class="[global.mode === 'pc' ? 'flex flex-middle' : 'flex-center']">
          <a class="avatar" href="javascript:;">
            <img src="img/avatar.png" alt="">
          </a>
          <div class="flex-item">
            <div class="profile-header">
              <span class="username">YoungJay LAO</span>
              <span class="display-name">漾际资本（YoungJay Capital Ltd.）</span>
            </div>
            <p>不求双确，只依标准；接纳风险，果断执行；旁观自省，拥抱概率。</p>
          </div>
        </div>
      </div>
      <div class="main-cont">
        <transition name="multi-fade">
          <router-view class="page"/>
        </transition>
      </div>

    </div>

    <template v-if="global.mode === 'mobile'">
      <a class="toolbox flex flex-middle flex-center" href="javascript:;" @click="toggleModal">盒子</a>
      <div class="mobile-navs">
        <transition name="fade">
          <div class="mask" v-if="global.showModal"></div>
        </transition>
        <transition name="slide-down">
          <div class="cont" v-if="global.showModal">
            <div class="top flex flex-center flex-middle">
              <a class="close flex flex-middle flex-center" href="javascript:;" @click="toggleModal">关闭</a>
            </div>
            <div class="navs flex flex-center flex-middle">
              <a class="nav-item normal-nav-item flex flex-middle flex-center" href="javascript:;" v-for="(nav, index) in navs" :key="index" @click="clickNav(nav.path)">
                <span v-text="nav.name"></span>
              </a>
              <a v-if="!isLoggedIn" class="nav-item flex flex-middle flex-center login-btn" :href="getLoginUrl()">
                <i class="iconfont"></i>
              </a>
              <a 
                v-else
                class="nav-item flex flex-middle flex-center login-btn logged-in"
                href="javascript:;"
                @click="logout"
              >
                <i class="iconfont"></i> 
              </a>
              <template v-if="isLoggedIn && showModeToggle">
                <div 
                  class="mode-toggle capsule"
                  :class="{ 'private-mode': blogMode === 'private' }"
                  @click="toggleBlogMode"
                >
                  {{ blogMode === 'public' ? '公开' : '私密' }}
                </div>
              </template>
            </div>
          </div>
        </transition>
      </div>
    </template>

    <transition name="fade">
      <a class="btn-backtop flex flex-middle flex-center" href="javascript:;" v-if="global.scrollH >= 200" @click="backTop">
        <i class="iconfont icon-backtop"></i>
      </a>
    </transition>
  </div>
</template>
<script>
import {
  ref, reactive, watch, onBeforeUnmount, onMounted, nextTick, computed, provide, inject
} from '@vue/composition-api';
import {
  debounce, throttle, pageUnlock, pageLock, repoConfig
} from './utils/utils';

export default {
  setup(props, context) {
    const blogMode = ref(context.root.$route.path.startsWith('/private/') ? 'private' : 'public');   // 'public' 或 'private'
    const getModePath = (path) => {
      return repoConfig[blogMode.value].pathPrefix + path;
    };

    const showModeToggle = computed(() => {
      const currentName = context.root.$route.name;
      // 只在这些路由名下显示（基于你的 router/index.js 定义的 name）
      return ['archives', 'labels', 'privateArchives', 'privateLabels'].includes(currentName);
    });
    const logout = () => {
      fetch('https://github-blog-proxy.laoyanjie666.workers.dev/logout', {
        method: 'GET',           // 或 GET，看你后端怎么写
        credentials: 'include'
      })
        .then(res => {
          if (res.ok) {
            // 后端已通过 Set-Cookie 清除了 HttpOnly cookie
            localStorage.removeItem('blog_logged_in');
            isLoggedIn.value = false;
          } else {
            // 可选：处理非 200 状态码
            console.warn('退出响应非 200 状态', res.status);
          }
          let currentPath = context.root.$route.path;
          const newPath = currentPath.replace(/^\/private/, '');
          if (newPath !== currentPath) {
            context.root.$router.push(newPath);
          } else {
            window.location.reload();
          }
        })
        .catch(err => {
          console.error('退出失败', err);
          window.location.reload();
        });
    };



    const navs = [{
      path: '/archives',
      name: '博客',
    }, {
      path: '/labels',
      name: '标签',
    }, {
      path: '/search',
      name: '搜索',
    }];



    const global = reactive({
      mode: ref(''),
      name: ref(''),
      showModal: false,
      scrollH: 0,
    });

    const isLoggedIn = ref(false);
    const endpoint = 'https://github-blog-proxy.laoyanjie666.workers.dev';
    const blogBaseUrl = 'https://youngjaylao.github.io/github_blog_src';  // 如果你的仓库名是 github_blog_src

    const getLoginUrl = () => {
      // fullPath 通常是 /archives
      let currentPath = context.root.$route.fullPath;

      
      // 拼接成完整 URL
      const fullReturnTo = blogBaseUrl + "#" + currentPath;
      
      // 编码后传给 Worker
      return `${endpoint}/login?return_to=${encodeURIComponent(fullReturnTo)}`;
    };
    // 从 localStorage 读状态（供其他地方调用，如 toggleModal）
    const checkAuthStatusFromStorage = () => {
      const stored = localStorage.getItem('blog_logged_in');
      if (!stored) {
        isLoggedIn.value = false;
        return;
      }

      try {
        const data = JSON.parse(stored);
        
        if (data.isLoggedIn && Date.now() <= data.exp) {
          isLoggedIn.value = true;
        } else {
          isLoggedIn.value = false;
          localStorage.removeItem('blog_logged_in'); // 过期清理
        }
      } catch (e) {
        isLoggedIn.value = false;
        localStorage.removeItem('blog_logged_in');
      }
    };
    const toggleBlogMode = () => {
      if (blogMode.value === 'public') {
        blogMode.value = 'private'
      } else {
        blogMode.value = 'public'
      }

      // 获取当前路径，替换前缀
      let currentPath = context.root.$route.path;
      if (blogMode.value === 'private') {
        if (!currentPath.startsWith('/private')) {
          currentPath = '/private' + currentPath;
        }
      } else {
        currentPath = currentPath.replace(/^\/private/, '');
      }
      context.root.$router.push(currentPath);
    }


    onMounted(() => {

      let hash = window.location.hash;

      // 解析 hash 中的 query 参数
      const hashParts = hash.split('?');
      const pathPart = hashParts[0] || '#/';  // #/archives
      let queryString = hashParts[1] || '';  // blog_login=success&exp=...&other=xxx


      if (queryString) {
        const urlParams = new URLSearchParams(queryString);
        const loginSuccess = urlParams.get('blog_login');
        const exp = urlParams.get('exp');

        if (loginSuccess === 'success' && exp && Number(exp) > Date.now()) {
          localStorage.setItem('blog_logged_in', JSON.stringify({
            isLoggedIn: true,
            exp: Number(exp)
          }));
        }

        // 只删除 blog_login 和 exp
        urlParams.delete('blog_login');
        urlParams.delete('exp');

        // 重新生成 query 字符串（如果还有其他参数，保留）
        const newQuery = urlParams.toString();

        // 拼接新的 hash
        let newHash = newQuery ? `${pathPart}?${newQuery}` : pathPart;
        if (newHash.startsWith('#')) {
          newHash = newHash.slice(1); // 去掉开头的 #
        }
        
        context.root.$router.replace(newHash || '/')
          .then(() => {
          })
          .catch(err => {
            if (err.name !== 'NavigationDuplicated') console.error(err);
          });

      }
      checkAuthStatusFromStorage();

    });

    const setMode = () => {
      const w = document.documentElement.clientWidth || document.body.clientWidth;

      global.mode = w > 767 ? 'pc' : 'mobile';
    };


    const handleResize = debounce(() => {
      setMode();
    }, 200);

    const handleScroll = throttle(() => {
      global.scrollH = document.body.scrollTop || document.documentElement.scrollTop;
    }, 200);

    setMode();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll);


    watch(
      () => (context.root ? context.root.$route : null), // 增加 root 存在性检查      
      (to) => {
        if (!to) return; // 如果 to 为空则不执行逻辑
        const path = navs.find(_ => ~to.path.indexOf(_.path));
        global.name = path ? path.name : '';
      },
      { immediate: true }
    );
    watch(
      () => context.root.$route.fullPath, // 监听完整路径变化，包含 query
      (newFullPath, oldFullPath) => {
        const nowPrivate = newFullPath.startsWith('/private/');
        blogMode.value = nowPrivate ? 'private' : 'public';
      }
    );

    onBeforeUnmount(() => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    });

    const toggleModal = () => {
      global.showModal = !global.showModal;
      
      if (global.showModal) {
        // 关键在这里：每次弹窗打开都重新读 storage
        checkAuthStatusFromStorage();
        pageLock();
      } else {
        pageUnlock();
      }
    };

    const clickNav = (path) => {
      toggleModal();
      if (context.root.$route.path !== path) {
        context.root.$router.push(getModePath(path));
      }
    };
    const clickNavPC = (path) => {
      if (context.root.$route.path !== path) {
        context.root.$router.push(getModePath(path));
      }
    };


    const backTop = () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth' // 原生平滑滚动，不依赖定时器，不会与用户操作冲突
      });
    };

    return {
      // static
      navs,
      // dynamic
      global,
      clickNav,
      clickNavPC,
      toggleModal,
      backTop,
      isLoggedIn,
      getLoginUrl,
      showModeToggle,
      blogMode,
      toggleBlogMode,
      logout,
    };
  },
  
};
</script>
<style lang="scss">
  @import "./assets/css/_main";
  @import "./assets/css/fonts/iconfont.css";
  @import "./assets/css/fonts/calligraffitti-regular-webfont.css";
  @import "~github-markdown-css";

  body {
    background-color: #ffffff;
  }

  #app {
    position: relative;
  }

  .pc-mode {
    width: 600px;
    margin: 0 auto;
    padding: 40px 0 80px;
    min-height: calc(100vh + 1px);

    .main-wrap {
      position: relative;

      &:before {
        content: '';
        position: absolute;
        left: 0;
        top: 80px;
        width: 4px;
        bottom: 16px;
        background-color: #f9f9f9;
        z-index: -1;
        pointer-events: none;
      }
    }

    .page {
      .list .item {
        padding-left: 20px;

        &-name {
          position: relative;

          &:before {
            content: '';
            position: absolute;
            top: 50%;
            left: -22px;
            width: 8px;
            height: 8px;
            margin-top: -4px;
            border-radius: 50%;
            background-color: #dddddd;
          }
        }

        &:nth-child(5n + 1) {
          .item-name {
            &:before {
              background-color: #1abc9c;
            }
          }
        }

        &:nth-child(5n + 2) {
          .item-name {
            &:before {
              background-color: #3498db;
            }
          }
        }

        &:nth-child(5n + 3) {
          .item-name {
            &:before {
              background-color: #9b59b6;
            }
          }
        }

        &:nth-child(5n + 4) {
          .item-name {
            &:before {
              background-color: #e67e22;
            }
          }
        }

        &:nth-child(5n + 5) {
          .item-name {
            &:before {
              background-color: #e74c3c;
            }
          }
        }

        .archives { list-style: none;
          .archive {
            &:before {
              content: '';
              position: absolute;
              left: -22px;
              top: 50%;
              margin-top: -4px;
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background-color: #dddddd;
            }
          }
        }
      }
    }
  }

  .mobile-mode {
    width: 100%;
    padding: 32px 16px 8px;

    .header .info {
      margin-top: 0;
      display: flex;
      align-items: center; 
      text-align: center; // 让 p 标签内的文字也居中
      flex-direction: column;

      .avatar {
        margin-left: auto;
        margin-right: auto;
      }
      .flex-item {
        width: 100%; // 撑满宽度以便内容居中
      }

      .profile-header {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        display: flex;
        gap: 18px; /* 两个名字之间的间距 */
        justify-content: center;
        align-items: baseline;
        line-height: 1.5;
        margin-bottom: 8px; // 名字和下面介绍的间距
        .username {
          font-weight: 700; /* 加粗 */
          color: #262626;  /* 深色/黑色 */
          font-size: 22px;
        }

        .display-name {
          font-weight: 400; /* 常规粗细 */
          color: #8e8e8e;  /* 灰色 */
          font-size: 10px;
        }
      }


    }
  }

  .header {
    padding-bottom: 32px;

    .breadcrumb {
      width: 60px;
      margin-left: -28px;
      text-align: center;
      min-height: 50px;

      p {
        font-size: $sizeNormal;
        line-height: 18px;
        color: #d0d0d0;
        height: 18px;
      }

      i {
        font-size: 26px;
        color: #dfdfdf;
        line-height: 32px;
      }
    }

    .navs {
      margin-top: 8px;
      min-height: 40px;

      .nav-home {
        margin-left: -18px;

        span {
          font-size: $sizeNormal;
        }

        i {
          font-size: 22px;
          color: #999999;
          display: none;
        }

        &:hover {
          span {
            display: none;
          }

          i {
            display: block;
          }
        }
      }

      .nav-item {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        
        transition: all 0.5s;
        color: #555555;
        display: flex; 
        align-items: center;
        justify-content: center;

        &:hover {
          background-color: #dfdfdf;
        }
      }
      .normal-nav-item {
        background-color: #f0f0f0;
      }

      .list {
        margin-left: 6px;

        .nav-item + .nav-item {
          margin-left: 6px;
        }

        @for $i from 1 through 7 {
          .nav-item:nth-child(#{$i}) {
            animation: fadeIn 0.8s #{0.1 * ($i - 1)}s both;
          }
        }
      }

      
    }

    .info {
      margin-top: 16px;

      .avatar {
        display: block;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        overflow: hidden;
        object-fit: cover;
        margin-left: -28px;
        margin-right: 8px;

        img {
          width: 100%;
        }
      }


      .profile-header {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        display: flex;
        gap: 15px; /* 两个名字之间的间距 */
        justify-content: flex-start; /* 确保 PC 端靠左 */
        text-align: left;
        align-items: baseline;
        line-height: 1.5;
        margin-bottom: 8px; // 名字和下面介绍的间距
        .username {
          font-weight: 700; /* 加粗 */
          color: #262626;  /* 深色/黑色 */
          font-size: 22px;
        }

        .display-name {
          font-weight: 400; /* 常规粗细 */
          color: #8e8e8e;  /* 灰色 */
          font-size: 10px;
        }
      }

      p {
        font-size: $sizeMedium;
        line-height: 19px;
        color: #999999;
        transition: all $animateTime;
      }
    }
  }

  .footer { position: fixed; left: 0; right: 0; bottom: 0; height: 40px; font-size: 12px; color: $mainWeak; background-color: #fff; box-shadow: 0 -1px 4px 0 rgba(0,0,0,0.04);}

  .toolbox {
    position: fixed;
    left: 12px;
    bottom: 12px;
    font-size: $sizeNormal;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: #f0f0f0;
    transition: all 0.5s;
    color: #555555;
  }

  .mobile-navs {
    .mask {
      position: fixed;
      z-index: 10;
      left: 0;
      top: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6)
    }

    .cont {
      position: fixed;
      z-index: 11;
      left: 0;
      bottom: 0;
      width: 100%;
      padding-bottom: 10px;
      transition: all 0.3s ease-out;
      background-color: #fefefe;

      .top {
        position: relative;
        height: 70px;

        &:before {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 1px;
          background-image: linear-gradient(0deg, transparent, #d5d5d5, transparent);
          background-image: -webkit-linear-gradient(0deg, transparent, #d5d5d5, transparent);
        }

        .close {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: #f0f0f0;
          transition: all 0.5s;
          color: #555555;

          &:active {
            background-color: #dfdfdf;
          }
        }
      }

      .navs {
        min-height: 70px;
        flex-wrap: wrap;
        margin-top: 8px;
        .nav-item {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          transition: all 0.5s;
          color: #555555;
          margin: 8px 4px;
          i {
            font-size: 22px;
            color: #999999;
          }
          &:active {
            background-color: #dfdfdf;
          }
        }
        .normal-nav-item {
          background-color: #f0f0f0;
        }
      }
    }
  }

  .btn-backtop {
    position: fixed;
    right: 12px;
    bottom: 12px;
    background-color: #ffffff;
    border: 1px solid #f0f0f0;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    color: #555555;
    transition: all 0.5s;

    &:hover, &:active {
      background-color: #dfdfdf;
    }
  }

  .auxi {
    color: #cccccc;
    font-size: $sizeSmall;
    line-height: 32px;
    margin-top: 8px;

    i {
      margin-right: 8px;
    }

    .icon-loading {
      animation: loading-rotate 1.2s linear infinite;
    }
  }

  .btn-next {
    width: 100px;
    height: 32px;
    border: 1px solid #eeeeee;
    border-radius: 16px;
    color: #888888;
    margin-top: 8px;
  }

  .markdown-body {
    box-sizing: border-box;
    min-width: 200px;
    max-width: 980px;
    margin: 0 auto;
    padding: 20px;
    font-size: 14px;
  }

  @media (max-width: 767px) {
    .markdown-body {
      padding: 20px 0;
    }
  }
  /* 添加登录按钮样式 */
  .nav-item.login-btn {
    background-color: #f0f0f0;
    color: #555555;
  }

  .nav-item.login-btn.logged-in {
    background-color: #218845; 
  }
.mode-toggle.capsule {
  margin-left: 6px;           // 和 nav-item 之间的间距保持一致（昨天通常是 6px）
  width: 40px;                // 改成和其它圆形按钮一样大
  height: 40px;
  line-height: 40px;
  text-align: center;
  border-radius: 50%;         // 改成正圆
  font-size: 13px;            // 接近昨天圆形按钮的视觉大小（可调 12px ~ 14px）
  font-weight: 500;           // 比 400 稍粗一点，更清晰；可改回 400
  cursor: pointer;
  user-select: none;
  transition: all .25s;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 2px;             // 微调文字不贴边

  &.private-mode {
    background: #e74c3c33;    // 浅红
    color: #c0392b;
  }

  &:not(.private-mode) {
    background: #2ecc7133;    // 浅绿
    color: #27ae60;
  }

  &:hover {
    filter: brightness(1.08);
  }

  // 如果觉得文字还是太大或太挤，可以再微调
  // font-size: 12px;
  // letter-spacing: -0.5px;
}
</style>
