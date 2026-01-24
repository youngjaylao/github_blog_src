<template>
  <div class="page-details">
    <div v-if="toc.length > 0" class="toc-container pc-only">
      <ul class="toc-list">
        <li v-for="(item, index) in toc" :key="index" :class="'toc-depth-' + item.level">
          <a 
            @click.prevent="scrollToAnchor(item.id)" 
            href="javascript:;" 
            >{{ item.text }}</a>
        </li>
      </ul>
    </div>

    <div class="mobile-only">
      <div class="toc-fab flex flex-middle flex-center" @click="showMobileToc = !showMobileToc">
        <i class="iconfont icon-list">目录</i>
      </div>
      <transition name="fade">
        <div class="toc-mask" v-if="showMobileToc" @click="showMobileToc = false"></div>
      </transition>
      <transition name="slide-up">
        <div class="mobile-toc-panel" v-if="showMobileToc">
          <div class="mobile-toc-header flex flex-between">
            <span>目录导航</span>
            <span class="close-btn" @click="showMobileToc = false">关闭</span>
          </div>
          <ul class="toc-list">
            <li v-for="(item, index) in toc" :key="index" :class="'toc-depth-' + item.level">
              <a @click.prevent="scrollToAnchor(item.id)" href="javascript:;">{{ item.text }}</a>
            </li>
          </ul>
        </div>
      </transition>
    </div>

    <div class="content-wrapper">
      <h4 class="title" v-text="issue.title"></h4>
      <div class="labels flex flex-middle">
        <div class="label" v-for="label in issue.labels" :key="label.name" v-text="label.name" :style="{'background-color': `#${label.color}`, 'color': `${isLightColor(label.color) ? '#000000' : '#ffffff'}`}" @click="goToLabelPage(label.name)"></div>
      </div>
      <div class="markdown-body" v-html="issue.bodyHTML"></div>
      <div id="comment"></div>
    </div>
  </div>
</template>

<script>
import { reactive, onMounted, ref, nextTick } from '@vue/composition-api';
import { isLightColor, formatTime } from '../utils/utils';

export default {
  setup(props, context) {
    const issue = reactive({ title: '', bodyHTML: '', labels: [] });
    const toc = ref([]);
    const showMobileToc = ref(false);
    const { id } = context.root.$route.params;

    // 在获取到 ID 后立即存入本地存储
    if (id) {
      localStorage.setItem('last_issue_id', id);
    }

    // 核心跳转逻辑：手动计算偏移量跳转
    const scrollToAnchor = (anchorId) => {
      const target = document.getElementById(anchorId);
      if (target) {
        const top = target.getBoundingClientRect().top + window.pageYOffset - 20;
        window.scrollTo({ top, behavior: 'smooth' });
        showMobileToc.value = false;
      }
    };

    const generateTOC = (html) => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const headings = tempDiv.querySelectorAll('h1, h2, h3, h4');
      const list = [];
      
      headings.forEach((heading, index) => {
        const id = `anchor-${index}`;
        heading.setAttribute('id', id); // 预设ID
        list.push({
          id: id,
          text: heading.innerText.trim(),
          level: parseInt(heading.tagName.replace('H', ''), 10)
        });
      });
      
      toc.value = list;
      // 将带有ID的新HTML写回，确保DOM中存在对应的ID
      issue.bodyHTML = tempDiv.innerHTML;
    };

    const getData = () => {
      context.root.$loading.show('努力为您查询');
      const query = `query {
          repository(owner: "youngjaylao", name: "github_blog_src") {
            issue(number: ${id}) {
              title
              bodyHTML
              labels (first: 10) { nodes { name color } }
            }
          }
        }`;
      context.root.$http(query).then((res) => {
        const { title, bodyHTML, labels } = res.repository.issue;
        issue.title = title;
        issue.labels = labels.nodes;
        document.title = `${title} - LAO Blog`;
        generateTOC(bodyHTML); // 生成目录并补全ID
      });
    };

    const initComment = () => {
      const currentId = id || context.root.$route.params.id;
      if (!currentId) return; // 没有 ID 就不初始化评论，防止报错
      const utterances = document.createElement('script');
      utterances.type = 'text/javascript';
      utterances.async = true;
      console.log('issue id:', currentId);
      utterances.setAttribute('issue-number', parseInt(currentId, 10));
      utterances.setAttribute('theme', 'github-light');
      utterances.setAttribute('repo', 'youngjaylao/github_blog_src');
      utterances.crossorigin = 'anonymous';
      utterances.src = 'https://utteranc.es/client.js';
      const container = document.getElementById('comment');
      if (container) container.appendChild(utterances);
    };

    onMounted(() => {
      getData();
      initComment();
    });

    // 新增跳转方法
    const goToLabelPage = (labelName) => {
      // 方案 A: 如果你想在当前页面跳转
      context.root.$router.push({ path: '/labels', query: { label: labelName, page: 1 } });

      // 方案 B: 按照你的要求，在新标签页打开
      // const url = `${window.location.origin}${window.location.pathname}#/labels?label=${encodeURIComponent(labelName)}&page=1`;
      // window.open(url, '_blank');
    };

    return { 
      isLightColor, 
      issue, 
      toc, 
      scrollToAnchor, 
      showMobileToc, 
      goToLabelPage,
    };
  },
};
</script>

<style lang="scss" scoped>
/* 强制隐藏 App.vue 中定义的左侧灰色装饰竖线 */

/* 响应式控制 */
.pc-only { display: block; }
.mobile-only { display: none; }

@media (max-width: 767px) {
  .pc-only { display: none !important; }
  .mobile-only { display: block; }
}

/* PC 端布局重构 */
.pc-mode {
  /* 针对 PC 端，隐藏 App.vue 中定义的左侧灰色装饰竖线 */
  .pc-mode .main-wrap:before {
    display: none !important;
  }
  
  .page-details {
    width: 900px; /* 增加整体宽度 */
    margin: 0 auto;
    display: flex;
    justify-content: flex-start;
    position: relative;
    padding-left: 100px; /* 为左侧目录腾出固定空间 */
  }

  .toc-container {
    position: fixed; /* 固定在左侧 */
    top: 190px;
    left: 20px; 
    width: 180px;
    max-height: 70vh;
    overflow-y: auto;
    padding-right: 15px;
    border-right: 1px solid #f0f0f0;

    .toc-title { font-weight: bold; font-size: 14px; color: #333; margin-bottom: 15px; padding-left: 10px;}
    .toc-list {
      list-style: none;
      li {
        margin: 8px 0;
        line-height: 1.4;
        a { 
          color: #666; 
          font-size: 13px; 
          text-decoration: none; 
          display: block;
          
          /* --- 修改部分 --- */
          white-space: normal;      /* 允许换行 */
          overflow: visible;        /* 允许内容溢出容器（即正常显示） */
          text-overflow: clip;      /* 关闭省略号 */
          word-break: break-all;    /* 强制长单词/链接换行（可选） */
          line-height: 1.5;         /* 换行后增加行高，防止文字挤在一起 */
          margin-bottom: 4px;       /* 增加间距 */
          /* ---------------- */

          &:hover { color: #1abc9c; }
        }
        &.toc-depth-1 { font-weight: bold; }
        &.toc-depth-2 { padding-left: 15px; }
        &.toc-depth-3 { padding-left: 30px; font-size: 12px; color: #999; }
      }
    }
  }

  .content-wrapper { width: 600px; } /* 保持正文宽度不变 */
}

/* 移动端样式 */
.mobile-mode {
  .content-wrapper { width: 100%; }
  
  .toc-fab {
    position: fixed; right: 20px; bottom: 80px; width: 44px; height: 44px;
    background: #1abc9c; color: #fff; border-radius: 50%; font-size: 12px;
    box-shadow: 0 4px 12px rgba(26,188,156,0.3); z-index: 99;
  }

  .toc-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100; }

  .mobile-toc-panel {
    position: fixed; bottom: 0; left: 0; right: 0; background: #fff;
    z-index: 101; border-radius: 16px 16px 0 0; padding: 20px; max-height: 70vh; overflow-y: auto;
    
    .mobile-toc-header { margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee;
      span:first-child { font-weight: bold; }
      .close-btn { color: #1abc9c; }
    }
    
    .toc-list { list-style: none;
      li { padding: 12px 0; border-bottom: 1px dashed #f0f0f0;
        a {
          white-space: normal;      /* 确保移动端也会换行 */
          word-wrap: break-word;
          line-height: 1.6;
        }
        &.toc-depth-3 { padding-left: 20px; font-size: 13px; color: #666; }
      }
    }
  }
}

.page-details {
  .title { font-size: 24px; font-weight: bold; color: #2c3e50; }
  .labels { margin: 15px 0 25px; 
    .label { 
      padding: 9px 15px;      /* 1. 稍微增加左右内边距，让胶囊更修长 */
      border-radius: 50px;    /* 2. 核心：设置大圆角变为胶囊形状 */
      margin-right: 10px;     /* 3. 适当调整间距 */
      font-size: 12px;
      font-weight: 500;       /* 4. 可选：加粗一点点更美观 */
      display: inline-block;  /* 确保边距生效 */
      cursor: pointer;
      user-select: none;

      transition:
        background-color 0.25s ease,
        color 0.25s ease,
        box-shadow 0.25s ease,
        transform 0.15s ease;

      // 默认态（阴影同步减弱）
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12);
      }

      &.active {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.16);
      }
    } 
  }
}

.markdown-body { margin-top: 20px; line-height: 1.8; }

/* 动画效果 */
.slide-up-enter-active, .slide-up-leave-active { transition: all 0.3s ease; }
.slide-up-enter, .slide-up-leave-to { transform: translateY(100%); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter, .fade-leave-to { opacity: 0; }
</style>
<style lang="scss">
/* 这里的样式会作用于全局，但只在详情页加载时生效 */
.pc-mode .main-wrap:before {
  background-color: transparent !important; /* 或是 display: none */
}

</style>