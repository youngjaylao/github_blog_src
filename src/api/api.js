import Loading from '../components/loading/loading';

const endpoint = 'https://github-blog-proxy.laoyanjie666.workers.dev'; 

const Http = (query = {}, variables = {}, alive = false) => {
  return new Promise((resolve, reject) => {
    fetch(endpoint, {
      method: 'POST',
      headers: {
        // 保持你要求的特定 Content-Type
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      },
      // 这里的 body 依然按你之前的逻辑传 JSON 串
      body: JSON.stringify({ query: query, variables: variables }),
    })
    .then(function(response) {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(function(res) {
      if (!alive) {
        Loading.hide();
      }
      // 适配你的逻辑：成功返回 res.data，失败 reject res.errors
      if (res.errors) {
        reject(res.errors);
      } else {
        resolve(res.data);
      }
    })
    .catch(function(error) {
      if (!alive) {
        Loading.hide();
      }
      reject(error);
    });
  });
};

export default Http;