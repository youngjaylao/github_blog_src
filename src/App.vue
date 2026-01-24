<template>
  <div id="app" :class="global.mode + '-mode'">
    <div class="main-wrap">
      <div class="header">
        <template v-if="global.mode === 'pc'">
          <div class="navs flex">
            <div class="list flex flex-middle">
              <router-link class="nav-item flex flex-middle flex-center" :to="nav.path" v-for="(nav, index) in navs" :key="index">
                <span v-text="nav.name"></span>
              </router-link>
            </div>
          </div>
        </template>
        <div class="info" :class="[global.mode === 'pc' ? 'flex flex-middle' : 'flex-center']">
          <a class="avatar" href="javascript:;">
            <img src="img/avatar.png" alt="">
          </a>
          <div class="flex-item">
            <div class="profile-header">
              <span class="username">youngjaylao</span>
              <span class="display-name">YoungJay LAO</span>
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
              <a class="nav-item flex flex-middle flex-center" href="javascript:;" v-for="(nav, index) in navs" :key="index" @click="clickNav(nav.path)">
                <span v-text="nav.name"></span>
              </a>
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
  ref, reactive, watch, onBeforeUnmount,
} from '@vue/composition-api';
import {
  debounce, throttle, pageUnlock, pageLock,
} from './utils/utils';

export default {
  setup(props, context) {
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

    onBeforeUnmount(() => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    });

    const toggleModal = () => {
      global.showModal = !global.showModal;
      if (global.showModal) {
        pageLock();
      } else {
        pageUnlock();
      }
    };

    const clickNav = (path) => {
      toggleModal();
      if (context.root.$route.path !== path) {
        context.root.$router.push(path);
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
      toggleModal,
      backTop,
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
        gap: 15px; /* 两个名字之间的间距 */
        justify-content: center;
        align-items: center;
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
          font-size: 22px;
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
        background-color: #f0f0f0;
        transition: all 0.5s;
        color: #555555;
        display: flex; 
      align-items: center;
      justify-content: center;

        &:hover {
          background-color: #dfdfdf;
        }
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
        align-items: center;
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
          font-size: 22px;
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
          background-color: #f0f0f0;
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
</style>
