import { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import detectEthereumProvider from '@metamask/detect-provider';

const Web3Context = createContext();

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [networkId, setNetworkId] = useState(null);

  const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  const CONTRACT_ABI = [
    // Contract ABI will be added here after compilation
    "function uploadFile(string _ipfsHash, bytes32 _fileHash, string _fileName, uint256 _fileSize) returns (uint256)",
    "function verifyFile(uint256 _fileId, bool _isValid, string _comment) returns (uint256)",
    "function getFile(uint256 _fileId) view returns (tuple(uint256 fileId, string ipfsHash, bytes32 fileHash, string fileName, uint256 fileSize, address uploader, uint256 timestamp, bool exists, bool isVerified, uint256 verificationCount, uint256 verificationScore))",
    "function getUserFiles(address _user) view returns (uint256[])",
    "function getFileVerifications(uint256 _fileId) view returns (tuple(uint256 verificationId, uint256 fileId, address verifier, bool isValid, string comment, uint256 timestamp, bool exists)[])",
    "function getVerifierHistory(address _verifier) view returns (uint256[])",
    "function searchByHash(bytes32 _fileHash) view returns (uint256)",
    "function searchByIpfsHash(string _ipfsHash) view returns (uint256)",
    "function getTotalFiles() view returns (uint256)",
    "function getTotalVerifications() view returns (uint256)",
    "function fundContract() payable",
    "function owner() view returns (address)",
    "function paused() view returns (bool)",
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function tokenURI(uint256 tokenId) view returns (string)",
    "function ownerOf(uint256 tokenId) view returns (address)",
    "event FileUploaded(uint256 indexed fileId, string indexed ipfsHash, bytes32 indexed fileHash, string fileName, uint256 fileSize, address uploader, uint256 timestamp)",
    "event FileVerified(uint256 indexed verificationId, uint256 indexed fileId, address indexed verifier, bool isValid, string comment, uint256 timestamp)"
  ];

  useEffect(() => {
    checkConnection();
    setupEventListeners();
  }, []);

  const checkConnection = async () => {
    try {
      const ethereum = await detectEthereumProvider();
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const accounts = await provider.listAccounts();
        
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setProvider(provider);
          setNetworkId(await provider.getNetwork().then(n => n.chainId));
          
          const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
          setContract(contract);
        }
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const setupEventListeners = () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }
  };

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      disconnect();
    } else {
      setAccount(accounts[0]);
    }
  };

  const handleChainChanged = () => {
    window.location.reload();
  };

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      alert('Please install MetaMask!');
      return;
    }

    setIsConnecting(true);
    try {
      const ethereum = window.ethereum;
      await ethereum.request({ method: 'eth_requestAccounts' });
      
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();
      
      setAccount(address);
      setProvider(provider);
      setNetworkId(network.chainId);
      
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      setContract(contract);
      
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAccount(null);
    setProvider(null);
    setContract(null);
    setNetworkId(null);
  };

  const getSigner = () => {
    if (!provider) return null;
    return provider.getSigner();
  };

  const getContractWithSigner = () => {
    if (!contract || !provider) return null;
    const signer = getSigner();
    return contract.connect(signer);
  };

  const value = {
    account,
    provider,
    contract: getContractWithSigner(),
    connectWallet,
    disconnect,
    isConnecting,
    networkId,
    isConnected: !!account,
    CONTRACT_ADDRESS
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
};

export default Web3Provider;
