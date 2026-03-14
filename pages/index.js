import { useState, useEffect } from 'react';
import { useWeb3 } from '../utils/Web3Context';
import FileUpload from '../components/FileUpload';
import FileVerification from '../components/FileVerification';
import FileExplorer from '../components/FileExplorer';
import Navbar from '../components/Navbar';
import { ethers } from 'ethers';

export default function Home() {
  const { account, contract, connectWallet, isConnecting } = useWeb3();
  const [activeTab, setActiveTab] = useState('upload');
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalVerifications: 0,
    userFiles: 0,
    contractBalance: '0'
  });

  useEffect(() => {
    if (contract && account) {
      loadStats();
    }
  }, [contract, account]);

  const loadStats = async () => {
    try {
      const [totalFiles, totalVerifications, userFiles, balance] = await Promise.all([
        contract.getTotalFiles(),
        contract.getTotalVerifications(),
        contract.getUserFiles(account),
        contract.provider.getBalance(contract.address)
      ]);

      setStats({
        totalFiles: totalFiles.toNumber(),
        totalVerifications: totalVerifications.toNumber(),
        userFiles: userFiles.length,
        contractBalance: ethers.utils.formatEther(balance)
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex items-center justify-center min-h-screen">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">SecureChain</h1>
                <p className="text-gray-600">Decentralized File Verification System</p>
              </div>
              
              <div className="mb-8">
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Features</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Decentralized file storage on IPFS</li>
                    <li>• Blockchain-based verification</li>
                    <li>• NFT representation of files</li>
                    <li>• Community-driven verification</li>
                  </ul>
                </div>
              </div>
              
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="w-full bg-blue-600 text-white rounded-lg px-6 py-3 font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
              
              <p className="mt-4 text-sm text-gray-500">
                Connect your wallet to start using SecureChain
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Files</h3>
            <p className="text-2xl font-bold text-blue-600">{stats.totalFiles}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Verifications</h3>
            <p className="text-2xl font-bold text-green-600">{stats.totalVerifications}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Your Files</h3>
            <p className="text-2xl font-bold text-purple-600">{stats.userFiles}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Contract Balance</h3>
            <p className="text-2xl font-bold text-yellow-600">{parseFloat(stats.contractBalance).toFixed(3)} ETH</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('upload')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'upload'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Upload File
              </button>
              <button
                onClick={() => setActiveTab('verify')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'verify'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Verify Files
              </button>
              <button
                onClick={() => setActiveTab('explore')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'explore'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Explore Files
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'upload' && <FileUpload />}
            {activeTab === 'verify' && <FileVerification />}
            {activeTab === 'explore' && <FileExplorer />}
          </div>
        </div>
      </div>
    </div>
  );
}
