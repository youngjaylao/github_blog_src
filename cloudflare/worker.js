export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://youngjaylao.github.io",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Requested-With",
      "Access-Control-Allow-Credentials": "true"   // 允许带 cookie
    };

    // 处理 CORS 预检
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // ── 1. 登录入口 ──
    if (pathname === "/login") {
      if (request.method !== "GET") {
        return new Response("Method not allowed", { status: 405, headers: corsHeaders });
      }

      // 生成随机 state 防 CSRF（这里简单用 randomUUID，如果你的环境不支持可换成 Date.now() + Math.random()）
      const returnTo = url.searchParams.get("return_to") || "https://youngjaylao.github.io/github_blog_src/#/archives"; // 默认回首页
      // state = csrf_token + | + return_to（用 | 分隔，简单且不易冲突）

      const csrfSecret = env.BLOG_SESSION_SECRET; // 你的密钥
      const csrfPayload = Date.now() + "." + Math.random().toString(36).slice(2); // 时间戳 + 随机
      const hmac = await simpleHmacSign(csrfPayload, csrfSecret);
      const state = csrfPayload + "." + hmac + "|" + encodeURIComponent(returnTo);

      const authUrl = "https://github.com/login/oauth/authorize?" +
        "client_id=" + env.GITHUB_CLIENT_ID +
        "&redirect_uri=" + encodeURIComponent(url.origin + "/callback") +
        "&scope=user" +
        "&state=" + encodeURIComponent(state);

      return Response.redirect(authUrl, 302);
    }

    // ── 2. OAuth 回调 ──
    if (pathname === "/callback") {
      const code = url.searchParams.get("code");
      const receivedState = url.searchParams.get("state");
      if (!code) {
        return new Response("No code received", { status: 400, headers: corsHeaders });
      }
      if (!receivedState) {
        return new Response("Missing state parameter - possible CSRF", { status: 403, headers: corsHeaders });
      }

      // 交换 code 拿 access_token
      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code: code,
          redirect_uri: url.origin + "/callback"
        })
      });

      const tokenData = await tokenResponse.json();
      if (tokenData.error) {
        return new Response("OAuth error: " + tokenData.error_description, { status: 400, headers: corsHeaders });
      }

      const accessToken = tokenData.access_token;

      // 用 token 拿用户信息，验证是不是你本人
      const userResponse = await fetch("https://api.github.com/user", {
        headers: {
          "Authorization": "Bearer " + accessToken,
          "User-Agent": "blog-worker"
        }
      });

      const user = await userResponse.json();

      if (user.login !== "youngjaylao") {  // 只允许你自己
        return new Response("Access denied: only youngjaylao allowed", { status: 403, headers: corsHeaders });
      }
      const expTimeGap = 14 * 86400000; // 14天

      // 设置 session cookie（简单版：payload + 签名）
      const payload = JSON.stringify({
        user: "youngjaylao",
        exp: Date.now() + expTimeGap  // 14天
      });

      const signature = await simpleHmacSign(payload, env.BLOG_SESSION_SECRET);
      const cookieValue = btoa(payload) + "." + signature;

      // 从 state 解析并验证 return_to
      let returnTo = "https://youngjaylao.github.io/github_blog_src/#/archives";  // 默认回博客首页完整 URL
      try {
        // 防止csrf攻击，验证 state 中的 HMAC 和时间戳 
        const [csrfPart, encodedReturnTo] = receivedState.split("|");
        if (!csrfPart || !encodedReturnTo) {
          throw new Error("Invalid state format");
        }
        const [timestampStr, randomPart, receivedHmac] = csrfPart.split(".");
        const expectedHmac = await simpleHmacSign(timestampStr + "." + randomPart, env.BLOG_SESSION_SECRET);

        if (receivedHmac !== expectedHmac) {
          return new Response("Invalid state signature", { status: 403 });
        }

        if (Date.now() - Number(timestampStr) > expTimeGap) { // 14 天
          return new Response("State expired", { status: 403 });
        }

        const candidate = decodeURIComponent(encodedReturnTo);
        if (candidate.startsWith("https://youngjaylao.github.io")) {
          returnTo = candidate;
        }
      } catch (e) {
        returnTo = "https://youngjaylao.github.io/github_blog_src/#/archives";
      }
      // 拼接参数（用 & 或 ?）
      const separator = returnTo.includes('?') ? '&' : '?';
      const loginParam = `blog_login=success&exp=${Date.now() + expTimeGap}`;
      const finalUrl = `${returnTo}${separator}${loginParam}`;

      const headers = new Headers(corsHeaders);
      headers.set("Set-Cookie", "blog_auth=" + cookieValue +
        "; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=" + (14*86400));
      headers.set("Location", finalUrl);
      
      return new Response("Logged in", {
        status: 302,
        headers
      });
    }

    // 3. 退出登录 ──
    if (pathname === "/logout") {
      const deleteCookie =  "blog_auth=deleted; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0";                         // ← 关键：立即过期
      const headers = new Headers(corsHeaders);
      headers.set("Set-Cookie", deleteCookie);
      return new Response(
        JSON.stringify({ message: "已退出登录" }), 
        { 
          status: 200,
          headers: headers
        }
      );
    }



    // ── 4. GraphQL 代理（核心部分） ──
    if (request.method === "POST") {
      try {
        const bodyText = await request.text();

        // 判断是公共路径还是私有路径
        const isPrivatePath = 
          pathname === "/private" ||
          pathname === "/private/graphql" ||
          pathname === "/private/api/graphql";

        let githubToken;

        if (isPrivatePath) {


          // 检查 cookie
          const cookieHeader = request.headers.get("Cookie") || "";
          let authCookie = null;

          // 老式解析 cookie
          var cookies = cookieHeader.split(";");
          for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i].trim();
            if (cookie.indexOf("blog_auth=") === 0) {
              authCookie = cookie.substring("blog_auth=".length);
              break;
            }
          }

          if (!authCookie) {
            return new Response(JSON.stringify({ error: "Please login first" }), {
              status: 401,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          // 验证签名 + 过期
          const parts = authCookie.split(".");
          if (parts.length !== 2) {
            return new Response(JSON.stringify({ error: "Invalid session" }), { 
              status: 401, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            });
          }

          const payloadB64 = parts[0];
          const receivedSig = parts[1];
          const payload = atob(payloadB64);

          const expectedSig = await simpleHmacSign(payload, env.BLOG_SESSION_SECRET);

          if (receivedSig !== expectedSig) {
            return new Response(JSON.stringify({ error: "Invalid session signature" }), { 
              status: 401, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            });
          }

          let session;
          try {
            session = JSON.parse(payload);
          } catch (e) {
            return new Response(JSON.stringify({ error: "Invalid session data" }), { 
              status: 401, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            });
          }

          if (session.user !== "youngjaylao" || Date.now() > session.exp) {
            return new Response(JSON.stringify({ error: "Session expired or invalid" }), { 
              status: 401, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            });
          }
          githubToken = env.PRIVATE_GITHUB_TOKEN;

          // 如果没有设置 PRIVATE_GITHUB_TOKEN，直接报错（防止误配置）
          if (!githubToken) {
            return new Response(JSON.stringify({ error: "Private token not configured" }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          // 通过验证，继续使用私有 token
        } else {
          // 公共路径：直接用公共 token
          githubToken = env.GITHUB_TOKEN;

          // 如果没有公共 token，也报错（可选，根据你的需求）
          if (!githubToken) {
            return new Response(JSON.stringify({ error: "Public token not configured" }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
        }

        // 真正转发到 GitHub GraphQL
        const response = await fetch("https://api.github.com/graphql", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + githubToken,
            "User-Agent": "Cloudflare-Worker",
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          },
          body: bodyText,
        });

        const data = await response.json();

        return new Response(JSON.stringify(data), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }


    // ── 5. 认证状态检查 ──
    if (pathname === "/auth-status" && request.method === "GET") {
      let isAuthorized = false;

      // 检查 cookie（复用验证逻辑）
      const cookieHeader = request.headers.get("Cookie") || "";
      let authCookie = null;

      var cookies = cookieHeader.split(";");
      for (var i = 0; i < cookies.length; i++) {
        var cookie = cookies[i].trim();
        if (cookie.indexOf("blog_auth=") === 0) {
          authCookie = cookie.substring("blog_auth=".length);
          break;
        }
      }
      if (authCookie) {
        const parts = authCookie.split(".");
        if (parts.length === 2) {
          const payloadB64 = parts[0];
          const payload = atob(payloadB64);

          let session;
          try {
            session = JSON.parse(payload);
          } catch (e) {
            session = null;
          }

          if (session && session.user === "youngjaylao" && Date.now() <= session.exp) {
            isAuthorized = true;
          }
        }
      }
      return new Response(JSON.stringify({ isAuthorized }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }


    // 其他情况
    return new Response("Not found or method not allowed", { status: 404, headers: corsHeaders });
  }
};

// 简单 HMAC SHA-256 签名函数（兼容 Workers crypto）
async function simpleHmacSign(message, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message)
  );
  // 转 hex
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}