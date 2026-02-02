<template>
  <div class="page-search">
    <div class="header-bar flex flex-middle">
      <div class="search flex flex-middle">
        <i class="iconfont icon-search"></i>
        <input
          class="flex-item"
          type="text"
          placeholder="search"
          v-model="search"
          @input="handleInput"
        />
      </div>
      
    </div>


    <ul class="archives">
      <li
        class="archive"
        v-for="archive in archives.list"
        :key="archive.number"
      >
        <div class="archive-header flex flex-middle">
          <span class="date" v-text="formatTime(archive.createdAt, 'yyyy-MM-dd')"></span>
          <router-link
            class="title"
            :to="`/archives/${archive.number}`"
            :title="archive.title"
            target="_blank"
            rel="noopener noreferrer"
            v-html="highlight(archive.title)"
          ></router-link>
          
          <div class="labels">
            <div 
              class="label" 
              v-for="label in archive.labels" 
              :key="label.name" 
              v-text="label.name" 
              :style="{
                'background-color': `#${label.color}`, 
                'color': `${isLightColor(label.color) ? '#000000' : '#ffffff'}`
              }"
              @click="goToLabelPage(label.name)"
            ></div>
          </div>

          <div class="others">
            <i class="iconfont icon-comment"></i>
            <span v-text="archive.comments.totalCount"></span>
          </div>
        </div>

        <p class="body-text" v-html="getSnippetAndHighlight(archive.bodyText)"></p>        
      </li>
    </ul>

    <div class="auxi flex flex-middle flex-center" v-if="archives.none && archives.list.length > 0">
      <i class="iconfont icon-none"></i>
      <span>目前就这么多啦~</span>
    </div>

    <div class="auxi flex flex-middle flex-center" v-else-if="archives.loading">
      <i class="iconfont icon-loading"></i>
      <span>正在加载中</span>
    </div>

    <div class="flex flex-middle flex-center" v-else-if="!archives.none && archives.list.length > 0">
      <a class="btn-next flex flex-middle flex-center" href="javascript:;" @click="getData">
        加载更多
      </a>
    </div>
  </div>
</template>

<script>
import { debounce, formatTime, isLightColor } from '../utils/utils';
import { Segment, useDefault } from 'segmentit';
export default {
  name: 'Search',

  data() {
    return {
      search: '',
      segmentit: null,
      archives: {
        list: [],
        totalCount: 0,
        cursor: null,
        loading: false,
        none: false,
      },
    };
  },
  created() {
    document.title = `搜索 - 漾际资本（YoungJay Capital Ltd.）`;
    this.onInputDebounced = debounce(this.onInput, 300);
    this.segmentit = new Segment();
    this.segmentit.use(useDefault);
    
  },

  methods: {
    formatTime,
    isLightColor,
    goToLabelPage(labelName) {
      // 方案 A: 如果你想在当前页面跳转
      // context.root.$router.push({ path: '/labels', query: { label: labelName, page: 1 } });

      // 方案 B: 按照你的要求，在新标签页打开
      const url = `${window.location.origin}${window.location.pathname}#/labels?label=${encodeURIComponent(labelName)}&page=1`;
      window.open(url, '_blank');
    },
    
    // 关键词高亮逻辑
    highlight(text) {
      if (!this.search || !text) return text;
      // 替换特殊字符并创建全局不区分大小写的正则
      const highlightReg = new RegExp(`(${this.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return text.replace(highlightReg, '<span class="highlight">$1</span>');
    },
    // --- 【新增方法】智能截取正文片段并高亮 ---
    getSnippetAndHighlight(text) {
      if (!text) return '';
      if (!this.search) return text.slice(0, 120); // 没有搜索词时，默认显示前120字

      const lowerText = text.toLowerCase();
      const lowerSearch = this.search.toLowerCase();
      const index = lowerText.indexOf(lowerSearch);

      // 情况1：关键词不在正文中（可能只在标题里匹配到了），显示文章开头
      if (index === -1) {
        return this.highlight(text.slice(0, 120) + (text.length > 120 ? '...' : ''));
      }

      // 情况2：关键词在正文中，需要截取上下文
      // 设定截取长度，比如关键词前后各留 30-50 个字符
      const beforeCount = 30;
      const afterCount = 90;
      
      let start = index - beforeCount;
      let end = index + this.search.length + afterCount;

      // 边界处理
      if (start < 0) start = 0;
      if (end > text.length) end = text.length;

      let snippet = text.slice(start, end);

      // 如果不是从头开始截取，前面加省略号
      if (start > 0) snippet = '...' + snippet;
      // 如果没有截取到最后，后面加省略号
      if (end < text.length) snippet = snippet + '...';

      // 对截取后的片段进行高亮处理
      return this.highlight(snippet);
    },
    handleInput() {
      this.onInputDebounced();
    },

    onInput() {
      this.resetData();
      if (this.search) {
        this.getData();
      }
    },

    resetData() {
      this.archives.cursor = null;
      this.archives.loading = false;
      this.archives.none = false;
      this.archives.list = [];
      this.archives.totalCount = 0;
    },

    getData() {
      if (this.archives.loading) return;
      this.archives.loading = true;
      const safeSearch = this.search.replace(/"/g, '\\"'); 
      // 修改点A：不再根据 checkbox 决定是否加引号，直接传给 GitHub
      // 我们希望 GitHub 返回尽可能多的结果，由前端来通过分词精准过滤
      const queryKeyword = safeSearch;
      const query = `query {
        search(
          query: "${queryKeyword} repo:youngjaylao/github_blog_src",
          type: ISSUE,
          first: 10,
          after: ${this.archives.cursor}
        ) {
          issueCount
          pageInfo {
            endCursor
            hasNextPage
          }
          nodes {
            ... on Issue {
              createdAt
              title
              bodyText
              number
              comments(first: null) { totalCount }
              labels (first: 10) {
                nodes {
                  name
                  color
                }
              }
            }
          }
        }
      }`;
      console.log('Executing search query:', query);

      this.$http(query).then((res) => {
        const { nodes, pageInfo, issueCount } = res.search;
        console.log(res.search);


        this.archives.loading = false;
        let formattedNodes = nodes.map(node => ({
          ...node,
          labels: node.labels ? node.labels.nodes : []
        }));
        // --- 修改点B：引入分词智能过滤 ---
        if (this.search) {
          const lowerSearch = this.search.toLowerCase();
          
          // 1. 使用 segmentit 进行分词，simple: true 返回纯字符串数组
          const segments = this.segmentit.doSegment(lowerSearch, { simple: true });
          
          // 2. 过滤：要求文章内容必须包含 分词结果中的每一个词 (AND关系)
          formattedNodes = formattedNodes.filter(node => {
            const title = (node.title || '').toLowerCase();
            const body = (node.bodyText || '').toLowerCase();
            const content = title + body;
            
            // 检查 content 是否包含 segments 里的每一个词
            return segments.every(word => content.includes(word));
          });
        }


        this.archives.list = this.archives.list.concat(formattedNodes);
        this.archives.totalCount = issueCount;
        this.archives.cursor = pageInfo.endCursor ? `"${pageInfo.endCursor}"` : null;

        // 修改点C：如果当前页过滤完了（没显示任何东西），但 API 还有下一页，自动加载下一页
        if (formattedNodes.length === 0 && pageInfo.hasNextPage) {
          this.getData();
          return;
        }

        if (!pageInfo.hasNextPage) {
          this.archives.none = true;
        }

        document.title = `${this.search} - 搜索 - 漾际资本（YoungJay Capital Ltd.）`;
      }).catch(err => {
        console.error(err);
        this.archives.loading = false;
      });
    },
  },
};
</script>

<style lang="scss" scoped>
  /* 基础结构与归档页保持一致 */
  .pc-mode {
    .page-search {
      .search {
        margin-left: 20px;
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

  .page-search {
    /* 修改点 5: 调整头部布局样式 */
    .header-bar {
      margin-bottom: 16px; /* 给下方留点空隙 */
      
    }
    .search {
      position: relative;
      max-width: 400px;
      background-color: #f0f0f0;
      height: 36px;
      border-radius: 18px;
      padding: 0 16px;

      i {
        font-size: $sizeMedium;
        margin-left: -8px;
        margin-right: 8px;
      }

      input {
        position: relative;
        height: 100%;
        background-color: transparent;
        border: none;
        font-size: $sizeMedium;
        color: $mainStrong;
        outline: none;
      }
    }

    .tips {
      margin-left: 20px;
      margin-top: 16px;
      p {
        font-size: $sizeNormal;
        color: #999999;
      }
    }

    .archives {
      margin-top: 32px;
      margin-bottom: 16px;
      list-style: none;
      padding-left: 20px;

      .archive {
        position: relative;
        display: block;

        .archive-header {
          width: 100%;
          line-height: 32px;
          display: flex;
          align-items: center;

          .date {
            font-size: $sizeSmall;
            color: #888888;
            white-space: nowrap;
            margin-right: 12px;
          }

          .title {
            flex: 0 1 auto;
            max-width: 60%;
            font-size: $sizeMedium;
            font-weight: bold;
            color: $mainStrong;
            text-overflow: ellipsis;
            white-space: nowrap;
            overflow: hidden;
            transition: all 0.5s;
            text-decoration: none;

            &:hover {
              color: #1abc9c;
            }

            /* 高亮样式 */
            ::v-deep .highlight {
              background-color: rgba(103, 3, 3, 0.1);
              color: #670303;
              font-weight: bold;
            }
          }

          .labels {
            display: flex;
            gap: 8px;
            margin-left: 12px;
            flex-shrink: 0;

            .label {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              height: 24px;
              padding: 0 10px;
              border-radius: 999px;
              font-size: 12px;
              font-weight: 500;
              white-space: nowrap;

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

        .body-text {
          color: #777777;
          font-size: $sizeNormal;
          line-height: 1.6;
          max-height: 96px;
          margin-top: 8px;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
          overflow: hidden;
          word-break: break-all;

          /* 高亮样式 */
          ::v-deep .highlight {
            background-color: rgba(103, 3, 3, 0.1);
            color: #670303;
            padding: 0 2px;
            border-radius: 2px;
          }
        }
      }

      .archive + .archive {
        margin-top: 24px;
        padding-top: 24px;
        border-top: 1px solid #f5f5f5;
      }
    }

    .btn-next {
      padding: 8px 24px;
      font-size: 14px;
      border: 1px solid $mainStrong;
      border-radius: 4px;
      color: $mainStrong;
      transition: all 0.3s;
      text-decoration: none;
      margin-top: 20px;
      /* 添加以下两行 */
      white-space: nowrap;  /* 强制文字不换行 */
      min-width: 120px;     /* 设置一个最小宽度，确保视觉美观 */

      &:hover {
        background-color: #1abc9c;
        border-color: #1abc9c;
        color: #fff;
      }
    }
  }

  .icon-loading {
    display: inline-block;
    animation: rotate 1.5s linear infinite;
  }

  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>