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
        :key="archive.source + '-' + archive.number"
      >
        <div class="archive-header flex flex-middle">
          <span class="date" v-text="formatTime(archive.createdAt, 'yyyy-MM-dd')"></span>
          <router-link
            class="title"
            :to="getModePath(archive.source, `/archives/${archive.number}`)"
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
              @click="goToLabelPage(archive.source, label.name)"
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
import { debounce, formatTime, isLightColor, checkAuthStatusUtil, repoConfig } from '../utils/utils';
import { Segment, useDefault } from 'segmentit';
import { computed } from '@vue/composition-api';
export default {
  name: 'Search',

  data() {
    return {
      search: '',
      segmentit: null,
      isLoggedIn: false,

      // 统一管理多个 repo 的分页和数据
      sources: {
        public: {
          repo: 'github_blog_src',
          list: [],
          cursor: null,
          hasNextPage: true,
          totalCount: 0,
          loading: false
        },
        private: {
          repo: 'private_blog',
          list: [],
          cursor: null,
          hasNextPage: true,
          totalCount: 0,
          loading: false
        }
      },

      // 显示给用户的合并结果
      archives: {
        list: [],        // 合并后排序的结果
        loading: false,
        none: false
      }
    };
  },
  created() {
    document.title = `搜索 - 漾际资本（YoungJay Capital Ltd.）`;
    this.onInputDebounced = debounce(this.onInput, 300);
    this.segmentit = useDefault(new Segment());
    this.isLoggedIn = checkAuthStatusUtil();
  },
  computed: {
    searchSegments() {
      if (!this.search.trim()) return [];
      // 实时分词，返回字符串数组
      return this.segmentit.doSegment(this.search, { simple: true })
            .map(word => word.toLowerCase())
            .filter(word => word.trim().length > 0);  // 去掉空串    }
    },
    // 实际要搜索的 sources
    activeSources() {
      if (this.isLoggedIn) {
        return ['public', 'private'];
      }
      return ['public'];
    }
  },

  methods: {
    formatTime,
    isLightColor,
    getModePath(blogModeValue, path){
      return repoConfig[blogModeValue].pathPrefix + path;
    },
    goToLabelPage(blogModeValue, labelName) {
      // 方案 A: 如果你想在当前页面跳转
      // context.root.$router.push({ path: '/labels', query: { label: labelName, page: 1 } });

      // 方案 B: 按照你的要求，在新标签页打开
      const url = `${window.location.origin}${window.location.pathname}#${this.getModePath(blogModeValue, '/labels')}?label=${encodeURIComponent(labelName)}&page=1`;
      
      window.open(url, '_blank');
    },

    
    // 关键词高亮逻辑
    highlight(text) {
      if (!this.search || !text) return text;
      let result = text;

      // 对 searchSegments 里的每一个词都做高亮（不区分大小写）
      this.searchSegments.forEach(word => {
        if (!word) return;

        // 转义正则特殊字符
        const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const reg = new RegExp(`(${escaped})`, 'gi');

        result = result.replace(reg, match => {
          // 保留原始大小写，但加上高亮标签
          return `<span class="highlight">${match}</span>`;
        });
      });

      return result;
    },
    // --- 【新增方法】智能截取正文片段并高亮 ---
    getSnippetAndHighlight(text) {
      if (!text) return '';
      
      // 没有搜索词 → 显示前 120 字（不加高亮）
      if (!this.search.trim()) {
        return text.slice(0, 120) + (text.length > 120 ? '...' : '');
      }
      const lowerText = text.toLowerCase();

      // 寻找最早出现的任意一个分词
      let firstMatchIndex = Infinity;
      let matchedWord = '';

      this.searchSegments.forEach(word => {
        const idx = lowerText.indexOf(word);
        if (idx !== -1 && idx < firstMatchIndex) {
          firstMatchIndex = idx;
          matchedWord = word;
        }
      });

      // 没有任何分词出现在正文 → 显示开头 + 高亮标题里可能匹配的部分
      if (firstMatchIndex === Infinity) {
        let snippet = text.slice(0, 120) + (text.length > 120 ? '...' : '');
        return this.highlight(snippet);
      }

      // 情况2：关键词在正文中，需要截取上下文
      // 设定截取长度，比如关键词前后各留 30-50 个字符
      const beforeCount = 30;
      const afterCount = 90;
      
      let start = firstMatchIndex - beforeCount;
      let end   = firstMatchIndex + matchedWord.length + afterCount;

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
      this.archives.list = [];
      this.archives.none = false;
      this.archives.loading = false;

      // 重置每个 source
      Object.keys(this.sources).forEach(key => {
        const s = this.sources[key];
        s.list = [];
        s.cursor = null;
        s.hasNextPage = true;
        s.totalCount = 0;
      });
    },
    // 核心：获取数据（可能并发请求多个 repo）
    getData() {
      if (this.archives.loading) return;
      this.archives.loading = true;

      const promises = this.activeSources.map(sourceKey => {
        const source = this.sources[sourceKey];
        if (!source.hasNextPage) return Promise.resolve({ nodes: [], pageInfo: {}, issueCount: 0 });

        const safeSearch = this.search.replace(/"/g, '\\"');
        const query = `query {
          search(
            query: "${safeSearch} repo:youngjaylao/${source.repo}",
            type: ISSUE,
            first: 10,
            after: ${source.cursor ? `"${source.cursor}"` : null}
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
                comments(first: 1) { totalCount }
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

        // 根据仓库类型决定调用方式
        const options = sourceKey === 'private' ? { blogModeValue: 'private' } : {};

        return this.$http(query, {}, options)
          .then(res => {
            const data = res.search || {};
            let nodes = (data.nodes || []).map(node => ({
              ...node,
              labels: node.labels && node.labels.nodes ? node.labels.nodes : [],
              source: sourceKey   // ← 新增这一行，标记是 public 还是 private
            }));

            // 前端严格过滤（AND 关系）
            if (this.search.trim()) {
              const segments = this.searchSegments;
              nodes = nodes.filter(node => {
                const title = (node.title || '').toLowerCase();
                const body = (node.bodyText || '').toLowerCase();
                const content = title + body;
                return segments.every(word => content.includes(word));
              });
            }

            // 更新该 source 状态
            source.list = source.list.concat(nodes);
            source.cursor = (data.pageInfo && data.pageInfo.endCursor) || null;
            source.hasNextPage = !!(data.pageInfo && data.pageInfo.hasNextPage);
            source.totalCount = data.issueCount || 0;

            return { nodes, sourceKey };
          })
          .catch(err => {
            console.error(`[${sourceKey}] search error:`, err);
            source.hasNextPage = false;
            return { nodes: [], sourceKey };
          });
      });

      Promise.all(promises)
        .then(results => {
          // 合并所有 source 的 list，并按 createdAt 降序
          let allItems = [];
          this.activeSources.forEach(key => {
            allItems = allItems.concat(this.sources[key].list);
          });

          // 排序（新 → 旧）
          allItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

          this.archives.list = allItems;

          // 判断是否彻底没有了
          const anyHasNext = this.activeSources.some(key => this.sources[key].hasNextPage);
          if (!anyHasNext) {
            this.archives.none = true;
          }

          this.archives.loading = false;

          // 重要：本轮合并后仍然是 0 条，但还有下一页 → 自动继续
          if (this.archives.list.length === 0 && anyHasNext) {
            this.getData();
          }
        })
        .catch(err => {
          console.error(err);
          this.archives.loading = false;
        });
    }
  },
}
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