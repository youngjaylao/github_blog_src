<template>
  <div class="page-search">
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

    <div class="tips" v-if="archives.totalCount">
      <p>共 {{ archives.totalCount }} 条搜索结果</p>
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
            ></div>
          </div>

          <div class="others">
            <i class="iconfont icon-comment"></i>
            <span v-text="archive.comments.totalCount"></span>
          </div>
        </div>

        <p class="body-text" v-html="highlight(archive.bodyText)"></p>
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

export default {
  name: 'Search',

  data() {
    return {
      search: '',
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
    document.title = `搜索 - LAO Blog`;
    this.onInputDebounced = debounce(this.onInput, 300);
  },

  methods: {
    formatTime,
    isLightColor,
    
    // 关键词高亮逻辑
    highlight(text) {
      if (!this.search || !text) return text;
      // 替换特殊字符并创建全局不区分大小写的正则
      const highlightReg = new RegExp(`(${this.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return text.replace(highlightReg, '<span class="highlight">$1</span>');
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

      const query = `query {
        search(
          query: "${this.search} repo:Young-LAO/github_blog_src",
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

      this.$http(query).then((res) => {
        const { nodes, pageInfo, issueCount } = res.search;

        this.archives.loading = false;
        const formattedNodes = nodes.map(node => ({
          ...node,
          labels: node.labels ? node.labels.nodes : []
        }));

        this.archives.list = this.archives.list.concat(formattedNodes);
        this.archives.totalCount = issueCount;
        this.archives.cursor = pageInfo.endCursor ? `"${pageInfo.endCursor}"` : null;

        if (!pageInfo.hasNextPage) {
          this.archives.none = true;
        }

        document.title = `${this.search} - 搜索 - LAO Blog`;
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