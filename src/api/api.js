import Loading from '../components/loading/loading';

// 替换为你自己的 Cloudflare Worker 地址
const endpoint = 'https://github-blog-proxy.laoyanjie666.workers.dev'; 

const Http = (query = {}, variables = {}, alive = false) => {
  return new Promise((resolve, reject) => {
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      // 将 GraphQL 的 query 和 variables 传给 Worker
      body: JSON.stringify({ query: query, variables: variables }),
    })
    .then(function(response) {
      // 检查网络响应状态
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(function(res) {
      if (!alive) {
        Loading.hide();
      }
      
      // GraphQL 的错误通常在 res.errors 中返回
      if (res.errors) {
        reject(res.errors);
      } else {
        // 返回 res.data 以保持与原有 GraphQLClient 行为一致
        resolve(res.data);
      }
    })
    .catch(function(error) {
      Loading.hide();
      reject(error);
    });
  });
};

export default Http;