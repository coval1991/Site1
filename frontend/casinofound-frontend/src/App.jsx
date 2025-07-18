import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createWeb3Modal, defaultConfig } from '@web3modal/ethers/react';
import { BrowserProvider, Contract } from 'ethers';
import './App.css';

// Componentes
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import ICOPage from './pages/ICOPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import WhitepaperPage from './pages/WhitepaperPage';
import FAQPage from './pages/FAQPage';

// 1. Get projectId at https://cloud.walletconnect.com
const projectId = '90d1b38d3f88cd5cd21dece9823faa08';

// 2. Set chains
const polygonMainnet = {
  chainId: 137, // ID da mainnet do Polygon
  name: 'Polygon Mainnet',
  currency: 'MATIC',
  explorerUrl: 'https://polygonscan.com',
  rpcUrl: 'https://rpc.ankr.com/polygon', // ou https://polygon-rpc.com
};

const chains = [polygonMainnet];

// 3. Create a metadata object
const metadata = {
  name: 'CasinoFound',
  description: 'Plataforma de Casino Online com Criptomoeda',
  url: 'https://casinofound.com',
  icons: ['https://avatars.githubusercontent.com/u/37784886'],
};

// 4. Create Ethers config
const ethersConfig = defaultConfig({
  metadata,
  defaultChainId: 137, // Mainnet Polygon
  rpcUrl: 'https://rpc.ankr.com/polygon', // ou https://polygon-rpc.com
  optionalMethods: ['eth_signTypedData', 'eth_signTypedData_v4', 'eth_accounts'],
});

// 5. Create Web3Modal
createWeb3Modal({
  ethersConfig,
  chains,
  projectId,
  enableAnalytics: true, // Optional - defaults to your projectId
  onramp: {
    projectId: '09fcfc0d1c750281faef6476bff1cc51',
  },
});

// Configurar React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      cacheTime: 10 * 60 * 1000, // 10 minutos
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-background">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/ico" element={<ICOPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/whitepaper" element={<WhitepaperPage />} />
              <Route path="/faq" element={<FAQPage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;


