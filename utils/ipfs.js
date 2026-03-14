import { create } from 'ipfs-http-client';
import CryptoJS from 'crypto-js';

// IPFS client configuration
const IPFS_URL = process.env.NEXT_PUBLIC_IPFS_URL || 'http://localhost:5001';
const client = create({ url: IPFS_URL });

/**
 * Upload file to IPFS
 * @param {File} file - The file to upload
 * @param {Function} onProgress - Progress callback function
 * @returns {Promise<Object>} - IPFS upload result
 */
export const uploadToIPFS = async (file, onProgress) => {
  try {
    // Check if IPFS node is available
    const isOnline = await client.isOnline();
    if (!isOnline) {
      throw new Error('IPFS node is not available. Please ensure IPFS is running.');
    }

    // Create a readable stream from the file
    const fileBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(fileBuffer);

    // Upload to IPFS with progress tracking
    const result = await client.add(buffer, {
      progress: (bytes) => {
        if (onProgress) {
          const progress = (bytes / file.size) * 100;
          onProgress(Math.round(progress));
        }
      }
    });

    return {
      ipfsHash: result.cid.toString(),
      size: result.size,
      path: result.path
    };

  } catch (error) {
    console.error('IPFS upload error:', error);
    throw new Error(`Failed to upload to IPFS: ${error.message}`);
  }
};

/**
 * Retrieve file from IPFS
 * @param {string} ipfsHash - IPFS hash of the file
 * @returns {Promise<Buffer>} - File buffer
 */
export const retrieveFromIPFS = async (ipfsHash) => {
  try {
    const chunks = [];
    for await (const chunk of client.cat(ipfsHash)) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch (error) {
    console.error('IPFS retrieval error:', error);
    throw new Error(`Failed to retrieve from IPFS: ${error.message}`);
  }
};

/**
 * Calculate SHA-256 hash of a file
 * @param {File} file - The file to hash
 * @returns {Promise<string>} - SHA-256 hash as hex string
 */
export const calculateFileHash = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const wordArray = CryptoJS.lib.WordArray.create(event.target.result);
        const hash = CryptoJS.SHA256(wordArray);
        resolve(hash.toString(CryptoJS.enc.Hex));
      } catch (error) {
        reject(new Error(`Failed to calculate file hash: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file for hashing'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Verify file integrity by comparing hashes
 * @param {File} file - The file to verify
 * @param {string} expectedHash - Expected SHA-256 hash
 * @returns {Promise<boolean>} - True if hashes match
 */
export const verifyFileIntegrity = async (file, expectedHash) => {
  try {
    const actualHash = await calculateFileHash(file);
    return actualHash.toLowerCase() === expectedHash.toLowerCase();
  } catch (error) {
    console.error('File verification error:', error);
    return false;
  }
};

/**
 * Pin file to IPFS (prevent garbage collection)
 * @param {string} ipfsHash - IPFS hash to pin
 * @returns {Promise<boolean>} - True if pinned successfully
 */
export const pinToIPFS = async (ipfsHash) => {
  try {
    await client.pin.add(ipfsHash);
    return true;
  } catch (error) {
    console.error('IPFS pinning error:', error);
    return false;
  }
};

/**
 * Unpin file from IPFS
 * @param {string} ipfsHash - IPFS hash to unpin
 * @returns {Promise<boolean>} - True if unpinned successfully
 */
export const unpinFromIPFS = async (ipfsHash) => {
  try {
    await client.pin.rm(ipfsHash);
    return true;
  } catch (error) {
    console.error('IPFS unpinning error:', error);
    return false;
  }
};

/**
 * Get IPFS node stats
 * @returns {Promise<Object>} - IPFS node statistics
 */
export const getIPFSStats = async () => {
  try {
    const version = await client.version();
    const id = await client.id();
    const repo = await client.repo.stat();
    
    return {
      version: version.version,
      peerId: id.id,
      addresses: id.addresses,
      repoSize: repo.repoSize,
      numObjects: repo.numObjects
    };
  } catch (error) {
    console.error('IPFS stats error:', error);
    return null;
  }
};

/**
 * Check if IPFS node is running
 * @returns {Promise<boolean>} - True if IPFS is available
 */
export const checkIPFSConnection = async () => {
  try {
    const isOnline = await client.isOnline();
    return isOnline;
  } catch (error) {
    return false;
  }
};

/**
 * Get file metadata from IPFS
 * @param {string} ipfsHash - IPFS hash
 * @returns {Promise<Object>} - File metadata
 */
export const getFileMetadata = async (ipfsHash) => {
  try {
    const stat = await client.object.stat(ipfsHash);
    return {
      hash: stat.Hash,
      size: stat.CumulativeSize,
      links: stat.NumLinks
    };
  } catch (error) {
    console.error('IPFS metadata error:', error);
    return null;
  }
};

/**
 * Create IPFS directory structure
 * @param {Array} files - Array of file objects with path and content
 * @returns {Promise<string>} - Root IPFS hash
 */
export const createIPFSDirectory = async (files) => {
  try {
    // Upload each file and collect the results
    const uploadedFiles = await Promise.all(
      files.map(async (file) => {
        const result = await client.add(file.content);
        return {
          path: file.path,
          cid: result.cid
        };
      })
    );

    // Create directory structure
    const directory = uploadedFiles.reduce((acc, file) => {
      acc[file.path] = { cid: file.cid };
      return acc;
    }, {});

    const result = await client.add(JSON.stringify(directory));
    return result.cid.toString();

  } catch (error) {
    console.error('IPFS directory creation error:', error);
    throw new Error(`Failed to create IPFS directory: ${error.message}`);
  }
};

/**
 * Get gateway URL for IPFS hash
 * @param {string} ipfsHash - IPFS hash
 * @param {string} gateway - Gateway URL (optional)
 * @returns {string} - Gateway URL
 */
export const getGatewayURL = (ipfsHash, gateway = 'https://ipfs.io/ipfs/') => {
  return `${gateway}${ipfsHash}`;
};

/**
 * Convert IPFS hash to Stellar-compatible format
 * @param {string} ipfsHash - IPFS hash
 * @returns {string} - Stellar-compatible string
 */
export const ipfsHashToStellarFormat = (ipfsHash) => {
  // Stellar can handle strings directly, no conversion needed
  return ipfsHash;
};

/**
 * Convert Stellar format back to IPFS hash
 * @param {string} stellarFormat - Stellar string format
 * @returns {string} - IPFS hash
 */
export const stellarFormatToIPFSHash = (stellarFormat) => {
  // Direct conversion since Stellar stores as string
  return stellarFormat;
};
