<template>
  <div class="page-labels">
    <div class="nav flex flex-middle" v-if="archives.labels.length">
      <div class="labels flex-item flex">
        <a 
          class="label flex flex-middle flex-center" 
          :class="[item.name === archives.label && 'active']" 
          href="javascript:;" 
          v-for="item in archives.labels" 
          :key="item.name" 
          v-text="item.name" 
          @click="changeLabel(item.name)"
          :style="{'background-color': `#${item.color}`, 'color': `${isLightColor(item.color) ? '#000000' : '#ffffff'}`}"
        ></a>
      </div>
    </div>

    <div class="list">
      <div class="item">
        <div class="item-name flex flex-middle" v-if="archives.label">
          <strong v-text="`共( ${archives.totalCount} )篇`"></strong>
        </div>
        <ul class="archives">
          <li class="archive flex flex-middle" v-for="archive in archives.list" :key="archive.number">
            <div class="archive-header flex flex-middle">
              <span class="date" v-text="formatTime(archive.createdAt, 'yyyy-MM-dd')"></span>
              <router-link class="title" :to="`/archives/${archive.number}`" v-text="archive.title" :title="archive.title" target="_blank" rel="noopener noreferrer"></router-link>
              <div class="others flex-item flex-end flex flex-middle">
                <i class="iconfont icon-comment"></i>
                <span v-text="archive.comments.totalCount"></span>
              </div>
            </div>
            <p class="body-text">{{ archive.bodyText }}</p>
          </li>
        </ul>
      </div>
    </div>

    <div class="auxi flex flex-middle flex-center" v-if="archives.loading">
      <i class="iconfont icon-loading"></i>
      <span>正在加载中</span>
    </div>

    <div class="auxi flex flex-middle flex-center" v-if="archives.none && !archives.loading && archives.label">
      <i class="iconfont icon-none"></i>
      <span>目前就这么多啦~</span>
    </div>

    <div class="pagination-wrapper" style="min-height: 50px;" v-if="!archives.loading && archives.label">
      <div class="pagination flex flex-middle flex-center">
        <a href="javascript:;" class="btn-page" :class="{ disabled: archives.page === 1 }" @click="goFirstPage">首页</a>
        <a href="javascript:;" class="btn-page" :class="{ disabled: archives.page === 1 }" @click="prevPage">上一页</a>

        <div class="page-jump flex flex-middle">
          <span>第</span>
          <input type="number" v-model.number="jumpPage" @keyup.enter="goToPage" min="1" />
          <span>/ {{ archives.totalPages }} 页</span>
        </div>

        <a href="javascript:;" class="btn-page" :class="{ disabled: archives.none }" @click="nextPage">下一页</a>
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

<script>
import { ref, reactive, watch, onMounted } from '@vue/composition-api';
import { isLightColor, formatTime } from '../utils/utils';

export default {
  setup(props, context) {
    const { $http, $loading } = context.root;

    const jumpPage = ref(1);
    const labelCache = {}; // 核心：缓存每个标签的 cursors, totalCount 等

    const archives = reactive({
      list: [],
      labels: [],
      label: null,
      page: 1,
      pageSize: 5,
      cursors: [null],
      loading: false,
      none: false,
      totalCount: 0,
      totalPages: 1,
    });

    const secret = reactive({ timer: null, ready: false, loading: false });

    // 数据获取函数
    const getData = () => {
      if (!archives.label) return;
      archives.loading = true;

      // 如果当前页没有 cursor 且不是第一页，自动修正到第一页
      const cursor = archives.cursors[archives.page - 1];
      if (archives.page > 1 && cursor === undefined) {
        context.root.$router.replace({ query: { ...context.root.$route.query, page: 1 } });
        return;
      }

      const query = `query {
        repository(owner: "youngjaylao", name: "github_blog_src") {
          issues(
            filterBy: {labels: "${archives.label}"}, 
            orderBy: {field: CREATED_AT, direction: DESC}, 
            first: ${archives.pageSize}, 
            after: ${cursor ? `"${cursor}"` : null}
          ) {
            totalCount
            nodes {
              title, createdAt, number, bodyText
              comments(first: null) { totalCount }
            }
            pageInfo { endCursor, hasNextPage }
          }
        }
      }`;

      $http(query).then((res) => {
        const { nodes, pageInfo, totalCount } = res.repository.issues;
        
        // 更新当前状态
        archives.totalCount = totalCount;
        archives.totalPages = Math.ceil(totalCount / archives.pageSize);
        archives.none = !pageInfo.hasNextPage;
        
        // 更新指针记录
        if (pageInfo.hasNextPage) {
          archives.cursors[archives.page] = pageInfo.endCursor;
        }

        // 同步回缓存对象，这样切换标签能找回进度
        labelCache[archives.label] = {
          cursors: [...archives.cursors],
          totalCount: archives.totalCount,
          totalPages: archives.totalPages
        };

        archives.list = nodes;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }).finally(() => {
        archives.loading = false;
      });
    };

    // 获取标签列表
    const getLabels = () => {
      $loading.show('查询标签中...');
      const query = `query {
        repository(owner: "youngjaylao", name: "github_blog_src") {
          labels(first: 100) { nodes { name, color } }
        }
      }`;
      $http(query).then((res) => {
        archives.labels = res.repository.labels.nodes;
        // 如果进入页面时没带标签参数，默认选中第一个
        if (archives.labels.length && !context.root.$route.query.label) {
          changeLabel(archives.labels[0].name);
        }
      });
    };

    // 关键修复：监听整个 query 对象的变化
    watch(
      () => context.root.$route.query,
      (newQuery) => {
        const newLabel = newQuery.label;
        const newPage = parseInt(newQuery.page) || 1;

        if (newLabel) {
          // 1. 处理标签切换逻辑
          if (archives.label !== newLabel) {
            archives.label = newLabel;
            // 尝试从缓存恢复
            if (labelCache[newLabel]) {
              archives.cursors = labelCache[newLabel].cursors;
              archives.totalCount = labelCache[newLabel].totalCount;
              archives.totalPages = labelCache[newLabel].totalPages;
            } else {
              // 新标签，重置状态
              archives.cursors = [null];
              archives.totalCount = 0;
              archives.totalPages = 1;
            }
          }

          // 2. 更新页码
          archives.page = newPage;
          jumpPage.value = newPage;
          document.title = `第${newPage}页 - ${newQuery.label} - 标签 - LAO Blog`;

          // 3. 执行数据请求
          getData();
        }
      },
      { immediate: true, deep: true }
    );

    // 操作逻辑
    const changeLabel = (labelName) => {
      if (archives.label === labelName && archives.page === 1) return;
      context.root.$router.push({ query: { label: labelName, page: 1 } }).catch(() => {});
    };

    const changePage = (step) => {
      const target = archives.page + step;
      if (target < 1 || (step > 0 && archives.none)) return;
      context.root.$router.push({ query: { ...context.root.$route.query, page: target } });
    };

    const goFirstPage = () => context.root.$router.push({ query: { ...context.root.$route.query, page: 1 } });
    const goLastPage = () => {
      if (archives.cursors.length < archives.totalPages) {
        alert(`请通过“下一页”加载或使用秘密探测。目前最远：${archives.cursors.length}页`);
      } else {
        context.root.$router.push({ query: { ...context.root.$route.query, page: archives.totalPages } });
      }
    };
    const goToPage = () => {
      let target = Math.max(1, Math.min(jumpPage.value, archives.totalPages));
      if (target > archives.cursors.length) {
        alert(`目前最远可跳转至 ${archives.cursors.length} 页`);
        jumpPage.value = archives.page;
        return;
      }
      context.root.$router.push({ query: { ...context.root.$route.query, page: target } });
    };

    // 秘密搜集逻辑
    const startSecretTimer = () => {
      if (secret.ready || secret.loading || archives.none) return;
      secret.timer = setTimeout(() => { secret.ready = true; }, 15000);
    };
    const clearSecretTimer = () => {
      if (secret.timer) { clearTimeout(secret.timer); secret.timer = null; }
      if (!secret.loading) secret.ready = false;
    };
    const handleSecretClick = () => {
      if (!secret.ready || secret.loading) return;
      secret.loading = true;
      secret.ready = false;
      const recursiveFetch = (currentPage, currentCursor) => {
        if (currentPage >= archives.totalPages) {
          secret.loading = false;
          context.root.$router.push({ query: { ...context.root.$route.query, page: archives.totalPages } });
          return;
        }
        const q = `query {
          repository(owner: "youngjaylao", name: "github_blog_src") {
            issues(filterBy: {labels: "${archives.label}"}, first: ${archives.pageSize}, after: ${currentCursor ? `"${currentCursor}"` : null}) {
              pageInfo { endCursor }
            }
          }
        }`;
        $http(q).then(res => {
          const { endCursor } = res.repository.issues.pageInfo;
          archives.cursors[currentPage] = endCursor;
          recursiveFetch(currentPage + 1, endCursor);
        }).catch(() => { secret.loading = false; });
      };
      recursiveFetch(archives.cursors.length, archives.cursors[archives.cursors.length - 1]);
    };

    onMounted(getLabels);

    return {
      formatTime, archives, jumpPage, secret,
      nextPage: () => changePage(1),
      prevPage: () => changePage(-1),
      goFirstPage, goLastPage, goToPage, changeLabel,
      startSecretTimer, clearSecretTimer, handleSecretClick, isLightColor
    };
  }
};
</script>

<style lang="scss" scoped>
  @keyframes label-glow {
    0% { 
      box-shadow: 0 0 0 2px #000, 0 4px 12px rgba(0, 0, 0, 0.16); 
    }
    50% { 
      box-shadow: 0 0 0 3px #000, 0 6px 20px rgba(0, 0, 0, 0.25); 
    }
    100% { 
      box-shadow: 0 0 0 2px #000, 0 4px 12px rgba(0, 0, 0, 0.16); 
    }
  }
  /* 样式完全保留并合并 Archives 的分页按钮样式 */
  .pc-mode .page-labels .nav .name { margin-left: -18px; }
  .page-labels {
    .nav { margin-bottom: 24px;
      .name { font-size: $sizeNormal; width: 40px; height: 40px; background-color: #f0f0f0; border-radius: 50%; color: #555555; margin-right: 8px;}
      .labels {
        flex-wrap: wrap;
        gap: 13px; // 同步稍微缩小间距
        margin-left: 12px;

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

          cursor: pointer;
          user-select: none;

          transition:
            background-color 0.25s ease,
            color 0.25s ease,
            box-shadow 0.25s ease,
            cubic-bezier(0.175, 0.885, 0.32, 1.275),
            transform 0.15s ease;

          // 默认态（阴影同步减弱）
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);

          &:hover:not(.active) {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          }

          &.active {
            padding: 0 20px;
            transform: scale(1.15); // 放大 15%
            z-index: 10; // 确保放大时图层在最上方
            font-weight: bold;
            letter-spacing: 0.5px; // 文字稍微撑开一点，更有质感
            box-shadow: 0 4px 15px rgba(0,0,0,0.15);
            // 触发呼吸动画：持续 3 秒，无限循环，平滑过渡
            animation: label-glow 3s infinite ease-in-out;
            // --- 关键修改：添加黑色线条 ---
            outline: 2px solid #000000; // 使用 outline 不占据空间
            outline-offset: 1px;        // 线条与标签之间留一点点呼吸间隙，更好看
            // ---------------------------
            
          }
        }
      }
    }
    .list .item {
      &-name { position: relative; height: 32px; line-height: 1;
        p, strong { font-size: $sizeLarge; color: $mainStrong; }
        strong { margin-top: 8px;}
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
            align-items: flex-start;
            .date {
              font-size: $sizeSmall;
              color: #888888;
              white-space: nowrap;
              margin-right: 12px; // 增加间距
            }

            .title {
              flex: 0 1 auto;
              font-size: $sizeMedium;
              font-weight: bold;
              color: $mainStrong;
              white-space: normal;      // 允许正常换行
              word-break: break-all;    // 确保长英文单词也能断开换行
              transition: all 0.5s;
              line-height: 1.4;         // 换行后增加行高，防止文字挤在一起

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
  }

  .pagination {
    margin-top: 40px; gap: 10px;
    .page-jump {
      display: flex !important;
      flex-direction: row;      /* 确保横向排列 */
      align-items: center;
      gap: 5px;                 /* 元素间的间距 */
      margin: 0 10px;
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
  .btn-page {
    padding: 6px 12px; font-size: 13px; border: 1px solid $mainStrong; border-radius: 4px; color: $mainStrong; transition: all 0.3s ease; text-decoration: none;
    &:hover:not(.disabled) { background-color: #1abc9c; border-color: #1abc9c; color: #fff; }
    &.disabled { color: #ccc !important; border-color: #eee !important; cursor: not-allowed; pointer-events: none; background-color: #fafafa; }
  }
  .icon-loading { display: inline-block; animation: rotate 1.5s linear infinite; }
  @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .secret-trigger {
    display: inline-flex; align-items: center; justify-content: center; width: 15px; height: 28px; margin-left: 5px; transition: background-color 0.8s ease; border-radius: 4px;
    &:hover { background-color: rgba(0, 0, 0, 0.05); }
    &.is-ready { cursor: pointer; background-color: rgba(0, 0, 0, 0.1); &::after { content: ''; width: 4px; height: 4px; background: #ccc; border-radius: 50%; } }
    &.is-loading { .icon-loading { font-size: 12px; color: #1abc9c; } }
  }
</style>