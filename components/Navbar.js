import { useStellar } from '../utils/StellarContext';
import { useState } from 'react';

export default function Navbar() {
  const { connectedAccount, accountDetails, connectWallet, disconnectWallet, network, verificationReward } = useStellar();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getNetworkName = (network) => {
    switch (network) {
      case 'mainnet':
        return 'Stellar Mainnet';
      case 'testnet':
        return 'Stellar Testnet';
      case 'futurenet':
        return 'Stellar FutureNet';
      default:
        return 'Unknown Network';
    }
  };

  const getNetworkColor = (network) => {
    switch (network) {
      case 'mainnet':
        return 'bg-green-500';
      case 'testnet':
        return 'bg-blue-500';
      case 'futurenet':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-2xl font-bold text-green-600">SecureChain</h1>
            </div>
            <div className="hidden md:ml-10 md:flex md:space-x-8">
              <a href="#" className="text-gray-900 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium">
                Home
              </a>
              <a href="#upload" className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                Upload
              </a>
              <a href="#verify" className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                Verify
              </a>
              <a href="#explore" className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                Explore
              </a>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {network && (
              <div className="flex items-center space-x-2">
                <span className={`inline-block w-2 h-2 rounded-full ${getNetworkColor(network)}`}></span>
                <span className="text-sm text-gray-600">
                  {getNetworkName(network)}
                </span>
              </div>
            )}

            {connectedAccount ? (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-2 bg-green-50 hover:bg-green-100 px-3 py-2 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {connectedAccount.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {formatAddress(connectedAccount)}
                  </span>
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="text-sm text-gray-500">Connected Account</p>
                      <p className="text-sm font-medium text-gray-900">{formatAddress(connectedAccount)}</p>
                      {accountDetails && (
                        <p className="text-xs text-gray-500 mt-1">
                          Balance: {parseFloat(accountDetails.balance || 0).toFixed(4)} XLM
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(connectedAccount);
                        setIsDropdownOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Copy Address
                    </button>
                    <button
                      onClick={() => {
                        window.open(`https://stellar.expert/explorer/public/account/${connectedAccount}`, '_blank');
                        setIsDropdownOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      View on Explorer
                    </button>
                    <button
                      onClick={() => {
                        window.open('https://freighter.app', '_blank');
                        setIsDropdownOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Open Freighter
                    </button>
                    <div className="border-t border-gray-200 mt-1">
                      <div className="px-4 py-2">
                        <p className="text-xs text-gray-500">Verification Reward</p>
                        <p className="text-sm font-medium text-green-600">{verificationReward} XLM</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        disconnectWallet();
                        setIsDropdownOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM8 7a2 2 0 11-4 0 2 2 0 014 0zm8 0a2 2 0 11-4 0 2 2 0 014 0zm-8 6a2 2 0 11-4 0 2 2 0 014 0zm8 0a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
                <span className="text-sm font-medium">Connect Freighter</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
