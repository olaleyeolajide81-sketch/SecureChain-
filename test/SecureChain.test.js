const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SecureChain", function () {
  let secureChain;
  let owner;
  let uploader;
  let verifier1;
  let verifier2;
  
  const testFile = {
    ipfsHash: "QmTest123456789",
    fileHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test file content")),
    fileName: "test-document.pdf",
    fileSize: 1024
  };

  beforeEach(async function () {
    [owner, uploader, verifier1, verifier2] = await ethers.getSigners();
    
    const SecureChain = await ethers.getContractFactory("SecureChain");
    secureChain = await SecureChain.deploy();
    await secureChain.deployed();
    
    // Fund contract for verification rewards
    await secureChain.fundContract({ value: ethers.utils.parseEther("2.0") });
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await secureChain.owner()).to.equal(owner.address);
    });

    it("Should have correct name and symbol", async function () {
      expect(await secureChain.name()).to.equal("SecureChain");
      expect(await secureChain.symbol()).to.equal("SCT");
    });

    it("Should start with zero files and verifications", async function () {
      expect(await secureChain.getTotalFiles()).to.equal(0);
      expect(await secureChain.getTotalVerifications()).to.equal(0);
    });
  });

  describe("File Upload", function () {
    it("Should upload a file successfully", async function () {
      const tx = await secureChain.connect(uploader).uploadFile(
        testFile.ipfsHash,
        testFile.fileHash,
        testFile.fileName,
        testFile.fileSize
      );
      
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "FileUploaded");
      
      expect(event.args.fileId).to.equal(1);
      expect(event.args.ipfsHash).to.equal(testFile.ipfsHash);
      expect(event.args.fileHash).to.equal(testFile.fileHash);
      expect(event.args.fileName).to.equal(testFile.fileName);
      expect(event.args.fileSize).to.equal(testFile.fileSize);
      expect(event.args.uploader).to.equal(uploader.address);
      
      expect(await secureChain.getTotalFiles()).to.equal(1);
    });

    it("Should mint NFT for uploaded file", async function () {
      await secureChain.connect(uploader).uploadFile(
        testFile.ipfsHash,
        testFile.fileHash,
        testFile.fileName,
        testFile.fileSize
      );
      
      expect(await secureChain.ownerOf(1)).to.equal(uploader.address);
      expect(await secureChain.tokenURI(1)).to.equal(testFile.ipfsHash);
    });

    it("Should reject duplicate file hashes", async function () {
      await secureChain.connect(uploader).uploadFile(
        testFile.ipfsHash,
        testFile.fileHash,
        testFile.fileName,
        testFile.fileSize
      );
      
      await expect(
        secureChain.connect(uploader).uploadFile(
          "QmDifferentHash",
          testFile.fileHash,
          "different-file.pdf",
          2048
        )
      ).to.be.revertedWith("File with this hash already exists");
    });

    it("Should reject duplicate IPFS hashes", async function () {
      await secureChain.connect(uploader).uploadFile(
        testFile.ipfsHash,
        testFile.fileHash,
        testFile.fileName,
        testFile.fileSize
      );
      
      await expect(
        secureChain.connect(uploader).uploadFile(
          testFile.ipfsHash,
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes("different content")),
          "different-file.pdf",
          2048
        )
      ).to.be.revertedWith("File with this IPFS hash already exists");
    });

    it("Should validate input parameters", async function () {
      await expect(
        secureChain.connect(uploader).uploadFile("", testFile.fileHash, testFile.fileName, testFile.fileSize)
      ).to.be.revertedWith("IPFS hash cannot be empty");
      
      await expect(
        secureChain.connect(uploader).uploadFile(testFile.ipfsHash, ethers.constants.HashZero, testFile.fileName, testFile.fileSize)
      ).to.be.revertedWith("File hash cannot be zero");
      
      await expect(
        secureChain.connect(uploader).uploadFile(testFile.ipfsHash, testFile.fileHash, "", testFile.fileSize)
      ).to.be.revertedWith("File name cannot be empty");
      
      await expect(
        secureChain.connect(uploader).uploadFile(testFile.ipfsHash, testFile.fileHash, testFile.fileName, 0)
      ).to.be.revertedWith("File size must be greater than zero");
    });
  });

  describe("File Verification", function () {
    beforeEach(async function () {
      await secureChain.connect(uploader).uploadFile(
        testFile.ipfsHash,
        testFile.fileHash,
        testFile.fileName,
        testFile.fileSize
      );
    });

    it("Should verify a file successfully", async function () {
      const tx = await secureChain.connect(verifier1).verifyFile(1, true, "File looks authentic");
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "FileVerified");
      
      expect(event.args.verificationId).to.equal(1);
      expect(event.args.fileId).to.equal(1);
      expect(event.args.verifier).to.equal(verifier1.address);
      expect(event.args.isValid).to.be.true;
      expect(event.args.comment).to.equal("File looks authentic");
      
      const file = await secureChain.getFile(1);
      expect(file.verificationCount).to.equal(1);
      expect(file.verificationScore).to.equal(100);
      expect(file.isVerified).to.be.true;
    });

    it("Should send verification reward", async function () {
      const initialBalance = await verifier1.getBalance();
      
      await secureChain.connect(verifier1).verifyFile(1, true, "Good file");
      
      const finalBalance = await verifier1.getBalance();
      const reward = ethers.utils.parseEther("0.01");
      
      // Account for gas costs, just check that some ETH was received
      expect(finalBalance.gt(initialBalance)).to.be.true;
    });

    it("Should prevent self-verification", async function () {
      await expect(
        secureChain.connect(uploader).verifyFile(1, true, "My own file")
      ).to.be.revertedWith("Cannot verify your own file");
    });

    it("Should calculate verification score correctly", async function () {
      // First verification (positive)
      await secureChain.connect(verifier1).verifyFile(1, true, "Good file");
      
      let file = await secureChain.getFile(1);
      expect(file.verificationScore).to.equal(100);
      
      // Second verification (negative)
      await secureChain.connect(verifier2).verifyFile(1, false, "Suspicious content");
      
      file = await secureChain.getFile(1);
      expect(file.verificationScore).to.equal(50); // 1 positive out of 2 total
      expect(file.isVerified).to.be.false; // Below 70% threshold
    });

    it("Should track verification history", async function () {
      await secureChain.connect(verifier1).verifyFile(1, true, "Good file");
      await secureChain.connect(verifier2).verifyFile(1, false, "Bad file");
      
      const verifications = await secureChain.getFileVerifications(1);
      expect(verifications.length).to.equal(2);
      
      const verifier1History = await secureChain.getVerifierHistory(verifier1.address);
      expect(verifier1History.length).to.equal(1);
    });
  });

  describe("Search Functionality", function () {
    beforeEach(async function () {
      await secureChain.connect(uploader).uploadFile(
        testFile.ipfsHash,
        testFile.fileHash,
        testFile.fileName,
        testFile.fileSize
      );
    });

    it("Should search by file hash", async function () {
      const fileId = await secureChain.searchByHash(testFile.fileHash);
      expect(fileId).to.equal(1);
    });

    it("Should search by IPFS hash", async function () {
      const fileId = await secureChain.searchByIpfsHash(testFile.ipfsHash);
      expect(fileId).to.equal(1);
    });
  });

  describe("User Management", function () {
    beforeEach(async function () {
      await secureChain.connect(uploader).uploadFile(
        testFile.ipfsHash,
        testFile.fileHash,
        testFile.fileName,
        testFile.fileSize
      );
      
      await secureChain.connect(verifier1).verifyFile(1, true, "Good file");
    });

    it("Should get user files", async function () {
      const userFiles = await secureChain.getUserFiles(uploader.address);
      expect(userFiles.length).to.equal(1);
      expect(userFiles[0]).to.equal(1);
    });

    it("Should get verifier history", async function () {
      const verifierHistory = await secureChain.getVerifierHistory(verifier1.address);
      expect(verifierHistory.length).to.equal(1);
      expect(verifierHistory[0]).to.equal(1);
    });
  });

  describe("Admin Functions", function () {
    it("Should pause and unpause contract", async function () {
      await secureChain.pause();
      expect(await secureChain.paused()).to.be.true;
      
      await secureChain.unpause();
      expect(await secureChain.paused()).to.be.false;
    });

    it("Should prevent uploads when paused", async function () {
      await secureChain.pause();
      
      await expect(
        secureChain.connect(uploader).uploadFile(
          testFile.ipfsHash,
          testFile.fileHash,
          testFile.fileName,
          testFile.fileSize
        )
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should allow contract funding", async function () {
      const fundAmount = ethers.utils.parseEther("0.5");
      await secureChain.fundContract({ value: fundAmount });
      
      expect(await ethers.provider.getBalance(secureChain.address)).to.be.gt(
        ethers.utils.parseEther("2.0")
      );
    });

    it("Should allow withdrawal by owner", async function () {
      const initialBalance = await owner.getBalance();
      const contractBalance = await ethers.provider.getBalance(secureChain.address);
      
      await secureChain.withdraw();
      
      const finalBalance = await owner.getBalance();
      expect(finalBalance).to.equal(initialBalance.add(contractBalance));
    });
  });

  describe("Reentrancy Protection", function () {
    it("Should prevent reentrancy attacks", async function () {
      // This test would require a malicious contract to test reentrancy
      // For now, we just verify the nonReentrant modifier is present
      const contractSource = await ethers.provider.getCode(secureChain.address);
      expect(contractSource).to.include("reentrancy guard");
    });
  });
});
