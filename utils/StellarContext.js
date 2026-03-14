import React, { createContext, useContext, useState, useEffect } from 'react';
import StellarUtils from './stellar';

const StellarContext = createContext();

export const useStellar = () => {
  const context = useContext(StellarContext);
  if (!context) {
    throw new Error('useStellar must be used within a StellarProvider');
  }
  return context;
};

export const StellarProvider = ({ children }) => {
  const [stellarUtils, setStellarUtils] = useState(null);
  const [connectedAccount, setConnectedAccount] = useState(null);
  const [accountDetails, setAccountDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initialize Stellar utilities
    const utils = new StellarUtils();
    setStellarUtils(utils);
  }, []);

  /**
   * Connect to Freighter wallet
   */
  const connectWallet = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const publicKey = await stellarUtils.connectWallet();
      setConnectedAccount(publicKey);
      
      // Get account details
      const details = await stellarUtils.getAccountDetails(publicKey);
      setAccountDetails(details);
      
      setIsLoading(false);
      return publicKey;
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      throw err;
    }
  };

  /**
   * Disconnect wallet
   */
  const disconnectWallet = () => {
    setConnectedAccount(null);
    setAccountDetails(null);
    setError(null);
  };

  /**
   * Upload file to Stellar
   */
  const uploadFile = async (fileData) => {
    if (!connectedAccount) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const result = await stellarUtils.uploadFileToStellar(fileData, connectedAccount);
      
      setIsLoading(false);
      return result;
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      throw err;
    }
  };

  /**
   * Verify file on Stellar
   */
  const verifyFile = async (verificationData) => {
    if (!connectedAccount) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const result = await stellarUtils.verifyFileOnStellar(verificationData, connectedAccount);
      
      setIsLoading(false);
      return result;
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      throw err;
    }
  };

  /**
   * Get file metadata
   */
  const getFileMetadata = async (fileId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const metadata = await stellarUtils.getFileMetadata(fileId);
      
      setIsLoading(false);
      return metadata;
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      throw err;
    }
  };

  /**
   * Get verification history
   */
  const getVerificationHistory = async (fileId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const history = await stellarUtils.getVerificationHistory(fileId);
      
      setIsLoading(false);
      return history;
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      throw err;
    }
  };

  /**
   * Search file by hash
   */
  const searchByHash = async (fileHash) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await stellarUtils.searchByHash(fileHash);
      
      setIsLoading(false);
      return result;
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      throw err;
    }
  };

  /**
   * Search file by IPFS hash
   */
  const searchByIpfsHash = async (ipfsHash) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await stellarUtils.searchByIpfsHash(ipfsHash);
      
      setIsLoading(false);
      return result;
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      throw err;
    }
  };

  /**
   * Get user's uploaded files
   */
  const getUserFiles = async () => {
    if (!connectedAccount) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const files = await stellarUtils.getUserFiles(connectedAccount);
      
      setIsLoading(false);
      return files;
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      throw err;
    }
  };

  /**
   * Calculate verification score
   */
  const calculateVerificationScore = async (fileId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const score = await stellarUtils.calculateVerificationScore(fileId);
      
      setIsLoading(false);
      return score;
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      throw err;
    }
  };

  /**
   * Get account balance
   */
  const getBalance = async () => {
    if (!connectedAccount) {
      throw new Error('Wallet not connected');
    }

    try {
      const balance = await stellarUtils.getBalance(connectedAccount);
      return balance;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  /**
   * Check if account exists
   */
  const accountExists = async (publicKey) => {
    try {
      const exists = await stellarUtils.accountExists(publicKey);
      return exists;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  /**
   * Fund account (for testing)
   */
  const fundAccount = async (publicKey, amount = '1') => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await stellarUtils.fundAccount(publicKey, amount);
      
      setIsLoading(false);
      return result;
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      throw err;
    }
  };

  const value = {
    // State
    connectedAccount,
    accountDetails,
    isLoading,
    error,
    stellarUtils,
    
    // Methods
    connectWallet,
    disconnectWallet,
    uploadFile,
    verifyFile,
    getFileMetadata,
    getVerificationHistory,
    searchByHash,
    searchByIpfsHash,
    getUserFiles,
    calculateVerificationScore,
    getBalance,
    accountExists,
    fundAccount,
    
    // Utilities
    isConnected: !!connectedAccount,
    network: process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'mainnet',
    verificationReward: parseFloat(process.env.VERIFICATION_REWARD) || 0.01
  };

  return (
    <StellarContext.Provider value={value}>
      {children}
    </StellarContext.Provider>
  );
};

export default StellarContext;
