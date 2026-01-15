<template>
  <div class="page-archives">
    <div class="list">
      <div class="item" v-for="year in archives.years" :key="year.year">
        <div class="item-name flex flex-middle">
          <a class="font-clg" href="javascript:;" v-text="year.year"></a>
          <i class="iconfont" :class="[`icon-${getZodiac(year.year)}`]"></i>
        </div>
        <ul class="archives">
          <li class="archive" v-for="archive in year.archives" :key="archive.number">
            <div class="archive-header flex flex-middle">
              <span class="date" v-text="formatTime(archive.createdAt, 'yyyy-MM-dd')"></span>
              <router-link 
                class="title"
                :to="`/archives/${archive.number}`" 
                v-text="archive.title" 
                :title="archive.title"
                target="_blank"
                rel="noopener noreferrer"
              ></router-link>
              <div class="labels">
                <div class="label" v-for="label in archive.labels" :key="label.name" v-text="label.name" :style="{'background-color': `#${label.color}`, 'color': `${isLightColor(label.color) ? '#000000' : '#ffffff'}`}"></div>
              </div>
              <div class="others">
                <i class="iconfont icon-comment"></i>
                <span v-text="archive.comments.totalCount"></span>
              </div>
            </div>

            <p class="body-text">{{ archive.bodyText }}</p>
          </li>
        </ul>
      </div>
    </div>
    <template>
      <div class="page-archives">
        <div class="list">
          <div class="item" v-for="year in archives.years" :key="year.year">
            </div>
        </div>

        <div class="auxi flex flex-middle flex-center" v-if="archives.loading">
          <i class="iconfont icon-loading"></i>
          <span>正在加载中</span>
        </div>

        <div class="auxi flex flex-middle flex-center" v-if="archives.none && !archives.loading">
          <i class="iconfont icon-none"></i>
          <span>目前就这么多啦~</span>
        </div>

        <div class="pagination-wrapper" style="min-height: 50px;" v-if="!archives.loading">
          <div class="pagination flex flex-middle flex-center">
            <a href="javascript:;" class="btn-page" :class="{ disabled: archives.page === 1 }" @click="goFirstPage">首页</a>

            <a
              href="javascript:;"
              class="btn-page"
              :class="{ disabled: archives.page === 1 }"
              @click="archives.page > 1 && prevPage()"
            >
              上一页
            </a>

            <div class="page-jump flex flex-middle">
              <span>第</span>
              <input 
                type="number" 
                v-model.number="jumpPage" 
                @keyup.enter="goToPage"
                min="1"
              />
              <span>/ {{ archives.totalPages }} 页</span>
            </div>

            <a
              href="javascript:;"
              class="btn-page"
              :class="{ disabled: archives.none }"
              @click="!archives.none && nextPage()"
            >
              下一页
            </a>

            <a href="javascript:;" class="btn-page" :class="{ disabled: archives.none }" @click="goLastPage">末页</a>
            <div 
              class="secret-trigger" 
              :class="{ 'is-ready': secret.ready, 'is-loading': secret.loading }"
              @mouseenter="startSecretTimer"
              @mouseleave="clearSecretTimer"
              @click="handleSecretClick"
            >
              <i v-if="secret.loading" class="iconfont icon-loading"></i>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
<script>
import { ref, reactive, watch, onMounted } from '@vue/composition-api';
import { formatTime, getZodiac, isLightColor } from '../utils/utils';

export default {
  setup(props, context) {
    const { $route, $router, $http } = context.root;
    const jumpPage = ref(parseInt($route.query.page) || 1);

    const archives = reactive({
      years: [],
      page: parseInt($route.query.page) || 1,
      pageSize: 5,
      cursors: [null], 
      loading: false,
      none: false,
      totalCount: 0,   // 新增：总文章数
      totalPages: 1,   // 新增：计算出的总页数
    });
    // 1. 首页逻辑
    const goFirstPage = () => {
      if (archives.page === 1) return;
      $router.push({ query: { ...$route.query, page: 1 } }).catch(() => {});
    };

    const goLastPage = () => {
      if (archives.none) return;
      
      // 如果当前缓存的指针还没到最后一页
      if (archives.cursors.length < archives.totalPages) {
        alert(`受接口限制，请通过“下一页”逐步加载。目前最远可跳至第 ${archives.cursors.length} 页`);
        jumpPage.value = archives.page;
      } else {
        // 如果已经加载过末页指针
        $router.push({ query: { ...$route.query, page: archives.totalPages } }).catch(() => {});
      }
    };

    const goToPage = () => {
      let target = Math.floor(jumpPage.value);
      if (target < 1) target = 1;
      if (target > archives.totalPages) target = archives.totalPages;
      
      if (target > archives.cursors.length) {
        alert(`暂无法直接跳转。请先逐页浏览，目前可跳转的最远页为第 ${archives.cursors.length} 页。`);
        jumpPage.value = archives.page;
        return;
      }

      $router.push({ query: { ...$route.query, page: target } }).catch(() => {});
    };

    // 同步页码：当通过路由/按钮翻页时，更新输入框数字
    watch(() => archives.page, (newVal) => {
      jumpPage.value = newVal;
      document.title = `第${newVal}页 - 博客 - LAO Blog`;
    });
    const getData = (page = archives.page) => {
      if (page > 1 && !archives.cursors[page - 1]) {
        context.root.$router.replace({ query: { ...context.root.$route.query, page: 1 } });
        return;
      }

      if (archives.loading) return;
      archives.loading = true;

      const cursor = archives.cursors[page - 1];
      const query = `query {
        repository(owner: "Young-LAO", name: "github_blog_src") {
          issues(
            orderBy: {field: CREATED_AT, direction: DESC},
            first: ${archives.pageSize},
            after: ${cursor ? `"${cursor}"` : null}
          ) {
            totalCount
            nodes {
              title, createdAt, number, bodyText,
              comments(first: null) { totalCount },               
              labels (first: 10) {
                nodes {
                  name
                  color
                }
              }
            }
            pageInfo { endCursor, hasNextPage }
          }
        }
      }`;

      console.log(query);

      // 改回 .then() 模式，避开 async/await 带来的编译难题
      context.root.$http(query)
        .then((res) => {
          const { nodes, pageInfo, totalCount} = res.repository.issues;
          // 更新总数和计算总页数
          archives.totalCount = totalCount;
          archives.totalPages = Math.ceil(totalCount / archives.pageSize);

          archives.none = !pageInfo.hasNextPage;
          if (pageInfo.hasNextPage) {
            const newCursors = [...archives.cursors];
            newCursors[page] = pageInfo.endCursor;
            archives.cursors = newCursors;
          }

          const yearGroups = [];
          const yearMap = {};
          nodes.forEach((archive) => {
            const year = archive.createdAt.substr(0, 4);
            if (!yearMap[year]) {
              yearMap[year] = { year, archives: [] };
              yearGroups.push(yearMap[year]);
            }
            archive.labels = archive.labels.nodes;
            yearMap[year].archives.push(archive);
          });

          archives.years = yearGroups;
          window.scrollTo({ top: 0, behavior: 'smooth' });
        })
        .catch((err) => {
          console.error("Fetch failed:", err);
        })
        .finally(() => {
          archives.loading = false;
        });
    };

    // --- 路由监听：关键功能 ---
    watch(
      () => context.root.$route.fullPath, // 监听完整路径变化，包含 query
      () => {
        const queryPage = parseInt(context.root.$route.query.page) || 1;
        if (archives.page !== queryPage) {
          archives.page = queryPage;
          getData(queryPage);
        }
      }
    );

    const changePage = (step) => {
      const targetPage = archives.page + step;
      if (targetPage < 1) return;
      if (step > 0 && archives.none) return;

      // 仅仅修改 URL，由上面的 watch 来触发 getData
      $router.push({
        path: $route.path,
        query: { ...$route.query, page: targetPage }
      }).catch(err => {});
    };

    const secret = reactive({
      timer: null,
      ready: false,
      loading: false
    });
    const startSecretTimer = () => {
      if (secret.ready || secret.loading || archives.none) return;
      secret.timer = setTimeout(() => {
        secret.ready = true;
      }, 15000);
    };

    const clearSecretTimer = () => {
      if (secret.timer) {
        clearTimeout(secret.timer);
        secret.timer = null;
      }
      if (!secret.loading) { // 如果正在加载中，建议不要重置状态，防止 UI 闪烁
        secret.ready = false;
      }
    };

    const recursiveFetch = (currentPage, currentCursor) => {
      if (currentPage >= archives.totalPages) {
        secret.loading = false;
        $router.push({ query: { ...$route.query, page: archives.totalPages } }).catch(() => {});
        return;
      }

      const query = `query {
        repository(owner: "Young-LAO", name: "github_blog_src") {
          issues(
            orderBy: {field: CREATED_AT, direction: DESC},
            first: ${archives.pageSize},
            after: ${currentCursor ? `"${currentCursor}"` : null}
          ) {
            pageInfo { endCursor, hasNextPage }
          }
        }
      }`;

      $http(query)
        .then((res) => {
          const { endCursor } = res.repository.issues.pageInfo;
          archives.cursors[currentPage] = endCursor;
          
          recursiveFetch(currentPage + 1, endCursor);
        })
        .catch((err) => {
          console.error("Secret path failed:", err);
          secret.loading = false;
          alert("探测中断，请重试");
        });
    };

    const handleSecretClick = () => {
      if (!secret.ready || secret.loading) return;

      secret.loading = true;
      secret.ready = false;

      const lastKnownIndex = archives.cursors.length - 1;
      const lastCursor = archives.cursors[lastKnownIndex];
      
      recursiveFetch(lastKnownIndex + 1, lastCursor);
    };

    onMounted(() => {
      getData();
    });

    return {
      formatTime,
      getZodiac,
      nextPage: () => changePage(1),
      prevPage: () => changePage(-1),
      jumpPage,
      goToPage,
      goFirstPage,
      goLastPage,
      secret,
      startSecretTimer,
      clearSecretTimer,
      handleSecretClick,
      archives,
      isLightColor
    };
  },
};
</script>
<style lang="scss" scoped>
  .page-archives {
    .list {
      .item {
        &-name {
          position: relative;
          height: 32px;
          &:before { margin-top: -8px;}
          a, i {
            font-size: 20px;
            color: $mainStrong;
            line-height: 1.5;
          }

          a {
            font-weight: bold;
            margin-right: 8px;
          }

          i {
            margin-top: -6px;
          }
        }

        /* 在 <style> 中找到 .archives 相关的部分并替换/更新 */
        .archives {
          .archive {
            position: relative;
            display: block; // 确保是块级排列，不再是 flex 强制一行
            
            // 第一行容器
            .archive-header {
              width: 100%;
              line-height: 32px; // 适当缩小行高，因为下面有正文
              display: flex; // 确保是 flex 布局
              align-items: center;
              .labels {
                display: flex; // 确保标签内部横向排列
                flex-wrap: nowrap; // 既然是贴着标题，通常不希望换行
                gap: 8px;
                margin-left: 12px; // 标题和标签之间的间距
                flex-shrink: 0;   // 防止标签被压缩

                .label {
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;

                  height: 30px;               // 👈 缩小 20%
                  padding: 0 14px;            // 👈 缩小 20%
                  border-radius: 999px;

                  font-size: 12px;            // 👈 缩小 20%
                  font-weight: 500;
                  line-height: 1;
                  white-space: nowrap;

                  height: 24px; // 稍微对齐一下高度
                  padding: 0 10px;
                  font-size: 12px;

                }
              }
              .date {
                font-size: $sizeSmall;
                color: #888888;
                white-space: nowrap;
                margin-right: 12px; // 增加间距
              }

              .title {
                flex: 0 1 auto;
                max-width: 60%; // 限制标题最大宽度，防止挤掉标签
                font-size: $sizeMedium;
                font-weight: bold;
                color: $mainStrong;
                text-overflow: ellipsis;
                white-space: nowrap;
                overflow: hidden;
                transition: all 0.5s;

                &:hover {
                  color: #1abc9c;
                }
              }

              .others {
                flex: 1; 
                display: flex;
                justify-content: flex-end; 
                align-items: center;
                color: #bbbbbb;
                margin-left: 15px;
                font-size: 13px;

                i { font-size: 14px; }
                span { margin-left: 4px; color: #bbbbbb; }
              }
            }

            // 第二行正文
            .body-text {
              color: #777777; // 颜色稍微调淡一点点以区分标题
              font-size: $sizeNormal;
              line-height: 1.6;
              max-height: 96px;
              margin-top: 8px; // 标题与正文的间距
              margin-bottom: 0;
              display: -webkit-box;
              -webkit-box-orient: vertical;
              -webkit-line-clamp: 3; // 建议 3 行更美观
              overflow: hidden;
              word-break: break-all;
            }
          }

          .archive + .archive {
            margin-top: 24px; // 调整列表项之间的间距
            padding-top: 24px;
            border-top: 1px solid #f5f5f5; // 可选：加一条浅色分割线
          }
        }
      }

      .item + .item {
        margin-top: 40px;
      }
    }
  }
  /* 分页容器样式 */
  .pagination {
    margin-top: 40px;
    gap: 10px; // 适当缩小间距以容纳更多按钮

    .page-jump {
      display: flex !important;
      flex-direction: row;      /* 确保横向排列 */
      align-items: center;
      gap: 5px;                 /* 元素间的间距 */
      margin: 0 5px;
      font-size: 13px;
      color: #888;
      white-space: nowrap;      /* 防止文字换行 */
      span {
        display: inline-block;  /* 确保 span 不占整行 */
      }

      input {
        width: 45px;
        height: 28px;
        margin: 0;
        padding: 0;
        text-align: center;
        border: 1px solid #ddd;
        border-radius: 4px;
        outline: none;
        transition: border-color 0.3s;

        &:focus {
          border-color: #1abc9c;
        }

        // 移除数字增减箭头
        &::-webkit-inner-spin-button,
        &::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      }
    }
  }

  /* 按钮通用样式 */
  .btn-page {
    padding: 6px 12px;
    font-size: 13px;
    border: 1px solid $mainStrong; // 建议使用你的主题变量
    border-radius: 4px;
    color: $mainStrong;

    transition: all 0.3s ease;
    text-decoration: none;

    &:hover:not(.disabled) {
      background-color: #1abc9c;
      border-color: #1abc9c;
      color: #fff;
    }

    /* 禁用状态：关键！ */
    &.disabled {
      color: #ccc !important;
      border-color: #eee !important;
      cursor: not-allowed;
      pointer-events: none; // 彻底禁止点击事件
      background-color: #fafafa;
    }
  }

  /* 加载动画 */
  .icon-loading {
    display: inline-block;
    animation: rotate 1.5s linear infinite;
  }

  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .secret-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 15px;
    height: 28px;
    margin-left: 5px;
    cursor: default;
    background: transparent;
    transition: background-color 0.8s ease;
    border-radius: 4px;

    /* 正常悬浮：微微变灰 */
    &:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }

    /* 15秒满足后的状态 */
    &.is-ready {
      cursor: pointer;
      background-color: rgba(0, 0, 0, 0.1);
      
      &::after {
        content: '';
        width: 4px;
        height: 4px;
        background: #ccc;
        border-radius: 50%;
      }
    }

    /* 点击加载中的状态 */
    &.is-loading {
      .icon-loading {
        font-size: 12px;
        color: #1abc9c;
      }
      &::after {
        display: none;
      }
    }
  }
</style>
