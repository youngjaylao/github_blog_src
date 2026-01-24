import Vue from 'vue';
import VueCompositionApi from '@vue/composition-api';
import Http from './api/api';
import Loading from './components/loading/loading';
import App from './App.vue';
import router from './router';

Vue.use(VueCompositionApi);
Vue.config.productionTip = false;
Vue.prototype.$http = Http;
Vue.prototype.$loading = Loading;

/**
 * 【最高优先级】拦截 Utterances 登录回调
 */
(function() {
  var href = window.location.href;
  
  // 1. 判断是否带有登录标记
  if (href.indexOf('utterances=') !== -1) {
    var lastId = localStorage.getItem('last_issue_id');
    
    // 2. 检查 Hash 是否不包含具体的文章 ID (比如只是 #/ 或 #/archives)
    var isInvalidPath = !(/\/\d+/.test(window.location.hash));

    if (isInvalidPath && lastId) {
      var urlParts = href.split('?');
      var queryString = urlParts.length > 1 ? urlParts[1].split('#')[0] : '';
      
      // 3. 构造完美的跳转地址
      var curPath = window.location.pathname;

      curPath = curPath.replace(/\/+$/, '');
      var newUrl = window.location.origin + curPath + '?' + queryString + '#/archives/' + lastId;
      
      // 4. 暴力跳转并彻底阻止后续 Vue 渲染
      window.location.replace(newUrl);
      
      // 关键：抛出一个无法捕获的“错误”来强行停止 JS 线程执行，防止 Vue 启动
      console.warn('Redirecting to fix route...');
      document.body.innerHTML = ''; // 清空 body，防止闪烁
      throw new Error("Redirecting..."); 
    }
  }
})();

// 正常逻辑：只有上面没跳，才会运行到这里
new Vue({
  router,
  render: h => h(App),
}).$mount('#app');