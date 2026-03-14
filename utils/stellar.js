import { 
  Horizon, 
  TransactionBuilder, 
  Networks, 
  Asset, 
  Operation, 
  Keypair,
  Memo,
  MemoType
} from '@stellar/stellar-sdk';
import freighter from '@stellar/freighter-api';

/**
 * Stellar utility functions for SecureChain
 */
export class StellarUtils {
  constructor() {
    this.server = new Horizon.Server('https://horizon.stellar.org'); // Mainnet
    this.networkPassphrase = Networks.PUBLIC;
  }

  /**
   * Connect to Freighter wallet
   */
  async connectWallet() {
    try {
      const { address } = await freighter.connect();
      return address;
    } catch (error) {
      console.error('Failed to connect to Freighter:', error);
      throw error;
    }
  }

  /**
   * Get account details
   */
  async getAccountDetails(publicKey) {
    try {
      const account = await this.server.loadAccount(publicKey);
      return {
        publicKey: account.accountId(),
        balance: account.balances,
        sequence: account.sequenceNumber(),
        signers: account.signers,
        flags: account.flags
      };
    } catch (error) {
      console.error('Failed to load account:', error);
      throw error;
    }
  }

  /**
   * Create a unique asset for file ownership
   */
  createFileAsset(fileId, fileName) {
    const assetCode = `FILE_${fileId.toString().padStart(6, '0')}`;
    return new Asset(assetCode, this.getIssuerPublicKey());
  }

  /**
   * Upload file metadata to Stellar
   */
  async uploadFileToStellar(fileData, userPublicKey) {
    try {
      const account = await this.server.loadAccount(userPublicKey);
      
      const transaction = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: this.networkPassphrase
      })
        .addOperation(Operation.manageData({
          name: `file_${fileData.fileId}`,
          value: JSON.stringify({
            ipfsHash: fileData.ipfsHash,
            fileHash: fileData.fileHash,
            fileName: fileData.fileName,
            fileSize: fileData.fileSize,
            uploader: fileData.uploader,
            timestamp: Date.now()
          })
        }))
        .addOperation(Operation.manageData({
          name: `hash_to_file_${fileData.fileHash}`,
          value: fileData.fileId.toString()
        }))
        .addOperation(Operation.manageData({
          name: `ipfs_to_file_${fileData.ipfsHash}`,
          value: fileData.fileId.toString()
        }))
        .addOperation(Operation.createAccount({
          destination: this.getContractAddress(),
          startingBalance: '1.5' // Minimum balance for contract
        }))
        .setTimeout(30)
        .build();

      // Sign transaction with Freighter
      const signedTransaction = await freighter.signTransaction(transaction.toXDR());
      
      // Submit transaction
      const result = await this.server.submitTransaction(signedTransaction);
      
      return result;
    } catch (error) {
      console.error('Failed to upload file to Stellar:', error);
      throw error;
    }
  }

  /**
   * Verify file on Stellar
   */
  async verifyFileOnStellar(verificationData, verifierPublicKey) {
    try {
      const account = await this.server.loadAccount(verifierPublicKey);
      
      const transaction = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: this.networkPassphrase
      })
        .addOperation(Operation.manageData({
          name: `verification_${verificationData.verificationId}`,
          value: JSON.stringify({
            fileId: verificationData.fileId,
            verifier: verifierPublicKey,
            isValid: verificationData.isValid,
            comment: verificationData.comment,
            timestamp: Date.now()
          })
        }))
        .addOperation(Operation.manageData({
          name: `file_verifications_${verificationData.fileId}`,
          value: verificationData.verificationId.toString()
        }))
        .addOperation(Operation.payment({
          destination: verifierPublicKey,
          asset: Asset.native(),
          amount: '0.01' // 0.01 XLM reward
        }))
        .setTimeout(30)
        .build();

      const signedTransaction = await freighter.signTransaction(transaction.toXDR());
      const result = await this.server.submitTransaction(signedTransaction);
      
      return result;
    } catch (error) {
      console.error('Failed to verify file on Stellar:', error);
      throw error;
    }
  }

  /**
   * Get file metadata from Stellar
   */
  async getFileMetadata(fileId) {
    try {
      const account = await this.server.loadAccount(this.getContractAddress());
      const dataEntry = account.data_attr.find(data => data.name === `file_${fileId}`);
      
      if (!dataEntry) {
        throw new Error('File not found');
      }

      return JSON.parse(dataEntry.value.toString());
    } catch (error) {
      console.error('Failed to get file metadata:', error);
      throw error;
    }
  }

  /**
   * Get verification history for a file
   */
  async getVerificationHistory(fileId) {
    try {
      const account = await this.server.loadAccount(this.getContractAddress());
      const verifications = [];
      
      // Find all verification entries for this file
      account.data_attr.forEach(data => {
        if (data.name.startsWith('verification_')) {
          const verification = JSON.parse(data.value.toString());
          if (verification.fileId === fileId) {
            verifications.push(verification);
          }
        }
      });
      
      return verifications;
    } catch (error) {
      console.error('Failed to get verification history:', error);
      throw error;
    }
  }

  /**
   * Search file by hash
   */
  async searchByHash(fileHash) {
    try {
      const account = await this.server.loadAccount(this.getContractAddress());
      const dataEntry = account.data_attr.find(data => data.name === `hash_to_file_${fileHash}`);
      
      if (dataEntry) {
        return dataEntry.value.toString();
      }
      
      return null;
    } catch (error) {
      console.error('Failed to search by hash:', error);
      throw error;
    }
  }

  /**
   * Search file by IPFS hash
   */
  async searchByIpfsHash(ipfsHash) {
    try {
      const account = await this.server.loadAccount(this.getContractAddress());
      const dataEntry = account.data_attr.find(data => data.name === `ipfs_to_file_${ipfsHash}`);
      
      if (dataEntry) {
        return dataEntry.value.toString();
      }
      
      return null;
    } catch (error) {
      console.error('Failed to search by IPFS hash:', error);
      throw error;
    }
  }

  /**
   * Get user's uploaded files
   */
  async getUserFiles(userPublicKey) {
    try {
      const account = await this.server.loadAccount(this.getContractAddress());
      const userFiles = [];
      
      account.data_attr.forEach(data => {
        if (data.name.startsWith('file_')) {
          const fileData = JSON.parse(data.value.toString());
          if (fileData.uploader === userPublicKey) {
            userFiles.push(fileData);
          }
        }
      });
      
      return userFiles;
    } catch (error) {
      console.error('Failed to get user files:', error);
      throw error;
    }
  }

  /**
   * Calculate verification score for a file
   */
  async calculateVerificationScore(fileId) {
    try {
      const verifications = await this.getVerificationHistory(fileId);
      
      if (verifications.length === 0) {
        return 0;
      }
      
      const positiveVerifications = verifications.filter(v => v.isValid).length;
      const score = (positiveVerifications * 100) / verifications.length;
      
      return Math.round(score);
    } catch (error) {
      console.error('Failed to calculate verification score:', error);
      throw error;
    }
  }

  /**
   * Get contract address (this would be the deployed Soroban contract address)
   */
  getContractAddress() {
    // This should be set to your deployed contract address
    return process.env.NEXT_PUBLIC_STELLAR_CONTRACT_ADDRESS || 'GD...';
  }

  /**
   * Get issuer public key for asset creation
   */
  getIssuerPublicKey() {
    // This should be your issuer account public key
    return process.env.STELLAR_ISSUER_PUBLIC_KEY || 'G...';
  }

  /**
   * Check if account exists
   */
  async accountExists(publicKey) {
    try {
      await this.server.loadAccount(publicKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Fund account with XLM
   */
  async fundAccount(publicKey, amount = '1') {
    try {
      const friendbotUrl = 'https://friendbot.stellar.org';
      const response = await fetch(`${friendbotUrl}?addr=${publicKey}`);
      const responseJSON = await response.json();
      
      if (responseJSON.success) {
        console.log('Account funded successfully');
        return true;
      } else {
        throw new Error('Failed to fund account');
      }
    } catch (error) {
      console.error('Failed to fund account:', error);
      throw error;
    }
  }

  /**
   * Get account balance
   */
  async getBalance(publicKey) {
    try {
      const account = await this.server.loadAccount(publicKey);
      const nativeBalance = account.balances.find(balance => balance.asset_type === 'native');
      return nativeBalance ? parseFloat(nativeBalance.balance) : 0;
    } catch (error) {
      console.error('Failed to get balance:', error);
      throw error;
    }
  }

  /**
   * Create and sign transaction
   */
  async createAndSignTransaction(operations, publicKey) {
    try {
      const account = await this.server.loadAccount(publicKey);
      
      const transaction = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: this.networkPassphrase
      });

      operations.forEach(operation => {
        transaction.addOperation(operation);
      });

      const builtTransaction = transaction
        .setTimeout(30)
        .build();

      const signedTransaction = await freighter.signTransaction(builtTransaction.toXDR());
      
      return signedTransaction;
    } catch (error) {
      console.error('Failed to create and sign transaction:', error);
      throw error;
    }
  }

  /**
   * Submit transaction
   */
  async submitTransaction(signedTransaction) {
    try {
      const result = await this.server.submitTransaction(signedTransaction);
      return result;
    } catch (error) {
      console.error('Failed to submit transaction:', error);
      throw error;
    }
  }
}

export default StellarUtils;
