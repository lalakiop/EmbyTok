import React, { useState } from 'react';
import { ServerConfig } from '../types';
import { authenticate } from '../services/embyService';
import { Server, User, Key, Loader2, Info } from 'lucide-react';

interface LoginProps {
  onLogin: (config: ServerConfig) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic validation
    let formattedUrl = serverUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = `http://${formattedUrl}`;
    }

    try {
      const authData = await authenticate(formattedUrl, username, password);
      
      onLogin({
        url: formattedUrl,
        username: authData.User.Name,
        userId: authData.User.Id,
        token: authData.AccessToken,
      });
    } catch (err: any) {
      console.error(err);
      setError('连接失败。请检查地址、账号密码，并确保服务端允许跨域访问（CORS）。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600 mb-2">
            EmbyTok
            </h1>
            <p className="text-zinc-400">Emby 竖屏客户端</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase">服务器地址</label>
            <div className="relative">
                <Server className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
                <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="http://192.168.1.100:8096"
                className="w-full bg-zinc-800 border-none rounded-xl py-3 pl-10 text-white placeholder-zinc-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                required
                />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase">用户名</label>
            <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
                <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="User"
                className="w-full bg-zinc-800 border-none rounded-xl py-3 pl-10 text-white placeholder-zinc-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                required
                />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase">密码</label>
             <div className="relative">
                <Key className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
                <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="可选"
                className="w-full bg-zinc-800 border-none rounded-xl py-3 pl-10 text-white placeholder-zinc-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm flex gap-2">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '连接'}
          </button>
        </form>
        
        <div className="text-center text-xs text-zinc-600 px-4">
            <p>EmbyTok 是非官方客户端。请确保该设备可以访问您的 Emby 服务器。</p>
        </div>
      </div>
    </div>
  );
};

export default Login;