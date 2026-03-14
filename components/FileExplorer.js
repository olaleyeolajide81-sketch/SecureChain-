import { useState, useEffect } from 'react';
import { useWeb3 } from '../utils/Web3Context';

export default function FileExplorer() {
  const { contract, account } = useWeb3();
  const [files, setFiles] = useState([]);
  const [userFiles, setUserFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // all, verified, pending, user

  useEffect(() => {
    loadData();
  }, [contract, account]);

  const loadData = async () => {
    if (!contract) return;
    
    setLoading(true);
    try {
      // Load all files
      const totalFiles = await contract.getTotalFiles();
      const filePromises = [];
      
      for (let i = 1; i <= totalFiles.toNumber(); i++) {
        filePromises.push(contract.getFile(i));
      }
      
      const fileData = await Promise.all(filePromises);
      const validFiles = fileData.filter(file => file.exists);
      setFiles(validFiles);
      
      // Load user files
      if (account) {
        const userFileIds = await contract.getUserFiles(account);
        const userFilePromises = userFileIds.map(id => contract.getFile(id));
        const userFileData = await Promise.all(userFilePromises);
        setUserFiles(userFileData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFileVerifications = async (fileId) => {
    if (!contract) return;
    
    try {
      const verificationData = await contract.getFileVerifications(fileId);
      setVerifications(verificationData);
    } catch (error) {
      console.error('Error loading verifications:', error);
      setVerifications([]);
    }
  };

  const handleFileSelect = async (file) => {
    setSelectedFile(file);
    await loadFileVerifications(file.fileId);
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.uploader.toLowerCase().includes(searchTerm.toLowerCase());
    
    switch (filter) {
      case 'verified':
        return matchesSearch && file.isVerified;
      case 'pending':
        return matchesSearch && !file.isVerified;
      case 'user':
        return matchesSearch && userFiles.some(userFile => userFile.fileId.toString() === file.fileId.toString());
      default:
        return matchesSearch;
    }
  });

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getVerificationScoreColor = (score) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading files...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">File Explorer</h2>
        <p className="text-gray-600">
          Browse and explore all files uploaded to the SecureChain network.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by filename or uploader address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Files</option>
              <option value="verified">Verified Only</option>
              <option value="pending">Pending Verification</option>
              <option value="user">My Files</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              Files ({filteredFiles.length})
            </h3>
            
            {filteredFiles.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-2 text-sm text-gray-600">No files found</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredFiles.map((file) => (
                  <div
                    key={file.fileId.toString()}
                    onClick={() => handleFileSelect(file)}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedFile && selectedFile.fileId.toString() === file.fileId.toString()
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{file.fileName}</h4>
                        <div className="mt-1 text-sm text-gray-500 space-y-1">
                          <p>Size: {formatFileSize(file.fileSize)}</p>
                          <p>Uploader: {formatAddress(file.uploader)}</p>
                          <p>Uploaded: {formatDate(file.timestamp)}</p>
                          <p>File ID: #{file.fileId}</p>
                        </div>
                      </div>
                      <div className="ml-4 text-right">
                        {file.isVerified ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Pending
                          </span>
                        )}
                        <div className="mt-1">
                          <span className={`text-sm font-medium ${getVerificationScoreColor(file.verificationScore)}`}>
                            {file.verificationScore}%
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {file.verificationCount} verifications
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">File Details</h3>
            
            {selectedFile ? (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">File Name:</span>
                      <span className="font-medium break-all">{selectedFile.fileName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">File Size:</span>
                      <span className="font-medium">{formatFileSize(selectedFile.fileSize)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Uploader:</span>
                      <span className="font-medium">{formatAddress(selectedFile.uploader)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Uploaded:</span>
                      <span className="font-medium">{formatDate(selectedFile.timestamp)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">File ID:</span>
                      <span className="font-medium">#{selectedFile.fileId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">IPFS Hash:</span>
                      <span className="font-medium text-xs break-all">{selectedFile.ipfsHash}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">File Hash:</span>
                      <span className="font-medium text-xs break-all">{selectedFile.fileHash}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Verification Status</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      {selectedFile.isVerified ? (
                        <span className="text-green-600 font-medium">Verified</span>
                      ) : (
                        <span className="text-yellow-600 font-medium">Pending</span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Score:</span>
                      <span className={`font-medium ${getVerificationScoreColor(selectedFile.verificationScore)}`}>
                        {selectedFile.verificationScore}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Verifications:</span>
                      <span className="font-medium">{selectedFile.verificationCount}</span>
                    </div>
                  </div>
                </div>

                {verifications.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Recent Verifications</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {verifications.slice(-5).reverse().map((verification) => (
                        <div key={verification.verificationId.toString()} className="text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{formatAddress(verification.verifier)}</span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              verification.isValid
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {verification.isValid ? 'Valid' : 'Invalid'}
                            </span>
                          </div>
                          {verification.comment && (
                            <p className="text-gray-600 text-xs mt-1">{verification.comment}</p>
                          )}
                          <p className="text-gray-500 text-xs mt-1">
                            {formatDate(verification.timestamp)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <button
                    onClick={() => window.open(`https://ipfs.io/ipfs/${selectedFile.ipfsHash}`, '_blank')}
                    className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    View on IPFS
                  </button>
                  <button
                    onClick={() => window.open(`https://etherscan.io/address/${selectedFile.uploader}`, '_blank')}
                    className="w-full bg-gray-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-700 transition-colors"
                  >
                    View Uploader on Etherscan
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="mt-2 text-sm text-gray-600">Select a file to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
