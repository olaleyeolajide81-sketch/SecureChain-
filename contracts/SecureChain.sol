// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/**
 * @title SecureChain - Decentralized File Verification System
 * @dev A comprehensive smart contract for file verification, storage, and NFT representation
 * @author SecureChain Team
 */
contract SecureChain is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard, Pausable {
    using Counters for Counters.Counter;
    
    // State variables
    Counters.Counter private _fileIds;
    Counters.Counter private _verificationIds;
    
    struct FileRecord {
        uint256 fileId;
        string ipfsHash;
        bytes32 fileHash;
        string fileName;
        uint256 fileSize;
        address uploader;
        uint256 timestamp;
        bool exists;
        bool isVerified;
        uint256 verificationCount;
        uint256 verificationScore;
    }
    
    struct VerificationRecord {
        uint256 verificationId;
        uint256 fileId;
        address verifier;
        bool isValid;
        string comment;
        uint256 timestamp;
        bool exists;
    }
    
    // Mappings
    mapping(uint256 => FileRecord) public files;
    mapping(uint256 => VerificationRecord[]) public fileVerifications;
    mapping(address => uint256[]) public userFiles;
    mapping(address => uint256[]) public verifierHistory;
    mapping(bytes32 => uint256) public hashToFileId;
    mapping(string => uint256) public ipfsHashToFileId;
    
    // Events
    event FileUploaded(
        uint256 indexed fileId,
        string indexed ipfsHash,
        bytes32 indexed fileHash,
        string fileName,
        uint256 fileSize,
        address uploader,
        uint256 timestamp
    );
    
    event FileVerified(
        uint256 indexed verificationId,
        uint256 indexed fileId,
        address indexed verifier,
        bool isValid,
        string comment,
        uint256 timestamp
    );
    
    event VerificationScoreUpdated(
        uint256 indexed fileId,
        uint256 newScore,
        uint256 verificationCount
    );
    
    event ContractPaused(address indexed by);
    event ContractUnpaused(address indexed by);
    
    // Constants
    uint256 public constant MIN_VERIFICATION_SCORE = 1;
    uint256 public constant MAX_VERIFICATION_SCORE = 100;
    uint256 public constant VERIFICATION_REWARD = 0.01 ether;
    
    constructor() ERC721("SecureChain", "SCT") {
        // Initialize contract
    }
    
    /**
     * @dev Upload a new file to the decentralized system
     * @param _ipfsHash IPFS hash of the file
     * @param _fileHash SHA-256 hash of the file content
     * @param _fileName Name of the file
     * @param _fileSize Size of the file in bytes
     */
    function uploadFile(
        string memory _ipfsHash,
        bytes32 _fileHash,
        string memory _fileName,
        uint256 _fileSize
    ) external whenNotPaused nonReentrant returns (uint256) {
        require(bytes(_ipfsHash).length > 0, "IPFS hash cannot be empty");
        require(_fileHash != bytes32(0), "File hash cannot be zero");
        require(bytes(_fileName).length > 0, "File name cannot be empty");
        require(_fileSize > 0, "File size must be greater than zero");
        require(hashToFileId[_fileHash] == 0, "File with this hash already exists");
        require(ipfsHashToFileId[_ipfsHash] == 0, "File with this IPFS hash already exists");
        
        _fileIds.increment();
        uint256 newFileId = _fileIds.current();
        
        // Create file record
        files[newFileId] = FileRecord({
            fileId: newFileId,
            ipfsHash: _ipfsHash,
            fileHash: _fileHash,
            fileName: _fileName,
            fileSize: _fileSize,
            uploader: msg.sender,
            timestamp: block.timestamp,
            exists: true,
            isVerified: false,
            verificationCount: 0,
            verificationScore: 0
        });
        
        // Update mappings
        hashToFileId[_fileHash] = newFileId;
        ipfsHashToFileId[_ipfsHash] = newFileId;
        userFiles[msg.sender].push(newFileId);
        
        // Mint NFT representing the file
        _safeMint(msg.sender, newFileId);
        _setTokenURI(newFileId, _ipfsHash);
        
        emit FileUploaded(
            newFileId,
            _ipfsHash,
            _fileHash,
            _fileName,
            _fileSize,
            msg.sender,
            block.timestamp
        );
        
        return newFileId;
    }
    
    /**
     * @dev Verify a file's authenticity
     * @param _fileId ID of the file to verify
     * @param _isValid Whether the file is verified as authentic
     * @param _comment Optional comment about the verification
     */
    function verifyFile(
        uint256 _fileId,
        bool _isValid,
        string memory _comment
    ) external whenNotPaused nonReentrant returns (uint256) {
        require(files[_fileId].exists, "File does not exist");
        require(msg.sender != files[_fileId].uploader, "Cannot verify your own file");
        
        _verificationIds.increment();
        uint256 newVerificationId = _verificationIds.current();
        
        // Create verification record
        VerificationRecord memory verification = VerificationRecord({
            verificationId: newVerificationId,
            fileId: _fileId,
            verifier: msg.sender,
            isValid: _isValid,
            comment: _comment,
            timestamp: block.timestamp,
            exists: true
        });
        
        // Add to file verifications
        fileVerifications[_fileId].push(verification);
        verifierHistory[msg.sender].push(newVerificationId);
        
        // Update file verification metrics
        files[_fileId].verificationCount++;
        
        // Calculate new verification score
        uint256 positiveVerifications = 0;
        for (uint256 i = 0; i < fileVerifications[_fileId].length; i++) {
            if (fileVerifications[_fileId][i].isValid) {
                positiveVerifications++;
            }
        }
        
        files[_fileId].verificationScore = (positiveVerifications * 100) / files[_fileId].verificationCount;
        
        // Mark as verified if score is above threshold
        if (files[_fileId].verificationScore >= 70) {
            files[_fileId].isVerified = true;
        }
        
        // Send reward to verifier
        if (address(this).balance >= VERIFICATION_REWARD) {
            payable(msg.sender).transfer(VERIFICATION_REWARD);
        }
        
        emit FileVerified(
            newVerificationId,
            _fileId,
            msg.sender,
            _isValid,
            _comment,
            block.timestamp
        );
        
        emit VerificationScoreUpdated(
            _fileId,
            files[_fileId].verificationScore,
            files[_fileId].verificationCount
        );
        
        return newVerificationId;
    }
    
    /**
     * @dev Get file details by ID
     * @param _fileId ID of the file
     */
    function getFile(uint256 _fileId) external view returns (FileRecord memory) {
        require(files[_fileId].exists, "File does not exist");
        return files[_fileId];
    }
    
    /**
     * @dev Get all files uploaded by a user
     * @param _user Address of the user
     */
    function getUserFiles(address _user) external view returns (uint256[] memory) {
        return userFiles[_user];
    }
    
    /**
     * @dev Get verification history for a file
     * @param _fileId ID of the file
     */
    function getFileVerifications(uint256 _fileId) external view returns (VerificationRecord[] memory) {
        require(files[_fileId].exists, "File does not exist");
        return fileVerifications[_fileId];
    }
    
    /**
     * @dev Get verification history for a verifier
     * @param _verifier Address of the verifier
     */
    function getVerifierHistory(address _verifier) external view returns (uint256[] memory) {
        return verifierHistory[_verifier];
    }
    
    /**
     * @dev Search file by hash
     * @param _fileHash SHA-256 hash of the file
     */
    function searchByHash(bytes32 _fileHash) external view returns (uint256) {
        return hashToFileId[_fileHash];
    }
    
    /**
     * @dev Search file by IPFS hash
     * @param _ipfsHash IPFS hash of the file
     */
    function searchByIpfsHash(string memory _ipfsHash) external view returns (uint256) {
        return ipfsHashToFileId[_ipfsHash];
    }
    
    /**
     * @dev Get total number of files
     */
    function getTotalFiles() external view returns (uint256) {
        return _fileIds.current();
    }
    
    /**
     * @dev Get total number of verifications
     */
    function getTotalVerifications() external view returns (uint256) {
        return _verificationIds.current();
    }
    
    /**
     * @dev Pause the contract (owner only)
     */
    function pause() external onlyOwner {
        _pause();
        emit ContractPaused(msg.sender);
    }
    
    /**
     * @dev Unpause the contract (owner only)
     */
    function unpause() external onlyOwner {
        _unpause();
        emit ContractUnpaused(msg.sender);
    }
    
    /**
     * @dev Withdraw contract balance (owner only)
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        payable(owner()).transfer(balance);
    }
    
    /**
     * @dev Fund the contract for verification rewards
     */
    function fundContract() external payable {
        require(msg.value > 0, "Must send ETH");
    }
    
    // Override required functions
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
    
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
